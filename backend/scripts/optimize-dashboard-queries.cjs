// Explicit migration for the stock battery and sensor-free pump queries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const dist = process.env.BACKEND_DIST || '/app/dist';
const db = require(dist + '/database/mongodb/models').default;
const { client, org } = require(dist + '/database/influxdb/config/influxdb');

const batteryId = 'battery-' + (process.env.BATTERY_DEVICE_ID || 'mega_energy');
const pumpId = 'pump-controller-1c1250';
const quoted = '"[^"\\\\\\n]+"';
const batteryQuery = new RegExp([
  '^from\\(bucket: (' + quoted + ')\\)',
  '  \\|> range\\(start: v\\.timeRangeStart, stop: v\\.timeRangeStop\\)',
  '  \\|> filter\\(fn: \\(r\\) => r\\._measurement == (' + quoted + ') and r\\.device == (' + quoted + ')\\)',
  '  \\|> filter\\(fn: \\(r\\) => contains\\(value: r\\._field, set: (\\[' + quoted + '(?:,' + quoted + ')*\\])\\)\\)',
  '  \\|> toFloat\\(\\)',
  '  \\|> map\\(fn: \\(r\\) => \\(\\{r with metric: r\\._field\\}\\)\\)',
  '  \\|> (last\\(\\)|aggregateWindow\\(every: v\\.windowPeriod, fn: last, createEmpty: false\\))',
].join('\n') + '(\\n  \\|> group\\(\\)\\n  \\|> max\\(\\))?$');
const pumpQuery = /^(from\(bucket:"[^"\n]+"\)\n \|> range\(start:v\.timeRangeStart,stop:v\.timeRangeStop\)\n \|> filter\(fn:\(r\)=>r\._measurement=="mqtt_consumer" and r\._field=="value"\)\n \|> filter\(fn:\(r\)=>r\.topic=="sensors\/esp32s3-1C1250\/diag\/[a-z0-9_]+"\))\n \|> toFloat\(\)\n \|> last\(\)$/;

function optimizedQuery(id, chart) {
  if (chart.liveSource) return chart.query;
  if (id === batteryId && /^(?:overview-(?:stat|gauge)-)?battery-/.test(chart.id)) {
    const match = batteryQuery.exec(chart.query);
    if (!match) return chart.query;
    const [, bucket, measurement, device, fieldList, selector, suffix = ''] = match;
    const fields = JSON.parse(fieldList).map(field => 'r._field == ' + JSON.stringify(field)).join(' or ');
    return [
      `from(bucket: ${bucket})`,
      '  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)',
      `  |> filter(fn: (r) => r._measurement == ${measurement} and r.device == ${device})`,
      `  |> filter(fn: (r) => ${fields})`,
      `  |> ${selector}`,
      '  |> toFloat()',
      '  |> map(fn: (r) => ({r with metric: r._field}))' + suffix,
    ].join('\n');
  }
  if (id === pumpId) {
    const match = pumpQuery.exec(chart.query);
    if (match) return match[1] + '\n |> last()\n |> toFloat()';
  }
  return chart.query;
}

function comparable(rows) {
  return rows.map(row => JSON.stringify(Object.fromEntries(
    Object.entries(row).filter(([key]) => key !== 'table' && key !== 'result')
      .sort(([a], [b]) => a.localeCompare(b)),
  ))).sort();
}

async function main() {
  await db.mongoose.connect(db.url);
  const collection = db.mongoose.connection.collection('dashboards');
  const originals = await collection.find({ _id: { $in: [batteryId, pumpId] } }).toArray();
  const plans = originals.map(dashboard => {
    const changes = dashboard.charts.flatMap((chart, index) => {
      const query = optimizedQuery(dashboard._id, chart);
      return query === chart.query ? [] : [{ chart, index, query }];
    });
    return { dashboard, changes };
  }).filter(plan => plan.changes.length);

  const hours = Number(process.env.DASHBOARD_BENCH_HOURS || 24);
  assert.ok([12, 24, 72].includes(hours), 'Benchmark range must be 12, 24 or 72 hours');
  const end = Date.now();
  const start = new Date(end - hours * 3600000).toISOString();
  const stop = new Date(end).toISOString();
  const window = { 12: '1m', 24: '2m', 72: '5m' }[hours];
  const resolve = query => query
    .replaceAll('v.timeRangeStart', `time(v: "${start}")`)
    .replaceAll('v.timeRangeStop', `time(v: "${stop}")`)
    .replaceAll('v.windowPeriod', window);
  const influx = client.getQueryApi(org);
  async function measured(query) {
    const before = performance.now();
    const rows = await influx.collectRows(resolve(query));
    return { rows, ms: performance.now() - before };
  }
  for (const { dashboard, changes } of plans) {
    let beforeMs = 0, afterMs = 0, rows = 0;
    for (const { chart, query } of changes) {
      const before = await measured(chart.query);
      const after = await measured(query);
      assert.ok(JSON.stringify(comparable(before.rows)) === JSON.stringify(comparable(after.rows)),
        `Query result changed for ${dashboard._id}/${chart.id}`);
      beforeMs += before.ms;
      afterMs += after.ms;
      rows += before.rows.length;
    }
    console.log(`${dashboard._id} ${hours}h: ${changes.length} equivalent queries, ${rows} rows, ${Math.round(beforeMs)} -> ${Math.round(afterMs)} ms sequential`);
  }

  if (!process.argv.includes('--apply') || !plans.length) return;
  const backup = '/tmp/dashboard-query-backup-' + Date.now() + '.json';
  fs.writeFileSync(backup, JSON.stringify(plans.map(plan => plan.dashboard)), { mode: 0o600, flag: 'wx' });
  console.log('Backup:', backup);
  for (const { dashboard, changes } of plans) {
    const queries = Object.fromEntries(changes.map(({ index, query }) => [`charts.${index}.query`, query]));
    const result = await collection.updateOne(
      { _id: dashboard._id, revision: dashboard.revision },
      { $set: { ...queries, updatedAt: new Date() }, $inc: { revision: 1 } },
    );
    assert.equal(result.modifiedCount, 1, `Revision conflict for ${dashboard._id}`);
    console.log('Updated:', dashboard._id);
  }
}

main().catch(error => {
  console.error('Dashboard query migration stopped:', error.code === 'ERR_ASSERTION' ? error.message : error.name);
  process.exitCode = 1;
}).finally(() => db.mongoose.disconnect());
