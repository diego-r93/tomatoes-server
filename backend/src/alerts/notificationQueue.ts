import { access, get, run } from '../users/database';
import { deliver, Message, providerReady } from './providers';
import { contactRow, ruleRow, silenced } from './store';
import { Rule, unitFor } from './types';

const messageFor=(rule:Rule,phase:string):Message=>({name:rule.name,phase,severity:rule.severity,target:`${rule.source.host}${rule.source.gpio!==undefined?` / GPIO ${rule.source.gpio}`:''}`,reading:rule.value===null?'Not available':`${Number(rule.value.toFixed(2))} ${unitFor(rule.source)}`,condition:`${rule.operator} ${rule.threshold} ${unitFor(rule.source)} for ${rule.pendingSeconds} sec; recovery ${rule.recovery} ${unitFor(rule.source)}`});
export async function enqueueNotification(rule:Rule,phase:string,time:number) {
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
