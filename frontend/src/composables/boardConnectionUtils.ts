export interface BoardConnectionSnapshot {
  devices?: { host: string; received_at?: number | null }[];
  checkedAt: number;
  monitorRunning?: boolean;
  mqttConnected?: boolean;
  lastDiscovery?: number | null;
  error?: boolean;
}

interface BoardConnection {
  host: string;
  state: 'online' | 'unknown' | 'unseen';
  label: string;
  detail: string;
  receivedAt: number | null;
}

import { lastSeenLabel } from './deviceInventoryUtils.ts';

export const boardHost = (value: unknown) => String(value || '').trim().replace(/#[^#]*$/, '');
type Translate = (key: string, values?: Record<string, unknown>) => string;
const english: Translate = (key, values = {}) => key.replace(
  /\{(\w+)\}/g,
  (placeholder, name: string) => Object.hasOwn(values, name) ? String(values[name]) : placeholder,
);

export const CONNECTION_FRESHNESS_MS = 90000;
export function boardConnection(code: string, snapshot: BoardConnectionSnapshot | null, now = Date.now(), t: Translate = english): BoardConnection {
  const host = boardHost(code), row = snapshot?.devices?.find(item => item.host === host);
  const receivedAt = typeof row?.received_at === 'number' && Number.isFinite(row.received_at) && row.received_at > 0 ? row.received_at : null;
  const lastResponse = receivedAt ? t('Last response: {time}.', { time: lastSeenLabel(receivedAt, now, t) }) : t('No response has been observed for this board.');
  const unknown = (reason: string): BoardConnection => ({ host, state: 'unknown', label: t('Unknown'), detail: `${t(reason)} ${lastResponse}`, receivedAt });
  if (!host) return unknown('No board is assigned.');
  if (!snapshot) return unknown('Waiting for connection information.');
  if (snapshot.error) return unknown('Connection information could not be refreshed.');
  if (now - snapshot.checkedAt >= CONNECTION_FRESHNESS_MS) return unknown('Connection information is out of date.');
  if (!snapshot.monitorRunning) return unknown('The discovery monitor is not running.');
  if (!snapshot.mqttConnected) return unknown('The server is not connected to MQTT.');
  if (!snapshot.lastDiscovery || now - snapshot.lastDiscovery >= CONNECTION_FRESHNESS_MS) return unknown('No recent discovery check is available.');
  if (!receivedAt) return unknown('The board has not been observed by the discovery monitor.');
  if (receivedAt > now + 5000) return unknown('The reported time is ahead of the monitor clock.');
  const online = now - receivedAt < CONNECTION_FRESHNESS_MS;
  return { host, state: online ? 'online' : 'unseen', label: t(online ? 'Online' : 'Not seen'), detail: `${lastResponse} ${t(online ? 'The board replied within 90 seconds.' : 'No reply within 90 seconds.')} ${t('This indicates communication, not pump operation.')}`, receivedAt };
}
