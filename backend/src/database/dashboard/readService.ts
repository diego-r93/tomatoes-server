import { HttpError } from '../../users/types';
import { createSchemaCatalog } from '../influxdb/schemaCatalog';
import sensorDataModel from '../influxdb/models/sensorDataModel';
import { findDashboard, findDashboardCharts } from './readRepository';

export async function readDashboard(id: string) {
  const item = await findDashboard(id);
  if (!item) throw new HttpError(404, 'Dashboard not found.');
  return item;
}

export async function readLegacyCharts() {
  const item = await findDashboard('existing-charts');
  return item?.charts || [];
}

export async function readDashboardSchema(bucket: string, measurement: string, tag: string) {
  if (!bucket || bucket.length > 200 || measurement.length > 200 || tag.length > 100) {
    throw new HttpError(400, 'Select a valid bucket and measurement.');
  }

  const catalog = createSchemaCatalog(bucket);
  if (!measurement) return { bucket, measurements: await catalog('measurements') };
  if (tag) return { values: await catalog('measurementTagValues', measurement, tag) };

  const [fields, tags] = await Promise.all([
    catalog('measurementFieldKeys', measurement),
    catalog('measurementTagKeys', measurement),
  ]);
  return { bucket, measurement, fields, tags: tags.filter(value => !String(value).startsWith('_')) };
}

function validBound(value: unknown, start: boolean): value is string {
  if (typeof value !== 'string') return false;
  if (start ? /^-[1-9]\d{0,7}[smhdw]$/.test(value) : value === 'now()') return true;
  return /^time\(v: "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\)$/.test(value);
}

export async function readSavedPanel({ dashboardId, panelId, start, stop, window }: {
  dashboardId?: unknown;
  panelId?: unknown;
  start?: unknown;
  stop?: unknown;
  window?: unknown;
}) {
  if (typeof dashboardId !== 'string' || dashboardId.length > 128 ||
      typeof panelId !== 'string' || panelId.length > 128 ||
      !validBound(start, true) || !validBound(stop, false) ||
      typeof window !== 'string' || !/^[1-9]\d{0,7}(ms|s|m|h)$/.test(window)) {
    throw new HttpError(400, 'Invalid dashboard panel or time range.');
  }
  const dashboard = await findDashboardCharts(dashboardId);
  const panel = dashboard?.charts.find(chart => String(chart.id) === panelId);
  if (!panel?.query) throw new HttpError(404, 'The saved dashboard panel does not exist.');
  const query = panel.query
    .replace(/\bv\.timeRangeStart\b/g, () => start)
    .replace(/\bv\.timeRangeStop\b/g, () => stop)
    .replace(/\bv\.windowPeriod\b/g, () => window);
  return sensorDataModel.getSensorData(query);
}
