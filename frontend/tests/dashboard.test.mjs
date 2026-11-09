import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveQuery, alignRows, processingFor, processingError, buildQuery, chartDefinition } from '../src/composables/dashboardUtils.ts';
test('time macros are resolved without changing the saved query or parentheses', () => {
  const query='from(bucket: "tomatoes") |> range(start: v.timeRangeStart, stop: v.timeRangeStop) |> aggregateWindow(every: v.windowPeriod, fn: mean)';
  assert.equal(resolveQuery(query,'-1h','10s'),'from(bucket: "tomatoes") |> range(start: -1h, stop: now()) |> aggregateWindow(every: 10s, fn: mean)');
  assert.match(query,/v.timeRangeStart/);
  const fixed='from(bucket: "tomatoes") |> range(start: -2h, stop: now())';
  assert.equal(resolveQuery(fixed,'-1h','10s'),fixed);
});
test('separate tagged series align in time; null and text never become zero', () => {
  const rows=[{_time:'2026-11-02T00:00:02Z',_value:3,host:'a'},{_time:'2026-11-02T00:00:01Z',_value:1,host:'a'},{_time:'2026-11-02T00:00:01Z',_value:7,host:'b'},{_time:'2026-11-02T00:00:02Z',_value:'8',host:'b'}];
  const p=processingFor({processing:{multiplier:2,offset:1}}),aligned=alignRows(rows,p);
  assert.deepEqual(aligned.data.slice(1),[[3,7],[15,null]]);
  assert.equal(aligned.data[0][1]-aligned.data[0][0],1);
});
test('builder safely quotes names and converts before aggregation', () => {
  const query=buildQuery({bucket:'test"x',measurement:'mqtt_consumer',field:'value',tag:'topic',tagValue:'a"b',convertText:true,aggregation:'mean'});
  assert.match(query,/test\\"x/);assert(query.indexOf('float(')<query.indexOf('aggregateWindow'));
});
test('export retains chart options, query and layout, excluding live samples', () => {
  const original={id:0,data:[[1],[2]],options:{chartTitle:'pH',series:[{},{stroke:'rgb(184, 119, 217)'}]},layout:{x:0,y:0,w:4,h:10,i:'0'},query:'original Flux'};
  assert.deepEqual(chartDefinition(original),{...original,data:[]});assert.deepEqual(original.data,[[1],[2]]);
});
test('invalid processing is rejected and limits are ordered', () => {
  assert.equal(processingError({processing:processingFor({})}),'');
  assert.match(processingError({processing:{minimum:5,maximum:2}}),/minimum/);
  assert.match(processingError({processing:{multiplier:''}}),/finite/);
});
