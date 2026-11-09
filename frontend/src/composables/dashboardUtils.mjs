import { rangeBounds } from './dashboardTimeRange.mjs';
export { alignRows, processValue } from './dashboardSeries.ts';
/** @template T @param {T} value @returns {T} */
export const clone = value => JSON.parse(JSON.stringify(value));
export const refreshIntervals = ['Off', '2s', '5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '6h'];
export const timeRanges = [ ['Last 5 minutes', '-5m', '1s'], ['Last 15 minutes', '-15m', '2s'], ['Last 30 minutes', '-30m', '5s'], ['Last 1 hour', '-1h', '10s'], ['Last 3 hours', '-3h', '20s'], ['Last 6 hours', '-6h', '30s'], ['Last 12 hours', '-12h', '1m'], ['Last 24 hours', '-24h', '2m'], ['Last 3 days', '-3d', '5m'], ['Last 1 week', '-1w', '15m'], ['Last 1 month', '-4w', '1h'], ['Last 3 months', '-12w', '2h'], ['Last 6 months', '-24w', '6h'] ];
export const settingsFor = dashboard => ({ range: '-1h', refresh: 'Off', timezone: 'Browser', intervals: refreshIntervals.slice(1), hideTimePicker: false, pauseHidden: true, bucket: 'tomatoes', ...dashboard?.settings });
/** @param {{ processing?: Partial<import('./dashboardSeries').Processing> }} chart
 * @returns {import('./dashboardSeries').Processing} */
export const processingFor = chart => ({ multiplier: 1, offset: 0, minimum: '', maximum: '', decimals: 2, gaps: 'Gaps', lineWidth: 1.5, showPoints: false, showLegend: true, ...chart.processing });
export function processingError(chart) {
  const p = processingFor(chart);
  if (![p.multiplier, p.offset].every(v => typeof v === 'number' && Number.isFinite(v))) return 'Multiplier and offset must be finite numbers.';
  if (!Number.isInteger(p.decimals) || p.decimals < 0 || p.decimals > 6) return 'Decimal places must be an integer from 0 to 6.';
  for (const k of ['minimum', 'maximum']) if (p[k] !== '' && p[k] !== null && (typeof p[k] !== 'number' || !Number.isFinite(p[k]))) return 'Clamp limits must be numbers or blank.';
  if (p.minimum !== '' && p.minimum !== null && p.maximum !== '' && p.maximum !== null && p.minimum > p.maximum) return 'Clamp minimum must not exceed maximum.';
  if (!Number.isFinite(p.lineWidth) || p.lineWidth < .5 || p.lineWidth > 5) return 'Line width must be between 0.5 and 5.';
  return '';
}
// Replace only supported macros. Never rewrite the saved Flux program.
export function resolveQuery(query, range, window, timezone = 'Browser', now = Date.now()) {
  if (!/^\d+(ms|s|m|h)$/.test(window)) throw new Error('Invalid dashboard aggregation window.');
  const bounds = rangeBounds(range, timezone, now);
  return query.replace(/\bv\.timeRangeStart\b/g, () => bounds.start).replace(/\bv\.timeRangeStop\b/g, () => bounds.stop).replace(/\bv\.windowPeriod\b/g, () => window);
}

export function buildQuery(source) {
  const quote = JSON.stringify;
  let query = `from(bucket: ${quote(source.bucket)})\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r._measurement == ${quote(source.measurement)} and r._field == ${quote(source.field)})`;
  if (source.tag && source.tagValue) query += `\n  |> filter(fn: (r) => r[${quote(source.tag)}] == ${quote(source.tagValue)})`;
  if (source.convertText) query += '\n  |> map(fn: (r) => ({r with _value: float(v: r._value)}))';
  if (source.aggregation !== 'none') query += `\n  |> aggregateWindow(every: v.windowPeriod, fn: ${['mean', 'min', 'max', 'sum', 'last'].includes(source.aggregation) ? source.aggregation : 'mean'}, createEmpty: false)`;
  return query;
}
/** @template T @param {T} chart */
export function chartDefinition(chart) { return { ...clone(chart), data: [] }; }
export function newChart(charts) {
  const id = globalThis.crypto.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
  return { id, data: [], options: { chartTitle: 'New panel', series: [{ label: 'Date' }, { label: 'Value', stroke: '#80cbc4', fill: '#80cbc41a', points: { show: false } }], axes: [{}, {}] }, layout: { x: 0, y: Math.max(0, ...charts.map(c => c.layout.y + c.layout.h)), w: 6, h: 10, i: id }, query: '', processing: processingFor({}) };
}
export function downloadJson(value, name) {
  const url = globalThis.URL.createObjectURL(new globalThis.Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = globalThis.document.createElement('a');a.href = url;a.download = name;a.click();globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
}
