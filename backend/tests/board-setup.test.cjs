const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clearPhCalibration, createSetupTransport, parseEcParameters, parsePhCalibration, readSetup, setEcParameters, setPhCalibration, setProbeLabel, validProbeLabel } = require('../src/mqtt/setupTransport');

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
 const exchange = async (_id, op, rev, args) => {
  if (op === 'setup.get') return current;
  const { label } = args;
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

test('EC edits validate wire values and verify omitted fields stayed unchanged', async () => {
 const initial = { label: 'probe', k: 1, alpha: 0.0214, tdsFactor: 0.47 };
 const sent = [];
 let current = { ok: true, rev: 0, readback: initial };
 const exchange = async (_id, op, rev, args) => {
  if (op === 'setup.get') return current;
  assert.equal(op, 'ec.params.set');
  sent.push(args);
  current = { ok: true, rev: rev + 1, readback: { ...initial, ...args } };
  return current;
 };
 for (const invalid of [{}, [], null, { k: '1.05' }, { k: 20 }, { alpha: 0.021401 }, { tdsFactor: 0.95 }, { other: 1 }]) {
  assert.throws(() => parseEcParameters(invalid), { status: 400 });
 }
 assert.deepEqual(parseEcParameters({ k: 0.01, alpha: 0, tdsFactor: 0.9 }), { k: 0.01, alpha: 0, tdsFactor: 0.9 });
 await assert.rejects(setEcParameters(exchange, 'write', 1, { k: 1.05 }), { status: 409 });
 assert.equal((await setEcParameters(exchange, 'write', 0, { k: 1 })).outcome, 'unchanged');
 const observed = await setEcParameters(exchange, 'write', 0, { k: 1.05 });
 assert.deepEqual(sent, [{ k: 1.05 }]);
 assert.equal(observed.outcome, 'verified');
 assert.equal(observed.cellConstant, 1.05);
 assert.equal(observed.temperatureCoefficient, 0.0214);
 assert.equal(observed.tdsFactor, 0.47);
 const inconsistentExchange = async (_id, op) => {
  if (op === 'setup.get') return current;
  current = { ok: true, rev: 2, readback: { ...initial, k: 1.05, alpha: 0.02, tdsFactor: 0.5 } };
  return current;
 };
 await assert.rejects(setEcParameters(inconsistentExchange, 'write', 1, { alpha: 0.02 }), { status: 504 });
});

test('pH requires all coefficients and confirms set and clear through independent readback', async () => {
 const coefficients = { off: -12.5, acid: 0.97, base: 0.95 };
 assert.deepEqual(parsePhCalibration(coefficients), coefficients);
 for (const invalid of [{ off: 0, acid: 1 }, { ...coefficients, extra: 1 }, { ...coefficients, off: 40 },
  { ...coefficients, acid: 1.2 }, { ...coefficients, off: 0.001 }, { ...coefficients, base: '0.95' }]) {
  assert.throws(() => parsePhCalibration(invalid), { status: 400 });
 }
 let rev = 4;
 let readback = { label: '', phCalibrated: false };
 const sent = [];
 const exchange = async (_id, op, revision, args) => {
  if (op === 'setup.get') return { ok: true, rev, readback };
  assert.equal(revision, rev);
  sent.push({ op, args });
  readback = op === 'ph.cal.set'
   ? { label: '', phCalibrated: true, ph: args }
   : { label: '', phCalibrated: false };
  return { ok: true, rev: ++rev };
 };
 assert.equal((await readSetup(exchange)).ph, null);
 await assert.rejects(setPhCalibration(exchange, 'test', 3, coefficients), { status: 409 });
 const saved = await setPhCalibration(exchange, 'test', 4, coefficients);
 assert.equal(saved.revision, 5);
 assert.equal(saved.outcome, 'verified');
 assert.deepEqual(saved.ph, coefficients);
 const cleared = await clearPhCalibration(exchange, 'test-clear', 5);
 assert.equal(cleared.revision, 6);
 assert.equal(cleared.phCalibrated, false);
 assert.equal(cleared.ph, null);
 assert.equal((await clearPhCalibration(exchange, 'test-clear', 6)).outcome, 'unchanged');
 assert.deepEqual(sent, [{ op: 'ph.cal.set', args: coefficients }, { op: 'ph.cal.clear', args: undefined }]);
});
