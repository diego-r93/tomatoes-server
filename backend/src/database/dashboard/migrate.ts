import fs from 'fs';
import path from 'path';
import { isDeepStrictEqual } from 'util';
import Dashboard from './models/dashboard.model';
import { validateCharts } from './validation';

export const legacyChartsFile = path.resolve(__dirname, 'config/charts.json');

export async function migrateCharts(file = legacyChartsFile) {
  if (!fs.existsSync(file)) return { migrated: false, count: 0 };
  const charts = validateCharts(JSON.parse(fs.readFileSync(file, 'utf8')));
  const existing = await Dashboard.findById('existing-charts').lean();
  if (existing) {
    // A migrated dashboard may have been edited; never overwrite it on restart.
    return { migrated: false, count: existing.charts.length };
  }
  await Dashboard.updateOne({ _id: 'existing-charts' }, { $setOnInsert: {
    name: 'Existing charts', description: 'Charts migrated from the original JSON configuration.', folder: 'General',
    tags: ['migrated'], charts, revision: 1,
    settings: { range: '-1h', refresh: 'Off', timezone: 'Browser' },
  } }, { upsert: true });
  const stored = await Dashboard.findById('existing-charts').lean();
  if (!stored || !isDeepStrictEqual(stored.charts, charts)) throw new Error('Dashboard migration verification failed. The source JSON was kept.');
  // Keep the source file until an operator verifies the export and archives it.
  console.log(`Dashboard migration verified: ${charts.length} charts.`);
  return { migrated: true, count: charts.length };
}
