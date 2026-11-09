import mongoose from 'mongoose';
import { savePumpHistory, startPumpHistory } from './pumpHistory';
import Board from '../database/mongodb/models/board.model';
import { approvedDeviceHosts, deviceAdmission } from './deviceRegistry';
import { PumpDriverTracker, PumpState, parseDriverEvent, recentlyDue } from './pumpDriverState';

const tracker = new PumpDriverTracker();
const collection = () => mongoose.connection.collection<PumpState & { _id: string }>('pump_driver_state');
let ready: Promise<void> | undefined;
const queues = new Map<string, Promise<void>>();
const observed = new Map<string, { at: number; outputs: Map<string, boolean> }>();
let schedules: { pumperCode: string; driveTimes: {time: string; state: boolean}[] }[] = [];
const started = Date.now();

function enqueue(code: string, operation: () => Promise<void>) {
  if (mongoose.connection.readyState !== 1) return Promise.resolve();
  const next = (queues.get(code) ?? Promise.resolve()).then(async () => { await ready; await operation(); }).catch(error => {
    console.warn('Pump driver observation failed:', error instanceof Error ? error.name : 'Unknown error');
  });
  queues.set(code, next);
  void next.finally(() => { if (queues.get(code) === next) queues.delete(code); });
  return next;
}
async function persist(code: string) {
  const state = tracker.states.get(code);
  if (state) await collection().updateOne({ _id: code }, { $set: { code: state.code, latest: state.latest, history: state.history, lastObservedAt: state.lastObservedAt } }, { upsert: true });
}
export function expectPumpPulse(code: string, at: number, source: string) {
  if (!/^esp32[A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]{0,100}#0[1-4]$/.test(code)) return Promise.resolve();
  return enqueue(code, async () => { if (tracker.expect(code, at, source)) {
    await persist(code);
    await savePumpHistory(code, tracker.states.get(code)!.latest);
  } });
}
export async function observePumpDriver(topic: string, payload: Buffer, retained: boolean, at = Date.now()) {
  const event = parseDriverEvent(topic, payload, retained, at);
  if (!event || mongoose.connection.readyState !== 1) return;
  return enqueue(event.host + '#' + event.pump, async () => {
    if (await deviceAdmission(event.host) !== 'approved') return;
    const code = event.host + '#' + event.pump;
    if (tracker.ingest(event)) {
      await persist(code);
      await savePumpHistory(code, tracker.states.get(code)!.latest);
    }
  });
}
export async function observePumpOutputs(host: string, ports: unknown, at: number) {
  if (!ports || typeof ports !== 'object' || mongoose.connection.readyState !== 1) return;
  const old = observed.get(host);
  const outputs = new Map<string, boolean>();
  for (const [code, port] of Object.entries(ports as Record<string, {state: unknown}>)) {
    if (!code.startsWith(host + '#') || !/#0[1-4]$/.test(code)) continue;
    const on = [true, 1, '1', 'true'].includes(port.state as never);
    outputs.set(code, on);
    // A first report or a reconnect is not evidence of a new rising edge.
    const pulse = tracker.states.get(code)?.latest;
    const matchingStart = pulse?.startAt != null && old && pulse.startAt >= old.at;
    if (on && old && at - old.at < 90000 && old.outputs.get(code) === false && !matchingStart) await expectPumpPulse(code, at, 'reported-output');
  }
  observed.set(host, { at, outputs });
}
export async function pumpDriverSnapshots(hosts?: string[]) {
  if (mongoose.connection.readyState !== 1) return [];
  await ready;
  const allowed = await approvedDeviceHosts();
  return (hosts ?? [...allowed]).filter(host => allowed.has(host)).map(host => ({ host,
    pumps: ['01','02','03','04'].map(pump => tracker.snapshot(host + '#' + pump)) }));
}
async function initialize() {
  for (const row of await collection().find().toArray()) tracker.states.set(row.code, row);
  startPumpHistory(structuredClone(tracker.states));
  // Replay actual arrival timestamps from the existing sensor history, not fake test messages.
  const cutoff = new Map([...tracker.states].map(([code, state]) => [code, state.lastObservedAt]));
  try {
    const { client, org } = await import('../database/influxdb/config/influxdb.js');
    const allowed = await approvedDeviceHosts();
    const bucket = JSON.stringify(process.env.DOCKER_INFLUXDB_INIT_BUCKET || 'tomatoes');
    const rows = await client.getQueryApi(org).collectRows<{topic:string;_time:string;_value:unknown}>(
      `from(bucket:${bucket}) |> range(start:-24h) |> filter(fn:(r)=>r._measurement=="pump_driver") |> group() |> sort(columns:["_time"],desc:true) |> limit(n:20000) |> sort(columns:["_time"])`);
    const changed = new Set<string>();
    for (const row of rows) {
      const event = parseDriverEvent(row.topic, Buffer.from(String(row._value)), false, Date.parse(row._time));
      if (!event || !allowed.has(event.host)) continue;
      const code = event.host + '#' + event.pump;
      if (event.at <= (cutoff.get(code) ?? -Infinity)) continue;
      const previous = tracker.states.get(code)?.latest;
      if (tracker.ingest(event)) {
        changed.add(code);
        if (previous && previous !== tracker.states.get(code)?.latest) {
          await savePumpHistory(code, previous, 'reconstructed');
        }
      }
    }
    for (const code of changed) {
      await persist(code);
      await savePumpHistory(code, tracker.states.get(code)!.latest, 'reconstructed');
    }
  } catch (error) { console.warn('Pump driver history replay unavailable:', error instanceof Error ? error.name : 'Unknown error'); }
}
export async function startPumpDriverTracking() {
  ready = initialize().catch(error => { console.warn('Pump driver state restore failed:', error instanceof Error ? error.name : 'Unknown error'); });
  await ready;
  const timezone = process.env.PUMP_SCHEDULE_TIMEZONE || 'America/Sao_Paulo';
  new Intl.DateTimeFormat('en', { timeZone: timezone });
  const reload = async () => { schedules = await Board.find().select('pumperCode driveTimes').lean(); };
  await reload();
  const refresh = setInterval(() => { void reload().catch(() => console.warn('Pump schedule observation will retry')); }, 15000);
  const tick = setInterval(() => {
    for (const schedule of schedules) {
      const device = observed.get(schedule.pumperCode.split('#')[0]);
      if (!device || Date.now() - device.at >= 90000) continue;
      for (const at of recentlyDue(schedule.driveTimes, Date.now(), timezone, started)) void expectPumpPulse(schedule.pumperCode, at, 'schedule');
    }
  }, 1000);
  refresh.unref();tick.unref();
}
