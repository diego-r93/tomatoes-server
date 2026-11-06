const stateValue = value => value === true || value === 1 || value === '1' || value === 'true' ? true : value === false || value === 0 || value === '0' || value === 'false' ? false : null;

export function devicePorts(ports) {
  if (!ports || typeof ports !== 'object') return [];
  const seen = new Set();
  return Object.entries(ports).flatMap(([code, port], index) => {
    if (port?.gpio === null || port?.gpio === undefined || port?.gpio === '') return [];
    const gpio = Number(port.gpio);
    if (!Number.isInteger(gpio) || gpio < 0 || gpio > 255 || seen.has(gpio)) return [];
    seen.add(gpio);
    return [{ gpio, code, label: String(port.name || port.pumperName || `Output ${index + 1}`), state: stateValue(port.state) }];
  });
}

export function mergeDeviceDiscovery(information, previous = [], timestamp = Date.now()) {
  if (!Array.isArray(information)) throw new Error('The server returned an invalid device list.');
  const known = new Map(previous.map(device => [device.key, { ...device, responded: false }]));
  for (const reply of information) {
    const host = String(reply?.host || '').trim();
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(host)) continue;
    const mac = String(reply.mac || '').trim();
    const key = mac ? mac.toUpperCase() : host;
    const rssi = reply.rssi === null || reply.rssi === '' || reply.rssi === undefined ? null : Number(reply.rssi);
    known.set(key, { ...reply, key, host, mac, ip: String(reply.ip || ''), rssi: Number.isFinite(rssi) && rssi <= 0 && rssi >= -150 ? rssi : null, ports: reply.ports || {}, outputs: devicePorts(reply.ports), responded: true, receivedAt: timestamp });
  }
  return [...known.values()];
}
export const isResponding = (device, timestamp = Date.now()) => Boolean(device?.responded && timestamp - device.receivedAt < 90000);
export const weakSignal = device => device.rssi !== null && device.rssi <= -75;
export function signalText(device) {
  return device.rssi === null ? 'Unknown' : `${device.rssi} dBm`;
}
export function lastSeenLabel(timestamp, current = Date.now()) {
  if (!timestamp) return 'Not observed';
  const seconds = Math.max(0, Math.floor((current - timestamp) / 1000));
  return seconds < 5 ? 'Just now' : seconds < 60 ? `${seconds} sec ago` : seconds < 3600 ? `${Math.floor(seconds / 60)} min ago` : `${Math.floor(seconds / 3600)} hr ago`;
}
