// Run inside the backend container. Pass --apply to add the panel after validating its query.
const { client, org } = require('/app/dist/database/influxdb/config/influxdb');
const db = require('/app/dist/database/mongodb/models').default;
const { validateCharts } = require('/app/dist/database/dashboard/validation');

const panelId = 'raspberry-pi-wifi-signal';
const bucket = process.env.DOCKER_INFLUXDB_INIT_BUCKET || 'tomatoes';
const source = `from(bucket: ${JSON.stringify(bucket)})
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "wireless" and r._field == "level" and r.host == "raspberrypi" and r.interface == "wlan0")`;

async function main() {
  const query = source + '\n  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)';
  const recent = query.replace('v.timeRangeStart', '-5m').replace('v.timeRangeStop', 'now()').replace('v.windowPeriod', '10s');
  const rows = await client.getQueryApi(org).collectRows(recent);
  if (!rows.some(row => Number.isFinite(row._value))) throw new Error('No recent Wi-Fi signal samples.');

  await db.mongoose.connect(db.url);
  try {
    const dashboards = db.mongoose.connection.collection('dashboards');
    const dashboard = await dashboards.findOne({ _id: 'existing-charts' });
    if (!dashboard) throw new Error('Raspberry Pi dashboard not found.');
    if (dashboard.charts.some(chart => chart.id === panelId)) {
      console.log('Wi-Fi signal panel already installed.');
      return;
    }
    const y = Math.max(0, ...dashboard.charts.map(({ layout }) => layout.y + layout.h));
    const panel = {
      id: panelId,
      query,
      data: [],
      options: {
        chartTitle: 'Wi-Fi signal strength',
        unit: 'dBm',
        series: [{ label: 'Time' }, { label: 'wlan0', stroke: '#5794f2', points: { show: false } }],
        axes: [{}, {}],
      },
      layout: { x: 0, y, w: 6, h: 12, i: panelId },
    };
    validateCharts([...dashboard.charts, panel]);
    console.log('Validated Wi-Fi signal query with', rows.length, 'recent samples.');
    if (!process.argv.includes('--apply')) return;
    const result = await dashboards.updateOne(
      { _id: dashboard._id, revision: dashboard.revision },
      { $push: { charts: panel }, $set: { updatedAt: new Date() }, $inc: { revision: 1 } },
    );
    if (result.modifiedCount !== 1) throw new Error('Dashboard revision changed. Re-run to plan against the current revision.');
    console.log('Wi-Fi signal panel added to Raspberry Pi.');
  } finally {
    await db.mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
