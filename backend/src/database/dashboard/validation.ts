import { HttpError } from '../../users/types';

export function validateCharts(value: unknown): any[] {
  if (!Array.isArray(value) || value.length > 100) throw new HttpError(400, 'Charts must be an array with at most 100 panels.');
  const ids = new Set<string>();
  for (const chart of value) {
    if (!chart || typeof chart !== 'object' || Array.isArray(chart) || !['string', 'number'].includes(typeof chart.id) || ids.has(String(chart.id))) throw new HttpError(400, 'Every panel needs a unique ID.');
    ids.add(String(chart.id));
    if (typeof chart.query !== 'string' || chart.query.length > 50000 || !chart.options || typeof chart.options !== 'object' || !chart.layout) throw new HttpError(400, 'Each panel needs a query, options and layout.');
    if (typeof chart.options.chartTitle !== 'string' || chart.options.chartTitle.length > 200) throw new HttpError(400, 'Panel titles must contain at most 200 characters.');
    for (const key of ['x', 'y', 'w', 'h']) if (!Number.isInteger(chart.layout[key]) || chart.layout[key] < (['w', 'h'].includes(key) ? 1 : 0) || chart.layout[key] > (key === 'w' || key === 'x' ? 12 : 10000)) throw new HttpError(400, 'Panel layout is invalid.');
    if (!Array.isArray(chart.data) || chart.data.length) throw new HttpError(400, 'Save chart definitions with an empty data array. Samples stay in InfluxDB.');
    if (chart.processing) {
      const p = chart.processing;
      for (const key of ['multiplier', 'offset']) if (typeof p[key] !== 'number' || !Number.isFinite(p[key])) throw new HttpError(400, 'Panel processing requires finite numbers.');
      if (!Number.isInteger(p.decimals) || p.decimals < 0 || p.decimals > 6) throw new HttpError(400, 'Decimal places must be from 0 to 6.');
      for (const key of ['minimum', 'maximum']) if (p[key] !== '' && p[key] !== null && (typeof p[key] !== 'number' || !Number.isFinite(p[key]))) throw new HttpError(400, 'Clamp limits must be numbers or blank.');
      if (p.minimum !== '' && p.minimum !== null && p.maximum !== '' && p.maximum !== null && p.minimum > p.maximum) throw new HttpError(400, 'Clamp minimum must not exceed maximum.');
    }
  }
  if (Buffer.byteLength(JSON.stringify(value)) > 1500000) throw new HttpError(400, 'Dashboard definitions are too large.');
  return value;
}

export function validateDashboard(body: any) {
  if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 160) throw new HttpError(400, 'Enter a dashboard name with at most 160 characters.');
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) throw new HttpError(400, 'Description is too long.');
  if (body.folder !== undefined && (typeof body.folder !== 'string' || body.folder.length > 100)) throw new HttpError(400, 'Folder is invalid.');
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 20 || body.tags.some((tag: unknown) => typeof tag !== 'string' || tag.length > 60))) throw new HttpError(400, 'Tags are invalid.');
  const settings = body.settings || {};
  const range = /^-\d+(m|h|d|w)$/;
  const duration = /^\d+(ms|s|m|h)$/;
  if (settings.range && !range.test(settings.range)) throw new HttpError(400, 'Default time range is invalid.');
  const allowed = ['Off', '2s', '5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '6h'];
  if (settings.refresh && !allowed.includes(settings.refresh)) throw new HttpError(400, 'Refresh interval is invalid.');
  if (settings.intervals && (!Array.isArray(settings.intervals) || !settings.intervals.length || settings.intervals.some((item: string) => !allowed.slice(1).includes(item)))) throw new HttpError(400, 'Available refresh intervals are invalid.');
  if (settings.window && !duration.test(settings.window)) throw new HttpError(400, 'Aggregation window is invalid.');
  if (settings.timezone && !['Browser', 'UTC', 'America/Sao_Paulo'].includes(settings.timezone)) throw new HttpError(400, 'Timezone is invalid.');
  if (settings.refresh && settings.refresh !== 'Off' && settings.intervals && !settings.intervals.includes(settings.refresh)) throw new HttpError(400, 'Default refresh must be in the available intervals.');
  return { name: body.name.trim(), description: body.description || '', folder: body.folder || 'General', tags: body.tags || [], favorite: Boolean(body.favorite), settings, charts: validateCharts(body.charts) };
}
