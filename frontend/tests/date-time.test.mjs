import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDateTime, formatDate, formatTime, formatDeviceTime, chartTimeLabel } from '../src/composables/dateTime.ts';
test('display timestamps use a stable 24-hour format and dashboard timezone', () => {
 assert.equal(formatDateTime('2026-11-03T02:04:05Z','UTC'),'2026-11-03 02:04:05');
 assert.equal(formatDateTime('2026-11-03T02:04:05Z','America/Sao_Paulo'),'2026-11-02 23:04:05');
 assert.equal(formatDate('2026-11-03T02:04:05Z','America/Sao_Paulo'),'2026-11-02');
 assert.equal(formatTime('2026-11-03T00:00:00Z','UTC'),'00:00:00');
 assert.equal(formatDateTime('2026-11-03 02:04:05','UTC'),'2026-11-03 02:04:05');
 assert.equal(formatDateTime(0,'UTC'),'1970-01-01 00:00:00');
 for (const value of [null,undefined,'','invalid']) assert.equal(formatDateTime(value,'UTC','Never'),'Never');
});
test('offset-free device timestamps do not assume the browser timezone', () => {
 assert.equal(formatDeviceTime('2026-11-03T02:04:05'),'2026-11-03 02:04:05 (device time)');
 assert.equal(formatDeviceTime('unknown'),'unknown (as reported)');
});

test('chart labels adapt to the visible time window without changing timezone', () => {
 const instant = '2026-11-03T02:04:05Z';
 for (const span of [60,3600,21600,86400]) {
  assert.equal(chartTimeLabel(instant,span,'UTC',true),'02:04:05');
  assert.equal(chartTimeLabel(instant,span,'America/Sao_Paulo'),'23:04:05');
 }
 for (const span of [172800,604800,2592000]) {
  assert.equal(chartTimeLabel(instant,span,'UTC',true),'02:04:05\n2026-11-03');
  assert.equal(chartTimeLabel(instant,span,'America/Sao_Paulo'),'2026-11-02 23:04:05');
 }
});
