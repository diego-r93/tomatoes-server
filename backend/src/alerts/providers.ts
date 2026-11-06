import { emailSettings, sendAlertEmail } from '../users/mail';
import { Contact } from './types';
export function whatsappSettings() {
 const enabled=process.env.WHATSAPP_ENABLED==='true';
 const configured=enabled&&/^v[0-9]+\.[0-9]+$/.test(process.env.WHATSAPP_API_VERSION||'')&&/^[0-9]+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID||'')&&Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&!process.env.WHATSAPP_ACCESS_TOKEN.startsWith('CHANGE_ME'));
 return {enabled,configured:Boolean(configured)};
}
export const providerReady=(kind:Contact['kind'])=>kind==='email'?emailSettings().configured:whatsappSettings().configured;
export interface Message {name:string;phase:string;severity:string;target:string;reading:string;condition:string;}
export function templateBody(contact:Contact,recipient:string,message:Message) {
 return {messaging_product:'whatsapp',to:recipient.replace(/^\+/,''),type:'template',template:{name:contact.template,language:{code:contact.language},components:[{type:'body',parameters:[message.name,message.phase,message.severity,message.target,message.reading,message.condition].map(value=>({type:'text',text:value.replace(/[\r\n\t]/g,' ').slice(0,180)||'Not available'}))}]}};
}
export async function deliver(contact:Contact,recipient:string,message:Message):Promise<string> {
 if(!providerReady(contact.kind))throw new Error('Provider not configured.');
 if(contact.kind==='email') {
  await sendAlertEmail(recipient,`Tomatoes: ${message.phase} - ${message.name}`,`${message.severity} | ${message.target}\nState: ${message.phase}\nReading: ${message.reading}\nCondition: ${message.condition}`);
  return 'Accepted by SMTP server';
 }
 const response=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(templateBody(contact,recipient,message)),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error(`WhatsApp provider rejected the request (HTTP ${response.status}).`);
 const body=await response.json() as {messages?:{id?:string}[]};
 if(!body.messages?.[0]?.id)throw new Error('WhatsApp acceptance could not be confirmed.');
 return body.messages[0].id.slice(0,200);
}
