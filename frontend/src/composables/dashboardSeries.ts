export interface QueryRow extends Record<string, unknown> {
  _time?: string;
  _value?: unknown;
  _field?: string;
  _start?: string;
  _stop?: string;
}

export type PlotData = [timestamps: number[], ...series: (number | null)[][]];
export interface AlignedSeries { data: PlotData; labels: string[] }
export interface Processing {
  multiplier: number;
  offset: number;
  minimum: number | '' | null;
  maximum: number | '' | null;
  decimals: number;
  gaps: 'Gaps' | 'Connect gaps';
  lineWidth: number;
  showPoints: boolean;
  showLegend: boolean;
}

export function processValue(value: unknown, processing: Processing): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  let output = value * processing.multiplier + processing.offset;
  if (processing.minimum !== '' && processing.minimum !== null) output = Math.max(processing.minimum, output);
  if (processing.maximum !== '' && processing.maximum !== null) output = Math.min(processing.maximum, output);
  return Number.isFinite(output) ? output : null;
}

// Keep separate Influx series aligned by timestamp, rather than joining unrelated tags.
export function alignRows(rows: QueryRow[], processing: Processing): AlignedSeries {
  const groups = new Map<string, { label: string; values: Map<number, number | null> }>();
  const times = new Set<number>();
  for (const row of rows) {
    const time = Date.parse(row._time ?? '') / 1000;
    if (!Number.isFinite(time)) continue;
    const tags = Object.keys(row)
      .filter(key => !['_time', '_value', '_start', '_stop', 'result', 'table'].includes(key))
      .sort().map(key => [key, row[key]] as const);
    const key = JSON.stringify(tags);
    let group = groups.get(key);
    if (!group) {
      const label = tags.filter(([tag]) => !['_measurement', '_field'].includes(tag))
        .map(([tag, value]) => `${tag}=${value}`).join(', ') || row._field || 'Value';
      group = { label, values: new Map() };
      groups.set(key, group);
    }
    if (groups.size > 30) throw new Error('Query returned more than 30 series. Add tag filters before plotting.');
    times.add(time);
    group.values.set(time, processValue(row._value, processing));
  }
  const timestamps = [...times].sort((a, b) => a - b);
  const series = [...groups.values()];
  return {
    data: [timestamps, ...series.map(group => timestamps.map(time => group.values.get(time) ?? null))],
    labels: series.map(group => group.label),
  };
}
