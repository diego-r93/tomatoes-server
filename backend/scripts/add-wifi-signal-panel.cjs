// Run inside the backend container. Pass --apply to add the panel after validating its query.
const { client, org } = require('/app/dist/database/influxdb/config/influxdb');
const db = require('/app/dist/database/mongodb/models').default;
const { validateCharts } = require('/app/dist/database/dashboard/validation');

const historyId = 'raspberry-pi-wifi-signal';
const gaugeId = 'raspberry-pi-wifi-rssi';
const bucket = process.env.DOCKER_INFLUXDB_INIT_BUCKET || 'tomatoes';
const source = `from(bucket: ${JSON.stringify(bucket)})
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "wireless" and r._field == "level" and r.host == "raspberrypi" and r.interface == "wlan0")`;

async function main() {
  const query = source + '\n  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)';
  const latestQuery = source.replace('v.timeRangeStart', '-2m').replace('v.timeRangeStop', 'now()') + '\n  |> last()';
  const rows = await client.getQueryApi(org).collectRows(latestQuery);
  if (!rows.some(row => Number.isFinite(row._value))) throw new Error('No recent Wi-Fi signal samples.');

  await db.mongoose.connect(db.url);
  try {
    const dashboards = db.mongoose.connection.collection('dashboards');
    const dashboard = await dashboards.findOne({ _id: 'existing-charts' });
    if (!dashboard) throw new Error('Raspberry Pi dashboard not found.');
    const installed = new Set(dashboard.charts.map(chart => chart.id));
    const bottom = Math.max(0, ...dashboard.charts.map(({ layout }) => layout.y + layout.h));
    const history = dashboard.charts.find(chart => chart.id === historyId);
    const rightOfHistory = history?.layout.x === 0 && history.layout.w === 6 &&
      dashboard.charts.every(({ layout }) => layout.x + layout.w <= 6 ||
        layout.y + layout.h <= history.layout.y || layout.y >= history.layout.y + history.layout.h);
    const options = {
      unit: 'dBm',
      series: [{ label: 'Time' }, { label: 'wlan0', stroke: '#5794f2', points: { show: false } }],
      axes: [{}, {}],
    };
    const panels = [
      {
        id: historyId,
        query,
        data: [],
        options: { ...options, chartTitle: 'Wi-Fi signal strength' },
        layout: { x: 0, y: bottom, w: 6, h: 12, i: historyId },
      },
      {
        id: gaugeId,
        query: latestQuery,
        data: [],
        options: { ...options, chartTitle: 'Wi-Fi RSSI', description: 'Latest Wi-Fi signal in the last two minutes.' },
        processing: { multiplier: 1, offset: 0, minimum: '', maximum: '', decimals: 0, gaps: 'Gaps' },
        visualization: {
          type: 'gauge', reducer: 'last', min: -100, max: 0,
          color: '#f2495c', showThresholds: true,
          thresholds: [{ value: -74, color: '#ff9830' }, { value: -65, color: '#73bf69' }],
        },
        layout: {
          x: rightOfHistory || !history ? 6 : 0,
          y: rightOfHistory ? history.layout.y : bottom,
          w: 6, h: 12, i: gaugeId,
        },
      },
    ].filter(panel => !installed.has(panel.id));
    if (!panels.length) {
      console.log('Wi-Fi panels already installed.');
      return;
    }
    validateCharts([...dashboard.charts, ...panels]);
    console.log('Validated current Wi-Fi RSSI:', rows[0]._value, 'dBm.');
    if (!process.argv.includes('--apply')) return;
    const result = await dashboards.updateOne(
      { _id: dashboard._id, revision: dashboard.revision },
      { $push: { charts: { $each: panels } }, $set: { updatedAt: new Date() }, $inc: { revision: 1 } },
    );
    if (result.modifiedCount !== 1) throw new Error('Dashboard revision changed. Re-run to plan against the current revision.');
    console.log('Wi-Fi panels added to Raspberry Pi.');
  } finally {
    await db.mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
