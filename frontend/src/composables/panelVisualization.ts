import type { ReducedReading, VisualizationSettings } from './dashboardPanelTypes';
import type { PlotData } from './dashboardSeries';

type PanelVisualization = { visualization?: Partial<VisualizationSettings> };

// Visualization settings are separate from the query and sample processing.
export const visualizationTypes = [
  { value: 'time-series', title: 'Time series', description: 'Follow changes over time with lines, filled areas or bars.', icon: 'mdi-chart-line' },
  { value: 'stat', title: 'Stat', description: 'Highlight a single reading with an optional trend and sample age.', icon: 'mdi-numeric' },
  { value: 'gauge', title: 'Gauge', description: 'See one reading against a circular scale with color thresholds.', icon: 'mdi-gauge' },
  { value: 'bar-gauge', title: 'Bar gauge', description: 'Compare one value per series on horizontal or vertical bars with a shared scale.', icon: 'mdi-chart-box-outline' },
  { value: 'table', title: 'Table', description: 'Browse individual query rows, including timestamps, values and tags.', icon: 'mdi-table' },
] as const;
export const reducers = [{ value: 'last', title: 'Last non-null' }, { value: 'mean', title: 'Mean' }, { value: 'min', title: 'Minimum' }, { value: 'max', title: 'Maximum' }];
export function visualizationFor(chart: PanelVisualization): VisualizationSettings {
  return { orientation: 'horizontal', pageSize: 25, tableOrder: 'newest', mappings: [], sparkline: true, staleAfterSeconds: 120, type: 'time-series', reducer: 'last', series: null, min: 0, max: 100, color: '#73bf69', showThresholds: true, thresholds: [{ value: 80, color: '#f2cc0c' }, { value: 90, color: '#f2495c' }], ...chart?.visualization };
}
export function visualizationError(chart: PanelVisualization) {
  const p = visualizationFor(chart);
  if (!visualizationTypes.some(item => item.value === p.type)) return 'Select a supported visualization.';
  if (p.type === 'table') return [10, 25, 50].includes(p.pageSize) && ['newest', 'oldest'].includes(p.tableOrder) ? '' : 'Invalid table options.';
  if (p.type === 'bar-gauge' && !['horizontal', 'vertical'].includes(p.orientation)) return 'Invalid bar orientation.';
  if (p.type === 'time-series') return '';
  if (p.type === 'stat' && (!Array.isArray(p.mappings) || p.mappings.length > 20 || p.mappings.some((m,i) => !m || !Number.isFinite(m.value) || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 80 || p.mappings.slice(0,i).some(old=>old.value===m.value)))) return 'Use up to 20 unique numeric value mappings with nonempty labels.';
  if (p.type === 'stat' && (typeof p.sparkline !== 'boolean' || !Number.isInteger(p.staleAfterSeconds) || p.staleAfterSeconds < 1 || p.staleAfterSeconds > 604800)) return 'Stat requires a sparkline option and a sample age limit from 1 to 604800 seconds.';
  if (!reducers.some(item => item.value === p.reducer)) return 'Select a valid gauge calculation.';
  if (p.series !== null && (typeof p.series !== 'string' || !p.series || p.series.length > 4096)) return 'Select a valid gauge series.';
  if (p.type !== 'stat' && (![p.min, p.max].every(Number.isFinite) || p.max <= p.min || !Number.isFinite(p.max - p.min))) return 'Gauge maximum must be greater than minimum. Both must be finite numbers.';
  if (!/^#[0-9a-f]{6}$/i.test(p.color) || typeof p.showThresholds !== 'boolean') return 'Select a valid gauge color and threshold display.';
  if (!Array.isArray(p.thresholds) || p.thresholds.length > 10) return 'Use at most 10 gauge thresholds.';
  for (let i = 0; i < p.thresholds.length; i++) {
    const step = p.thresholds[i];
    if (!step || !Number.isFinite(step.value) || !/^#[0-9a-f]{6}$/i.test(step.color) || (i && step.value <= p.thresholds[i - 1].value)) return 'Thresholds need finite values in ascending order and valid colors.';
  }
  return '';
}
// Data has already been processed by alignRows. Do not scale or clamp it again.
export function gaugeReading(data: PlotData | [], labels: string[], config: VisualizationSettings): ReducedReading {
  const index = config.series === null ? 0 : labels.indexOf(config.series);
  if (config.series !== null && labels.filter(label => label === config.series).length > 1) return { value: null, timestamp: null, label: 'Ambiguous series. Add a tag or field filter to the query.' };
  return reduceSeries(data, labels, config, index);
}

export function reduceSeries(data: PlotData | [], labels: string[], config: VisualizationSettings, index: number): ReducedReading {
  if (index < 0 || !Array.isArray(data?.[index + 1])) return { value: null, timestamp: null, label: config.series || labels[0] || '' };
  let value = null, count = 0, timestamp = null;
  const values = data[index + 1];
  for (let i = 0; i < values.length; i++) {
    const sample = values[i];
    if (typeof sample !== 'number' || !Number.isFinite(sample)) continue;
    count++;
    timestamp = data[0]?.[i] ?? null;
    if (value === null || config.reducer === 'last') value = sample;
    else if (config.reducer === 'min') value = Math.min(value, sample);
    else if (config.reducer === 'max') value = Math.max(value, sample);
    else if (config.reducer === 'mean') value = value * ((count - 1) / count) + sample / count;
  }
  return { value, timestamp, label: labels[index] || '' };
}
export function gaugeColor(value: number, config: VisualizationSettings) {
  let color = config.color;
  for (const step of config.thresholds) if (value >= step.value) color = step.color;
  return color;
}
export function gaugeFraction(value: number | null, min: number, max: number) {
  return value === null ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
}
export function gaugeSegments(config: VisualizationSettings) {
  const limits = [config.min, ...config.thresholds.map(step => step.value).filter(value => value > config.min && value < config.max), config.max];
  return limits.slice(0, -1).map((start, i) => ({ start: gaugeFraction(start, config.min, config.max), end: gaugeFraction(limits[i + 1], config.min, config.max), color: gaugeColor(start, config) }));
}
export function gaugeArc(start: number, end: number, radius = 88) {
  if (end <= start) return '';
  const point = (fraction: number) => { const angle = (135 + fraction * 270) * Math.PI / 180; return [120 + radius * Math.cos(angle), 118 + radius * Math.sin(angle)]; };
  const a = point(start), b = point(end);
  return `M ${a[0]} ${a[1]} A ${radius} ${radius} 0 ${end - start > 2 / 3 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
}
