import { test } from 'node:test';
import assert from 'node:assert/strict';
import { devicePorts, isResponding, mergeDeviceDiscovery, weakSignal } from '../src/composables/deviceInventoryUtils.ts';

test('normalizes reported output states without guessing unknown values or creating duplicate GPIOs', () => {
  const ports = devicePorts({ a: { gpio: 4, state: false }, b: { gpio: 5, state: '1' }, c: { gpio: 6, state: 'unknown' }, duplicate: { gpio: 4, state: true }, invalid: { gpio: null, state: true } });
  assert.deepEqual(ports.map(port => [port.gpio, port.state]), [[4, false], [5, true], [6, null]]);
});
test('deduplicates replies by hardware identity, updates data and keeps missing known devices as not seen', () => {
  const previous = mergeDeviceDiscovery([{ host: 'esp32s3-A', mac: 'aa:bb', rssi: -45, ports: {} }, { host: 'esp32s3-B', mac: 'cc:dd', rssi: -76, ports: {} }], [], 1000);
  const current = mergeDeviceDiscovery([{ host: 'esp32s3-A', mac: 'AA:BB', ip: '192.168.1.12', ports: {} }, { host: 'esp32s3-A', mac: 'AA:BB', ip: '192.168.1.13', ports: {} }], previous, 2000);
  assert.equal(current.length, 2); assert.equal(current[0].ip, '192.168.1.13'); assert.equal(current[1].responded, false); assert.equal(previous[1].responded, true);
  assert.equal(isResponding(current[0], 91999), true); assert.equal(isResponding(current[0], 92000), false); assert.equal(isResponding(current[1], 2000), false);
});
test('malformed responses cannot silently replace the inventory or invent device data', () => {
  assert.throws(() => mergeDeviceDiscovery(undefined), /invalid device list/);
  assert.deepEqual(mergeDeviceDiscovery([{ host: '../invalid/#' }, null]), []);
  const [unknown] = mergeDeviceDiscovery([{ host: 'esp32s3-A', rssi: null, ports: {} }]);
  assert.equal(unknown.rssi, null); assert.equal(weakSignal(unknown), false);
  assert.equal(weakSignal({ rssi: -75 }), true);
});

test('keeps offline registration visible and preserves metadata without inventing network or GPIO data', () => {
  const [offline] = mergeDeviceDiscovery([
    { host: 'esp32s3-A', online: false, receivedAt: null, ports: 'invalid', model: 'N16R8V' },
  ], [], 1000);
  assert.equal(offline.host, 'esp32s3-A');
  assert.equal(offline.model, 'N16R8V');
  assert.equal(offline.receivedAt, null);
  assert.equal(isResponding(offline, 1000), false);
  assert.deepEqual(offline.ports, {});
  assert.deepEqual(offline.outputs, []);
});
