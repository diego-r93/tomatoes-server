<template>
  <div class="stat-visualization" :class="{'stat-stale':freshness === 'stale'}" role="img" :aria-label="accessibleLabel">
    <div class="stat-reading" :style="{color:reading.value === null ? undefined : color}"><span class="stat-number" :class="{'stat-number-long':formatted.length>9}">{{ formatted }}</span><span v-if="reading.value !== null && unit.unit" class="stat-unit">{{ unit.unit }}</span></div>
    <div class="stat-caption" :title="caption">{{ caption }}</div>
    <svg v-if="config.sparkline && spark.line" class="stat-sparkline" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true"><path :d="spark.area" :fill="color" opacity=".12"/><path :d="spark.line" :stroke="color" fill="none" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>
    <div class="stat-age" :class="{'text-warning':freshness !== 'fresh' && freshness !== 'no-data'}">
      <template v-if="reading.value !== null"><span>{{ t('Latest sample') }}: {{ sampleTime }}</span><strong v-if="freshness === 'stale'">{{ t('Older than {seconds}s', {seconds:config.staleAfterSeconds}) }}</strong><strong v-else-if="freshness === 'future'">{{ t('Sample time is ahead of this computer.') }}</strong></template>
      <span v-else>{{ t('No valid numeric sample in this time range.') }}</span>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useLanguage } from '@/composables/useLanguage';
import { formatDateTime } from '@/composables/dateTime.mjs';
import { processingFor } from '@/composables/dashboardUtils.mjs';
import { gaugeColor, reducers } from '@/composables/panelVisualization.mjs';
import { statReading, statUnit, statFreshness, statSparkline } from '@/composables/statVisualization.mjs';
const props = defineProps({chart:{type:Object,required:true},data:{type:Array,required:true},labels:{type:Array,default:()=>[]},config:{type:Object,required:true},timezone:{type:String,default:'Browser'}});
const {t} = useLanguage(), clock = ref(Date.now()); let timer;
onMounted(()=>{timer=setInterval(()=>{clock.value=Date.now();},5000);});
onBeforeUnmount(()=>clearInterval(timer));
const reading = computed(()=>statReading(props.data,props.labels,props.config));
const unit = computed(()=>statUnit(props.chart));
const formatted = computed(()=>reading.value.value === null ? t('No data') : (reading.value.value/unit.value.divisor).toFixed(processingFor(props.chart).decimals));
const color = computed(()=>gaugeColor(reading.value.value/unit.value.divisor,props.config));
const spark = computed(()=>statSparkline(props.data,props.labels,props.config));
const freshness = computed(()=>statFreshness(reading.value,clock.value,props.config.staleAfterSeconds));
const sampleTime = computed(()=>Number.isFinite(reading.value.timestamp) ? formatDateTime(reading.value.timestamp*1000,props.timezone) : t('Unknown'));
const caption = computed(()=>[reading.value.label === 'Ambiguous series. Add a tag or field filter to the query.' ? t(reading.value.label) : reading.value.label,t(reducers.find(item=>item.value===props.config.reducer)?.title || '')].filter(Boolean).join(' · '));
const accessibleLabel = computed(()=>`${props.chart.options?.chartTitle || 'Stat'}: ${formatted.value} ${reading.value.value === null ? '' : unit.value.unit}. ${caption.value}. ${reading.value.value === null ? '' : sampleTime.value}. ${freshness.value === 'stale' ? t('Older than {seconds}s',{seconds:props.config.staleAfterSeconds}) : ''}`);
</script>
<style scoped lang="scss">
.stat-visualization{container-type:inline-size;width:100%;height:100%;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px 18px;overflow:hidden}.stat-reading{display:flex;justify-content:center;align-items:baseline;gap:8px;max-width:100%;font-variant-numeric:tabular-nums}.stat-number{font-size:clamp(28px,15cqw,90px);font-weight:500;line-height:1.15;overflow-wrap:anywhere;text-align:center}.stat-number-long{font-size:clamp(20px,9cqw,56px)}.stat-unit{font-size:clamp(14px,5cqw,26px);opacity:.85}.stat-caption{font-size:12px;color:rgb(var(--v-theme-muted));max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stat-sparkline{display:block;width:100%;height:clamp(24px,16cqw,70px);flex-shrink:1;min-height:18px;margin-top:4px}.stat-age{display:flex;flex-direction:column;gap:4px;font-size:11px;line-height:1.5;text-align:center;color:rgb(var(--v-theme-muted));max-width:100%;overflow-wrap:anywhere}.stat-age strong{font-weight:500}.stat-stale .stat-reading{opacity:.7}
</style>
