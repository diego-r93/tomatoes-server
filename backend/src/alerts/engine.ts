import { access, all, get, run } from '../users/database';
import { alertsReady } from './database';
import { ruleRow, contactRow, event, listRules, silenced } from './store';
import { Sample, Rule, transition, unitFor } from './types';
import { readSource, startDiscovery, sourceHealth, influxConfigured } from './sources';
import { deliver, Message, providerReady, whatsappSettings } from './providers';
import { emailSettings } from '../users/mail';
export const monitor={running:false,lastTick:null as number|null,error:''};
const active=(state:string)=>['Firing','No data','Error'].includes(state);
export const messageFor=(rule:Rule,phase:string):Message=>({name:rule.name,phase,severity:rule.severity,target:`${rule.source.host}${rule.source.gpio!==undefined?` / GPIO ${rule.source.gpio}`:''}`,reading:rule.value===null?'Not available':`${Number(rule.value.toFixed(2))} ${unitFor(rule.source)}`,condition:`${rule.operator} ${rule.threshold} ${unitFor(rule.source)} for ${rule.pendingSeconds} sec; recovery ${rule.recovery} ${unitFor(rule.source)}`});
async function enqueue(rule:Rule,phase:string,time:number) {
 if(await silenced(rule.id,time))return false;
 let queued=false;
 for(const id of rule.contactIds) {
  const contact=await contactRow(id);
  if(!contact.enabled||(contact.kind==='whatsapp'&&!contact.consent)||!providerReady(contact.kind))continue;
  for(const recipient of contact.recipients) {
   const pending=await get("SELECT id FROM alert_outbox WHERE rule_id=? AND revision=? AND contact_id=? AND recipient=? AND phase=? AND status IN ('pending','sending')",[rule.id,rule.revision,id,recipient,phase]);
   if(!pending){await run('INSERT INTO alert_outbox(rule_id,revision,contact_id,recipient,phase,next_at,created_at) VALUES (?,?,?,?,?,?,?)',[rule.id,rule.revision,id,recipient,phase,time,time]);queued=true;}
  }
 }
 return queued;
}
export async function evaluate(rule:Rule,sample:Sample,time=Date.now()) {
 return access(async()=>{
  const current=await get<{revision:number}>('SELECT revision FROM alert_rules WHERE id=?',[rule.id]);
  if(!current||current.revision!==rule.revision)return;
  const next=transition(rule,sample,time);
  await run('UPDATE alert_rules SET state=?,since=?,latched=?,incident_open=?,value=?,sample_at=?,evaluated_at=?,reason=?,next_at=? WHERE id=?',[next.state,next.since,Number(next.latched),Number(next.incidentOpen),sample.health==='ok'?sample.value??null:null,sample.at??null,time,next.reason,time+rule.intervalSeconds*1000,rule.id]);
  if(rule.state!==next.state)await event(rule.id,rule.name,next.state,`${rule.state} → ${next.state}. ${next.reason}`,time);
  const updated=await ruleRow(rule.id);
  const repeat=active(next.state)&&(!rule.lastNotifiedAt||time-rule.lastNotifiedAt>=rule.repeatSeconds*1000);
  if((next.notify||repeat)&&await enqueue(updated,next.notify||next.state,time))await run('UPDATE alert_rules SET last_notified_at=? WHERE id=?',[time,rule.id]);
 },true);
}
interface Delivery {id:number;rule_id:number;revision:number;contact_id:number;recipient:string;phase:string;attempts:number;}
// Transport injection keeps tests away from external providers.
export async function dispatchOne(transport=deliver,time=Date.now()) {
 const job=await access(async()=>{
  const row=await get<Delivery>("SELECT * FROM alert_outbox WHERE status='pending' AND next_at<=? ORDER BY id LIMIT 1",[time]);
  if(!row)return null;
  const rule=await ruleRow(row.rule_id),contact=await contactRow(row.contact_id);
  const phase=rule.state==='Normal'?'Resolved':rule.state;
  let reason='';
  if(!rule.enabled||rule.revision!==row.revision||phase!==row.phase||!rule.contactIds.includes(contact.id))reason='Rule changed or this incident is no longer current.';
  else if(!contact.enabled||!contact.recipients.includes(row.recipient)||(contact.kind==='whatsapp'&&!contact.consent))reason='The contact point or recipient is no longer enabled.';
  else if(await silenced(rule.id,time))reason='Notifications are silenced.';
  else if(!providerReady(contact.kind))reason='Provider is not configured.';
  if(reason){await run("UPDATE alert_outbox SET status='cancelled',reason=? WHERE id=?",[reason,row.id]);return null;}
  await run("UPDATE alert_outbox SET status='sending',attempts=attempts+1 WHERE id=?",[row.id]);
  return {row,contact,message:messageFor(rule,row.phase)};
 },true);
 if(!job)return false;
 try {
  const providerId=await transport(job.contact,job.row.recipient,job.message);
  await access(()=>run("UPDATE alert_outbox SET status='submitted',provider_id=?,reason='Accepted by provider; delivery is not confirmed.' WHERE id=?",[providerId,job.row.id]));
 } catch {
  const attempts=job.row.attempts+1;
  await access(()=>run('UPDATE alert_outbox SET status=?,next_at=?,reason=? WHERE id=?',[attempts>=3?'failed':'pending',Date.now()+60000*Math.pow(2,attempts-1),'Provider request failed. Check credentials, template approval and connectivity.',job.row.id]));
 }
 return true;
}
export const alertSettings=()=>({monitor:{...monitor},mqtt:{...sourceHealth},influxConfigured:influxConfigured(),email:emailSettings().configured,whatsapp:whatsappSettings(),historyDays:90});
export async function startAlerts() {
 await alertsReady;
 if(process.env.ALERTING_ENABLED==='false')return ()=>{};
 monitor.running=true;
 const stopDiscovery=startDiscovery();let evaluating=false,dispatching=false,lastCleanup=0;
 const tick=async()=>{
  if(evaluating)return;evaluating=true;
  try {
   const time=Date.now(),cache=new Map<string,Promise<Sample>>();
   for(const rule of await listRules()) {
    if(!rule.enabled||rule.nextAt>time)continue;
    const key=JSON.stringify(rule.source);
    if(!cache.has(key))cache.set(key,readSource(rule.source));
    await evaluate(rule,await cache.get(key)!);
   }
   monitor.lastTick=Date.now();monitor.error='';
   if(time-lastCleanup>86400000){await access(async()=>{await run('DELETE FROM alert_history WHERE created_at<?',[time-90*86400000]);await run("DELETE FROM alert_outbox WHERE status IN ('submitted','failed','cancelled') AND created_at<?",[time-30*86400000]);await run('DELETE FROM alert_silences WHERE ends_at<?',[time-90*86400000]);},true);lastCleanup=time;}
  }catch{monitor.error='The alert evaluation cycle failed. Check backend logs and database availability.';}finally{evaluating=false;}
 };
 const flush=async()=>{if(dispatching)return;dispatching=true;try{await dispatchOne();}catch{monitor.error='The notification worker could not process its queue.';}finally{dispatching=false;}};
 const evaluationTimer=setInterval(()=>void tick(),5000),deliveryTimer=setInterval(()=>void flush(),2000);
 evaluationTimer.unref();deliveryTimer.unref();void tick();
 return ()=>{monitor.running=false;clearInterval(evaluationTimer);clearInterval(deliveryTimer);stopDiscovery();};
}
