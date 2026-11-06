/* Run only when you are ready to authorize your own Microsoft sender account. */
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../../.env');
const scope = 'https://outlook.office.com/SMTP.Send offline_access';
const endpoint = 'https://login.microsoftonline.com/consumers/oauth2/v2.0';
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function post(url, values) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(values), signal: AbortSignal.timeout(30000) });
  return { ok: response.ok, data: await response.json() };
}
async function main() {
  const source = fs.readFileSync(envPath, 'utf8'), config = dotenv.parse(source);
  if (!/^[a-f0-9-]{36}$/i.test(config.SMTP_OAUTH_CLIENT_ID || '')) throw new Error('Set SMTP_OAUTH_CLIENT_ID in .env first.');
  if (!config.SMTP_USER || config.SMTP_FROM !== config.SMTP_USER) throw new Error('Set SMTP_USER and SMTP_FROM to the same Outlook/Hotmail address first.');
  const device = await post(`${endpoint}/devicecode`, { client_id: config.SMTP_OAUTH_CLIENT_ID, scope });
  if (!device.ok) throw new Error(`Microsoft rejected the device request (${device.data.error || 'unknown_error'}). Check the app registration and public client setting.`);
  console.log(`Open ${device.data.verification_uri} and enter ${device.data.user_code}. Sign in as the SMTP_USER account and approve sending email.`);
  let interval = Math.max(5, Number(device.data.interval) || 5), result;
  const deadline = Date.now() + Number(device.data.expires_in) * 1000;
  while (Date.now() < deadline) {
    await pause(interval * 1000);
    const token = await post(`${endpoint}/token`, { client_id: config.SMTP_OAUTH_CLIENT_ID, grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: device.data.device_code });
    if (token.ok) { result = token.data; break; }
    if (token.data.error === 'authorization_pending') continue;
    if (token.data.error === 'slow_down') { interval += 5; continue; }
    throw new Error(`Authorization stopped (${token.data.error || 'unknown_error'}). No token was saved.`);
  }
  if (!result?.refresh_token) throw new Error('Authorization expired or returned no refresh token. No token was saved.');
  if (fs.readFileSync(envPath, 'utf8') !== source) throw new Error('.env changed during authorization. Retry to avoid overwriting your changes.');
  const values = { SMTP_AUTH_TYPE: 'oauth2', SMTP_OAUTH_REFRESH_TOKEN: result.refresh_token, SMTP_OAUTH_TOKEN_URL: `${endpoint}/token` };
  let updated = source;
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${JSON.stringify(value)}`, pattern = new RegExp(`^${key}=.*$`, 'm');
    updated = pattern.test(updated) ? updated.replace(pattern, () => line) : updated.replace(/\s*$/, '\n') + line + '\n';
  }
  fs.writeFileSync(envPath, updated, { mode: 0o600 });
  console.log('Sender authorization saved in .env. No token was printed. Recreate the backend to load the new environment.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
