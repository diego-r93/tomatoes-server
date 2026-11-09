<template>
  <div v-if="issue" class="visualization-error" role="status">{{ t(issue) }}</div>
  <Chart v-else-if="config.type === 'time-series'" :chart-options="chart.options" :chart-data="data" :labels="labels" :processing="processingFor(chart)" :timezone="timezone" />
  <StatChart v-else-if="config.type === 'stat'" :chart="chart" :data="data" :labels="labels" :config="config" :timezone="timezone" />
  <GaugeChart v-else-if="config.type === 'gauge'" :chart="chart" :data="data" :labels="labels" :config="config" />
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import { computed } from 'vue';
import Chart from './Chart.vue';
import GaugeChart from './GaugeChart.vue';
import StatChart from './StatChart.vue';
import { processingFor, processingError } from '@/composables/dashboardUtils.ts';
import { visualizationFor, visualizationError } from '@/composables/panelVisualization.ts';
import type { PlotData } from '@/composables/dashboardSeries';
import type { DashboardPanelModel, VisualizationSettings } from '@/composables/dashboardPanelTypes';
const props = withDefaults(defineProps<{
  chart: DashboardPanelModel;
  data: PlotData | [];
  labels?: string[];
  timezone?: string;
}>(), { labels: () => [], timezone: 'Browser' });
const config = computed<VisualizationSettings>(() => visualizationFor(props.chart));
const issue = computed(() => visualizationError(props.chart) || processingError(props.chart));
</script>
<style scoped>.visualization-error{display:flex;align-items:center;justify-content:center;height:100%;padding:16px;text-align:center;color:rgb(var(--v-theme-error));font-size:13px}</style>
