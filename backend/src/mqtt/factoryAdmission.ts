import { readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { createServer, TLSSocket } from 'node:tls';
import { deviceAdmission, isFactoryHostname, recordFactoryConnection } from './deviceRegistry';

const socketDir = '/run/tomatoes-mqtt/';
const maxConnectBytes = 8192;

function rewriteConnect(packet: Buffer, host: string) {
  if (packet.length < 12 || !packet.subarray(0, 7).equals(Buffer.from([0, 4, 77, 81, 84, 84, 4]))) {
    throw new Error('Factory devices must use MQTT 3.1.1');
  }
  let offset = 10;
  function field() {
    const length = packet.readUInt16BE(offset);
    offset += 2 + length;
    if (offset > packet.length) throw new Error('Invalid CONNECT field');
  }
  field(); // Supplied client ID is replaced by the certificate identity.
  const willStart = offset;
  const flags = packet[7];
  if (flags & 4) { field(); field(); }
  const will = packet.subarray(willStart, offset);
  if (flags & 128) field();
  if (flags & 64) field();
  if (offset !== packet.length) throw new Error('Invalid CONNECT length');

  const header = Buffer.from(packet.subarray(0, 10));
  header[7] = (flags & 0x3c) | 0x82; // Username and clean session.
  const identity = Buffer.concat([Buffer.from([0, host.length]), Buffer.from(host)]);
  const body = Buffer.concat([header, identity, will, identity]);
  const length: number[] = [];
  for (let remaining = body.length; ; remaining = Math.floor(remaining / 128)) {
    length.push((remaining % 128) | (remaining >= 128 ? 128 : 0));
    if (remaining < 128) break;
  }
  return Buffer.concat([Buffer.from([0x10, ...length]), body]);
}

function acceptDevice(socket: TLSSocket) {
  const host = socket.getPeerCertificate().subject?.CN;
  socket.on('error', () => socket.destroy());
  if (!socket.authorized || !isFactoryHostname(host)) { socket.destroy(); return; }
  socket.setTimeout(8000, () => socket.destroy());
  let buffer = Buffer.alloc(0);
  const onData = (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer[0] !== 0x10 || buffer.length > maxConnectBytes) { socket.destroy(); return; }
    let size = 0;
    for (let index = 1; index < Math.min(buffer.length, 5); index++) {
      const byte = buffer[index];
      size += (byte & 127) * 128 ** (index - 1);
      if (byte & 128) continue;
      const end = index + 1 + size;
      if (end > maxConnectBytes) { socket.destroy(); return; }
      if (buffer.length < end) return;
      socket.pause();
      socket.removeListener('data', onData);
      void forward(buffer.subarray(index + 1, end), buffer.subarray(end)).catch(() => socket.destroy());
      return;
    }
    if (buffer.length >= 5) socket.destroy();
  };

  async function forward(connect: Buffer, remainder: Buffer) {
    const packet = rewriteConnect(connect, host as string);
    const initial = await deviceAdmission(host as string);
    if (socket.destroyed) return;
    if (initial === 'removed') { socket.end(Buffer.from([0x20, 2, 0, 5])); return; }
    await recordFactoryConnection(host as string);
    if (socket.destroyed) return;
    const upstream = createConnection(socketDir + initial + '.sock');
    let checking = false;
    const timer = setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        if (await deviceAdmission(host as string) !== initial) socket.destroy();
      } catch {
        socket.destroy();
      } finally { checking = false; }
    }, 5000);
    socket.once('close', () => { clearInterval(timer); upstream.destroy(); });
    upstream.on('error', () => socket.destroy());
    upstream.once('close', () => socket.destroy());
    upstream.once('connect', () => {
      socket.setTimeout(0);
      upstream.write(packet);
      if (remainder.length) upstream.write(remainder);
      socket.pipe(upstream).pipe(socket);
    });
  }

  socket.on('data', onData);
}

export function startFactoryAdmission() {
  if (!process.env.MQTT_DEVICE_BIND_IP) return;
  const boot = () => {
    try {
      const server = createServer({
        cert: readFileSync('/run/tomatoes-tls/broker.pem'),
        key: readFileSync('/run/tomatoes-tls/broker.key'),
        ca: readFileSync('/run/tomatoes-device-ca.pem'),
        requestCert: true, rejectUnauthorized: true, minVersion: 'TLSv1.2',
      }, acceptDevice);
      server.on('error', error => console.error('Factory MQTT listener:', error.message));
      server.listen(8884, '0.0.0.0');
    } catch {
      setTimeout(boot, 3000).unref();
    }
  };
  boot();
}
