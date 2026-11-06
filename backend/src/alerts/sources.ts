import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { InfluxDB } from '@influxdata/influxdb-client';
import { access, all, get, run } from '../users/database';
import { alertsReady } from './database';
import { Source, Sample } from './types';
interface DeviceRow { host:string; payload:string; received_at:number; outputs:string; }
interface Output { state:boolean|null; since:number|null; }
export const sourceHealth = { mqttConnected:false, lastDiscovery:null as number|null, lastSample:null as number|null };
let client:MqttClient|undefined;
const processStarted=Date.now();
export function observedOutputs(ports:unknown, previous:Record<string,Output>, continuous:boolean, time:number) {
 const result:Record<string,Output>={};
 if(!ports||typeof ports!=='object')return result;
 for(const port of Object.values(ports as Record<string,{gpio:unknown;state:unknown}>)) {
  if(!port||port.gpio===null||port.gpio===undefined||port.gpio==='')continue;
  const gpio=Number(port.gpio);if(!Number.isInteger(gpio)||gpio<0||gpio>255)continue;
  const state=[true,1,'1','true'].includes(port.state as never)?true:[false,0,'0','false'].includes(port.state as never)?false:null;
  const old=previous[String(gpio)];
  result[String(gpio)]={state,since:state?(continuous&&old?.state&&old.since!==null?old.since:time):null};
 }
 return result;
}
export async function ingestDevice(payload:Buffer,time=Date.now()) {
 if(payload.length>65536)return;
 let data:Record<string,unknown>;try{data=JSON.parse(payload.toString());}catch{return;}
 if(!data||typeof data!=='object'||Array.isArray(data)||!Object.prototype.hasOwnProperty.call(data,'host'))return;
 const host=String(data.host);if(!/^[a-zA-Z0-9._-]{1,128}$/.test(host))return;
 await alertsReady;
 await access(async()=>{
  const old=await get<DeviceRow>('SELECT * FROM alert_devices WHERE host=?',[host]);
  const continuous=Boolean(old&&old.received_at>=processStarted&&time-old.received_at<90000);
  const outputs=observedOutputs(data.ports,old?JSON.parse(old.outputs):{},continuous,time);
  await run('INSERT INTO alert_devices(host,payload,received_at,outputs) VALUES (?,?,?,?) ON CONFLICT(host) DO UPDATE SET payload=excluded.payload,received_at=excluded.received_at,outputs=excluded.outputs',[host,JSON.stringify(data),time,JSON.stringify(outputs)]);
  sourceHealth.lastSample=time;
 });
}
export function startDiscovery(connect=mqtt.connect) {
 if(!process.env.MQTT_HOST_NAME)return ()=>{};
 client=connect(process.env.MQTT_HOST_NAME,{username:process.env.MQTT_USER_NAME,password:process.env.MQTT_PASSWORD,clientId:`tomatoes-alerts-${process.pid}`,reconnectPeriod:5000,connectTimeout:10000,clean:true});
 const discover=()=>{if(client?.connected){client.publish('getdevices','get all');sourceHealth.lastDiscovery=Date.now();}};
 client.on('connect',()=>client!.subscribe('devices',error=>{sourceHealth.mqttConnected=!error;if(!error)discover();}));
 client.on('close',()=>{sourceHealth.mqttConnected=false;});
 client.on('error',()=>{sourceHealth.mqttConnected=false;});
 client.on('message',(topic,payload)=>{if(topic==='devices')void ingestDevice(payload).catch(()=>{});});
 const timer=setInterval(discover,30000);timer.unref();
 return ()=>{clearInterval(timer);client?.end(true);sourceHealth.mqttConnected=false;};
}
export function influxConfigured() {return Boolean(process.env.DOCKER_INFLUXDB_INIT_HOST&&process.env.DOCKER_INFLUXDB_INIT_PORT&&process.env.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN&&process.env.DOCKER_INFLUXDB_INIT_ORG&&process.env.DOCKER_INFLUXDB_INIT_BUCKET);}
export function metricQuery(source:Source) {
 const measurement=source.kind==='cpu_temperature'?'cpu_temperature':source.kind==='disk_usage'?'disk':source.measurement!;
 const field=source.kind==='disk_usage'?'used_percent':source.kind==='cpu_temperature'?'value':source.field!;
 const quote=JSON.stringify;
 return `from(bucket: ${quote(process.env.DOCKER_INFLUXDB_INIT_BUCKET||'')}) |> range(start: -24h) |> filter(fn: (r) => r._measurement == ${quote(measurement)} and r._field == ${quote(field)} and r.host == ${quote(source.host)}${source.kind==='disk_usage'?` and r.path == ${quote(source.path)}`:''}${source.topic?` and r.topic == ${quote(source.topic)}`:''}) |> last()`;
}
export function metricSample(source:Source,rows:{_time:string;_value:unknown}[],time=Date.now()):Sample {
 if(!rows.length)return {health:'missing',reason:'No matching metric was found in the last 24 hours.'};
 if(rows.length!==1)return {health:'error',reason:'Multiple series matched. Select a more specific measurement, topic or target.'};
 const row=rows[0],at=Date.parse(row._time);
 if(!Number.isFinite(at))return {health:'error',reason:'The metric timestamp is invalid.'};
 if(at-time>60000)return {health:'missing',reason:'The metric timestamp is ahead of the monitor clock.'};
 // Age rules evaluate staleness with their trigger/recovery limits, not freshnessSeconds.
 if(source.kind==='metric_age')return {health:'ok',value:Math.max(0,(time-at)/1000),at};
 const value=Number(row._value)*(source.kind==='cpu_temperature'?0.001:source.scale||1);
 if(!Number.isFinite(value)||row._value===null)return {health:'error',reason:'The metric is not a valid numeric sample.'};
 if(time-at>source.freshnessSeconds*1000)return {health:'missing',reason:'The metric timestamp is stale.'};
 return {health:'ok',value,at};
}
export async function readSource(source:Source,time=Date.now()):Promise<Sample> {
 if(['device_age','wifi','output_on'].includes(source.kind)) {
  if(!sourceHealth.mqttConnected)return {health:'error',reason:'The alert monitor is not connected to MQTT.'};
  const device=await access(()=>get<DeviceRow>('SELECT * FROM alert_devices WHERE host=?',[source.host]));
  if(!device)return {health:'missing',reason:'This device has not been observed by the alert monitor.'};
  if(source.kind==='device_age')return {health:'ok',value:Math.max(0,(time-device.received_at)/1000),at:device.received_at};
  if(time-device.received_at>source.freshnessSeconds*1000)return {health:'missing',reason:'The device report is stale.'};
  if(source.kind==='wifi') {
   const value=JSON.parse(device.payload).rssi;
   return value!==null&&value!==''&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)<=0&&Number(value)>=-150?{health:'ok',value:Number(value),at:device.received_at}:{health:'missing',reason:'The device did not report a valid Wi-Fi signal.'};
  }
  const output:Output|undefined=JSON.parse(device.outputs)[String(source.gpio)];
  if(!output||output.state===null)return {health:'missing',reason:'The selected GPIO has no reported state.'};
  // This is observed GPIO time, not proof of flow or uninterrupted operation.
  if(output.state&&(output.since===null||output.since<processStarted))return {health:'missing',reason:'Waiting for a GPIO report after monitor startup.'};
  return {health:'ok',value:output.state?Math.max(0,(time-output.since!)/1000):0,at:device.received_at};
 }
 if(!influxConfigured())return {health:'error',reason:'InfluxDB access is not configured for the backend.'};
 try {
  const influx=new InfluxDB({url:`http://${process.env.DOCKER_INFLUXDB_INIT_HOST}:${process.env.DOCKER_INFLUXDB_INIT_PORT}`,token:process.env.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN,timeout:10000});
  const rows=await influx.getQueryApi(process.env.DOCKER_INFLUXDB_INIT_ORG!).collectRows<{_time:string;_value:number}>(metricQuery(source));
  return metricSample(source,rows,time);
 } catch {return {health:'error',reason:'The InfluxDB query failed. Check connectivity and backend credentials.'};}
}
export const knownDevices=()=>access(()=>all<{host:string;received_at:number}>('SELECT host,received_at FROM alert_devices ORDER BY host'));
