process.env.DOCKER_INFLUXDB_INIT_HOST='localhost';process.env.DOCKER_INFLUXDB_INIT_PORT='8086';
const test=require('node:test'),assert=require('node:assert/strict');
const Dashboard=require('../src/database/dashboard/models/dashboard.model').default;
const controller=require('../src/database/dashboard/controllers/dashboard.controller');
const locals={auth:{user:{username:'admin'}}};
test('revision conflicts reject saves; export keeps the original array',async()=>{
 const update=Dashboard.findOneAndUpdate,find=Dashboard.findById;
 const charts=[{id:0,data:[],query:'original query',options:{chartTitle:'pH'},layout:{x:0,y:0,w:4,h:10,i:'0'}}];let updateFilter,exported;
 Dashboard.findOneAndUpdate=(filter)=>{updateFilter=filter;return{lean:async()=>null};};
 Dashboard.findById=()=>({lean:async()=>({_id:'test',charts})});
 try{
  await assert.rejects(controller.update({params:{id:'test'},body:{name:'Test',charts,revision:4}},{locals,json(){throw new Error('Must not report success');}}),error=>error.status===409);
  assert.deepEqual(updateFilter,{_id:'test',revision:4});
  await controller.exportCharts({params:{id:'test'}},{setHeader(){},send(value){exported=JSON.parse(value);}});
  assert.deepEqual(exported,charts);
 }finally{Dashboard.findOneAndUpdate=update;Dashboard.findById=find;}
});

test('gauge settings survive the save and export API without altering the query',async()=>{
 const update=Dashboard.findOneAndUpdate,find=Dashboard.findById;
 const visualization={type:'gauge',reducer:'mean',series:null,min:-10,max:50,color:'#73bf69',showThresholds:true,thresholds:[{value:30,color:'#ffcc00'}]};
 const charts=[{id:'gauge',data:[],query:'original query',options:{chartTitle:'Temperature',unit:'°C'},layout:{x:0,y:0,w:4,h:10,i:'gauge'},visualization}];
 let stored,response,exported;
 Dashboard.findOneAndUpdate=(filter,operation)=>({lean:async()=>{stored={_id:filter._id,...operation.$set,revision:filter.revision+1};return stored;}});
 Dashboard.findById=()=>({lean:async()=>stored});
 try{
  await controller.update({params:{id:'gauge-test'},body:{name:'Test',charts,revision:1}},{locals,json(value){response=value;}});
  assert.equal(response.revision,2);assert.deepEqual(response.charts[0].visualization,visualization);
  await controller.exportCharts({params:{id:'gauge-test'}},{setHeader(){},send(value){exported=JSON.parse(value);}});
  assert.deepEqual(exported,charts);
 }finally{Dashboard.findOneAndUpdate=update;Dashboard.findById=find;}
});

test('Stat settings survive the save and export API without altering the query',async()=>{
 const update=Dashboard.findOneAndUpdate,find=Dashboard.findById;
 const visualization={type:'stat',sparkline:false,staleAfterSeconds:300,reducer:'mean',series:null,min:-10,max:50,color:'#73bf69',showThresholds:true,thresholds:[{value:30,color:'#ffcc00'}]};
 const charts=[{id:'stat',data:[],query:'original query',options:{chartTitle:'Temperature',unit:'°C'},layout:{x:0,y:0,w:4,h:10,i:'stat'},visualization}];
 let stored,response,exported;
 Dashboard.findOneAndUpdate=(filter,operation)=>({lean:async()=>{stored={_id:filter._id,...operation.$set,revision:filter.revision+1};return stored;}});
 Dashboard.findById=()=>({lean:async()=>stored});
 try{
  await controller.update({params:{id:'stat-test'},body:{name:'Test',charts,revision:1}},{locals,json(value){response=value;}});
  assert.equal(response.revision,2);assert.deepEqual(response.charts[0].visualization,visualization);
  await controller.exportCharts({params:{id:'stat-test'}},{setHeader(){},send(value){exported=JSON.parse(value);}});
  assert.deepEqual(exported,charts);
 }finally{Dashboard.findOneAndUpdate=update;Dashboard.findById=find;}
});

test('save message is attached to the same revision update with the authenticated author', async () => {
 const update = Dashboard.findOneAndUpdate;
 let operation;
 Dashboard.findOneAndUpdate = (_filter, change) => {
  operation = change;
  return { lean: async () => ({ revision: 5 }) };
 };
 const req = { params: { id: 'test' }, body: { name: 'Test', charts: [], revision: 4, saveMessage: '  Align gauges  ', author: 'forged' } };
 try {
  await controller.update(req, { locals, json() {} });
  const history = operation.$push.saveHistory;
  assert.equal(history.$slice, 20);
  assert.equal(history.$position, 0);
  const [entry] = history.$each;
  assert.deepEqual({ ...entry, savedAt: undefined }, { revision: 5, message: 'Align gauges', author: 'admin', savedAt: undefined });
  assert.ok(entry.savedAt instanceof Date);
  req.body.saveMessage = 'x'.repeat(501);
  await assert.rejects(controller.update(req, { locals, json() {} }), error => error.status === 400);
 } finally {
  Dashboard.findOneAndUpdate = update;
 }
});
