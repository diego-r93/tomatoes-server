import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectionTable, seriesStats, valueText, csvText, xlsxBytes } from '../src/composables/panelInspection.mjs';

const chart = { options: { chartTitle: 'Temperature', axes: [{}, { scale: 'C' }], series: [{}, { label: 'Temperature' }] }, processing: { decimals: 2 } };
const snapshot = { chart, timezone: 'UTC', result: { data: [[1700000000, 1700000010], [25.123456, null], [null, -2]], labels: ['host=one', 'host=two'], rawRows: [{ _time: '2023-11-14T22:13:20Z', _value: 20, topic: 'a,b"c' }] } };
test('chart export keeps timestamps, full precision, distinct series and gaps', () => {
  const table = inspectionTable(snapshot);
  assert.equal(table.rows[0][0], '2023-11-14T22:13:20.000Z'); assert.equal(table.rows[0][2], 25.123456); assert.equal(table.rows[1][2], null); assert.equal(table.rows[1][3], -2); assert.match(table.headers[2], /host=one/); assert.match(table.headers[3], /host=two/);
  assert.equal(inspectionTable(snapshot, 'chart', true).rows[0][2], '25.12 °C'); assert.equal(valueText(1e6, { ...chart, options: { axes: [{}, { scale: 'mb' }] } }), '1.00 MB');
});
test('query response export keeps original row fields and values', () => {
  const table = inspectionTable(snapshot, 'response'); assert.deepEqual(table.headers, ['_time', '_value', 'topic']); assert.deepEqual(table.rows, [['2023-11-14T22:13:20Z', 20, 'a,b"c']]);
});
test('statistics exclude gaps and nonfinite values', () => {
  assert.deepEqual(seriesStats({ data: [[], [2, null, 4, Infinity, '5'], [null]] }), [{count:2,missing:3,min:2,max:4,mean:3,first:2,last:4},{count:0,missing:1,min:null,max:null,mean:null,first:null,last:null}]);
});
test('CSV escapes quotes/newlines and treats formula-like text as text', () => {
  const table = { headers: ['Value'], rows: [['a,b"c\nx'], ['=1+1'], ['\t+SUM(A1)'], [-2], [null]] };
  const csv = csvText(table); assert.match(csv, /"a,b""c\nx"/); assert.match(csv, /"'=1\+1"/); assert.match(csv, /"'\t\+SUM/); assert.match(csv, /"-2"/); assert(csvText(table, true).startsWith('\ufeffsep=,\r\n')); assert(!csv.startsWith('sep='));
});
test('XLSX contains numeric cells, inline text and null gaps without formulas', () => {
  const bytes = xlsxBytes({ headers: ['Time', 'Value'], rows: [['á<&', 12.345678], ['=1+1', null]] }, [['Panel', 'Temperature']]);
  const files = new Map(); const view = new DataView(bytes.buffer); let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) { const size = view.getUint32(offset+18,true), length = view.getUint16(offset+26,true), start = offset+30; files.set(new TextDecoder().decode(bytes.slice(start,start+length)),new TextDecoder().decode(bytes.slice(start+length,start+length+size))); offset=start+length+size; }
  assert(files.has('[Content_Types].xml')); assert(files.has('xl/workbook.xml')); const xml = files.get('xl/worksheets/sheet1.xml'); assert.match(xml, /<v>12.345678<\/v>/); assert.match(xml, /á&lt;&amp;/); assert.match(xml, /t="inlineStr"/); assert.match(xml, /=1\+1/); assert(!xml.includes('<f>')); assert.match(xml, /<c r="B3"\/>/); assert(files.get('xl/worksheets/sheet2.xml').includes('Temperature'));
});
