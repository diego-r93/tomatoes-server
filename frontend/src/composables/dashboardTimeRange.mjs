const units = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
export const timezoneName = zone => zone === 'Browser' ? Intl.DateTimeFormat().resolvedOptions().timeZone : zone;
function partsAt(milliseconds, zone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezoneName(zone), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(milliseconds);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}
export function timeInput(milliseconds, zone = 'Browser') {
  const p = partsAt(milliseconds, zone), pad = value => String(value).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}
export function parseTime(value, zone = 'Browser', now = Date.now()) {
  const text = String(value || '').trim();
  if (text === 'now') return now;
  const relative = text.match(/^now([+-])(\d+)(s|m|h|d|w)$/);
  if (relative) { const result = now + (relative[1] === '-' ? -1 : 1) * Number(relative[2]) * units[relative[3]]; if (!Number.isFinite(result) || !Number.isFinite(new Date(result).getTime())) throw new Error('Relative time is out of range.'); return result; }
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/);
  if (!match) throw new Error('Use now, now-90m, or YYYY-MM-DD HH:mm:ss. Units: s, m, h, d, w.');
  const [, y, m, d, h = '00', minute = '00', second = '00', fraction = '', offset] = match;
  const values = [Number(y), Number(m), Number(d), Number(h), Number(minute), Number(second)], milliseconds = Number(fraction.padEnd(3, '0'));
  const utc = Date.UTC(values[0], values[1] - 1, ...values.slice(2), milliseconds), check = new Date(utc);
  if (values[0] < 1000 || check.getUTCFullYear() !== values[0] || check.getUTCMonth() + 1 !== values[1] || check.getUTCDate() !== values[2] || check.getUTCHours() !== values[3] || check.getUTCMinutes() !== values[4] || check.getUTCSeconds() !== values[5]) throw new Error('Enter a valid date and time.');
  if (offset) { if (offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4)) > 59)) throw new Error('Invalid UTC offset.'); const result = Date.parse(`${y}-${m}-${d}T${h}:${minute}:${second}.${String(milliseconds).padStart(3, '0')}${offset}`); if (!Number.isFinite(result)) throw new Error('Invalid date and time.'); return result; }
  // Match the wall-clock date in the dashboard timezone, including DST changes.
  let result = utc;
  for (let i = 0; i < 4; i++) { const p = partsAt(result, zone), observed = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, milliseconds); const difference = utc - observed; result += difference; if (!difference) break; }
  const p = partsAt(result, zone);
  if ([p.year, p.month, p.day, p.hour, p.minute, p.second].some((value, i) => value !== values[i])) throw new Error('This local time does not exist in the dashboard timezone. Enter an ISO date with a UTC offset.');
  return result;
}
export function rangeBounds(range, zone = 'Browser', now = Date.now()) {
  const preset = typeof range === 'string';
  if (preset && !/^-\d+(s|m|h|d|w)$/.test(range)) throw new Error('Invalid time range.');
  const from = preset ? 'now' + range : String(range?.from || '').trim(), to = preset ? 'now' : String(range?.to || '').trim();
  const startMs = parseTime(from, zone, now), stopMs = parseTime(to, zone, now);
  if (startMs >= stopMs) throw new Error('From must be earlier than To.');
  const startISO = new Date(startMs).toISOString(), stopISO = new Date(stopMs).toISOString();
  return { from, to, startMs, stopMs, startISO, stopISO, label: `${from} → ${to}`, start: preset ? range : `time(v: "${startISO}")`, stop: preset ? 'now()' : `time(v: "${stopISO}")` };
}
export function rangeWindow(range, zone = 'Browser') {
  const bounds = rangeBounds(range, zone), seconds = (bounds.stopMs - bounds.startMs) / 600000;
  const choices = [[1,'1s'],[2,'2s'],[5,'5s'],[10,'10s'],[15,'15s'],[30,'30s'],[60,'1m'],[120,'2m'],[300,'5m'],[600,'10m'],[900,'15m'],[1800,'30m'],[3600,'1h'],[7200,'2h'],[21600,'6h'],[86400,'24h']];
  return choices.find(([step]) => step >= seconds)?.[1] || `${Math.ceil(seconds / 3600)}h`;
}
