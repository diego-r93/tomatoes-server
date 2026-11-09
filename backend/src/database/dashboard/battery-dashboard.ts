import Dashboard from './models/dashboard.model';
import { validateDashboard } from './validation';

type Options = { type?: 'gauge' | 'time-series'; min?: number; max?: number; color?: string; decimals?: number; thresholds?: { value: number; color: string }[]; width?: number; height?: number; unit?: string };

export function batteryDashboardDefinition(bucket: string, device: string, cells = 8) {
  if (!bucket || !/^[a-zA-Z0-9_-]{1,64}$/.test(device) || !Number.isInteger(cells) || cells < 1 || cells > 32) throw new Error('Invalid battery dashboard configuration.');
  const charts: any[] = [];
  let x = 0, y = 0, rowHeight = 0;
  const add = (key: string, title: string, measurement: string, fields: string[], options: Options = {}) => {
    const width = options.width ?? 3, height = options.height ?? 10;
    if (x + width > 12) { y += rowHeight; x = 0; rowHeight = 0; }
    const color = options.color ?? '#80cbc4';
    const id = 'battery-' + key;
    const query = `from(bucket: ${JSON.stringify(bucket)})
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == ${JSON.stringify(measurement)} and r.device == ${JSON.stringify(device)})
  |> filter(fn: (r) => ${fields.map(field => `r._field == ${JSON.stringify(field)}`).join(" or ")})
  |> aggregateWindow(every: v.windowPeriod, fn: last, createEmpty: false)
  |> toFloat()
  |> map(fn: (r) => ({r with metric: r._field}))`;
    const chart: any = { id, query, data: [], options: { chartTitle: title, unit: options.unit ?? '', series: [{ label: 'Date' }, { label: title, stroke: color, fill: color + '1a', points: { show: false } }], axes: [{}, {}] },
      layout: { x, y, w: width, h: height, i: id }, processing: { multiplier: 1, offset: 0, minimum: '', maximum: '', decimals: options.decimals ?? 2, gaps: 'Gaps', lineWidth: 1.5, showPoints: false, showLegend: true } };
    if (options.type !== 'time-series') chart.visualization = { type: 'gauge', reducer: 'last', series: null, min: options.min ?? 0, max: options.max ?? 100, color, showThresholds: true, thresholds: options.thresholds ?? [] };
    charts.push(chart); x += width; rowHeight = Math.max(rowHeight, height);
  };
  add('soc', 'State of charge', 'battery', ['soc'], {unit:'%',color:'#f2495c',decimals:0,thresholds:[{value:20,color:'#f2cc0c'},{value:40,color:'#73bf69'}]});
  add('voltage', 'Battery voltage', 'battery', ['voltage'], {unit:'V',min:20,max:30,color:'#5794f2'});
  add('current', 'Battery current', 'battery', ['current'], {unit:'A',min:-50,max:50,color:'#b877d9'});
  add('power', 'Power (calculated)', 'battery_calculated', ['power_w'], {unit:'W',min:-1500,max:1500,color:'#ff9830'});
  add('connection', 'BLE connection (1 = online)', 'battery_collector', ['connection_up'], {max:1,decimals:0,color:'#f2495c',thresholds:[{value:1,color:'#73bf69'}]});
  add('age', 'Age of last valid reading', 'battery_collector', ['reading_age_seconds'], {unit:'s',max:120,decimals:1,color:'#73bf69',thresholds:[{value:30,color:'#f2cc0c'},{value:60,color:'#f2495c'}]});
  add('protection', 'BMS protection (1 = active)', 'battery_calculated', ['protection_active'], {max:1,decimals:0,color:'#73bf69',thresholds:[{value:1,color:'#f2495c'}]});
  add('capacity', 'Remaining capacity', 'battery', ['remaining_capacity_ah'], {unit:'Ah',max:50,color:'#80cbc4'});
  const history = {type:'time-series' as const,width:6,height:12};
  add('soc-history', 'State of charge history', 'battery', ['soc'], {...history,unit:'%',color:'#73bf69'});
  add('voltage-history', 'Battery voltage history', 'battery', ['voltage'], {...history,unit:'V',color:'#5794f2'});
  add('current-history', 'Charge / discharge current', 'battery', ['current'], {...history,unit:'A',color:'#b877d9'});
  add('power-history', 'Charge / discharge power (calculated)', 'battery_calculated', ['power_w'], {...history,unit:'W',color:'#ff9830'});
  add('cells', `Cell voltages · ${cells} cells`, 'battery_cell', ['voltage'], {...history,unit:'V',color:'#5794f2',decimals:3});
  add('temperatures', 'BMS temperature probes', 'battery_temperature', ['temperature'], {...history,unit:'°C',color:'#f2cc0c',decimals:1});
  add('delta', 'Cell voltage difference (calculated)', 'battery_calculated', ['cell_delta_mv'], {unit:'mV',max:100,color:'#80cbc4',decimals:1});
  add('energy', 'Remaining energy (estimated)', 'battery_calculated', ['remaining_energy_estimated_wh'], {unit:'Wh',max:1600,color:'#b877d9',decimals:0});
  add('cycles', 'Charge cycles', 'battery', ['cycles'], {max:1000,color:'#f2cc0c',decimals:0});
  add('nominal-capacity', 'Configured capacity (BMS)', 'battery', ['nominal_capacity_ah'], {unit:'Ah',max:50,color:'#5794f2'});
  add('bms-states', 'BMS switches and cell overvoltage · 0 / 1', 'battery', ['charge_enabled','discharge_enabled','protection_cell_overvoltage'], {...history,height:10,color:'#73bf69',decimals:0});
  add('collector', 'Collector errors and reconnections', 'battery_collector', ['errors','reconnections'], {...history,height:10,color:'#ff9830',decimals:0});
  return { name: 'Mega Energy battery', folder: 'Energy', description: 'LiFePO4 battery via Bluetooth. Check BLE connection and reading age. Gauges summarize the selected time range. Estimated Wh uses voltage × remaining Ah and is not measured usable energy. Positive current = charging.', tags: ['battery','bluetooth',device], favorite: false, charts,
    settings: { range: '-1h', refresh: '10s', timezone: 'Browser', bucket, intervals: ['5s','10s','30s','1m'], pauseHidden: true } };
}

export async function provisionBatteryDashboard(env: NodeJS.ProcessEnv = process.env) {
  if (env.BATTERY_BLE_ENABLED !== 'true') return { created: false, count: 0 };
  const device = env.BATTERY_DEVICE_ID || 'mega_energy';
  const definition = batteryDashboardDefinition(env.DOCKER_INFLUXDB_INIT_BUCKET || 'tomatoes', device, Number(env.BATTERY_EXPECTED_CELLS || 8));
  const id = 'battery-' + device;
  const result = await Dashboard.updateOne({ _id: id }, { $setOnInsert: { ...validateDashboard(definition), revision: 1 } }, { upsert: true });
  return { created: result.upsertedCount === 1, count: definition.charts.length };
}
