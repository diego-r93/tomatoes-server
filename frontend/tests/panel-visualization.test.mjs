import test from 'node:test';
import assert from 'node:assert/strict';
import { visualizationFor, visualizationError, gaugeReading, reduceSeries, gaugeColor, gaugeFraction, gaugeSegments, gaugeArc } from '../src/composables/panelVisualization.ts';
import { chartDefinition, alignRows, processingFor } from '../src/composables/dashboardUtils.ts';
const config = changes => visualizationFor({ visualization: { type: 'gauge', ...changes } });

test('legacy panels remain time series and JSON exports preserve gauge settings without live samples', () => {
  assert.equal(visualizationFor({}).type, 'time-series');
  assert.equal(visualizationError({}), '');
  const chart = { id: 1, visualization: config({ min: -20, max: 50 }), data: [[1],[27]] };
  const exported = chartDefinition(chart);
  assert.deepEqual(exported.data, []);
  assert.deepEqual(JSON.parse(JSON.stringify(exported)).visualization, chart.visualization);
  assert.deepEqual(chart.data, [[1],[27]]);
});

test('gauge reduction skips gaps, nonnumeric and nonfinite samples while retaining a valid zero', () => {
  const data = [[1,2,3,4,5,6,7], [10,null,'30',NaN,20,0,Infinity]];
  assert.deepEqual(gaugeReading(data, ['sensor'], config({})), { value: 0, timestamp: 6, label: 'sensor' });
  assert.equal(gaugeReading(data, ['sensor'], config({reducer:'mean'})).value, 10);
  assert.equal(gaugeReading(data, ['sensor'], config({reducer:'min'})).value, 0);
  assert.equal(gaugeReading(data, ['sensor'], config({reducer:'max'})).value, 20);
  assert.equal(gaugeReading([[1,2],[null,null]], ['sensor'], config({})).value, null);
  assert.equal(gaugeReading([[],[]], [], config({})).value, null);
});

test('a saved series follows its label across result ordering and never substitutes a missing or ambiguous series', () => {
  const selected = config({ series: 'cell=2' });
  assert.equal(gaugeReading([[1],[3.3],[3.4]], ['cell=1','cell=2'], selected).value, 3.4);
  assert.equal(gaugeReading([[1],[3.4],[3.3]], ['cell=2','cell=1'], selected).value, 3.4);
  assert.equal(gaugeReading([[1],[3.3]], ['cell=1'], selected).value, null);
  assert.equal(gaugeReading([[1],[3.3],[3.4]], ['cell=2','cell=2'], selected).value, null);
});

test('processing is applied once, while gauge scale only limits arc length and colors are inclusive', () => {
  const chart = { processing: {multiplier:2,offset:1} };
  const result = alignRows([{_time:'2026-11-08T12:00:00Z',_field:'value',_value:8}], processingFor(chart));
  assert.equal(gaugeReading(result.data,result.labels,config({})).value, 17);
  assert.equal(gaugeFraction(120,0,100), 1);
  assert.equal(gaugeFraction(-10,0,100), 0);
  assert.equal(gaugeFraction(null,0,100), 0);
  assert.equal(gaugeColor(79,config({})), '#73bf69');
  assert.equal(gaugeColor(80,config({})), '#f2cc0c');
  assert.equal(gaugeColor(90,config({})), '#f2495c');
  assert.deepEqual(gaugeSegments(config({min:85,max:95})).map(item=>item.color), ['#f2cc0c','#f2495c']);
  assert.equal(gaugeArc(0,0), '');
  assert.ok(!gaugeArc(0,1).includes('NaN'));
});

test('invalid scales, calculations, colors and thresholds are rejected without affecting legacy panels', () => {
  for (const change of [{min:2,max:2},{min:NaN},{min:-1e308,max:1e308},{reducer:'sum'},{color:'red'},{showThresholds:'yes'},{thresholds:[{value:90,color:'#ff0000'},{value:80,color:'#ffff00'}]},{thresholds:[{value:null,color:'#ff0000'}]},{series:4}]) assert.ok(visualizationError({visualization:config(change)}), JSON.stringify(change));
  assert.ok(visualizationError({visualization:{type:'unknown'}}));
  assert.equal(visualizationError({visualization:config({thresholds:[]})}), '');
});

test('bar gauges reduce each series independently and tables have validated defaults', () => {
  const data = [[1, 2, 3], [1, null, 5], [10, 0, null]];
  const bar = config({ type: 'bar-gauge', orientation: 'vertical', reducer: 'mean' });
  assert.equal(visualizationError({ visualization: bar }), '');
  assert.deepEqual(['cell', 'cell'].map((_, index, labels) => reduceSeries(data, labels, bar, index).value), [3, 5]);
  assert.ok(visualizationError({ visualization: { ...bar, orientation: 'diagonal' } }));
  assert.equal(visualizationFor({ visualization: { type: 'table' } }).pageSize, 25);
  assert.equal(visualizationError({ visualization: { type: 'table', tableOrder: 'oldest' } }), '');
  assert.ok(visualizationError({ visualization: { type: 'table', pageSize: 500 } }));
});
