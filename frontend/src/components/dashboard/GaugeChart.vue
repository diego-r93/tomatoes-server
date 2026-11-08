<template>
  <div class="gauge-visualization" role="img" :aria-label="accessibleLabel">
    <svg viewBox="0 0 240 220" class="gauge-svg" aria-hidden="true">
      <path :d="gaugeArc(0, 1)" class="gauge-track" />
      <path v-if="reading.value !== null && fraction > 0" :d="gaugeArc(0, fraction)" :stroke="color" class="gauge-value" />
      <g v-if="config.showThresholds && reading.value !== null"><path v-for="(segment, index) in segments" :key="index" :d="gaugeArc(segment.start, segment.end, 101)" :stroke="segment.color" class="gauge-threshold" /></g>
      <text x="120" y="128" text-anchor="middle" class="gauge-number" :style="{ fontSize: fontSize + 'px' }">{{ formatted }}</text>
      <text v-if="unit && reading.value !== null" x="120" y="151" text-anchor="middle" class="gauge-unit">{{ unit }}</text>
      <text x="36" y="204" text-anchor="start" class="gauge-bound">{{ compactBound(config.min) }}</text>
      <text x="204" y="204" text-anchor="end" class="gauge-bound">{{ compactBound(config.max) }}</text>
    </svg>
    <div class="gauge-caption" :title="caption">{{ caption }}</div>
  </div>
</template>
<script setup>
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import { computed } from 'vue';
import { gaugeReading, gaugeColor, gaugeFraction, gaugeSegments, gaugeArc, reducers } from '@/composables/panelVisualization.mjs';
import { processingFor } from '@/composables/dashboardUtils.mjs';
const props = defineProps({ chart: { type: Object, required: true }, data: { type: Array, required: true }, labels: { type: Array, default: () => [] }, config: { type: Object, required: true } });
const reading = computed(() => gaugeReading(props.data, props.labels, props.config));
const scale = computed(() => props.chart.options?.axes?.[1]?.scale || props.chart.options?.series?.[1]?.scale);
const unit = computed(() => props.chart.options?.unit || ({ C: '°C', mb: 'MB', gb: 'GB' }[scale.value] ?? ''));
const divisor = computed(() => scale.value === 'mb' ? 1e6 : scale.value === 'gb' ? 1e9 : 1);
const formatted = computed(() => reading.value.value === null ? t('No data') : (reading.value.value / divisor.value).toFixed(processingFor(props.chart).decimals));
const fontSize = computed(() => Math.max(18, Math.min(48, 220 / Math.max(formatted.value.length, 1))));
const fraction = computed(() => gaugeFraction(reading.value.value / divisor.value, props.config.min, props.config.max));
const color = computed(() => gaugeColor(reading.value.value / divisor.value, props.config));
const segments = computed(() => gaugeSegments(props.config));
const caption = computed(() => [reading.value.label || props.chart.options?.series?.[1]?.label, t(reducers.find(item => item.value === props.config.reducer)?.title || '')].filter(Boolean).join(' · '));
const accessibleLabel = computed(() => `${props.chart.options?.chartTitle || 'Gauge'}: ${formatted.value}${reading.value.value === null ? '' : ' ' + unit.value}. Scale ${props.config.min} to ${props.config.max}. ${caption.value}`);
const compactBound = value => new Intl.NumberFormat('en', { maximumFractionDigits: 3, notation: Math.abs(value) >= 10000 ? 'compact' : 'standard' }).format(value);
</script>
<style scoped lang="scss">
.gauge-visualization{width:100%;height:100%;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 10px 8px;overflow:hidden}.gauge-svg{display:block;width:100%;height:calc(100% - 22px);min-height:0;flex:1}.gauge-track,.gauge-value{fill:none;stroke-width:18;stroke-linecap:butt}.gauge-track{stroke:rgb(var(--v-theme-border));opacity:.7}.gauge-threshold{fill:none;stroke-width:3}.gauge-number{fill:rgb(var(--v-theme-on-surface));font-family:inherit;font-weight:400;font-variant-numeric:tabular-nums}.gauge-unit,.gauge-bound{fill:rgb(var(--v-theme-muted));font-family:inherit;font-size:11px}.gauge-unit{font-size:13px}.gauge-caption{height:18px;max-width:100%;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgb(var(--v-theme-muted));font-size:11px}
</style>
