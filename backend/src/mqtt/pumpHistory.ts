import mongoose from 'mongoose';
import { client, getHistoryBucket, historyRetentionSeconds, org, setHistoryRetention } from '../database/influxdb/config/influxdb';
import { approvedDeviceHosts } from './deviceRegistry';
import { HttpError } from '../users/types';
import { parseDriverEvent, Pulse, pulseResult, PumpDriverTracker, PumpState } from './pumpDriverState';

const daySeconds = 86400;
const pulseSettleMs = 5000;
const history = () => mongoose.connection.collection<PulseRecord>('pump_pulse_history');
const migrations = () => mongoose.connection.collection<HistoryMigration>('pump_history_migrations');
const archiveId = 'telemetry-v1';
let maintenance = Promise.resolve();

type PulseRecord = {
  _id: string;
  host: string;
  pump: string;
  at: Date;
  origin: 'recorded' | 'reconstructed';
  result: ReturnType<typeof pulseResult>;
} & Pulse;
type HistoryMigration = { _id: string; until: number; complete?: boolean };

function orderedMaintenance<T>(operation: () => Promise<T>) {
  const result = maintenance.then(operation);
  maintenance = result.then(() => {}, () => {});
  return result;
}

export async function readHistoryRetention() {
  const seconds = historyRetentionSeconds(await getHistoryBucket());
  return { days: seconds ? seconds / daySeconds : 0 };
}

export function updateHistoryRetention(days: unknown, previousDays: unknown, confirmed: unknown) {
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 3650) {
    throw new HttpError(400, 'Enter a retention period from 1 to 3650 days.');
  }
  return orderedMaintenance(async () => {
    const bucket = await getHistoryBucket();
    const current = historyRetentionSeconds(bucket);
    if ((current ? current / daySeconds : 0) !== previousDays) {
      throw new HttpError(409, 'The retention period changed. Reload the settings and try again.');
    }
    const seconds = days * daySeconds;
    if ((!current || seconds < current) && confirmed !== true) {
      throw new HttpError(400, 'Confirm that older records may be deleted.');
    }
    if (current !== seconds) await setHistoryRetention(bucket, seconds);
    return { days };
  });
}

function recordFor(code: string, pulse: Pulse, origin: PulseRecord['origin']): PulseRecord | undefined {
  const time = pulse.expectedAt ?? pulse.startAt ?? pulse.endAt;
  if (time == null) return;
  const [host, pump] = code.split('#');
  const result = pulse.startAt === null && pulse.expectedAt === undefined && pulse.endAt !== null
    ? 'incomplete'
    : pulseResult(pulse, Math.max(time, pulse.startAt ?? time) + pulseSettleMs);
  return { ...pulse, _id: code + ':' + time, host, pump, at: new Date(time), origin, result };
}

export async function savePumpHistory(code: string, pulse: Pulse, origin: PulseRecord['origin'] = 'recorded') {
  const record = recordFor(code, pulse, origin);
  if (!record) return;
  if (origin === 'recorded') {
    await history().replaceOne({ _id: record._id }, record, { upsert: true });
  } else {
    const { _id, origin: provenance, ...values } = record;
    await history().updateOne({ _id }, { $set: values, $setOnInsert: { origin: provenance } }, { upsert: true });
  }
}

async function insertArchived(records: PulseRecord[]) {
  if (!records.length) return;
  await history().bulkWrite(records.map(record => ({
    updateOne: { filter: { _id: record._id }, update: { $setOnInsert: record }, upsert: true },
  })), { ordered: false });
}

async function pruneHistory() {
  return orderedMaintenance(async () => {
    const { days } = await readHistoryRetention();
    if (days) await history().deleteMany({ at: { $lt: new Date(Date.now() - days * daySeconds * 1000) } });
  });
}

export async function pumpHistoryImported() {
  return Boolean((await migrations().findOne({ _id: archiveId }))?.complete);
}

async function backfill(states: ReadonlyMap<string, PumpState>) {
  const initial = [...states].flatMap(([code, state]) => [state.latest, ...state.history].flatMap(pulse => {
    const row = recordFor(code, pulse, 'recorded');
    return row ? [row] : [];
  }));
  await insertArchived(initial);
  if (await pumpHistoryImported()) return;
  const migration = await migrations().findOneAndUpdate(
    { _id: archiveId },
    { $setOnInsert: { until: Date.now() } },
    { upsert: true, returnDocument: 'after' },
  );
  if (!migration) throw new Error('Pulse history migration unavailable');

  const cutoff = new Map<string, number>();
  for await (const record of history().find({ origin: 'recorded', at: { $lt: new Date(migration.until) } }).sort({ at: 1 })) {
    const code = record.host + '#' + record.pump;
    if (!cutoff.has(code)) cutoff.set(code, record.at.getTime() - 2000);
  }
  const { days } = await readHistoryRetention();
  const bucket = JSON.stringify(process.env.DOCKER_INFLUXDB_INIT_BUCKET || 'tomatoes');
  const from = days ? Date.now() - days * daySeconds * 1000 : 0;
  const tracker = new PumpDriverTracker();
  const records: PulseRecord[] = [];
  const append = (code: string, pulse: Pulse) => {
    const row = recordFor(code, pulse, 'reconstructed');
    if (row) records.push(row);
  };
  const flush = () => insertArchived(records.splice(0));
  const queryApi = client.getQueryApi(org);
  const time = (ms: number) => JSON.stringify(new Date(ms).toISOString());
  const allowed = await approvedDeviceHosts();
  const week = from ? 7 * daySeconds * 1000 : migration.until;
  for (let start = from; start < migration.until; start += week) {
    const end = Math.min(start + week, migration.until);
    const query = `from(bucket:${bucket}) |> range(start: time(v:${time(start)}), stop: time(v:${time(end)}))
      |> filter(fn:(r)=>r._measurement=="pump_driver")
      |> keep(columns:["_time","_value","topic"])
      |> group() |> sort(columns:["_time"])`;
    for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
      const row = tableMeta.toObject(values) as {topic: string; _time: string; _value: unknown};
      const event = parseDriverEvent(row.topic, Buffer.from(String(row._value)), false, Date.parse(row._time));
      if (!event || !allowed.has(event.host)) continue;
      const code = event.host + '#' + event.pump;
      if (event.at >= (cutoff.get(code) ?? migration.until)) continue;
      const previous = tracker.states.get(code)?.latest;
      tracker.ingest(event);
      if (previous && previous !== tracker.states.get(code)?.latest) append(code, previous);
      if (records.length >= 500) await flush();
    }
  }
  for (const [code, state] of tracker.states) append(code, state.latest);
  await flush();
  await migrations().updateOne({ _id: archiveId }, { $set: { complete: true } });
}

export function startPumpHistory(states: ReadonlyMap<string, PumpState>) {
  const initialize = async () => {
    await history().createIndex({ host: 1, at: -1, _id: -1 });
    await history().createIndex({ at: 1 });
    try {
      await backfill(states);
    } finally {
      await pruneHistory();
    }
  };
  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    void initialize().catch(() => console.warn('Pulse history maintenance will retry.')).finally(() => { running = false; });
  };
  run();
  setInterval(run, 60 * 60 * 1000).unref();
}

const results = ['actuated', 'supply-missing', 'short', 'temperature', 'supply-low', 'not-actuated', 'missing', 'incomplete'] as const;
function validResult(value: unknown): value is (typeof results)[number] {
  return results.some(result => result === value);
}
export async function pulseHistoryCursor(host: string, query: Record<string, unknown>) {
  const from = typeof query.from === 'string' ? Date.parse(query.from) : NaN;
  const to = typeof query.to === 'string' ? Date.parse(query.to) : NaN;
  const pump = query.pump;
  const result = query.result;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to || (pump !== undefined && (typeof pump !== 'string' || !['01','02','03','04'].includes(pump)))
      || (result !== undefined && !validResult(result))) {
    throw new HttpError(400, 'Choose a valid date range, pump and result.');
  }
  const { days } = await readHistoryRetention();
  const minimum = days ? Date.now() - days * daySeconds * 1000 : 0;
  return history().find({
    host, ...(pump ? { pump: String(pump) } : {}), ...(result ? { result } : {}),
    at: { $gte: new Date(Math.max(from, minimum)), $lt: new Date(Math.min(to, Date.now() - pulseSettleMs)) },
  }).sort({ at: -1, _id: -1 });
}

const csvHeader = [
  'board', 'pump', 'expected_at_utc', 'start_at_utc', 'end_at_utc', 'result', 'source', 'origin',
  'start_active', 'start_fault', 'start_status', 'end_active', 'end_fault', 'end_status',
];

export async function* pumpHistoryCsv(cursor: Awaited<ReturnType<typeof pulseHistoryCursor>>) {
  const date = (at: number | null | undefined) => at == null ? '' : new Date(at).toISOString();
  const line = (fields: unknown[]) => fields.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',') + '\r\n';
  try {
    yield '\uFEFF' + line(csvHeader);
    for await (const row of cursor) {
      yield line([row.host, row.pump, date(row.expectedAt), date(row.startAt), date(row.endAt), row.result, row.source, row.origin,
        row.start.active, row.start.fault, row.start.status, row.end.active, row.end.fault, row.end.status]);
    }
  } finally {
    await cursor.close();
  }
}
