<template>
  <article class="chart-panel app-panel">
    <header class="chart-header">
      <v-menu><template #activator="{props}"><button v-bind="props" type="button" class="chart-title"><span>{{ chart.options.chartTitle }}</span><v-icon icon="mdi-chevron-down" size="12" aria-hidden="true"/></button></template><v-list density="compact"><v-list-item prepend-icon="mdi-eye-outline" :title="t('View')" @click="emit('view')"/><v-list-item prepend-icon="mdi-magnify" :title="t('Inspect')" @click="emit('inspect')"/><v-list-item v-if="editing" prepend-icon="mdi-square-edit-outline" :title="t('Edit')" @click="emit('edit')"/><v-divider v-if="editing"/><v-list-item v-if="editing" prepend-icon="mdi-trash-can-outline" :title="t('Remove')" @click="emit('remove')"/></v-list></v-menu>
      <div class="app-action-row"><v-menu><template #activator="{props}"><v-btn v-bind="props" icon="mdi-dots-vertical" size="small" variant="text" :aria-label="t('Panel menu: {name}',{name:chart.options.chartTitle})" /></template><v-list density="compact"><v-list-item :title="t('View')" prepend-icon="mdi-eye-outline" @click="emit('view')"/><v-list-item :title="t('Inspect')" prepend-icon="mdi-magnify" @click="emit('inspect')"/><v-list-item v-if="editing" :title="t('Edit')" prepend-icon="mdi-square-edit-outline" @click="emit('edit')"/><v-list-item v-if="editing" :title="t('Move earlier')" prepend-icon="mdi-arrow-left" @click="emit('move')"/><v-divider v-if="editing"/><v-list-item v-if="editing" :title="t('Remove')" prepend-icon="mdi-trash-can-outline" @click="emit('remove')"/></v-list></v-menu></div>
    </header>
    <div class="chart-content"><PanelVisualization v-if="result?.data?.[0]?.length || (result?.updated && !result?.loading && !result?.error && chart.visualization?.type === 'stat')" :chart="chart" :data="result?.data || [[],[]]" :labels="result?.labels || []" :timezone="timezone"/><div v-else class="chart-empty"><v-progress-circular v-if="result?.loading || (!result?.updated && !result?.error)" indeterminate size="28"/><span>{{ t(result?.loading || (!result?.updated && !result?.error) ? 'Loading data…' : result?.error || 'No numeric data in this time range') }}</span></div></div>
    <div v-if="result?.error && result?.data?.[0]?.length" class="chart-warning" role="status">{{ t(result.error) }} {{ t("· previous samples shown") }}</div>
  </article>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import PanelVisualization from './PanelVisualization.vue';
import type { ChartPanelDefinition, PanelInspectionResult } from '@/composables/dashboardPanelTypes';

withDefaults(defineProps<{
  chart: ChartPanelDefinition;
  result?: PanelInspectionResult;
  editing?: boolean;
  timezone?: string;
}>(), { result: () => ({}), timezone: 'Browser' });

const emit = defineEmits<{ view: []; inspect: []; edit: []; remove: []; move: [] }>();
</script>
<style scoped lang="scss">
.chart-panel{height:100%;display:flex;flex-direction:column;min-width:0;overflow:hidden;border-radius:3px}.chart-header{display:flex;align-items:center;justify-content:center;position:relative;min-height:30px;height:30px;flex-shrink:0;padding:0 34px;cursor:move}.chart-header>.app-action-row{position:absolute;right:2px;top:0;gap:0}.chart-header :deep(.v-btn){width:28px;height:28px}.chart-header :deep(.v-icon){font-size:16px}.chart-header:hover,.chart-header:focus-within{background:rgb(var(--v-theme-hover))}.chart-title{display:inline-flex;align-items:center;justify-content:center;gap:5px;background:transparent;border:0;padding:0;text-align:center;font-size:13px;font-weight:500;color:rgb(var(--v-theme-on-surface));max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chart-title>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chart-content{flex:1;min-height:0;min-width:0;position:relative}.chart-content :deep(.dashboard-plot){position:absolute;inset:0 6px 4px;width:auto;height:auto}.chart-empty{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;text-align:center;padding:16px;color:rgb(var(--v-theme-muted));font-size:13px}.chart-warning{padding:4px 10px;font-size:12px;color:rgb(var(--v-theme-error))}
</style>
