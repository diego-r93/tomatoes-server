import { isAxiosError } from 'axios';
import { formatDateTime } from '@/composables/dateTime.mjs';
import { http } from './http-common';

export type AlertState = 'Normal' | 'Pending' | 'Firing' | 'No data' | 'Error' | 'Paused';
export type Severity = 'Warning' | 'Critical';
export type ContactKind = 'email' | 'whatsapp';
export type NotificationKind = ContactKind | 'inapp';
export type SourceKind = 'device_age' | 'wifi' | 'output_on' | 'cpu_temperature' | 'disk_usage' | 'metric' | 'metric_age' | 'pump_driver';
type DriverCondition = 'failure' | 'missing' | 'short' | 'temperature' | 'supply';
type NumericInput = number | string;

export interface AlertSource {
  kind: SourceKind;
  host: string;
  gpio?: number;
  pump?: number;
  condition?: DriverCondition;
  device?: string;
  path?: string;
  measurement?: string;
  field?: string;
  unit?: string;
  scale?: number;
  topic?: string;
  freshnessSeconds: number;
}

export interface Rule {
  id: number;
  name: string;
  source: AlertSource;
  operator: '>' | '<';
  threshold: number;
  recovery: number;
  pendingSeconds: number;
  intervalSeconds: number;
  repeatSeconds: number;
  severity: Severity;
  contactIds: number[];
  enabled: boolean;
  state: AlertState;
  value: number | null;
  sampleAt: number | null;
  evaluatedAt: number | null;
  reason: string;
}

export type RuleDraft = Pick<Rule, 'name' | 'operator' | 'severity' | 'contactIds' | 'enabled'> & {
  id?: number;
  source: Omit<AlertSource, 'gpio' | 'scale' | 'freshnessSeconds'> & {
    gpio?: NumericInput;
    scale?: NumericInput;
    freshnessSeconds: NumericInput;
  };
  threshold: NumericInput;
  recovery: NumericInput;
  pendingSeconds: NumericInput;
  intervalSeconds: NumericInput;
  repeatSeconds: NumericInput;
};

export interface Contact {
  id: number;
  name: string;
  kind: ContactKind;
  recipients: string[];
  enabled: boolean;
  consent: boolean;
  template: string;
  language: string;
}

export type ContactDraft = Omit<Contact, 'id'> & { id?: number };
export interface AlertDevice { host: string; received_at: number }
export interface AlertSettings {
  canManage: boolean;
  email: boolean;
  whatsapp: { configured: boolean };
  monitor: { running: boolean; error: string; lastTick: number | null };
  mqtt: { mqttConnected: boolean };
  influxConfigured: boolean;
  devices: AlertDevice[];
}

export interface Silence {
  id: number;
  rule_id: number;
  ruleName: string;
  reason: string;
  ends_at: number;
  actor: string;
}

export interface AlertEvent {
  id: number;
  name: string;
  description: string;
  kind: string;
  created_at: number;
}

export interface Delivery {
  id: number;
  recipient: string;
  phase: string;
  reason: string;
  attempts: number;
  status: string;
  created_at: number;
}

interface AlertReads {
  settings: AlertSettings;
  rules: Rule[];
  contacts: Contact[];
  silences: Silence[];
  history: AlertEvent[];
  deliveries: Delivery[];
}

const root = '/api/alerts';
function saveItem<T>(path: 'rules' | 'contacts', item: RuleDraft | ContactDraft) {
  return item.id
    ? http.put<T>(`${root}/${path}/${item.id}`, item).then(response => response.data)
    : http.post<T>(`${root}/${path}`, item).then(response => response.data);
}

export const alertService = {
  get<K extends keyof AlertReads>(path: K, params?: { offset: number }) {
    return http.get<AlertReads[K]>(`${root}/${path}`, { params, timeout: 15000 }).then(response => response.data);
  },
  saveRule: (item: RuleDraft) => saveItem<Rule>('rules', item),
  saveContact: (item: ContactDraft) => saveItem<Contact>('contacts', item),
  saveSilence: (item: { ruleId: number | null; minutes: NumericInput; reason: string }) => http.post<unknown>(`${root}/silences`, item),
  remove: (path: 'rules' | 'contacts' | 'silences', id: number) => http.delete<unknown>(`${root}/${path}/${id}`),
  enabled: (id: number, enabled: boolean) => http.patch<Rule>(`${root}/rules/${id}`, { enabled }),
};

export function alertError(error: unknown) {
  const message = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
  return message || 'The alert service is unavailable. Please try again.';
}

export const dateLabel = (value: number | null | undefined) => formatDateTime(value, 'Browser', 'Never');
type SourceLabel = Pick<AlertSource, 'kind' | 'pump' | 'condition' | 'measurement' | 'unit'>;
export const sourceLabel = (source: SourceLabel) => ({
  pump_driver: `Pump ${String(source.pump).padStart(2, '0')} driver / ${source.condition}`,
  device_age: 'Device last seen', wifi: 'Wi-Fi signal', output_on: 'GPIO ON duration',
  cpu_temperature: 'CPU temperature', disk_usage: 'Disk usage',
  metric_age: 'Telemetry age', metric: source.measurement || 'Sensor metric',
}[source.kind]);
export const ruleUnit = (source: SourceLabel) => ({
  pump_driver: '', device_age: 'sec', wifi: 'dBm', output_on: 'sec', cpu_temperature: '°C',
  disk_usage: '%', metric_age: 'sec', metric: source.unit || '',
}[source.kind]);
