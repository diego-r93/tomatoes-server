<template>
  <div class="panel-table">
    <v-table v-if="rows.length" class="panel-table-grid" fixed-header density="compact">
      <thead><tr><th v-for="column in columns" :key="column" scope="col">{{ headings[column] ? t(headings[column]) : column }}</th></tr></thead>
      <tbody><tr v-for="(row, index) in pageRows" :key="index"><td v-for="column in columns" :key="column">{{ cell(row, column) }}</td></tr></tbody>
    </v-table>
    <p v-else class="panel-table-empty" role="status">{{ t('No rows in this time range') }}</p>
    <footer v-if="pageCount > 1">
      <span>{{ t('{start}–{end} of {total}', { start: (page - 1) * config.pageSize + 1, end: Math.min(page * config.pageSize, rows.length), total: rows.length }) }}</span>
      <div>
        <v-btn size="small" icon="mdi-chevron-left" variant="text" :disabled="page === 1" :aria-label="t('Previous page')" @click="page--" />
        <v-btn size="small" icon="mdi-chevron-right" variant="text" :disabled="page === pageCount" :aria-label="t('Next page')" @click="page++" />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useLanguage } from '@/composables/useLanguage';
import { formatDateTime } from '@/composables/dateTime';
import type { VisualizationSettings } from '@/composables/dashboardPanelTypes';
import type { QueryRow } from '@/composables/dashboardSeries';

const props = defineProps<{ rows: QueryRow[]; config: VisualizationSettings; timezone: string }>();
const { t } = useLanguage();
const headings: Record<string, string> = Object.assign(Object.create(null), {
  _time: 'Time', _measurement: 'Measurement', _field: 'Field', _value: 'Value',
});
const internal = new Set(['result', 'table', '_start', '_stop']);
const columns = computed(() => {
  const keys = new Set(props.rows.flatMap(row => Object.keys(row)).filter(key => !internal.has(key)));
  const preferred = Object.keys(headings).filter(key => keys.delete(key));
  return [...preferred, ...keys];
});
const orderedRows = computed(() => {
  const direction = props.config.tableOrder === 'newest' ? -1 : 1;
  return props.rows.map(row => ({ row, time: Date.parse(row._time ?? '') }))
    .sort((a, b) => Number.isFinite(a.time) && Number.isFinite(b.time)
      ? (a.time - b.time) * direction : Number(Number.isFinite(b.time)) - Number(Number.isFinite(a.time)));
});
const page = ref(1);
const pageCount = computed(() => Math.max(1, Math.ceil(props.rows.length / props.config.pageSize)));
const pageRows = computed(() => orderedRows.value.slice((page.value - 1) * props.config.pageSize, page.value * props.config.pageSize).map(item => item.row));
watch(pageCount, count => { page.value = Math.min(page.value, count); });
watch(() => [props.config.pageSize, props.config.tableOrder], () => { page.value = 1; });
function cell(row: QueryRow, column: string) {
  const value = row[column];
  if (column === '_time') return formatDateTime(value, props.timezone);
  return value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
}
</script>

<style scoped lang="scss">
.panel-table{height:100%;min-width:0;display:flex;flex-direction:column;overflow:hidden;font-size:13px}
.panel-table-grid{flex:1;min-height:0;background:transparent}
.panel-table-grid :deep(th),.panel-table-grid :deep(td){white-space:nowrap}
.panel-table footer{display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 12px;border-top:1px solid rgb(var(--v-theme-border));color:rgb(var(--v-theme-muted))}
.panel-table-empty{margin:auto;color:rgb(var(--v-theme-muted))}
</style>
