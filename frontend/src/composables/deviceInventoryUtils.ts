export interface DeviceOutput {
  gpio: number;
  code: string;
  label: string;
  state: boolean | null;
}

export interface DiscoveredDevice extends Record<string, unknown> {
  key: string;
  host: string;
  mac: string;
  ip: string;
  rssi: number | null;
  ports: Record<string, unknown>;
  outputs: DeviceOutput[];
  responded: boolean;
  receivedAt: number | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function stateValue(value: unknown): boolean | null {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

export function devicePorts(ports: unknown): DeviceOutput[] {
  if (!isObject(ports)) return [];
  const seen = new Set<number>();
  return Object.entries(ports).flatMap(([code, port], index) => {
    if (!isObject(port) || port.gpio === null || port.gpio === undefined || port.gpio === '') return [];
    const gpio = Number(port.gpio);
    if (!Number.isInteger(gpio) || gpio < 0 || gpio > 255 || seen.has(gpio)) return [];
    seen.add(gpio);
    return [{
      gpio, code,
      label: String(port.name || port.pumperName || `Output ${index + 1}`),
      state: stateValue(port.state),
    }];
  });
}

export function mergeDeviceDiscovery(information: unknown, previous: DiscoveredDevice[] = [], timestamp = Date.now()): DiscoveredDevice[] {
  if (!Array.isArray(information)) throw new Error('The server returned an invalid device list.');
  const known = new Map(previous.map(device => [device.key, { ...device, responded: false }]));
  for (const reply of information as unknown[]) {
    if (!isObject(reply)) continue;
    const host = String(reply.host || '').trim();
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(host)) continue;
    const mac = String(reply.mac || '').trim();
    const key = mac ? mac.toUpperCase() : host;
    const rssi = reply.rssi === null || reply.rssi === '' || reply.rssi === undefined ? null : Number(reply.rssi);
    const responded = reply.online !== false;
    const receivedAt = typeof reply.receivedAt === 'number' && Number.isFinite(reply.receivedAt)
      ? Math.min(reply.receivedAt, timestamp)
      : responded ? timestamp : null;
    known.set(key, {
      ...reply, key, host, mac, ip: String(reply.ip || ''),
      rssi: rssi !== null && Number.isFinite(rssi) && rssi <= 0 && rssi >= -150 ? rssi : null,
      ports: isObject(reply.ports) ? reply.ports : {},
      outputs: devicePorts(reply.ports), responded, receivedAt,
    });
  }
  return [...known.values()];
}

type DeviceConnection = Pick<DiscoveredDevice, 'responded' | 'receivedAt'>;
type DeviceSignal = Pick<DiscoveredDevice, 'rssi'>;
type Translate = (message: string, values?: { count: number }) => string;

export function isResponding(device: DeviceConnection | null | undefined, timestamp = Date.now()): boolean {
  return Boolean(device?.responded && device.receivedAt !== null && timestamp - device.receivedAt < 90000);
}

export const weakSignal = (device: DeviceSignal) => device.rssi !== null && device.rssi <= -75;
export function signalText(device: DeviceSignal) {
  return device.rssi === null ? 'Unknown' : `${device.rssi} dBm`;
}

export function lastSeenLabel(
  timestamp: number | null | undefined,
  current = Date.now(),
  translate: Translate = (message, values) => values ? message.replace('{count}', String(values.count)) : message,
) {
  if (!timestamp) return translate('Not observed');
  const seconds = Math.max(0, Math.floor((current - timestamp) / 1000));
  if (seconds < 5) return translate('Just now');
  if (seconds < 60) return translate('{count} sec ago', { count: seconds });
  if (seconds < 3600) return translate('{count} min ago', { count: Math.floor(seconds / 60) });
  return translate('{count} hr ago', { count: Math.floor(seconds / 3600) });
}
