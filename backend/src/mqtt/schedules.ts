import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { connect, MqttClient } from 'mqtt';
import Board, { IBoard } from '../database/mongodb/models/board.model';
import { approvedDeviceHosts } from './deviceRegistry';
import { mqttCredentials } from './config/mqtt.config';

const maxBytes = 3500;
const interval = 60 * 60 * 1000;
let client: MqttClient | undefined;
let pending = false;
let force = false;
let running = false;
const sent = new Map<string, string>();
const publishedTopics = () => mongoose.connection.collection<{ _id: string }>('mqtt_schedule_topics');

function schedule(board: Pick<IBoard, 'pumperCode' | 'pumperName' | 'pulseDuration' | 'driveTimes'>) {
  const match = /^([a-zA-Z0-9._-]{1,128})#(0[1-4])$/.exec(board.pumperCode);
  if (!match) return null;
  const [, host, output] = match;
  const document = {
    pumperCode: board.pumperCode,
    pumperName: board.pumperName,
    pulseDuration: board.pulseDuration,
    driveTimes: board.driveTimes.map(({ time, state }) => ({ time, state })),
  };
  const version = createHash('sha256').update(JSON.stringify(document)).digest('hex').slice(0, 32);
  return {
    host,
    topic: host + '/config/' + output,
    code: board.pumperCode,
    version,
    payload: JSON.stringify({ document: { ...document, version } }),
  };
}

export async function scheduleVersions(hosts: string[]) {
  const codes = hosts.flatMap(host => ['01', '02', '03', '04'].map(output => host + '#' + output));
  const boards = await Board.find({ pumperCode: { $in: codes } }).lean();
  return Object.fromEntries(boards.flatMap(board => {
    const entry = schedule(board);
    return entry ? [[entry.code, entry.version]] : [];
  }));
}

async function reconcile(active: MqttClient, republish: boolean) {
  const [boards, approved] = await Promise.all([Board.find().sort({ _id: 1 }).lean(), approvedDeviceHosts()]);
  const entries = new Map<string, NonNullable<ReturnType<typeof schedule>>>();
  for (const board of boards) {
    const entry = schedule(board);
    if (!entry || !approved.has(entry.host) || entries.has(entry.topic)) continue;
    entries.set(entry.topic, entry);
  }

  const ledger = publishedTopics();
  for (const { _id: topic } of await ledger.find().toArray()) {
    if (entries.has(topic)) continue;
    await active.publishAsync(topic, '', { qos: 1, retain: true });
    await ledger.deleteOne({ _id: topic });
    sent.delete(topic);
  }

  for (const { topic, payload } of entries.values()) {
    if (!republish && sent.get(topic) === payload) continue;
    if (Buffer.byteLength(payload) > maxBytes) {
      console.warn('MQTT schedule exceeds 3500 bytes:', topic);
      continue;
    }
    // Record the topic before publishing so a later deletion can be retried after a restart.
    await ledger.updateOne({ _id: topic }, { $setOnInsert: { _id: topic } }, { upsert: true });
    await active.publishAsync(topic, payload, { qos: 1, retain: true });
    sent.set(topic, payload);
  }
}

export function queueScheduleSync(republish = false) {
  pending = true;
  force ||= republish;
  if (!client?.connected || running) return;
  const active = client;
  running = true;
  void (async () => {
    try {
      while (pending && active.connected) {
        const publishAll = force;
        pending = force = false;
        await reconcile(active, publishAll);
      }
    } catch (error) {
      pending = force = true;
      console.warn('MQTT schedule sync will retry:', error instanceof Error ? error.name : 'Unknown error');
    } finally {
      running = false;
    }
  })();
}

export function startScheduleSync() {
  if (!process.env.MQTT_HOST_NAME || process.env.MQTT_DEDICATED_BACKEND !== 'true') return;
  client = connect(process.env.MQTT_HOST_NAME, { ...mqttCredentials(), protocolVersion: 5 });
  client.on('connect', () => queueScheduleSync(true));
  client.on('error', error => console.warn('MQTT schedule connection:', error.name));
  setInterval(() => queueScheduleSync(true), interval).unref();
  setInterval(() => { if (pending) queueScheduleSync(); }, 30000).unref();
}
