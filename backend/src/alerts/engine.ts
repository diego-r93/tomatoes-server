import { access, get, run } from '../users/database';
import { alertsReady } from './database';
import { ruleRow, event, listRules } from './store';
import { Sample, Rule, transition } from './types';
import { readSource, startDiscovery, sourceHealth, influxConfigured } from './sources';
import { telegramSettings } from './providers';
import { dispatchOne, enqueueNotification } from './notificationQueue';
import { emailSettings } from '../users/mail';
export const monitor={running:false,lastTick:null as number|null,error:''};
const active=(state:string)=>['Firing','No data','Error'].includes(state);
export async function evaluate(rule:Rule,sample:Sample,time=Date.now()) {
 return access(async()=>{
  const current=await get<{revision:number}>('SELECT revision FROM alert_rules WHERE id=?',[rule.id]);
  if(!current||current.revision!==rule.revision)return;
  const next=transition(rule,sample,time);
  await run('UPDATE alert_rules SET state=?,since=?,latched=?,incident_open=?,value=?,sample_at=?,evaluated_at=?,reason=?,next_at=? WHERE id=?',[next.state,next.since,Number(next.latched),Number(next.incidentOpen),sample.health==='ok'?sample.value??null:null,sample.at??null,time,next.reason,time+rule.intervalSeconds*1000,rule.id]);
  if(rule.state!==next.state)await event(rule.id,rule.name,next.state,`${rule.state} → ${next.state}. ${next.reason}`,time);
  const updated=await ruleRow(rule.id);
  const repeat=!sample.suppressNotification&&active(next.state)&&(!rule.lastNotifiedAt||time-rule.lastNotifiedAt>=rule.repeatSeconds*1000);
  if((next.notify||repeat)&&await enqueueNotification(updated,next.notify||next.state,time))await run('UPDATE alert_rules SET last_notified_at=? WHERE id=?',[time,rule.id]);
 },true);
}
export const alertSettings=()=>({monitor:{...monitor},mqtt:{...sourceHealth},influxConfigured:influxConfigured(),email:emailSettings().configured,telegram:telegramSettings(),historyDays:90});
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
