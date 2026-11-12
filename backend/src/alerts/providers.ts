import { emailSettings, sendAlertEmail } from '../users/mail';
import type { Contact } from './types';

export function telegramSettings() {
 const enabled = process.env.TELEGRAM_ENABLED === 'true';
 const token = process.env.TELEGRAM_BOT_TOKEN || '';
 return { enabled, configured: enabled && /^\d+:[A-Za-z0-9_-]+$/.test(token) };
}

export const providerReady = (kind: Contact['kind']) =>
 kind === 'email' ? emailSettings().configured : telegramSettings().configured;

export interface Message {
 name: string;
 phase: string;
 severity: string;
 target: string;
 reading: string;
 condition: string;
}

export async function deliver(contact: Contact, recipient: string, message: Message): Promise<string> {
 if (!providerReady(contact.kind)) throw new Error('Provider not configured.');
 const title = 'Tomatoes: ' + message.phase + ' - ' + message.name;
 const details = [
  message.severity + ' | ' + message.target,
  'State: ' + message.phase,
  'Reading: ' + message.reading,
  'Condition: ' + message.condition,
 ].join('\n');

 if (contact.kind === 'email') {
  await sendAlertEmail(recipient, title, details);
  return 'Accepted by SMTP server';
 }

 // Do not pass transport errors upstream: the request URL contains the bot token.
 try {
  const response = await fetch('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ chat_id: Number(recipient), text: title + '\n' + details }),
   redirect: 'error',
   signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error();
  const body = await response.json() as { ok?: boolean; result?: { message_id?: number } };
  const messageId = body.result?.message_id;
  if (body.ok && Number.isSafeInteger(messageId)) return String(messageId);
 } catch {
  throw new Error('Telegram request failed. Check the bot configuration, chat ID and connectivity.');
 }
 throw new Error('Telegram acceptance could not be confirmed.');
}
