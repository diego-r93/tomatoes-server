const assert = require('node:assert/strict');
const { test } = require('node:test');
const { encodeSchedule } = require('../src/mqtt/schedulePayload');
const { createScheduleSync } = require('../src/mqtt/scheduleSync');

const board = {
  pumperCode: 'esp32s3-A00001#01',
  pumperName: 'Bench',
  pulseDuration: 1000,
  driveTimes: [{ time: '07:30:00', state: true }],
};

test('schedule encoding keeps the firmware topic, document and legacy version', () => {
  const encoded = encodeSchedule({ ...board, ignored: true });
  assert.equal(encoded.topic, 'esp32s3-A00001/config/01');
  assert.equal(encoded.version, '22ebf0d2b590cdb0e8eadc1acc430d9e');
  assert.deepEqual(JSON.parse(encoded.payload), { document: { ...board, version: encoded.version } });
  assert.equal(encodeSchedule({ ...board, pumperCode: 'esp32s3-A00001#05' }), null);
  assert.notEqual(encodeSchedule({ ...board, pulseDuration: 2000 }).version, encoded.version);
});

function fixture() {
  const events = [], known = new Set();
  const state = { boards: [board], approved: new Set(['esp32s3-A00001']), connected: false, fail: false };
  const sync = createScheduleSync({
    get connected() { return state.connected; },
    async publishRetained(topic, payload) {
      if (state.fail) throw new Error('Lost connection');
      events.push(['publish', topic, payload]);
    },
  }, {
    boards: async () => state.boards,
    approvedHosts: async () => state.approved,
    publishedTopics: async () => [...known],
    async rememberTopic(topic) { events.push(['remember', topic]); known.add(topic); },
    async forgetTopic(topic) { events.push(['forget', topic]); known.delete(topic); },
    warn: (message, detail) => events.push(['warn', message, detail]),
  });
  return { sync, state, events, known };
}

test('sync waits offline, deduplicates sent schedules and clears removed topics', async () => {
  const { sync, state, events, known } = fixture();
  const { topic, payload } = encodeSchedule(board);
  await sync.request();
  assert.deepEqual(events, []);
  state.connected = true;
  await sync.retry();
  assert.deepEqual(events.splice(0), [['remember', topic], ['publish', topic, payload]]);
  await sync.request();
  assert.deepEqual(events, []);
  await sync.request(true);
  assert.deepEqual(events.splice(0), [['remember', topic], ['publish', topic, payload]]);
  state.approved.clear();
  await sync.request();
  assert.deepEqual(events, [['publish', topic, ''], ['forget', topic]]);
  assert.equal(known.size, 0);
});

test('failed publish retains the cleanup record and the newest saved schedule is retried', async () => {
  const { sync, state, events, known } = fixture();
  const { topic } = encodeSchedule(board);
  state.connected = true;
  state.fail = true;
  await sync.request();
  assert.deepEqual([...known], [topic]);
  assert.deepEqual(events.map(([kind]) => kind), ['remember', 'warn']);
  state.fail = false;
  state.boards = [{ ...board, pulseDuration: 2000 }];
  await sync.retry();
  assert.deepEqual(events.at(-1), ['publish', topic, encodeSchedule(state.boards[0]).payload]);
});

test('oversized UTF-8 schedules are skipped and duplicate topics keep the first approved record', async () => {
  const { sync, state, events } = fixture();
  state.connected = true;
  state.boards = [
    { ...board, pumperName: 'é'.repeat(1800) },
    board,
    { ...board, pumperCode: 'unapproved#01' },
  ];
  await sync.request();
  assert.deepEqual(events, [['warn', 'MQTT schedule exceeds 3500 bytes:', encodeSchedule(board).topic]]);
});
