<template>
  <div v-if="issue" class="visualization-error" role="status">{{ t(issue) }}</div>
  <Chart v-else-if="config.type === 'time-series'" :chart-options="chart.options" :chart-data="data" :labels="labels" :processing="processingFor(chart)" :timezone="timezone" />
  <StatChart v-else-if="config.type === 'stat'" :chart="chart" :data="data" :labels="labels" :config="config" :timezone="timezone" />
  <BarGaugeChart v-else-if="config.type === 'bar-gauge'" :chart="chart" :data="data" :labels="labels" :config="config" />
  <PanelTable v-else-if="config.type === 'table'" :rows="rawRows" :config="config" :timezone="timezone" />
  <GaugeChart v-else-if="config.type === 'gauge'" :chart="chart" :data="data" :labels="labels" :config="config" />
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import { computed } from 'vue';
import Chart from './Chart.vue';
import GaugeChart from './GaugeChart.vue';
import BarGaugeChart from './BarGaugeChart.vue';
import PanelTable from './PanelTable.vue';
import StatChart from './StatChart.vue';
import { processingFor, processingError } from '@/composables/dashboardUtils.ts';
import { visualizationFor, visualizationError } from '@/composables/panelVisualization.ts';
import type { PlotData, QueryRow } from '@/composables/dashboardSeries';
import type { DashboardPanelModel, VisualizationSettings } from '@/composables/dashboardPanelTypes';
const props = withDefaults(defineProps<{
  chart: DashboardPanelModel;
  data: PlotData | [];
  labels?: string[];
  rawRows?: QueryRow[];
  timezone?: string;
}>(), { labels: () => [], rawRows: () => [], timezone: 'Browser' });
const config = computed<VisualizationSettings>(() => visualizationFor(props.chart));
const issue = computed(() => visualizationError(props.chart) || (config.value.type === 'table' ? '' : processingError(props.chart)));
</script>
<style scoped>.visualization-error{display:flex;align-items:center;justify-content:center;height:100%;padding:16px;text-align:center;color:rgb(var(--v-theme-error));font-size:13px}</style>
