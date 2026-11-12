const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSetupTransport, setProbeLabel, validProbeLabel } = require('../src/mqtt/setupTransport');

const host = 'esp32s3-A00001';
const message = data => Buffer.from(JSON.stringify(data));

test('setup reply must match host, ID and operation and cannot be retained', async () => {
 const transport = createSetupTransport(1000);
 transport.setPublisher(async (topic, payload) => {
  const { id, op } = JSON.parse(payload);
  assert.equal(topic, host + '/setup/req');
  const reply = { id, op, ok: true, rev: 0, readback: { label: 'original' } };
  transport.receive('devices/esp32s3-B00001/setup', message(reply), false);
  transport.receive('devices/' + host + '/setup', message({ ...reply, id: 'old' }), false);
  transport.receive('devices/' + host + '/setup', message({ ...reply, op: 'ec.label.set' }), false);
  transport.receive('devices/' + host + '/setup', message({ ...reply, rev: -1 }), false);
  transport.receive('devices/' + host + '/setup', message({ ...reply, rev: 5 }), true);
  transport.receive('devices/' + host + '/setup', message(reply), false);
 });
 assert.equal((await transport.request(host, 'abc', 'setup.get')).rev, 0);
});

test('setup rejects concurrent requests to one board and cancels on disconnect', async () => {
 const transport = createSetupTransport(1000);
 transport.setPublisher(async () => {});
 const response = transport.request(host, 'a', 'setup.get');
 assert.throws(() => transport.request(host, 'b', 'setup.get'), { status: 409 });
 transport.setPublisher();
 await assert.rejects(response, { status: 503 });
 assert.throws(() => transport.request(host, 'c', 'setup.get'), { status: 503 });
});

test('setup saves only a current revision, verifies readback and reconciles a lost acknowledgement', async () => {
 const { HttpError } = require('../src/users/types');
 let current = { ok: true, rev: 8, readback: { label: 'old' } };
 const writes = [];
 const exchange = async (_id, op, rev, label) => {
  if (op === 'setup.get') return current;
  writes.push({ rev, label });
  current = { ok: true, rev: rev + 1, readback: { label } };
  throw new HttpError(504, 'reply timed out');
 };
 await assert.rejects(setProbeLabel(exchange, 'write', 7, 'new'), { status: 409 });
 assert.equal(writes.length, 0);
 const observed = await setProbeLabel(exchange, 'write', 8, 'new');
 assert.deepEqual(writes, [{ rev: 8, label: 'new' }]);
 assert.equal(observed.outcome, 'reconciled');
 assert.equal(observed.revision, 9);
 assert.equal((await setProbeLabel(exchange, 'write', 9, 'new')).outcome, 'unchanged');
 assert.equal(writes.length, 1);
 const lyingExchange = async (_id, op) => op === 'setup.get' ? current : { ok: true, rev: 10 };
 await assert.rejects(setProbeLabel(lyingExchange, 'write', 9, ''), { status: 504 });
});

test('label validation matches the firmware ASCII and whitespace rules', () => {
 for (const label of ['', 'EC-bancada-01', 'a'.repeat(32), 'EC "A"']) assert.equal(validProbeLabel(label), true);
 for (const label of ['a'.repeat(33), ' EC', 'EC ', 'EC\n', 'EC\t', 'sonda é', null, 2]) assert.equal(validProbeLabel(label), false);
});
