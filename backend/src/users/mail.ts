import nodemailer from 'nodemailer';
import { HttpError } from './types';

const configuredValue = (value: string | undefined) => Boolean(value && !value.startsWith('CHANGE_ME'));
function publicUrl() {
  try {
    const url = new URL(process.env.APP_PUBLIC_URL || '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return '';
    return url.toString().replace(/\/$/, '');
  } catch { return ''; }
}
export function emailSettings() {
  const authType = process.env.SMTP_AUTH_TYPE || 'login';
  const credentials = authType === 'oauth2'
    ? configuredValue(process.env.SMTP_USER) && configuredValue(process.env.SMTP_OAUTH_CLIENT_ID) && configuredValue(process.env.SMTP_OAUTH_REFRESH_TOKEN)
    : (!process.env.SMTP_USER && !process.env.SMTP_PASS) || configuredValue(process.env.SMTP_USER) && configuredValue(process.env.SMTP_PASS);
  const validFrom = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(process.env.SMTP_FROM || '');
  const configured = configuredValue(process.env.SMTP_HOST) && validFrom && Boolean(publicUrl()) && credentials;
  return { configured: Boolean(configured), publicUrl: publicUrl(), defaultInvitationDays: Math.min(30, Math.max(1, Number(process.env.INVITE_EXPIRY_DAYS) || 7)) };
}
export function requireEmail() {
  if (!emailSettings().configured) throw new HttpError(503, 'Email delivery is not configured. Ask the administrator to configure it.');
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
async function send(to: string, subject: string, body: string, link: string, label: string) {
  requireEmail();
  const secure = process.env.SMTP_SECURE === 'true';
  const auth = process.env.SMTP_AUTH_TYPE === 'oauth2' ? {
    type: 'OAuth2' as const, user: process.env.SMTP_USER!, clientId: process.env.SMTP_OAUTH_CLIENT_ID!,
    clientSecret: process.env.SMTP_OAUTH_CLIENT_SECRET || undefined,
    refreshToken: process.env.SMTP_OAUTH_REFRESH_TOKEN!,
    accessUrl: process.env.SMTP_OAUTH_TOKEN_URL || 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  } : process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, secure,
    requireTLS: !secure && process.env.SMTP_REQUIRE_TLS !== 'false', auth,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({
      from: { name: 'Tomatoes', address: process.env.SMTP_FROM! }, to, subject,
      text: `${body}\n\n${label}: ${link}\n\nIf you did not expect this message, you can ignore it.`,
      html: `<h2>${escapeHtml(subject)}</h2><p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p><a href="${escapeHtml(link)}">${escapeHtml(label)}</a></p><p>If you did not expect this message, you can ignore it.</p>`,
    });
    if (!result.accepted?.length) throw new Error('Recipient not accepted');
  } finally { transport.close(); }
}
export async function sendInvitation(invite: { email: string; message: string; expiresAt: string }, rawToken: string) {
  await send(invite.email, 'You are invited to Tomatoes', `You have been invited to join the Tomatoes hydroponics workspace.\n\n${invite.message}\n\nThis invitation expires at ${invite.expiresAt}.`, `${publicUrl()}/invite/${rawToken}`, 'Accept invitation');
}
export async function sendPasswordReset(email: string, rawToken: string) {
  await send(email, 'Reset your Tomatoes password', 'A password reset was requested for your Tomatoes account. This link expires in 30 minutes.', `${publicUrl()}/reset-password/${rawToken}`, 'Reset password');
}

export async function sendAlertEmail(email:string, subject:string, body:string) {
 await send(email,subject,body,`${publicUrl()}/alerting/rules`,'Open alert rules');
}
