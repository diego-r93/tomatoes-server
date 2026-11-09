import mongoose from 'mongoose';
import { connect } from 'mqtt';
import Board from '../database/mongodb/models/board.model';
import { approvedDeviceHosts } from './deviceRegistry';
import { mqttCredentials } from './config/mqtt.config';
import { encodeSchedule } from './schedulePayload';
import { createScheduleSync } from './scheduleSync';

const interval = 60 * 60 * 1000;
let sync: ReturnType<typeof createScheduleSync> | undefined;
const publishedTopics = () => mongoose.connection.collection<{ _id: string }>('mqtt_schedule_topics');

export async function scheduleVersions(hosts: string[]) {
  const codes = hosts.flatMap(host => ['01', '02', '03', '04'].map(output => host + '#' + output));
  const boards = await Board.find({ pumperCode: { $in: codes } }).lean();
  return Object.fromEntries(boards.flatMap(board => {
    const entry = encodeSchedule(board);
    return entry ? [[entry.code, entry.version]] : [];
  }));
}

export function queueScheduleSync(republish = false) {
  void sync?.request(republish);
}

export function startScheduleSync() {
  if (sync || !process.env.MQTT_HOST_NAME || process.env.MQTT_DEDICATED_BACKEND !== 'true') return;
  const client = connect(process.env.MQTT_HOST_NAME, { ...mqttCredentials(), protocolVersion: 5 });
  sync = createScheduleSync({
    get connected() { return client.connected; },
    async publishRetained(topic, payload) {
      await client.publishAsync(topic, payload, { qos: 1, retain: true });
    },
  }, {
    boards: () => Board.find().sort({ _id: 1 }).lean().exec(),
    approvedHosts: approvedDeviceHosts,
    async publishedTopics() {
      return (await publishedTopics().find().toArray()).map(({ _id }) => _id);
    },
    async rememberTopic(topic) {
      await publishedTopics().updateOne({ _id: topic }, { $setOnInsert: { _id: topic } }, { upsert: true });
    },
    async forgetTopic(topic) {
      await publishedTopics().deleteOne({ _id: topic });
    },
    warn: (message, detail) => console.warn(message, detail),
  });
  client.on('connect', () => queueScheduleSync(true));
  client.on('error', error => console.warn('MQTT schedule connection:', error.name));
  setInterval(() => queueScheduleSync(true), interval).unref();
  setInterval(() => { void sync?.retry(); }, 30000).unref();
}
