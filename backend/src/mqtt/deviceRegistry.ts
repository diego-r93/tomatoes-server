import mongoose from 'mongoose';
import Board from '../database/mongodb/models/board.model';

type RegistrationStatus = 'pending' | 'approved' | 'removed';
type Metadata = { model?: string; fw?: string; psramMB?: number; auth?: string };
type Registration = Metadata & {
  _id: string; host: string; status: RegistrationStatus; online: boolean;
  firstSeen: Date | null; lastSeen: Date | null;
  approvedAt?: Date; approvedBy?: string;
  report?: Record<string, unknown>; reportAt?: Date;
};
const registry = () => mongoose.connection.collection<Registration>('device_registry');
const hostname = /^esp32[A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/;

function metadata(report: Record<string, unknown>): Metadata {
  const result: Metadata = {};
  for (const key of ['model', 'fw', 'auth'] as const) {
    const value = report[key];
    if (typeof value === 'string' && value.length > 0 && value.length <= 100) result[key] = value;
  }
  const memory = report.psramMB;
  if (typeof memory === 'number' && Number.isFinite(memory) && memory >= 0 && memory <= 128) result.psramMB = memory;
  return result;
}

export async function migrateRegisteredDevices() {
  const codes = await Board.distinct('pumperCode');
  const hosts = new Set(codes.map(code => code.split('#')[0]).filter(host => hostname.test(host)));
  const migration = mongoose.connection.collection<{ _id: string }>('device_registry_migrations');
  if (await migration.findOne({ _id: 'installed-boards-v1' })) return;
  for (const host of hosts) {
    await registry().updateOne({ _id: host }, { $setOnInsert: {
      host, status: 'approved', approvedAt: new Date(), approvedBy: 'migration',
      online: false, firstSeen: null, lastSeen: null,
    } }, { upsert: true });
  }
  await migration.updateOne({ _id: 'installed-boards-v1' }, { $setOnInsert: { _id: 'installed-boards-v1' } }, { upsert: true });
}

async function ensureRegistered(host: string, at: Date) {
  try {
    await registry().updateOne({ _id: host }, { $setOnInsert: {
      host, status: 'pending', online: false, firstSeen: at, lastSeen: null,
    } }, { upsert: true });
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
  }
}

export async function observeDeviceStatus(topic: string, payload: Buffer, retained: boolean, time = Date.now()) {
  const host = topic.split('/')[0];
  if (!hostname.test(host) || topic !== host + '/status' || payload.length > 4096) return;
  let data: Record<string, unknown>;
  try { data = JSON.parse(payload.toString()); } catch { return; }
  if (typeof data?.online !== 'boolean') return;
  const at = new Date(time);
  await ensureRegistered(host, at);
  if (retained) {
    // A replay can identify a new board, but does not refresh an old observation.
    await registry().updateOne({ _id: host, status: { $ne: 'removed' }, lastSeen: null }, {
      $set: { ...metadata(data), online: data.online, firstSeen: at, lastSeen: at },
    });
    return;
  }
  await registry().updateOne({ _id: host, status: { $ne: 'removed' }, $or: [{ lastSeen: null }, { lastSeen: { $lte: at } }] }, [
    { $set: { ...Object.fromEntries(Object.entries(metadata(data)).map(([key, value]) => [key, { $literal: value }])),
      online: data.online, firstSeen: { $ifNull: ['$firstSeen', at] }, lastSeen: at } },
  ]);
}

export async function observeDeviceDiscovery(host: string, data: Record<string, unknown>, time: number) {
  if (!hostname.test(host)) return false;
  const at = new Date(time);
  await ensureRegistered(host, at);
  const row = await registry().findOneAndUpdate({
    _id: host, status: { $ne: 'removed' }, $or: [{ lastSeen: null }, { lastSeen: { $lte: at } }],
  }, [{ $set: {
    ...Object.fromEntries(Object.entries(metadata(data)).map(([key, value]) => [key, { $literal: value }])),
    online: true, firstSeen: { $ifNull: ['$firstSeen', at] }, lastSeen: at,
    report: { $literal: data }, reportAt: at,
  } }], { returnDocument: 'after' });
  return row.value?.status === 'approved';
}

export async function approvedDeviceHosts() {
  return new Set(await registry().distinct('host', { status: 'approved' }));
}

export async function installedDeviceInventory(connected: boolean, processStarted: number) {
  const now = Date.now();
  const entries = await registry().find({ status: 'approved' }).sort({ host: 1 }).toArray();
  return entries.map(entry => {
    const receivedAt = entry.reportAt?.getTime() ?? null;
    const online = Boolean(connected && entry.online && receivedAt !== null &&
      receivedAt >= processStarted && now - receivedAt < 90000);
    return { ...entry.report, host: entry.host, model: entry.model, fw: entry.fw,
      psramMB: entry.psramMB, auth: entry.auth, receivedAt, online };
  });
}

export async function listRegisteredDevices() {
  const rows = await registry().find({ status: { $ne: 'removed' } }).sort({ host: 1 }).toArray();
  return rows.map(({ _id, report, reportAt, ...entry }) => entry);
}
