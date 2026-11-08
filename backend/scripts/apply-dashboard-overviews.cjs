// Run once explicitly inside the backend container after deploying this revision.
// --apply requires a successfully validated dry plan and writes a private backup first.
const fs=require('node:fs');
const root=process.env.BACKEND_DIST||'/app/dist';
const db=require(root+'/database/mongodb/models').default;
const {dashboardOverview}=require(root+'/database/dashboard/overview');
const {validateCharts}=require(root+'/database/dashboard/validation');
const {client,org}=require(root+'/database/influxdb/config/influxdb');
const sql=require(root+'/users/database'),store=require(root+'/alerts/store');
(async()=>{
 await db.mongoose.connect(db.url);await require(root+'/alerts/database').alertsReady;
 const collection=db.mongoose.connection.collection('dashboards');const before=await collection.find().toArray();
 const plan=before.map(d=>({old:d,next:dashboardOverview(d)})).filter(p=>p.next);
 for(const {old,next} of plan){validateCharts(next.charts);for(const chart of next.charts.filter(p=>String(p.id).startsWith('overview-')&&!p.liveSource)){
  const query=chart.query.replaceAll('v.timeRangeStart','-1h').replaceAll('v.timeRangeStop','now()').replaceAll('v.windowPeriod','10s');
  const rows=await client.getQueryApi(org).collectRows(query);
  if(!rows.some(r=>r._value!==null&&Number.isFinite(Number(r._value))))throw new Error('No numeric recent samples: '+chart.options.chartTitle);
 }
 console.log('Validated',old.name,'panels',old.charts.length,'->',next.charts.length);}
 if(!process.argv.includes('--apply')){console.log('Dry plan only; no dashboard or rule changes.');await db.mongoose.disconnect();process.exit(0);}
 const rules=await store.listRules();const backup='/tmp/dashboard-overviews-before-'+Date.now()+'.json';
 fs.writeFileSync(backup,JSON.stringify({at:new Date(),dashboards:before,rules},null,2),{mode:0o600,flag:'wx'});console.log('BACKUP',backup);
 const changed=[];
 try {for(const {old,next} of plan){const result=await collection.updateOne({_id:old._id,revision:old.revision},{$set:{charts:next.charts,updatedAt:new Date()},$inc:{revision:1}});if(result.modifiedCount!==1)throw new Error('Revision conflict');changed.push(old);}}
 catch(error){for(const old of changed)await collection.replaceOne({_id:old._id,revision:old.revision+1},old);throw error;}
 const add=async(name,source,threshold,recovery,pendingSeconds=0,enabled=true,severity='Warning')=>{
  if(rules.some(r=>r.name===name))return;
  const rule=await store.saveRule(null,{name,source:{freshnessSeconds:180,...source},operator:'>',threshold,recovery,pendingSeconds,intervalSeconds:30,repeatSeconds:3600,severity,contactIds:[],enabled},'dashboard-overviews-migration');rules.push(rule);console.log('Rule',rule.id,enabled?'enabled':'paused',name);
 };
 await add('ESP32 not responding — esp32s3-1C1250',{kind:'device_age',host:'esp32s3-1C1250'},120,60,60,false,'Critical');
 const devices=await sql.access(()=>sql.all('SELECT host,payload FROM alert_devices'));const states=await db.mongoose.connection.collection('pump_driver_state').find().toArray();
 const pumps=await db.mongoose.connection.collection('boards').find().toArray();
 for(const board of pumps){const [host,nn]=board.pumperCode.split('#');if(!['esp32s3-07945C','esp32s3-1C1250'].includes(host))continue;
  const observed=states.some(s=>s.code===board.pumperCode),scheduled=board.driveTimes?.some(t=>t.state);
  const enabled=host!=='esp32s3-1C1250' && (observed||scheduled);
  const source={kind:'pump_driver',host,pump:Number(nn)};
  await add('Pump not actuated — '+board.pumperCode,{...source,condition:'failure'},0.5,0,0,enabled,'Critical');
  await add('Driver feedback missing — '+board.pumperCode,{...source,condition:'missing'},0.5,0,0,enabled);
  const report=devices.find(d=>d.host===host);const ports=report?JSON.parse(report.payload).ports:null;const gpio=ports?.[board.pumperCode]?.gpio;
  if(Number.isInteger(Number(gpio))&&gpio!==null&&gpio!==undefined)await add('Output ON too long — '+board.pumperCode,{kind:'output_on',host,gpio:Number(gpio)},board.pulseDuration/1000+30,0,10,enabled,'Critical');
 }
 const disk=before.find(d=>d._id==='existing-charts')?.charts.find(p=>p.options.chartTitle==='Storage used');
 const diskPath=/r\["path"\] == "([^"]+)"/.exec(disk?.query||'')?.[1];
 if(diskPath)await add('Raspberry Pi storage usage high',{kind:'disk_usage',host:'raspberrypi',path:diskPath},85,80,300);
 const battery=before.find(d=>String(d._id).startsWith('battery-'));if(battery){const device=String(battery._id).slice(8);const metric=(kind,measurement,field)=>({kind,host:'raspberrypi',device,measurement,field});
  await add('Battery telemetry missing',metric('metric_age','battery','soc'),180,60,0);
  await add('BMS protection active',metric('metric','battery_calculated','protection_active'),0.5,0,0,true,'Critical');
  if(!rules.some(r=>r.name==='Battery charge low — review limits')){const rule=await store.saveRule(null,{name:'Battery charge low — review limits',source:{...metric('metric','battery','soc'),unit:'%',freshnessSeconds:180},operator:'<',threshold:20,recovery:25,pendingSeconds:120,intervalSeconds:30,repeatSeconds:3600,severity:'Warning',contactIds:[],enabled:false},'dashboard-overviews-migration');console.log('Rule',rule.id,'paused',rule.name);}
 }
 console.log('Applied overview migration. Original rules preserved; new rules are in-app only.');await db.mongoose.disconnect();process.exit(0);
})().catch(error=>{console.error('Overview migration stopped:',error.name,error.statusCode||'',/^No numeric recent samples:/.test(error.message)?error.message:'Check the private backup and validated plan.');process.exit(1)});
