// Explicit, additive migration. Dry run by default; preserves all existing charts.
const fs=require('node:fs');
const root=process.env.BACKEND_DIST||'/app/dist';
const db=require(root+'/database/mongodb/models').default;
const {validateCharts}=require(root+'/database/dashboard/validation');
const {client,org}=require(root+'/database/influxdb/config/influxdb');
const host='esp32s3-07945C',prefix='bench-diag-',bucket=JSON.stringify(process.env.DOCKER_INFLUXDB_INIT_BUCKET||'tomatoes');
function query(names,last){
 const filter=names===null?`exists r.topic and strings.hasPrefix(v:r.topic,prefix:"sensors/${host}/diag/cpu_task/")`:names.map(n=>`r.topic=="sensors/${host}/diag/${n}"`).join(' or ');
 return `${names===null?'import "strings"\n':''}from(bucket:${bucket})\n |> range(start:v.timeRangeStart,stop:v.timeRangeStop)\n |> filter(fn:(r)=>r._measurement=="mqtt_consumer" and r._field=="value")\n |> filter(fn:(r)=>${filter})\n |> toFloat()\n ${last?'|> last()':'|> aggregateWindow(every:v.windowPeriod,fn:max,createEmpty:false)'}`;
}
(async()=>{
 await db.mongoose.connect(db.url);const collection=db.mongoose.connection.collection('dashboards');
 const old=await collection.findOne({name:'Hydroponics — '+host});if(!old)throw new Error('Target dashboard missing');
 if(old.charts.some(p=>String(p.id).startsWith(prefix))){console.log('Diagnostics already installed; dashboard preserved.');await db.mongoose.disconnect();process.exit(0);}
 let y=Math.max(0,...old.charts.map(p=>p.layout.y+p.layout.h));const added=[];
 const panel=(key,title,names,type,x,w,h,unit='',color='#5794f2')=>{const id=prefix+key;added.push({id,data:[],query:query(names,type!=='time-series'),layout:{x,y,w,h,i:id},options:{chartTitle:title,unit,series:[{label:'Time'},{label:title,stroke:color,points:{show:false}}],axes:[{},{}]},processing:{multiplier:1,offset:0,minimum:'',maximum:'',decimals:0,gaps:'Gaps'},visualization:{type,reducer:'last',series:null,min:0,max:100,color,showThresholds:true,thresholds:[],sparkline:false,staleAfterSeconds:180,mappings:[]}})};
 [['uptime_s','Board uptime','s','#80cbc4'],['heap_free','Free heap','B','#73bf69'],['psram_free','Free PSRAM','B','#b877d9'],['mqtt_disconnects','MQTT disconnects — since boot','','#ff9830'],['mqtt_tx_dropped','MQTT TX dropped — since boot','','#f2cc0c'],['drv_spi_errors','Driver SPI errors — since boot','','#f2495c']].forEach(([key,title,unit,color],i)=>panel(key,title,[key],'stat',i*2,2,8,unit,color));
 y+=8;panel('cpu0','Board CPU 0 — latest',['cpu0'],'gauge',0,6,9,'%');panel('cpu1','Board CPU 1 — latest',['cpu1'],'gauge',6,6,9,'%','#b877d9');
 y+=9;panel('cpu-history','Board CPU usage and peaks',['cpu0','cpu1','cpu0_peak','cpu1_peak'],'time-series',0,6,12,'%');panel('heap-history','Board heap availability',['heap_free','heap_min','heap_max_block'],'time-series',6,6,12,'B','#73bf69');
 y+=12;panel('mqtt-history','Board MQTT counters — since boot',['mqtt_disconnects','mqtt_rx_dropped','mqtt_tx_dropped'],'time-series',0,6,12,'','#ff9830');panel('driver-history','Board driver SPI errors — since boot',['drv_spi_errors'],'time-series',6,6,12,'','#f2495c');
 y+=12;panel('cpu-other','Board CPU — other tasks',['cpu0_other','cpu1_other'],'time-series',0,6,12,'%','#80cbc4');panel('tasks','Board task CPU — reported tasks only',null,'time-series',6,6,12,'%','#b877d9');
 const charts=validateCharts([...old.charts,...added]);
 for(const p of added){const q=p.query.replaceAll('v.timeRangeStart','-1h').replaceAll('v.timeRangeStop','now()').replaceAll('v.windowPeriod','30s');const rows=await client.getQueryApi(org).collectRows(q);if(!rows.some(r=>r._value!==null&&Number.isFinite(Number(r._value))))throw new Error('No recent samples: '+p.options.chartTitle);console.log('Validated',p.options.chartTitle,rows.length,'samples');}
 console.log('Plan:',old.charts.length,'->',charts.length,'panels; existing definitions preserved.');
 if(process.argv.includes('--apply')){const backup='/tmp/bench-diagnostics-before-'+Date.now()+'.json';fs.writeFileSync(backup,JSON.stringify(old,null,2),{mode:0o600,flag:'wx'});const r=await collection.updateOne({_id:old._id,revision:old.revision},{$set:{charts,updatedAt:new Date()},$inc:{revision:1}});if(r.modifiedCount!==1)throw new Error('Revision conflict');console.log('Applied; backup',backup);}else console.log('Dry run only; no data changed.');
 await db.mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error('Bench diagnostics stopped:',e.name,/^No recent samples:/.test(e.message)?e.message:'Check target, validation or revision.');process.exit(1)});
