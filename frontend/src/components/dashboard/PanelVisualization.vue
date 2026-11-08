<template>
  <div v-if="issue" class="visualization-error" role="status">{{ t(issue) }}</div>
  <Chart v-else-if="config.type === 'time-series'" :chart-options="chart.options" :chart-data="data" :labels="labels" :processing="processingFor(chart)" :timezone="timezone" />
  <StatChart v-else-if="config.type === 'stat'" :chart="chart" :data="data" :labels="labels" :config="config" :timezone="timezone" />
  <GaugeChart v-else-if="config.type === 'gauge'" :chart="chart" :data="data" :labels="labels" :config="config" />
</template>
<script setup>
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import { computed } from 'vue';
import Chart from './Chart.vue';
import GaugeChart from './GaugeChart.vue';
import StatChart from './StatChart.vue';
import { processingFor, processingError } from '@/composables/dashboardUtils.mjs';
import { visualizationFor, visualizationError } from '@/composables/panelVisualization.mjs';
const props = defineProps({ chart: { type: Object, required: true }, data: { type: Array, required: true }, labels: { type: Array, default: () => [] }, timezone: { type: String, default: 'Browser' } });
const config = computed(() => visualizationFor(props.chart));
const issue = computed(() => visualizationError(props.chart) || processingError(props.chart));
</script>
<style scoped>.visualization-error{display:flex;align-items:center;justify-content:center;height:100%;padding:16px;text-align:center;color:rgb(var(--v-theme-error));font-size:13px}</style>
