import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { HttpError } from '../users/types';
import { access, run } from '../users/database';
import Board from '../database/mongodb/models/board.model';

type RegistrationStatus = 'pending' | 'approved' | 'removed';
type Metadata = { model?: string; fw?: string; psramMB?: number; auth?: string };
type Registration = Metadata & {
  _id: string; host: string; status: RegistrationStatus; online: boolean;
  firstSeen: Date | null; lastSeen: Date | null;
  approvedAt?: Date; approvedBy?: string;
  removedAt?: Date; removedBy?: string; restoredAt?: Date; restoredBy?: string;
  factoryAuthenticated?: boolean;
  report?: Record<string, unknown>; reportAt?: Date;
};
const registry = () => mongoose.connection.collection<Registration>('device_registry');
const hostname = /^esp32[A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/;

export function isFactoryHostname(host: unknown): host is string {
  return typeof host === 'string' && hostname.test(host);
}

export async function deviceAdmission(host: string): Promise<RegistrationStatus> {
  const row = await registry().findOne({ _id: host }, { projection: { status: 1 }, maxTimeMS: 2000 });
  if (!row) return 'pending';
  return row.status === 'approved' || row.status === 'pending' ? row.status : 'removed';
}

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

export async function recordFactoryConnection(host: string) {
  await ensureRegistered(host, new Date());
  await registry().updateOne({ _id: host, status: { $ne: 'removed' } }, {
    $set: { factoryAuthenticated: true, auth: 'certificate' },
  });
}

const changing = new Set<string>();
export async function changeRegistration(host: string, action: unknown, operator: string) {
  if (!isFactoryHostname(host) || !['approve', 'reject', 'remove', 'restore'].includes(String(action))) {
    throw new HttpError(400, 'Invalid device registration action.');
  }
  if (changing.has(host)) throw new HttpError(409, 'A registration change is already in progress.');
  changing.add(host);
  try {
    const row = await registry().findOne({ _id: host });
    if (!row) throw new HttpError(404, 'Board registration was not found.');
    if (action === 'restore') {
      if (row.status !== 'removed') throw new HttpError(409, 'Only removed boards can be restored.');
      const restored = await registry().updateOne({ _id: host, status: 'removed' }, {
        $set: { status: 'pending', online: false, lastSeen: null, factoryAuthenticated: false, restoredAt: new Date(), restoredBy: operator },
        $unset: { report: '', reportAt: '' },
      });
      if (!restored.matchedCount) throw new HttpError(409, 'The board registration has changed. Refresh and try again.');
      return;
    }
    if (!row.factoryAuthenticated) throw new HttpError(409, 'This board has not authenticated with a factory certificate.');
    const target = action === 'approve' ? 'approved' : 'removed';
    if (row.status !== target) {
      const expected = action === 'remove' ? 'approved' : 'pending';
      if (row.status !== expected) throw new HttpError(409, 'The board registration has changed. Refresh and try again.');
      if (target === 'approved') {
        for (const output of ['01', '02', '03', '04']) {
          const pumperCode = host + '#' + output;
          const id = new mongoose.Types.ObjectId(createHash('sha256').update('tomatoes-pump:' + pumperCode).digest('hex').slice(0, 24));
          await Board.updateOne({ pumperCode }, { $setOnInsert: {
            _id: id, pumperCode, pumperName: 'Output ' + Number(output), pulseDuration: 60000, driveTimes: [],
          } }, { upsert: true, timestamps: false });
        }
      }
      const result = await registry().updateOne({ _id: host, status: expected }, { $set: target === 'approved'
        ? { status: target, approvedAt: new Date(), approvedBy: operator }
        : { status: target, online: false, removedAt: new Date(), removedBy: operator },
      });
      if (!result.matchedCount) throw new HttpError(409, 'The board registration has changed. Refresh and try again.');
    }
    if (target === 'removed') await access(() => run('DELETE FROM alert_devices WHERE host=?', [host]));
  } finally {
    changing.delete(host);
  }
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
  if (data.online) await ensureRegistered(host, at);
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
  return row?.status === 'approved';
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
  const rows = await registry().find().sort({ host: 1 }).toArray();
  return rows.map(({ _id, report, reportAt, ...entry }) => entry);
}
