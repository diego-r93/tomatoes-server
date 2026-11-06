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
