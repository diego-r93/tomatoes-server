<template>
  <v-dialog :model-value="true" fullscreen :aria-label="t('Inspect: {name}', {name:snapshot.chart.options.chartTitle})" @update:model-value="!$event && emit('close')">
    <v-card class="panel-inspector">
      <header class="inspector-heading"><div><h1>{{ t("Inspect:") }} {{ snapshot.chart.options.chartTitle }}</h1><p>{{ summary }} {{ t("· Snapshot from") }} {{ capturedAt }}</p></div><v-btn icon="mdi-close" variant="text" :aria-label="t('Close inspector')" @click="emit('close')"/></header>
      <v-tabs v-model="tab" color="primary" class="inspector-tabs"><v-tab v-for="name in inspectorTabs" :key="name" :value="name">{{ t(name) }}</v-tab></v-tabs>
      <div class="inspector-body">
        <v-alert v-if="snapshot.result.error || snapshot.result.loading" type="warning" variant="tonal" class="mb-4">{{ t(snapshot.result.error || 'A refresh was in progress when this snapshot was opened.') }} {{ (snapshot.result.data?.[0]?.length || snapshot.result.rawRows?.length) ? t('The last loaded samples are shown.') : '' }}</v-alert>
        <template v-if="tab === 'Data'">
          <div class="data-toolbar"><div class="data-options"><v-select v-model="source" :label="t('Data source')" :items="[{title:t('Chart data'),value:'chart'},{title:t('Query response'),value:'response'}]" variant="outlined" hide-details/><v-switch v-if="source === 'chart'" v-model="formatted" :label="t('Formatted values')" color="primary" hide-details/><v-switch v-model="excelCsv" :label="t('Excel-compatible CSV')" color="primary" hide-details/></div><div class="download-actions"><v-btn prepend-icon="mdi-file-delimited-outline" variant="outlined" :disabled="!table.rows.length || exporting" @click="exportData('csv')">{{ t("Download CSV") }}</v-btn><v-btn prepend-icon="mdi-microsoft-excel" color="primary" :disabled="!table.rows.length || exporting" :loading="exporting" @click="exportData('xlsx')">{{ t("Download Excel") }}</v-btn></div></div>
          <p class="inspector-note">{{ t(source === 'chart' ? 'Chart data includes the panel transformations. Unformatted exports keep numeric values and full precision.' : 'Original rows returned by the executed Flux query, before panel transformations.') }} {{ t("Downloads include all") }} {{ table.rows.length.toLocaleString('en-US') }} {{ t("rows in this snapshot.") }}</p>
          <v-alert v-if="exportError" type="error" variant="tonal" class="my-3" role="alert">{{ t(exportError) }}</v-alert>
          <div class="inspection-table" role="region" :aria-label="t('Inspected data')"><table><thead><tr><th v-for="(name, i) in table.headers" :key="i" :title="name">{{ headerText(name,i) }}</th></tr></thead><tbody><tr v-for="(row, i) in visibleRows" :key="i"><td v-for="(value, j) in row" :key="j" :class="{number: typeof value === 'number'}">{{ cellText(value) }}</td></tr><tr v-if="!table.rows.length"><td :colspan="Math.max(1, table.headers.length)" class="empty">{{ t("No data was loaded for this panel.") }}</td></tr></tbody></table></div>
          <nav class="inspector-pagination" :aria-label="t('Data pages')"><span>{{ table.rows.length ? (page - 1) * pageSize + 1 : 0 }}–{{ Math.min(page * pageSize, table.rows.length) }} {{ t("of") }} {{ table.rows.length }} {{ t("rows") }}</span><div><label>{{ t("Rows per page") }}<select v-model.number="pageSize" :aria-label="t('Rows per page')"><option :value="25">25</option><option :value="100">100</option><option :value="500">500</option></select></label><v-btn icon="mdi-chevron-left" variant="text" size="small" :aria-label="t('Previous data page')" :disabled="page === 1" @click="page--"/><span>{{ t("Page") }} {{ page }} {{ t("of") }} {{ pageCount }}</span><v-btn icon="mdi-chevron-right" variant="text" size="small" :aria-label="t('Next data page')" :disabled="page === pageCount" @click="page++"/></div></nav>
        </template>
        <template v-else-if="tab === 'Stats'">
          <dl class="request-stats"><template v-for="[key, value] in metadata" :key="key"><dt>{{ t(key) }}</dt><dd>{{ displayMetadata(key, value) }}</dd></template></dl>
          <h2>{{ t("Series statistics") }}</h2><p class="inspector-note">{{ t("Calculated from the chart data after panel transformations. Missing values are excluded from min, max and mean.") }}</p>
          <div class="inspection-table"><table><thead><tr><th>{{ t("Series") }}</th><th>{{ t("Values") }}</th><th>{{ t("Missing") }}</th><th>{{ t("Min") }}</th><th>{{ t("Max") }}</th><th>{{ t("Mean") }}</th><th>{{ t("First") }}</th><th>{{ t("Last") }}</th></tr></thead><tbody><tr v-for="(row, index) in stats" :key="index"><td>{{ names[index] }}</td><td class="number">{{ row.count }}</td><td class="number">{{ row.missing }}</td><td v-for="key in statKeys" :key="key" class="number">{{ valueText(row[key], snapshot.chart) }}</td></tr></tbody></table></div>
        </template>
        <template v-else-if="tab === 'JSON'">
          <div class="json-toolbar"><v-select v-model="jsonSource" :label="t('Select source')" :items="[{title:t('Panel JSON'),value:'panel'},{title:t('Chart data'),value:'chart'},{title:t('Query response'),value:'response'},{title:t('Request details'),value:'request'}]" hide-details variant="outlined"/><v-btn prepend-icon="mdi-code-json" variant="outlined" @click="exportJson">{{ t("Download JSON") }}</v-btn></div>
          <pre class="code-view" :aria-label="t('Inspection JSON')">{{ jsonText }}</pre>
        </template>
        <template v-else>
          <div class="query-toolbar"><h2>{{ t("Executed Flux query") }}</h2><v-btn variant="outlined" prepend-icon="mdi-download-outline" :disabled="!snapshot.result.resolvedQuery" @click="exportQuery">{{ t("Download query") }}</v-btn></div>
          <pre class="code-view" :aria-label="t('Executed Flux query')">{{ snapshot.result.resolvedQuery || t('No completed query is available for this snapshot.') }}</pre>
          <h2 class="mt-6">{{ t("Panel query") }}</h2><p class="inspector-note">{{ t("The saved query template, before dashboard time macros are resolved.") }}</p><pre class="code-view" :aria-label="t('Panel query template')">{{ snapshot.chart.query }}</pre>
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import { formatDateTime } from '@/composables/dateTime.ts';
import { computed, ref, watch, nextTick } from 'vue';
import { chartDefinition } from '@/composables/dashboardUtils.ts';
import { inspectionTable, seriesNames, seriesStats, timeText, valueText, csvText, xlsxBytes, fileStem, downloadFile } from '@/composables/panelInspection.ts';
import type { InspectionMetadata, InspectionSource, PanelInspectionSnapshot } from '@/composables/dashboardPanelTypes';

const inspectorTabs = ['Data', 'Stats', 'JSON', 'Query'] as const;
const statKeys = ['min', 'max', 'mean', 'first', 'last'] as const;
type JsonSource = 'panel' | InspectionSource | 'request';

const props = defineProps<{ snapshot: PanelInspectionSnapshot }>();
const emit = defineEmits<{ close: [] }>();
const tab = ref<(typeof inspectorTabs)[number]>('Data');
const source = ref<InspectionSource>(props.snapshot.chart.visualization?.type === 'table' ? 'response' : 'chart');
const jsonSource = ref<JsonSource>('panel');
const formatted = ref(false);
const excelCsv = ref(false);
const page = ref(1);
const pageSize = ref(25);
const exporting = ref(false);
const exportError = ref('');
const capturedAt = computed(() => timeText(props.snapshot.capturedAt, props.snapshot.timezone));
const summary = computed(() => t('{rows} response rows · {series} series', {rows:props.snapshot.result.rawRows?.length ?? 0,series:Math.max(0,(props.snapshot.result.data?.length || 1)-1)}) + (props.snapshot.result.durationMs == null ? '' : ' · ' + t('{ms} ms request time',{ms:props.snapshot.result.durationMs})));
const table = computed(() => inspectionTable(props.snapshot, source.value, formatted.value));
const headerText = (name: string, index: number) => source.value === 'chart' && index < 2 && name.startsWith('Time (') ? t('Time ({timezone})',{timezone:name.slice(6,-1)}) : name;
const pageCount = computed(() => Math.max(1, Math.ceil(table.value.rows.length / pageSize.value)));
const visibleRows = computed(() => table.value.rows.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
watch([source, formatted, pageSize], () => { page.value = 1; exportError.value = ''; });
const names = computed(() => seriesNames(props.snapshot.chart, props.snapshot.result));
const stats = computed(() => seriesStats(props.snapshot.result));
const metadata = computed<InspectionMetadata[]>(() => { const r = props.snapshot.result; return [['Dashboard', props.snapshot.dashboardName], ['Panel', props.snapshot.chart.options.chartTitle], ['Selected range', r.queryRange || props.snapshot.range], ['From (UTC)', r.rangeStart], ['To (UTC)', r.rangeStop], ['Aggregation window', r.queryWindow || 'Query-defined'], ['Timezone', props.snapshot.timezone === 'Browser' ? Intl.DateTimeFormat().resolvedOptions().timeZone : props.snapshot.timezone], ['Request duration (ms)', r.durationMs], ['Response rows', r.rawRows?.length ?? 0], ['Aligned timestamps', r.data?.[0]?.length ?? 0], ['Series', names.value.length], ['Response size (bytes)', r.responseBytes], ['Loaded at', r.updated ? new Date(r.updated).toISOString() : 'No completed request'], ['Snapshot captured at', new Date(props.snapshot.capturedAt).toISOString()]]; });
const metadataText = (key: string, value: InspectionMetadata[1]) => typeof value === 'string' && value && ['From (UTC)', 'To (UTC)', 'Loaded at', 'Snapshot captured at'].includes(key) ? formatDateTime(value, key.includes('(UTC)') ? 'UTC' : props.snapshot.timezone, value) : value ?? 'Not available';
function displayMetadata(key: string, value: InspectionMetadata[1]) {
  const text = metadataText(key, value);
  return typeof text === 'string' && ['Query-defined', 'No completed request', 'Not available'].includes(text) ? t(text) : text;
}
const jsonValue = computed(() => ({ panel: chartDefinition(props.snapshot.chart), chart: { columns: names.value, timestamps: props.snapshot.result.data?.[0] || [], values: props.snapshot.result.data?.slice(1) || [], timestampUnit: 'Unix seconds', processing: props.snapshot.chart.processing || {} }, response: props.snapshot.result.rawRows || [], request: { metadata: Object.fromEntries(metadata.value), query: props.snapshot.result.resolvedQuery || null, error: props.snapshot.result.error || null, lastAttempt: props.snapshot.result.lastAttempt || null } })[jsonSource.value]);
const jsonText = computed(() => JSON.stringify(jsonValue.value, null, 2));
const stem = computed(() => fileStem(props.snapshot.chart.options.chartTitle) + '-' + new Date(props.snapshot.capturedAt).toISOString().replace(/[:.]/g, '-'));
const cellText = (value: unknown) => value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
async function exportData(kind: 'csv' | 'xlsx') {
  exporting.value = true; exportError.value = ''; await nextTick();
  try {
    const name = stem.value + '-' + source.value;
    if (kind === 'csv') downloadFile(csvText(table.value, excelCsv.value), name + '.csv', 'text/csv;charset=utf-8');
    else downloadFile(xlsxBytes(table.value, [...metadata.value, ['Data source', source.value], ['Formatted values', String(formatted.value && source.value === 'chart')], ['Executed Flux query', props.snapshot.result.resolvedQuery || '']]), name + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } catch (issue) { exportError.value = (issue instanceof Error ? issue.message : '') || 'The export could not be created. Try CSV or JSON.'; }
  finally { exporting.value = false; }
}
function exportJson() { downloadFile(jsonText.value, stem.value + '-' + jsonSource.value + '.json', 'application/json;charset=utf-8'); }
function exportQuery() {
  const query = props.snapshot.result.resolvedQuery;
  if (query) downloadFile(query, stem.value + '.flux', 'text/plain;charset=utf-8');
}
</script>
<style scoped lang="scss">
.panel-inspector{height:100dvh;max-height:100dvh;display:flex;flex-direction:column;background:rgb(var(--v-theme-background));border-radius:0;overflow:hidden}.inspector-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:22px 24px 18px;flex-shrink:0}.inspector-heading>div{min-width:0}.inspector-heading h1{font-size:20px;font-weight:500;overflow-wrap:anywhere}.inspector-heading p{font-size:12px;color:rgb(var(--v-theme-muted));margin:8px 0 0}.inspector-tabs{flex-shrink:0;border-bottom:1px solid rgb(var(--v-theme-border));padding-inline:12px}.inspector-body{flex:1;overflow:auto;min-height:0;padding:20px 24px}.data-toolbar,.data-options,.download-actions,.json-toolbar,.query-toolbar{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.data-toolbar{justify-content:space-between}.data-options{flex:1}.data-options>.v-select{min-width:200px;max-width:260px}.data-options>.v-switch{flex:0 0 auto}.download-actions{gap:8px}.inspector-note{font-size:12px;color:rgb(var(--v-theme-muted));margin:14px 0;line-height:1.6}.inspection-table{max-width:100%;overflow:auto;border:1px solid rgb(var(--v-theme-border));background:rgb(var(--v-theme-surface));border-radius:3px}.inspection-table table{border-collapse:collapse;min-width:100%;font-size:12px}.inspection-table th,.inspection-table td{padding:9px 12px;border-bottom:1px solid rgb(var(--v-theme-border));text-align:left;white-space:nowrap;max-width:720px;overflow:hidden;text-overflow:ellipsis}.inspection-table th{background:rgb(var(--v-theme-table-header));font-weight:500;color:rgb(var(--v-theme-muted))}.inspection-table tbody tr:last-child td{border-bottom:0}.inspection-table .number{text-align:right;font-variant-numeric:tabular-nums}.inspection-table .empty{text-align:center;padding:32px}.inspector-pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;color:rgb(var(--v-theme-muted));font-size:12px;margin-top:14px}.inspector-pagination>div,.inspector-pagination label{display:flex;align-items:center;gap:8px}.inspector-pagination select{border:1px solid rgb(var(--v-theme-border));border-radius:3px;padding:4px 8px;color:inherit;background:rgb(var(--v-theme-background))}.request-stats{display:grid;grid-template-columns:minmax(160px,220px) minmax(0,1fr);margin:0 0 28px;font-size:13px}.request-stats dt,.request-stats dd{padding:10px 12px;border-bottom:1px solid rgb(var(--v-theme-border));margin:0;overflow-wrap:anywhere}.request-stats dt{color:rgb(var(--v-theme-muted))}.inspector-body h2{font-size:16px;font-weight:500}.json-toolbar{margin-bottom:16px}.json-toolbar>.v-select{max-width:420px;min-width:200px}.code-view{white-space:pre;overflow:auto;background:rgb(var(--v-theme-surface));border:1px solid rgb(var(--v-theme-border));border-radius:3px;padding:16px;font-family:monospace;font-size:12px;line-height:1.6;max-height:65dvh}.query-toolbar{justify-content:space-between;margin-bottom:16px}
@media(max-width:700px){.inspector-heading{padding:16px}.inspector-body{padding:16px}.data-options{flex-basis:100%}.data-options>.v-select{max-width:none;flex-basis:100%}.download-actions{width:100%}.download-actions>.v-btn{flex:1}.request-stats{grid-template-columns:140px minmax(0,1fr)}.inspector-pagination>div{flex-wrap:wrap}.json-toolbar>.v-select{flex-basis:100%;max-width:none}.inspector-pagination label{flex-basis:100%}.inspector-heading h1{font-size:18px}}
@media(max-width:380px){.download-actions>.v-btn{flex-basis:100%}.request-stats{grid-template-columns:minmax(0,1fr)}.request-stats dt{border-bottom:0;padding-bottom:0}.request-stats dd{padding-top:4px}}
</style>
