import { gaugeReading } from './panelVisualization.mjs';

export function statUnit(chart) {
  const scale = chart.options?.axes?.[1]?.scale || chart.options?.series?.[1]?.scale;
  return { unit: chart.options?.unit || ({ C: '°C', mb: 'MB', gb: 'GB' }[scale] ?? ''),
    divisor: scale === 'mb' ? 1e6 : scale === 'gb' ? 1e9 : 1 };
}
export const statReading = (data, labels, config) => gaugeReading(data, labels, config);

export function statFreshness(reading, now, staleAfterSeconds) {
  if (reading.value === null) return 'no-data';
  if (!Number.isFinite(reading.timestamp) || !Number.isFinite(now)) return 'unknown';
  if (reading.timestamp * 1000 > now + 5000) return 'future';
  return now - reading.timestamp * 1000 >= staleAfterSeconds * 1000 ? 'stale' : 'fresh';
}

// Bounded min/max envelopes keep peaks. A bucket containing gaps is drawn as
// isolated observations, never as a fabricated continuous line through gaps.
export function statSparkline(data, labels, config) {
  const index = config.series === null ? 0 : labels.indexOf(config.series);
  if (index < 0 || (config.series !== null && labels.filter(v => v === config.series).length > 1)) return { line: '', area: '' };
  const values = data?.[index + 1], times = data?.[0];
  if (!Array.isArray(values) || !Array.isArray(times)) return { line: '', area: '' };
  const points = [], step = Math.max(1, Math.ceil(values.length / 160));
  for (let offset = 0; offset < values.length; offset += step) {
    const valid = []; let gaps = false;
    for (let i = offset; i < Math.min(values.length, offset + step); i++) {
      if (typeof values[i] === 'number' && Number.isFinite(values[i]) && Number.isFinite(times[i])) valid.push({ x: times[i], y: values[i] });
      else gaps = true;
    }
    if (!valid.length) { points.push(null); continue; }
    const low = valid.reduce((a,b) => a.y < b.y ? a : b), high = valid.reduce((a,b) => a.y > b.y ? a : b);
    const selected = [...new Set([valid[0],low,high,valid.at(-1)])].sort((a,b) => a.x - b.x);
    if (gaps) points.push(null);
    for (const point of selected) { points.push(point); if (gaps) points.push(null); }
  }
  const valid = points.filter(Boolean);
  if (!valid.length) return { line: '', area: '' };
  const xmin = valid[0].x, xmax = valid.at(-1).x;
  const ymin = Math.min(...valid.map(p => p.y)), ymax = Math.max(...valid.map(p => p.y));
  // Normalize extreme finite ranges before subtraction to avoid overflowing.
  const yscale = Math.max(Math.abs(ymin), Math.abs(ymax), 1);
  const normalizedMin = ymin / yscale, normalizedMax = ymax / yscale;
  const xy = p => ({ x: xmax === xmin ? 150 : (p.x - xmin) / (xmax - xmin) * 300,
    y: normalizedMax === normalizedMin ? 30 : 56 - ((p.y / yscale - normalizedMin) / (normalizedMax - normalizedMin)) * 52 });
  const segments = []; let current = [];
  for (const point of points) {
    if (point) current.push(xy(point));
    else if (current.length) { segments.push(current); current = []; }
  }
  if (current.length) segments.push(current);
  const path = segment => segment.map((p,i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  return { line: segments.map(path).join(' '), area: segments.filter(s => s.length > 1).map(s => `${path(s)} L${s.at(-1).x.toFixed(2)},60 L${s[0].x.toFixed(2)},60 Z`).join(' ') };
}
