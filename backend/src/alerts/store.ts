import { access, all, get, run } from '../users/database';
import { alertsReady } from './database';
import { AlertState, Contact, Rule, Source, finite, integer, json, now, sourceInput } from './types';
import { HttpError, emailAddress, idList, text } from '../users/types';
interface RuleRow { id:number;name:string;config:string;state:AlertState;since:number|null;latched:number;incident_open:number;value:number|null;sample_at:number|null;evaluated_at:number|null;reason:string;revision:number;next_at:number;last_notified_at:number|null;created_at:number; }
export const decodeRule = (row: RuleRow): Rule => ({ ...json<Omit<Rule,'id'>>(row.config),id:row.id,name:row.name,state:row.state,since:row.since,latched:Boolean(row.latched),incidentOpen:Boolean(row.incident_open),value:row.value,sampleAt:row.sample_at,evaluatedAt:row.evaluated_at,reason:row.reason,revision:row.revision,nextAt:row.next_at,lastNotifiedAt:row.last_notified_at,createdAt:row.created_at });
export const event = (ruleId:number|null,name:string,kind:string,description:string,time=now()) => run('INSERT INTO alert_history (rule_id,name,kind,description,created_at) VALUES (?,?,?,?,?)',[ruleId,name,kind,description.slice(0,1000),time]);
export async function ruleRow(id:number) { const row=await get<RuleRow>('SELECT * FROM alert_rules WHERE id=?',[id]);if(!row)throw new HttpError(404,'Alert rule not found.');return decodeRule(row); }
export async function contactRow(id:number) { const row=await get<{id:number;config:string}>('SELECT * FROM alert_contacts WHERE id=?',[id]);if(!row)throw new HttpError(404,'Contact point not found.');return { ...json<Contact>(row.config),id:row.id }; }
export async function silenced(ruleId:number,time=now()) { return Boolean(await get('SELECT id FROM alert_silences WHERE rule_id=? AND starts_at<=? AND ends_at>?',[ruleId,time,time])); }
export const listRules = () => access(async()=>{await alertsReady;return (await all<RuleRow>('SELECT * FROM alert_rules ORDER BY id')).map(decodeRule);});
export const listContacts = () => access(async()=>{await alertsReady;return (await all<{id:number;config:string}>('SELECT * FROM alert_contacts ORDER BY id')).map(row=>({...json<Contact>(row.config),id:row.id}));});
export async function saveRule(id:number|null,input:Record<string,unknown>,actor:string) {
 return access(async()=>{
  await alertsReady;if(id)await ruleRow(id);
  const source=sourceInput(input.source), name=text(input.name,100,true),operator=input.operator;
  if(!['>','<'].includes(String(operator)))throw new HttpError(400,'Choose a threshold operator.');
  const threshold=finite(input.threshold,'trigger limit'),recovery=finite(input.recovery,'recovery limit');
  if(operator==='>'?recovery>=threshold:recovery<=threshold)throw new HttpError(400,'The recovery limit must be below an upper trigger or above a lower trigger.');
  const contactIds=idList(input.contactIds||[]);if(contactIds.length>10)throw new HttpError(400,'Choose no more than 10 contact points.');for(const contact of contactIds)await contactRow(contact);
  if(typeof input.enabled!=='boolean'||!['Warning','Critical'].includes(String(input.severity)))throw new HttpError(400,'Invalid rule status or severity.');
  const config={source,operator,threshold,recovery,pendingSeconds:integer(input.pendingSeconds??120,0,86400,'pending period'),intervalSeconds:integer(input.intervalSeconds??30,10,3600,'evaluation interval'),repeatSeconds:integer(input.repeatSeconds??3600,900,604800,'repeat interval'),severity:input.severity,contactIds,enabled:input.enabled};
  if(id){await run("UPDATE alert_rules SET name=?,config=?,state=?,since=NULL,latched=0,incident_open=0,value=NULL,sample_at=NULL,revision=revision+1,next_at=0,last_notified_at=NULL,reason='Rule updated; awaiting evaluation.' WHERE id=?",[name,JSON.stringify(config),input.enabled?'No data':'Paused',id]);await run("UPDATE alert_outbox SET status='cancelled',reason='Rule updated.' WHERE rule_id=? AND status IN ('pending','blocked')",[id]);}
  else {if((await get<{count:number}>('SELECT COUNT(*) AS count FROM alert_rules'))!.count>=100)throw new HttpError(400,'Limit of 100 rules reached.');id=(await run('INSERT INTO alert_rules(name,config,state,created_at) VALUES (?,?,?,?)',[name,JSON.stringify(config),input.enabled?'No data':'Paused',now()])).id;}
  await event(id,name,'Rule',`${actor} ${input.enabled?'saved an enabled rule':'saved a paused rule'}.`);return ruleRow(id);
 },true);
}
export const removeRule=(id:number,actor:string)=>access(async()=>{const rule=await ruleRow(id);await run('DELETE FROM alert_rules WHERE id=?',[id]);await event(id,rule.name,'Rule',`${actor} deleted the rule.`);},true);
export const enableRule=(id:number,enabled:unknown,actor:string)=>access(async()=>{if(typeof enabled!=='boolean')throw new HttpError(400,'Invalid status.');const rule=await ruleRow(id);const config={...rule,enabled};await run('UPDATE alert_rules SET config=?,state=?,since=NULL,next_at=0,revision=revision+1 WHERE id=?',[JSON.stringify(config),enabled?'No data':'Paused',id]);await run("UPDATE alert_outbox SET status='cancelled',reason='Evaluation status changed.' WHERE rule_id=? AND status IN ('pending','blocked')",[id]);await event(id,rule.name,'Rule',`${actor} ${enabled?'resumed':'paused'} evaluation.`);return ruleRow(id);},true);
export function saveContact(id:number|null,input:Record<string,unknown>,actor:string) {
 return access(async()=>{
  if(id)await contactRow(id);else if((await get<{count:number}>('SELECT COUNT(*) AS count FROM alert_contacts'))!.count>=100)throw new HttpError(400,'Limit of 100 contact points reached.');if(input.kind!=='email'&&input.kind!=='telegram')throw new HttpError(400,'Choose email or Telegram.');
  if(!Array.isArray(input.recipients)||!input.recipients.length||input.recipients.length>20)throw new HttpError(400,'Enter 1–20 recipients.');
  const recipients=[...new Set(input.recipients.map(value=>input.kind==='email'?emailAddress(value):String(value).trim()))];
  if(input.kind==='telegram'&&recipients.some(value=>!/^-?[1-9]\d{0,15}$/.test(value)||!Number.isSafeInteger(Number(value))))throw new HttpError(400,'Enter valid numeric Telegram chat IDs.');
  if(typeof input.enabled!=='boolean'||typeof input.consent!=='boolean')throw new HttpError(400,'Invalid contact settings.');
  if(input.kind==='telegram'&&input.enabled&&!input.consent)throw new HttpError(400,'Recipient permission is required for Telegram notifications.');
  const config={name:text(input.name,80,true),kind:input.kind,recipients,enabled:input.enabled,consent:input.consent};
  if(id)await run('UPDATE alert_contacts SET config=? WHERE id=?',[JSON.stringify(config),id]);else id=(await run('INSERT INTO alert_contacts(config) VALUES (?)',[JSON.stringify(config)])).id;
  await run("UPDATE alert_outbox SET status='cancelled',reason='Contact point updated.' WHERE contact_id=? AND status='pending'",[id]);
  await event(null,config.name,'Contact point',`${actor} saved the contact point.`);return contactRow(id);
 },true);
}
export const removeContact=(id:number,actor:string)=>access(async()=>{const contact=await contactRow(id);const rules=(await all<RuleRow>('SELECT * FROM alert_rules')).map(decodeRule);if(rules.some(rule=>rule.contactIds.includes(id)))throw new HttpError(409,'Remove this contact point from its rules first.');await run('DELETE FROM alert_contacts WHERE id=?',[id]);await event(null,contact.name,'Contact point',`${actor} deleted the contact point.`);},true);
export const listSilences=()=>access(()=>all('SELECT s.*,r.name AS ruleName FROM alert_silences s JOIN alert_rules r ON r.id=s.rule_id WHERE ends_at>? ORDER BY ends_at',[now()]));
export const createSilence=(input:Record<string,unknown>,actor:string)=>access(async()=>{const id=integer(input.ruleId,1,Number.MAX_SAFE_INTEGER,'rule'),rule=await ruleRow(id);const minutes=integer(input.minutes,1,10080,'silence duration');await run('INSERT INTO alert_silences(rule_id,reason,starts_at,ends_at,actor) VALUES (?,?,?,?,?)',[id,text(input.reason,200,true),now(),now()+minutes*60000,actor]);await event(id,rule.name,'Silence',`${actor} silenced notifications for ${minutes} minutes. Evaluation continues.`);},true);
export const endSilence=(id:number,actor:string)=>access(async()=>{const row=await get<{rule_id:number;name:string}>('SELECT s.rule_id,r.name FROM alert_silences s JOIN alert_rules r ON r.id=s.rule_id WHERE s.id=?',[id]);if(!row)throw new HttpError(404,'Silence not found.');await run('UPDATE alert_silences SET ends_at=? WHERE id=?',[now(),id]);await event(row.rule_id,row.name,'Silence',`${actor} ended the silence.`);},true);
export const getHistory=(offset:number)=>access(()=>all('SELECT * FROM alert_history ORDER BY id DESC LIMIT 100 OFFSET ?',[offset]));
export const getDeliveries=()=>access(()=>all('SELECT id,rule_id,contact_id,recipient,phase,status,attempts,reason,created_at,provider_id FROM alert_outbox ORDER BY id DESC LIMIT 100'));
