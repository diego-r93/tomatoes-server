process.env.DOCKER_INFLUXDB_INIT_HOST='localhost';process.env.DOCKER_INFLUXDB_INIT_PORT='8086';
const test=require('node:test'),assert=require('node:assert/strict');
const Dashboard=require('../src/database/dashboard/models/dashboard.model').default;
const controller=require('../src/database/dashboard/controllers/dashboard.controller');
test('revision conflicts reject saves; export keeps the original array',async()=>{
 const update=Dashboard.findOneAndUpdate,find=Dashboard.findById;
 const charts=[{id:0,data:[],query:'original query',options:{chartTitle:'pH'},layout:{x:0,y:0,w:4,h:10,i:'0'}}];let updateFilter,exported;
 Dashboard.findOneAndUpdate=(filter)=>{updateFilter=filter;return{lean:async()=>null};};
 Dashboard.findById=()=>({lean:async()=>({_id:'test',charts})});
 try{
  await assert.rejects(controller.update({params:{id:'test'},body:{name:'Test',charts,revision:4}},{json(){throw new Error('Must not report success');}}),error=>error.status===409);
  assert.deepEqual(updateFilter,{_id:'test',revision:4});
  await controller.exportCharts({params:{id:'test'}},{setHeader(){},send(value){exported=JSON.parse(value);}});
  assert.deepEqual(exported,charts);
 }finally{Dashboard.findOneAndUpdate=update;Dashboard.findById=find;}
});
