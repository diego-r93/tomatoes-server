import test from 'node:test';
import assert from 'node:assert/strict';
import { statReading, statUnit, statFreshness, statSparkline } from '../src/composables/statVisualization.ts';
import { visualizationFor, visualizationError, gaugeColor } from '../src/composables/panelVisualization.ts';
import { chartDefinition, alignRows, processingFor } from '../src/composables/dashboardUtils.ts';
const config = changes => visualizationFor({visualization:{type:'stat',...changes}});
test('Stat reducers use valid samples, preserve zero and never substitute a selected series', () => {
 const data=[[1,2,3,4,5,6],[10,null,20,NaN,0,Infinity]];
 for(const [reducer,expected] of [['last',0],['mean',10],['min',0],['max',20]]) assert.equal(statReading(data,['value'],config({reducer})).value,expected);
 assert.deepEqual(statReading(data,['value'],config({})),{value:0,timestamp:5,label:'value'});
 assert.equal(statReading(data,['value'],config({series:'absent'})).value,null);
 assert.equal(statReading([[1],[5],[8]],['same','same'],config({series:'same'})).value,null);
 assert.equal(statReading([[1],[null]],['value'],config({})).value,null);
});
test('Stat age uses the newest valid sample, including for aggregates, and flags stale or future clocks', () => {
 const reading=statReading([[100,150,200],[2,4,null]],['value'],config({reducer:'mean'}));
 assert.equal(reading.timestamp,150);
 assert.equal(statFreshness(reading,269999,120),'fresh');
 assert.equal(statFreshness(reading,270000,120),'stale');
 assert.equal(statFreshness(reading,140000,120),'future');
 assert.equal(statFreshness({value:0,timestamp:null},150000,120),'unknown');
 assert.equal(statFreshness({value:null,timestamp:150},150000,120),'no-data');
});
test('Stat processing and byte units apply once; thresholds use displayed units and are not scale clamps', () => {
 const chart={options:{axes:[{}, {scale:'mb'}]},processing:{multiplier:2,offset:0}};
 const aligned=alignRows([{_time:'2026-11-08T12:00:00Z',_value:4e6,_field:'value'}],processingFor(chart));
 const reading=statReading(aligned.data,aligned.labels,config({}));
 assert.equal(reading.value,8e6);assert.deepEqual(statUnit(chart),{unit:'MB',divisor:1e6});
 assert.deepEqual(statUnit({options:{series:[{}, {scale:'C'}]}}),{unit:'°C',divisor:1});
 assert.equal(gaugeColor(reading.value/statUnit(chart).divisor,config({thresholds:[{value:8,color:'#ff0000'}]})),'#ff0000');
 assert.equal(visualizationError({visualization:config({min:0,max:0})}),'');
});
test('sparkline preserves missing intervals, selected series and peaks, with bounded finite paths', () => {
 assert.deepEqual(statSparkline([[1,2],[null,null]],['x'],config({})),{line:'',area:''});
 assert.equal(statSparkline([[1],[4]],['x'],config({series:'absent'})).line,'');
 const gaps=statSparkline([[1,2,3,4],[1,2,null,3]],['x'],config({}));
 assert.equal((gaps.line.match(/M/g)||[]).length,2);
 assert.equal((gaps.area.match(/Z/g)||[]).length,1);
 const values=Array(10000).fill(2);values[531]=99;values[3124]=-20;
 const spark=statSparkline([values.map((_,i)=>i),values],['x'],config({}));
 assert.ok(spark.line.includes(',4.00'));assert.ok(spark.line.includes(',56.00'));
 assert.ok((spark.line.match(/[ML]/g)||[]).length<=640);
 const extreme=statSparkline([[1,2,3],[-1e308,1e308,0]],['x'],config({}));
 assert.ok(!/NaN|Infinity/.test(extreme.line));
 assert.ok(statSparkline([[1,2],[2,2]],['x'],config({})).line.includes(',30.00'));
});
test('Stat definitions export without samples and reject invalid display options', () => {
 const chart={id:1,data:[[1],[5]],visualization:config({sparkline:false,staleAfterSeconds:300})};
 const exported=chartDefinition(chart);
 assert.deepEqual(exported.data,[]);assert.deepEqual(exported.visualization,chart.visualization);
 for(const changes of [{sparkline:'yes'},{staleAfterSeconds:0},{staleAfterSeconds:1.5},{staleAfterSeconds:604801},{reducer:'sum'}]) assert.ok(visualizationError({visualization:config(changes)}));
 assert.equal(visualizationError({visualization:{type:'stat'}}),'');
});
