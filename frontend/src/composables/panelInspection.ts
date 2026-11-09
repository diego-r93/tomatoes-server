import type { ChartPanelDefinition, InspectionMetadata, InspectionSource, PanelInspectionResult, PanelInspectionSnapshot } from './dashboardPanelTypes';

type InspectionTable = { headers: string[]; rows: unknown[][] };

import { formatDateTime } from './dateTime.ts';
import { processingFor } from './dashboardUtils.ts';

export const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function timeText(value: unknown, timezone = 'Browser') { return formatDateTime(value, timezone, String(value ?? '')); }
export function valueText(value: unknown, chart: ChartPanelDefinition, formatted = true) {
  if (value === null || value === undefined) return '—';
  if (!finite(value) || !formatted) return String(value);
  const scale = chart.options.axes?.[1]?.scale || chart.options.series?.[1]?.scale;
  const divisor = scale === 'mb' ? 1e6 : scale === 'gb' ? 1e9 : 1;
  const unit = chart.options.unit || (scale === 'mb' ? 'MB' : scale === 'gb' ? 'GB' : scale === 'C' ? '°C' : '');
  return (value / divisor).toFixed(processingFor(chart).decimals) + (unit ? ' ' + unit : '');
}
export function seriesNames(chart: ChartPanelDefinition, result: PanelInspectionResult) {
  const count = Math.max(0, (result.data?.length || 1) - 1), base = chart.options.series?.[1]?.label || chart.options.chartTitle || 'Value';
  return Array.from({ length: count }, (_, i) => `${base}${result.labels?.[i] ? ' {' + result.labels[i] + '}' : ''} [${i + 1}]`);
}
export function inspectionTable(snapshot: PanelInspectionSnapshot, source: InspectionSource = 'chart', formatted = false): InspectionTable {
  const { chart, result, timezone } = snapshot;
  if (source === 'response') {
    const rows = result.rawRows || [], keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const columns = ['_time', '_value', ...keys.filter(key => !['_time', '_value'].includes(key))].filter(key => keys.includes(key));
    return { headers: columns, rows: rows.map(row => columns.map(key => row[key] ?? null)) };
  }
  const data = result.data || [[]], names = seriesNames(chart, result);
  return { headers: ['Time (UTC)', `Time (${timezone === 'Browser' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone})`, ...names], rows: (data[0] || []).map((time, i) => [new Date(time * 1000).toISOString(), timeText(time * 1000, timezone), ...names.map((_, j) => { const value = data[j + 1]?.[i] ?? null; return formatted ? valueText(value, chart) : value; })]) };
}
export function seriesStats(result: PanelInspectionResult) {
  return (result.data || []).slice(1).map(values => {
    let count = 0, mean = 0, min = Infinity, max = -Infinity;
    let first: number | null = null, last: number | null = null;
    for (const value of values) if (finite(value)) { if (!count) first = value; last = value; count++; mean = mean * ((count - 1) / count) + value / count; min = Math.min(min, value); max = Math.max(max, value); }
    return { count, missing: values.length - count, min: count ? min : null, max: count ? max : null, mean: count ? mean : null, first, last };
  });
}
// Quote every field and keep spreadsheet formulas as text in CSV readers.
export function csvText(table: InspectionTable, excel = false) {
  const quote = (value: unknown) => { let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value); if (typeof value === 'string' && /^[=+\-@]/.test(text.replace(/\p{Cc}/gu, '').trimStart())) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
  return (excel ? '\ufeffsep=,\r\n' : '') + [table.headers, ...table.rows].map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
export function fileStem(title: string | undefined) { return String(title || 'chart').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'chart'; }
export function downloadFile(content: BlobPart, name: string, type: string) {
  const url = globalThis.URL.createObjectURL(new globalThis.Blob([content], { type }));
  const a = globalThis.document.createElement('a'); a.href = url; a.download = name; a.click();
  globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
}

const xmlEntities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };
const xml = (value: unknown) => String(value).replace(/\p{Cc}/gu, char => ['\t', '\n', '\r'].includes(char) ? char : '').replace(/[<>&"']/g, char => xmlEntities[char]);
const columnName = (index: number) => { let value = index + 1, name = ''; while (value) { name = String.fromCharCode(65 + (value - 1) % 26) + name; value = Math.floor((value - 1) / 26); } return name; };
const crcTable = Array.from({ length: 256 }, (_, n) => { for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc32 = (bytes: Uint8Array) => { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
function zip(files: [name: string, text: string][]) {
  const encoder = new globalThis.TextEncoder(), entries = files.map(([name, text]) => ({ name: encoder.encode(name), bytes: encoder.encode(text), offset: 0, crc: 0 }));
  const size = entries.reduce((n, file) => n + 30 + file.name.length + file.bytes.length + 46 + file.name.length, 22), output = new Uint8Array(size), view = new DataView(output.buffer);
  let offset = 0;
  for (const file of entries) {
    file.offset = offset; file.crc = crc32(file.bytes);
    view.setUint32(offset, 0x04034b50, true); view.setUint16(offset + 4, 20, true); view.setUint16(offset + 6, 0x800, true); view.setUint16(offset + 12, 33, true);
    view.setUint32(offset + 14, file.crc, true); view.setUint32(offset + 18, file.bytes.length, true); view.setUint32(offset + 22, file.bytes.length, true); view.setUint16(offset + 26, file.name.length, true);
    output.set(file.name, offset + 30); output.set(file.bytes, offset + 30 + file.name.length); offset += 30 + file.name.length + file.bytes.length;
  }
  const directory = offset;
  for (const file of entries) {
    view.setUint32(offset, 0x02014b50, true); view.setUint16(offset + 4, 20, true); view.setUint16(offset + 6, 20, true); view.setUint16(offset + 8, 0x800, true); view.setUint16(offset + 14, 33, true);
    view.setUint32(offset + 16, file.crc, true); view.setUint32(offset + 20, file.bytes.length, true); view.setUint32(offset + 24, file.bytes.length, true); view.setUint16(offset + 28, file.name.length, true); view.setUint32(offset + 42, file.offset, true);
    output.set(file.name, offset + 46); offset += 46 + file.name.length;
  }
  view.setUint32(offset, 0x06054b50, true); view.setUint16(offset + 8, entries.length, true); view.setUint16(offset + 10, entries.length, true); view.setUint32(offset + 12, offset - directory, true); view.setUint32(offset + 16, directory, true);
  return output;
}
// Minimal Open XML workbook. Text cells are inline strings, never formulas.
// https://learn.microsoft.com/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document
export function xlsxBytes(table: InspectionTable, metadata: InspectionMetadata[] = []) {
  if (table.rows.length > 1048575 || table.headers.length > 16384) throw new Error('This result exceeds Excel worksheet limits. Download CSV or JSON instead.');
  const ns = 'http://schemas.openxmlformats.org', rel = ns + '/officeDocument/2006/relationships', main = ns + '/spreadsheetml/2006/main';
  const sheet = (rows: unknown[][]) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="' + main + '"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>' + rows.map((row, i) => '<row r="' + (i + 1) + '">' + row.map((value, j) => { const ref = columnName(j) + (i + 1); if (value == null) return '<c r="' + ref + '"/>'; if (finite(value)) return '<c r="' + ref + '"><v>' + value + '</v></c>'; const text = typeof value === 'object' ? JSON.stringify(value) : String(value); if (text.length > 32767) throw new Error('A cell exceeds Excel text limits. Download CSV or JSON instead.'); return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xml(text) + '</t></is></c>'; }).join('') + '</row>').join('') + '</sheetData></worksheet>';
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="' + ns + '/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="' + ns + '/package/2006/relationships"><Relationship Id="rId1" Type="' + rel + '/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="' + main + '" xmlns:r="' + rel + '"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/><sheet name="Metadata" sheetId="2" r:id="rId2"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="' + ns + '/package/2006/relationships"><Relationship Id="rId1" Type="' + rel + '/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="' + rel + '/worksheet" Target="worksheets/sheet2.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', sheet([table.headers, ...table.rows])],
    ['xl/worksheets/sheet2.xml', sheet([['Property', 'Value'], ...metadata])],
  ]);
}
