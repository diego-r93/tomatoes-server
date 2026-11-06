import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, rangeBounds, rangeWindow, timeInput } from '../src/composables/dashboardTimeRange.mjs';
import { resolveQuery } from '../src/composables/dashboardUtils.mjs';
const now = Date.parse('2026-11-02T15:00:00Z');
test('relative bounds share an anchor and preserve existing quick Flux ranges', () => {
  assert.equal(parseTime('now-90m', 'UTC', now), now - 5400000);
  assert.equal(parseTime('now+30s', 'UTC', now), now + 30000);
  assert.equal(resolveQuery('range(start: v.timeRangeStart, stop: v.timeRangeStop) |> aggregateWindow(every: v.windowPeriod)', '-6h', '30s', 'UTC', now), 'range(start: -6h, stop: now()) |> aggregateWindow(every: 30s)');
  const result = rangeBounds({from:'now-90m',to:'now-15m'},'UTC',now);
  assert.equal(result.startISO,'2026-11-02T13:30:00.000Z');assert.equal(result.stopISO,'2026-11-02T14:45:00.000Z');
});
test('absolute calendar values use dashboard timezone and accept explicit UTC offsets', () => {
  assert.equal(new Date(parseTime('2026-11-02 08:00:00','America/Sao_Paulo')).toISOString(),'2026-11-02T11:00:00.000Z');
  assert.equal(new Date(parseTime('2026-11-02T08:00:00-03:00','UTC')).toISOString(),'2026-11-02T11:00:00.000Z');
  assert.equal(new Date(parseTime('2026-11-02T11:00:00Z','America/Sao_Paulo')).toISOString(),'2026-11-02T11:00:00.000Z');
  assert.equal(timeInput(now,'America/Sao_Paulo'),'2026-11-02T12:00:00');
  assert.equal(new Date(parseTime('2026-11-02 08:00:00.125','America/Sao_Paulo')).toISOString(),'2026-11-02T11:00:00.125Z');
});
test('custom Flux uses validated time literals for both endpoints', () => {
  const query = resolveQuery('range(start: v.timeRangeStart, stop: v.timeRangeStop)', {from:'2026-11-02 08:00',to:'2026-11-02 10:30'}, '15s','America/Sao_Paulo',now);
  assert.equal(query,'range(start: time(v: "2026-11-02T11:00:00.000Z"), stop: time(v: "2026-11-02T13:30:00.000Z"))');
});
test('invalid dates, inverted bounds, nonexistent DST times and Flux injection are rejected', () => {
  for(const value of ['2026-02-30 08:00','2026-11-02 24:00','now-1M','now-1h); die()', '2026-11-02T10:00:00+24:00'])assert.throws(()=>parseTime(value,'UTC',now));
  assert.throws(()=>rangeBounds({from:'now',to:'now-1h'},'UTC',now),/earlier/);
  assert.throws(()=>parseTime('2026-03-08 02:30:00','America/New_York'),/does not exist/);
  assert.equal(new Date(parseTime('2026-03-08 03:30:00','America/New_York')).toISOString(),'2026-03-08T07:30:00.000Z');
});
test('custom aggregation window scales with the requested duration', () => {
  assert.equal(rangeWindow({from:'2026-11-02T08:00:00Z',to:'2026-11-02T08:10:00Z'},'UTC'),'1s');
  assert.equal(rangeWindow({from:'now-2h',to:'now'},'UTC'),'15s');
  assert.equal(rangeWindow({from:'now-180d',to:'now'},'UTC'),'24h');
});
