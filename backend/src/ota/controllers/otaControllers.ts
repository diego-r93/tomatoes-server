import { createHash, createHmac, randomBytes } from 'node:crypto';
import { request } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { isIPv4 } from 'node:net';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { recentDevice } from '../../alerts/sources';
import { context } from '../../users/http';
import { HttpError } from '../../users/types';

export const MAX_FIRMWARE_BYTES = 6553600;
const activeHosts = new Set<string>();
const logs = () => mongoose.connection.collection('ota_logs');

export function firmwareMasterKey() {
  const key = process.env.OTA_MASTER_KEY;
  if (!key || !/^[0-9a-f]{64}$/.test(key)) throw new HttpError(503, 'Firmware signing is unavailable.');
  return key;
}

export function deriveBoardKey(masterKey: string, host: string) {
  return createHmac('sha256', masterKey).update(host).digest('hex');
}

const supportedModels = new Set(['N16R8V', 'N16R2']);

function validateFirmwareModel(image: Buffer, boardModel: unknown) {
  if (typeof boardModel !== 'string' || !supportedModels.has(boardModel)) {
    throw new HttpError(409, 'The selected board did not report a supported firmware model. Refresh Devices and try again.');
  }

  const marks = image.toString('latin1').matchAll(/TOMATOES_FW_MODEL=([A-Z0-9]{1,16});/g);
  const models = new Set(Array.from(marks, match => match[1]));
  const [imageModel] = models;
  if (models.size !== 1 || !supportedModels.has(imageModel)) {
    throw new HttpError(400, 'The firmware file must contain one supported model marker.');
  }
  if (imageModel !== boardModel) {
    throw new HttpError(400, 'This firmware is for ' + imageModel + '. The selected board requires ' + boardModel + '.');
  }
}

const missingBoardKey = 'Placa sem chave de OTA; grave a chave pela USB';

export function signFirmware(boardKey: string, host: string, nonce: string, size: number, sha256: string) {
  return createHmac('sha256', boardKey).update(['tomatoes-ota-v1', host, nonce, String(size), sha256].join('\n')).digest('hex');
}

function privateAddress(ip: string) {
  if (!isIPv4(ip)) return false;
  const [first, second] = ip.split('.').map(Number);
  return first === 10 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168;
}

type BoardReply = { status: number; body: string };
class OtaTransportError extends Error {
  constructor(readonly fullyWritten: boolean, readonly responseStatus?: number) {
    super('The board connection ended before a complete reply.');
  }
}

function postFirmware(url: string, image: Buffer, headers: Record<string, string>, signal: AbortSignal) {
  const boundary = 'tomatoes-' + randomBytes(16).toString('hex');
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="firmware"; filename="firmware.bin"\r\n` +
    'Content-Type: application/octet-stream\r\n\r\n',
  );
  const body = Buffer.concat([preamble, image, Buffer.from(`\r\n--${boundary}--\r\n`)]);

  return new Promise<BoardReply>((resolve, reject) => {
    let fullyWritten = false;
    let responseStatus: number | undefined;
    let settled = false;
    const finish = (reply?: BoardReply) => {
      if (settled) return;
      settled = true;
      console.info('OTA board POST', {
        contentLength: body.length,
        bodyBytesWritten: fullyWritten ? body.length : null,
        responseStatus: responseStatus ?? null,
      });
      if (reply) resolve(reply);
      else reject(new OtaTransportError(fullyWritten, responseStatus));
    };
    const outgoing = request(url, {
      method: 'POST',
      agent: false,
      signal,
      headers: {
        ...headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, incoming => {
      responseStatus = incoming.statusCode;
      let bytes = 0;
      const chunks: Buffer[] = [];
      incoming.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 8192) {
          incoming.destroy();
          finish();
          return;
        }
        chunks.push(chunk);
      });
      incoming.once('error', () => finish());
      incoming.once('close', () => { if (!incoming.complete) finish(); });
      incoming.once('end', () => finish({ status: responseStatus ?? 502, body: Buffer.concat(chunks).toString('utf8') }));
    });
    outgoing.once('finish', () => { fullyWritten = true; });
    outgoing.once('error', () => finish());
    outgoing.end(body);
  });
}

async function waitForRestart(url: string, host: string, ip: string, beforeUptime: unknown, uploadStarted: number) {
  const deadline = Date.now() + 60000;
  let unreachable = false;
  while (Date.now() < deadline) {
    const device = await recentDevice(host);
    if (device?.ip === ip && device.receivedAt > uploadStarted &&
        typeof beforeUptime === 'number' && typeof device.uptime === 'number' &&
        device.uptime >= 0 && device.uptime < beforeUptime) return true;

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const signal = AbortSignal.timeout(Math.min(2000, remaining));
    const response = await fetch(url + '/nonce', { signal, redirect: 'error' }).catch(() => {
      unreachable = true;
      return null;
    });
    if (response?.ok) {
      const challenge = await response.json().catch(() => null);
      if (challenge?.host && challenge.host !== host) return false;
      if (challenge?.host === host && unreachable) return true;
    } else {
      await response?.body?.cancel().catch(() => {});
    }
    await delay(Math.max(0, Math.min(2000, deadline - Date.now())));

  }
  return false;
}

export async function uploadOTAFile(req: Request, res: Response) {
  const masterKey = firmwareMasterKey();
  const host = req.params.host as string;
  const image = req.file?.buffer;
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(host) || !image?.length || image.length > MAX_FIRMWARE_BYTES || image[0] !== 0xe9) {
    throw new HttpError(400, 'Select a valid ESP32 firmware image.');
  }
  if (activeHosts.has(host)) throw new HttpError(409, 'An update is already running for this board.');
  activeHosts.add(host);
  const sha256 = createHash('sha256').update(image).digest('hex');
  let status = 502;
  let result: { ok: boolean; error?: string; restart_in_ms?: number; confirmation?: 'restart' } = { ok: false, error: 'The board did not confirm the firmware update.' };
  try {
    const { insertedId } = await logs().insertOne({
      userId: context(res).user.id, username: context(res).user.username,
      date: new Date(), host, size: image.length, sha256, result: 'started',
    });
    try {
      const device = await recentDevice(host);
      const ip = device?.ip;
      if (!ip || !privateAddress(ip)) throw new HttpError(409, 'The board has no recent discovery response with a valid address.');
      validateFirmwareModel(image, device.model);
      const url = `http://${ip}/update`;
      const options = { signal: AbortSignal.timeout(120000), redirect: 'error' as const };
      const nonceResponse = await fetch(url + '/nonce', options);
      if (nonceResponse.status === 503) throw new HttpError(503, missingBoardKey);
      if (!nonceResponse.ok) throw new HttpError(nonceResponse.status === 409 ? 409 : 502, 'The board refused the update nonce.');
      const challenge = await nonceResponse.json();
      if (challenge?.host !== host || typeof challenge.nonce !== 'string' || !/^[a-f0-9]{32}$/i.test(challenge.nonce)) {
        throw new HttpError(502, 'The board returned an invalid identity or nonce.');
      }
      const boardKey = deriveBoardKey(masterKey, host);
      const signature = signFirmware(boardKey, host, challenge.nonce, image.length, sha256);
      const uploadStarted = Date.now();
      let reply: BoardReply;
      try {
        reply = await postFirmware(url, image, {
          'X-OTA-Nonce': challenge.nonce,
          'X-OTA-Size': String(image.length),
          'X-OTA-SHA256': sha256,
          'X-OTA-Signature': signature,
        }, options.signal);
      } catch (error) {
        if (!(error instanceof OtaTransportError) || !error.fullyWritten ||
            (error.responseStatus !== undefined && error.responseStatus !== 200)) throw error;
        const restarted = await waitForRestart(url, host, ip, device.uptime, uploadStarted);
        reply = restarted
          ? { status: 200, body: JSON.stringify({ ok: true, confirmation: 'restart' }) }
          : { status: 504, body: JSON.stringify({ ok: false, error: 'The firmware was sent, but the board restart could not be confirmed.' }) };
      }
      const data = reply.status === 503 ? { ok: false, error: missingBoardKey } : JSON.parse(reply.body);
      if (!data || typeof data.ok !== 'boolean' || (reply.status === 200) !== data.ok || ![200, 400, 401, 409, 500, 503, 504].includes(reply.status)) {
        throw new HttpError(502, 'The board returned an invalid firmware result.');
      }
      status = reply.status;
      result = { ok: data.ok };
      if (data.confirmation === 'restart') result.confirmation = 'restart';
      if (typeof data.error === 'string') result.error = data.error.replace(new RegExp([masterKey, boardKey, signature].join('|'), 'gi'), '[redacted]').slice(0, 500);
      if (Number.isSafeInteger(data.restart_in_ms) && data.restart_in_ms >= 0) result.restart_in_ms = data.restart_in_ms;
    } catch (error) {
      if (error instanceof HttpError) { status = error.status; result = { ok: false, error: error.message }; }
      else if (error instanceof Error && error.name === 'TimeoutError') { status = 504; result = { ok: false, error: 'Timed out waiting for the board. Check its status before trying again.' }; }
    }
    await logs().updateOne({ _id: insertedId }, { $set: { result: result.ok ? 'success' : status === 504 ? 'unconfirmed' : 'failed', status, ...(result.confirmation ? { confirmation: result.confirmation } : {}), completedAt: new Date() } })
      .catch(() => console.error('Could not finalize the firmware audit record.'));
    res.status(status).json({ ...result, sha256 });
  } finally {
    activeHosts.delete(host);
  }
}
