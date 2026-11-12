import { HttpError, text } from '../users/types';
export type AlertState = 'Normal' | 'Pending' | 'Firing' | 'No data' | 'Error' | 'Paused';
export type Source = { kind: 'device_age' | 'wifi' | 'output_on' | 'cpu_temperature' | 'disk_usage' | 'metric' | 'metric_age' | 'pump_driver'; host: string; gpio?: number; pump?: number; condition?: 'failure' | 'missing' | 'short' | 'temperature' | 'supply'; device?: string; path?: string; measurement?: string; field?: string; unit?: string; scale?: number; topic?: string; freshnessSeconds: number };
export interface Rule { id: number; name: string; source: Source; operator: '>' | '<'; threshold: number; recovery: number; pendingSeconds: number; intervalSeconds: number; repeatSeconds: number; severity: 'Warning' | 'Critical'; contactIds: number[]; enabled: boolean; state: AlertState; since: number | null; latched: boolean; incidentOpen: boolean; value: number | null; sampleAt: number | null; evaluatedAt: number | null; reason: string; revision: number; nextAt: number; lastNotifiedAt: number | null; createdAt: number; }
export interface Sample { health: 'ok' | 'missing' | 'error'; value?: number; at?: number; reason?: string; }
export interface Contact { id: number; name: string; kind: 'email' | 'telegram'; recipients: string[]; enabled: boolean; consent: boolean; }
export const now = () => Date.now();
export const json = <T>(value: string): T => JSON.parse(value);
export function integer(value: unknown, min: number, max: number, name: string) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new HttpError(400, `Invalid ${name}.`); return number; }
export function finite(value: unknown, name: string) { if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) throw new HttpError(400, `Invalid ${name}.`); return Number(value); }
export function sourceInput(value: unknown): Source {
 const input = value as Partial<Source>;
 if (!input || !['device_age','wifi','output_on','cpu_temperature','disk_usage','metric','metric_age','pump_driver'].includes(input.kind || '')) throw new HttpError(400, 'Choose a supported source.');
 const host = text(input.host,128,true); if (!/^[a-zA-Z0-9._-]+$/.test(host)) throw new HttpError(400,'Invalid target hostname.');
 const result: Source = { kind: input.kind!, host, freshnessSeconds: integer(input.freshnessSeconds ?? 180,30,86400,'sample freshness') };
 if (result.kind === 'output_on') result.gpio = integer(input.gpio,0,255,'GPIO');
 if (result.kind === 'pump_driver') {
  result.pump = integer(input.pump,1,4,'pump number');
  if (!['failure','missing','short','temperature','supply'].includes(input.condition || '')) throw new HttpError(400,'Choose a driver condition.');
  result.condition = input.condition;
 }
 if (result.kind === 'disk_usage') result.path = text(input.path,256,true);
 if (['metric','metric_age'].includes(result.kind)) {
  for (const key of ['measurement','field'] as const) { const part = text(input[key],80,true); if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(part)) throw new HttpError(400,`Invalid ${key}.`); result[key] = part; }
  if (input.device) { result.device = text(input.device,64,true); if (!/^[a-zA-Z0-9_-]+$/.test(result.device)) throw new HttpError(400,'Invalid device tag.'); }
  result.topic = text(input.topic,512,result.kind === 'metric_age' && !result.device);
  result.unit = text(input.unit,24); result.scale = finite(input.scale ?? 1,'scale'); if (result.scale <= 0 || result.scale > 1000) throw new HttpError(400,'Scale must be positive and no greater than 1000.');
 }
 return result;
}
export const unitFor = (source: Source) => ({ device_age:'sec',wifi:'dBm',output_on:'sec',cpu_temperature:'°C',disk_usage:'%',metric_age:'sec',pump_driver:'',metric:source.unit || '' }[source.kind]);
export function transition(rule: Rule, sample: Sample, time: number): { state: AlertState; since: number | null; latched: boolean; incidentOpen: boolean; notify: string | null; reason: string } {
 let state: AlertState, since = rule.since, latched = rule.latched, reason = sample.reason || '';
 if (!rule.enabled) return { state:'Paused',since:null,latched,incidentOpen:rule.incidentOpen,notify:null,reason:'Evaluation paused.' };
 if (sample.health !== 'ok' || !Number.isFinite(sample.value)) { state = sample.health === 'error' ? 'Error' : 'No data'; since = null; }
 else {
  const value = sample.value!;
  const recovered = rule.operator === '>' ? value <= rule.recovery : value >= rule.recovery;
  const breached = rule.operator === '>' ? value > rule.threshold : value < rule.threshold;
  if (latched && !recovered) { state='Firing'; reason='Waiting for the recovery threshold.'; }
  else if (breached) { since = since ?? time; state = time-since >= rule.pendingSeconds*1000 ? 'Firing' : 'Pending'; latched = state==='Firing'; reason=state==='Firing'?'Condition persisted for the pending period.':'Waiting for a continuous threshold breach.'; }
  else { state='Normal'; since=null; latched=false; reason='Condition is within the recovery limits.'; }
 }
 const active = ['Firing','No data','Error'].includes(state);
 const notify = active && (state !== rule.state || !rule.incidentOpen) ? state : state==='Normal' && rule.incidentOpen ? 'Resolved' : null;
 return { state,since,latched,incidentOpen:active ? true : state==='Normal' ? false : rule.incidentOpen,notify,reason };
}
