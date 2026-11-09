// Explicit provisioning only: dry run by default; never overwrites an existing dashboard.
const fs=require('node:fs');
const root=process.env.BACKEND_DIST||'/app/dist';
const db=require(root+'/database/mongodb/models').default;
const {validateDashboard}=require(root+'/database/dashboard/validation');
const {client,org}=require(root+'/database/influxdb/config/influxdb');
const host='esp32s3-1C1250',id='pump-controller-1c1250';
const bucket=JSON.stringify(process.env.DOCKER_INFLUXDB_INIT_BUCKET||'tomatoes');
const charts=[];let y=0;
function panel(key,title,query,type,x,w,h,extra={}) {
 const p={id:key,data:[],query,layout:{x,y,w,h,i:key},options:{chartTitle:title,series:[{label:'Time'},{label:title,stroke:extra.color||'#5794f2',points:{show:false}}],axes:[{},{}],unit:extra.unit||''},processing:{multiplier:1,offset:0,minimum:'',maximum:'',decimals:extra.decimals??0,gaps:'Gaps'},visualization:{type,reducer:'last',series:null,min:0,max:100,color:extra.color||'#5794f2',showThresholds:true,thresholds:[],sparkline:false,staleAfterSeconds:180,mappings:[],...extra}};
 delete p.visualization.unit;delete p.visualization.decimals;charts.push(p);return p;
}
function metric(names,last=true){
 const topics=names.map(n=>'sensors/'+host+'/diag/'+n);
 return `from(bucket:${bucket})\n |> range(start:v.timeRangeStart,stop:v.timeRangeStop)\n |> filter(fn:(r)=>r._measurement=="mqtt_consumer" and r._field=="value")\n |> filter(fn:(r)=>${topics.map(t=>'r.topic=='+JSON.stringify(t)).join(' or ')})\n ${last?'|> last()\n |> toFloat()':'|> toFloat()\n |> aggregateWindow(every:v.windowPeriod,fn:max,createEmpty:false)'}`;
}
(async()=>{
 await db.mongoose.connect(db.url);const collection=db.mongoose.connection.collection('dashboards');
 if(await collection.findOne({_id:id})){console.log('Dashboard already exists; preserved without changes:',id);await db.mongoose.disconnect();process.exit(0);}
 const live=panel('connection','Board connection','Live board status — ignores dashboard time range','stat',0,2,8,{color:'#f2495c',thresholds:[{value:1,color:'#73bf69'}],mappings:[{value:0,text:'No recent reply'},{value:1,text:'Online'}],staleAfterSeconds:90});live.liveSource={kind:'connection',host};
 for(const [i,key,title,unit,color] of [[1,'uptime_s','Uptime','s','#80cbc4'],[2,'heap_free','Free heap','B','#73bf69'],[3,'psram_free','Free PSRAM','B','#b877d9'],[4,'mqtt_disconnects','MQTT disconnects','','#ff9830'],[5,'drv_spi_errors','Driver SPI errors','','#f2cc0c']])panel(key,title,metric([key]),'stat',i*2,2,8,{unit,color});
 y+=8;
 for(let pump=1;pump<=4;pump++){
  const p=panel('driver-'+pump,`Pump 0${pump} — latest driver result`,'Live driver status — ignores dashboard time range','stat',(pump-1)*3,3,8,{staleAfterSeconds:86400,color:'#f2495c',thresholds:[{value:1,color:'#73bf69'},{value:2,color:'#f2495c'}],mappings:[{value:0,text:'Not actuated'},{value:1,text:'Driver active'},{value:2,text:'Supply absent'},{value:3,text:'Short circuit'},{value:4,text:'Overtemperature'},{value:5,text:'Supply low'},{value:6,text:'No feedback'},{value:7,text:'Incomplete feedback'}]});p.liveSource={kind:'driver',host,pump};
 }
 y+=8;
 panel('cpu0','CPU 0 — latest',metric(['cpu0']),'gauge',0,6,9,{unit:'%',color:'#5794f2'});
 panel('cpu1','CPU 1 — latest',metric(['cpu1']),'gauge',6,6,9,{unit:'%',color:'#b877d9'});
 y+=9;
 panel('cpu-history','CPU usage and peaks',metric(['cpu0','cpu1','cpu0_peak','cpu1_peak'],false),'time-series',0,6,12,{unit:'%'});
 panel('heap-history','Heap availability',metric(['heap_free','heap_min','heap_max_block'],false),'time-series',6,6,12,{unit:'B',color:'#73bf69'});
 y+=12;
 panel('mqtt-history','MQTT counters — since boot',metric(['mqtt_disconnects','mqtt_rx_dropped','mqtt_tx_dropped'],false),'time-series',0,6,12,{color:'#ff9830'});
 panel('driver-errors','Driver SPI errors — since boot',metric(['drv_spi_errors'],false),'time-series',6,6,12,{color:'#f2495c'});
 const body=validateDashboard({name:'Pump controller — '+host,description:'Sensor-free controller: connection, CPU, memory and latest driver feedback. Pump supply was connected temporarily for tests and will remain disconnected until greenhouse installation. Driver cards show the LAST pulse (see its timestamp), not current supply or water flow. Diagnostics require debug telemetry; counters reset at boot.',folder:'ESP32 boards',tags:['pump-controller','diagnostics','supply-disconnected',host],favorite:false,settings:{range:'-1h',refresh:'30s',timezone:'Browser'},charts});
 for(const p of charts.filter(p=>!p.liveSource)){
  const q=p.query.replaceAll('v.timeRangeStart','-1h').replaceAll('v.timeRangeStop','now()').replaceAll('v.windowPeriod','30s');
  const rows=await client.getQueryApi(org).collectRows(q);
  if(!rows.some(r=>r._value!==null&&Number.isFinite(Number(r._value))))throw new Error('No recent samples: '+p.options.chartTitle);
  console.log('Validated',p.options.chartTitle,rows.length,'samples');
 }
 console.log('Validated dashboard:',id,charts.length,'panels');
 if(process.argv.includes('--apply')){
  const before=await collection.find({},{projection:{_id:1,name:1,revision:1}}).toArray();
  const backup='/tmp/controller-dashboard-before-'+Date.now()+'.json';fs.writeFileSync(backup,JSON.stringify({before,createdId:id},null,2),{mode:0o600,flag:'wx'});
  await collection.insertOne({_id:id,...body,revision:1,createdAt:new Date(),updatedAt:new Date()});console.log('Created',id,'backup',backup);
 }else console.log('Dry run: nothing written. Pass --apply to create.');
 await db.mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error('Controller dashboard failed:',e.name,/^No recent samples:/.test(e.message)?e.message:'Check validation and connection.');process.exit(1)});
