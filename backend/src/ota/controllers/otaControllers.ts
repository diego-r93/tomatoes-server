import { createHash, createHmac } from 'node:crypto';
import { isIPv4 } from 'node:net';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { recentDevice } from '../../alerts/sources';
import { context } from '../../users/http';
import { HttpError } from '../../users/types';

export const MAX_FIRMWARE_BYTES = 6553600;
const activeHosts = new Set<string>();
const logs = () => mongoose.connection.collection('ota_logs');

export function firmwareKey() {
  const key = process.env.OTA_HMAC_KEY;
  if (!key || !/^[\x20-\x7e]{32,}$/.test(key)) throw new HttpError(503, 'Firmware signing is unavailable.');
  return key;
}

export function signFirmware(key: string, host: string, nonce: string, size: number, sha256: string) {
  return createHmac('sha256', key).update(['tomatoes-ota-v1', host, nonce, String(size), sha256].join('\n')).digest('hex');
}

function privateAddress(ip: string) {
  if (!isIPv4(ip)) return false;
  const [first, second] = ip.split('.').map(Number);
  return first === 10 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168;
}

export async function uploadOTAFile(req: Request, res: Response) {
  const key = firmwareKey();
  const host = req.params.host;
  const image = req.file?.buffer;
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(host) || !image?.length || image.length > MAX_FIRMWARE_BYTES || image[0] !== 0xe9) {
    throw new HttpError(400, 'Select a valid ESP32 firmware image.');
  }
  if (activeHosts.has(host)) throw new HttpError(409, 'An update is already running for this board.');
  activeHosts.add(host);
  const sha256 = createHash('sha256').update(image).digest('hex');
  let status = 502;
  let result: { ok: boolean; error?: string; restart_in_ms?: number } = { ok: false, error: 'The board did not confirm the firmware update.' };
  try {
    const { insertedId } = await logs().insertOne({
      userId: context(res).user.id, username: context(res).user.username,
      date: new Date(), host, size: image.length, sha256, result: 'started',
    });
    try {
      const ip = (await recentDevice(host))?.ip;
      if (!ip || !privateAddress(ip)) throw new HttpError(409, 'The board has no recent discovery response with a valid address.');
      const url = `http://${ip}/update`;
      const options = { signal: AbortSignal.timeout(120000), redirect: 'error' as const };
      const nonceResponse = await fetch(url + '/nonce', options);
      if (!nonceResponse.ok) throw new HttpError(nonceResponse.status === 409 ? 409 : 502, 'The board refused the update nonce.');
      const challenge = await nonceResponse.json();
      if (challenge?.host !== host || typeof challenge.nonce !== 'string' || !/^[a-f0-9]{32}$/i.test(challenge.nonce)) {
        throw new HttpError(502, 'The board returned an invalid identity or nonce.');
      }
      const signature = signFirmware(key, host, challenge.nonce, image.length, sha256);
      const body = new FormData();
      body.append('file', new Blob([Uint8Array.from(image)]), 'firmware.bin');
      const reply = await fetch(url, {
        ...options, method: 'POST', body,
        headers: { 'X-OTA-Nonce': challenge.nonce, 'X-OTA-Size': String(image.length), 'X-OTA-SHA256': sha256, 'X-OTA-Signature': signature },
      });
      const data = await reply.json();
      if (!data || typeof data.ok !== 'boolean' || reply.ok !== data.ok || ![200, 400, 401, 409, 500, 503].includes(reply.status)) {
        throw new HttpError(502, 'The board returned an invalid firmware result.');
      }
      status = reply.status;
      result = { ok: data.ok };
      if (typeof data.error === 'string') result.error = data.error.replaceAll(key, '[redacted]').replaceAll(signature, '[redacted]').slice(0, 500);
      if (Number.isSafeInteger(data.restart_in_ms) && data.restart_in_ms >= 0) result.restart_in_ms = data.restart_in_ms;
    } catch (error) {
      if (error instanceof HttpError) { status = error.status; result = { ok: false, error: error.message }; }
      else if (error instanceof Error && error.name === 'TimeoutError') { status = 504; result = { ok: false, error: 'Timed out waiting for the board. Check its status before trying again.' }; }
    }
    await logs().updateOne({ _id: insertedId }, { $set: { result: result.ok ? 'success' : 'failed', status, completedAt: new Date() } })
      .catch(() => console.error('Could not finalize the firmware audit record.'));
    res.status(status).json({ ...result, sha256 });
  } finally {
    activeHosts.delete(host);
  }
}
