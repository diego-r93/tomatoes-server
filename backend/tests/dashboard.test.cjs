const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {validateCharts,validateDashboard}=require('../src/database/dashboard/validation');
const Dashboard=require('../src/database/dashboard/models/dashboard.model').default;
const {migrateCharts}=require('../src/database/dashboard/migrate');
const original=Array.from({length:8},(_,id)=>({id,data:[],options:{chartTitle:'Panel '+id,series:[{label:'Date'},{stroke:'rgb(184, 119, 217)'}]},layout:{x:0,y:id*10,w:4,h:10,i:String(id)},query:'from(bucket: \"tomatoes\") |> range(start: v.timeRangeStart, stop: v.timeRangeStop)'}));
test('original chart JSON passes intact; samples and duplicate IDs are rejected',()=>{
 assert.equal(validateCharts(original),original);
 assert.throws(()=>validateCharts([original[0],original[0]]),/unique/);
 assert.throws(()=>validateCharts([{...original[0],data:[[1],[2]]}]),/InfluxDB/);
 assert.throws(()=>validateDashboard({name:'Test',charts:original,settings:{refresh:'0s'}}),/interval/);
});
test('migration verifies exact data and does not overwrite edits on restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tomatoes-dashboard-')),file=path.join(dir,'charts.json');fs.writeFileSync(file,JSON.stringify(original));
 const find=Dashboard.findById,update=Dashboard.updateOne;let stored=null,writes=0;
 Dashboard.findById=()=>({lean:async()=>stored});Dashboard.updateOne=async(_filter,operation)=>{writes++;stored={...operation.$setOnInsert};};
 try{assert.deepEqual(await migrateCharts(file),{migrated:true,count:8});assert.deepEqual(stored.charts,original);assert(fs.existsSync(file));stored.charts=[];await migrateCharts(file);assert.equal(writes,1);assert.deepEqual(stored.charts,[]);}finally{Dashboard.findById=find;Dashboard.updateOne=update;fs.rmSync(dir,{recursive:true});}
});

test('gauge definitions survive validation intact and invalid visualization settings are refused', () => {
 const visualization={type:'gauge',reducer:'last',series:'cell=1',min:0,max:100,color:'#73bf69',showThresholds:true,thresholds:[{value:80,color:'#f2cc0c'},{value:90,color:'#f2495c'}]};
 const panel={...original[0],visualization};
 assert.equal(validateCharts([panel])[0],panel);
 assert.deepEqual(JSON.parse(JSON.stringify(validateDashboard({name:'Battery',charts:[panel]}))).charts[0].visualization,visualization);
 for(const update of [{type:'unknown'},{min:100,max:100},{max:'100'},{reducer:'sum'},{series:42},{color:'url(https://invalid)'},{showThresholds:1},{thresholds:[{value:90,color:'#ff0000'},{value:80,color:'#ffff00'}]},{thresholds:[{value:null,color:'#ffffff'}]},{thresholds:Array.from({length:11},(_,value)=>({value,color:'#ffffff'}))}]) assert.throws(()=>validateCharts([{...panel,visualization:{...visualization,...update}}]));
 assert.throws(()=>validateCharts([{...panel,visualization:null}]));
});


test('Stat settings round-trip without samples; invalid age limits and options are rejected', () => {
 const visualization={type:'stat',reducer:'mean',series:'battery',sparkline:false,staleAfterSeconds:300,color:'#73bf69',thresholds:[{value:80,color:'#ff0000'}]};
 const panel={...original[0],visualization};
 assert.deepEqual(JSON.parse(JSON.stringify(validateDashboard({name:'Stat',charts:[panel]}))).charts[0].visualization,visualization);
 assert.equal(validateCharts([{...panel,visualization:{type:'stat'}}]).length,1);
 for(const update of [{sparkline:1},{staleAfterSeconds:0},{staleAfterSeconds:1.5},{staleAfterSeconds:604801},{reducer:'sum'},{series:42},{color:'red'}]) assert.throws(()=>validateCharts([{...panel,visualization:{...visualization,...update}}]));
});

test('bar gauge and table options round-trip and reject unsupported settings', () => {
  const bar = {
    ...original[0],
    visualization: { type: 'bar-gauge', orientation: 'vertical', min: -10, max: 50 },
    options: { ...original[0].options, description: 'Compare cells', transparent: true },
  };
  const table = {
    ...original[1],
    visualization: { type: 'table', pageSize: 50, tableOrder: 'oldest' },
  };
  assert.deepEqual(validateDashboard({ name: 'Panels', charts: [bar, table] }).charts, [bar, table]);
  for (const [panel, options] of [
    [bar, { orientation: 'diagonal' }],
    [bar, { max: -20 }],
    [table, { pageSize: 100 }],
    [table, { tableOrder: 'random' }],
  ]) {
    assert.throws(() => validateCharts([{ ...panel, visualization: { ...panel.visualization, ...options } }]));
  }
  assert.throws(() => validateCharts([{ ...bar, options: { ...bar.options, legendMode: 'other' } }]));
});
