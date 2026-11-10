<template>
  <div v-if="readings.length" class="bar-gauge" :class="{ vertical: config.orientation === 'vertical' }">
    <div v-for="(reading, index) in readings" :key="index" class="bar-reading">
      <span class="bar-label" :title="reading.label">{{ reading.label }}</span>
      <div class="bar-track" aria-hidden="true">
        <div class="bar-fill" :style="{ '--fraction': reading.fill, backgroundColor: reading.color }" />
        <div v-if="config.showThresholds" class="thresholds">
          <span v-for="step in markers" :key="step.value" :style="{ '--position': step.position, backgroundColor: step.color }" />
        </div>
      </div>
      <strong class="bar-value">{{ reading.display }}</strong>
    </div>
  </div>
  <div v-else class="bar-empty" role="status">{{ t('No numeric data in this time range') }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLanguage } from '@/composables/useLanguage';
import { processingFor } from '@/composables/dashboardUtils';
import { gaugeColor, gaugeFraction, gaugeReading, reduceSeries } from '@/composables/panelVisualization';
import type { DashboardPanelModel, VisualizationSettings } from '@/composables/dashboardPanelTypes';
import type { PlotData } from '@/composables/dashboardSeries';

const { t } = useLanguage();
const props = defineProps<{ chart: DashboardPanelModel; data: PlotData | []; labels: string[]; config: VisualizationSettings }>();
const readings = computed(() => {
  const { chart, data, labels, config } = props;
  const decimals = processingFor(chart).decimals;
  const unit = chart.options.unit;
  const series = config.series === null
    ? labels.map((_, index) => reduceSeries(data, labels, config, index))
    : [gaugeReading(data, labels, config)];
  return series.map(({ value, label }) => ({
    label: label || chart.options.chartTitle || t('Value'),
    display: value === null ? '—' : value.toFixed(decimals) + (unit ? ' ' + unit : ''),
    color: value === null ? config.color : gaugeColor(value, config),
    fill: gaugeFraction(value, config.min, config.max) * 100 + '%',
  }));
});
const markers = computed(() => {
  const { min, max, thresholds } = props.config;
  return thresholds.filter(step => step.value > min && step.value < max)
    .map(step => ({ ...step, position: gaugeFraction(step.value, min, max) * 100 + '%' }));
});
</script>

<style scoped lang="scss">
.bar-gauge{height:100%;overflow:auto;display:grid;align-content:center;align-content:safe center;gap:12px;padding:16px}
.bar-reading{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;font-size:13px}
.bar-label{grid-column:1/-1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgb(var(--v-theme-muted))}
.bar-track{position:relative;overflow:hidden;height:16px;background:rgba(var(--v-theme-on-surface),.12);border-radius:3px}
.bar-fill{height:100%;width:var(--fraction)}
.thresholds span{position:absolute;inset-block:0;left:var(--position);width:2px}
.bar-value{font-variant-numeric:tabular-nums;white-space:nowrap}
.vertical{display:flex;align-items:stretch;justify-content:safe center}
.vertical .bar-reading{width:90px;min-width:64px;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(40px,1fr) auto;text-align:center}
.vertical .bar-track{width:24px;height:100%;justify-self:center;display:flex;align-items:flex-end}
.vertical .bar-fill{width:100%;height:var(--fraction)}
.vertical .thresholds span{inset: auto 0 var(--position);width:auto;height:2px}
.bar-empty{height:100%;display:grid;place-items:center;color:rgb(var(--v-theme-muted));font-size:13px}
</style>
