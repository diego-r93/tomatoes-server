<template><div ref="container" class="dashboard-plot" :class="{ 'legend-right': chartOptions.legendPosition === 'right' }" role="img" :aria-label="chartOptions.chartTitle || 'Time series chart'"><div ref="plotHost" class="plot-canvas"/><div v-if="processingFor({processing}).showLegend" class="plot-legend"><span v-for="(item,index) in legend" :key="index" class="legend-series" :title="item.label"><i :style="{background:item.color}"/><span class="legend-label">{{ item.label }}</span><span v-if="chartOptions.legendMode === 'values'">{{ hoverValues[index] ?? item.last }}</span><span v-else-if="hoverValues[index]!==undefined">{{ hoverValues[index] }}</span></span></div><div v-if="tooltip.visible" class="plot-tooltip" role="tooltip" :style="{left:tooltip.x+'px',top:tooltip.y+'px'}"><strong>{{ tooltip.time }}</strong><div v-for="(item,index) in tooltip.items" :key="index" class="tooltip-row"><i :style="{background:item.color}"/><span class="tooltip-label" :title="item.label">{{ item.label }}</span><span class="tooltip-value">{{ item.value }}</span></div></div></div></template>
<script setup lang="ts">
import { chartTimeLabel } from '@/composables/dateTime.ts';
import 'uplot/dist/uPlot.min.css';
import uPlot from 'uplot';
import { ref,computed,watch,onMounted,onBeforeUnmount } from 'vue';
import { useTheme } from 'vuetify';
import type { PlotData, Processing } from '@/composables/dashboardSeries';
import type { ChartOptions, SeriesStyle } from '@/composables/dashboardPanelTypes';
import { processingFor } from '@/composables/dashboardUtils.ts';
defineOptions({name:'DashboardChart'});
const props = withDefaults(defineProps<{
 chartOptions: ChartOptions;
 chartData: PlotData | [];
 processing?: Partial<Processing>;
 labels?: string[];
 timezone?: string;
}>(), { processing: () => ({}), labels: () => [], timezone: 'Browser' });
type LegendItem = { label: string; color: string; last: string };
type PlotTooltip = { visible: false } | { visible: true; x: number; y: number; time: string; items: (LegendItem & { value: string })[] };
const container = ref<HTMLElement | null>(null), plotHost = ref<HTMLElement | null>(null);
const legend = ref<LegendItem[]>([]), hoverValues = ref<string[]>([]);
const tooltip = ref<PlotTooltip>({ visible: false }), theme = useTheme();
let plot: uPlot | null = null, observer: ResizeObserver | undefined, resizeFrame = 0;
const palette=computed(()=>theme.current.value.colors);
function chartColor(key: 'muted' | 'chart-grid') {
 const color = palette.value[key];
 return typeof color === 'string' ? color : undefined;
}
const timeSpan = (chart: uPlot) => (chart.scales.x.max ?? 0) - (chart.scales.x.min ?? 0);
function lastSample(values: (number | null)[]) {
 for (let index = values.length - 1; index >= 0; index--) {
   if (values[index] != null) return values[index];
 }
 return null;
}
function draw(){
 const host = container.value;
 if(!host||!plotHost.value)return;plot?.destroy();plot=null;hoverValues.value=[];tooltip.value={visible:false};
 const p=processingFor({processing:props.processing}),width=plotHost.value.clientWidth,height=plotHost.value.clientHeight;if(width<100||height<80)return;
 const [timestamps, ...values] = props.chartData;
 const data: PlotData = timestamps?.length && values.length ? [timestamps, ...values] : [[], []];
 const count = data.length - 1;
 const original=props.chartOptions.series||[{},{}],base=original[1]||{},scale=props.chartOptions.axes?.[1]?.scale||base.scale;
 const colors=[base.stroke||'#80cbc4','#90caf9','#ffcc80','#ce93d8','#a5d6a7','#ef9a9a'];
 const format=(value: number | null | undefined)=>{if(value==null)return '—';const divisor=scale==='mb'?1e6:scale==='gb'?1e9:1;return (value/divisor).toFixed(p.decimals)+(props.chartOptions.unit?` ${props.chartOptions.unit}`:scale==='mb'?' MB':scale==='gb'?' GB':scale==='C'?' °C':'');};
 const options = props.chartOptions;
 const paths = options.lineStyle === 'step' ? uPlot.paths.stepped?.({ align: 1 })
   : options.lineStyle === 'bars' ? uPlot.paths.bars?.({ size: [0.75, 100] }) : undefined;
 const series: SeriesStyle[] = [{label:original[0]?.label||'Date'},...Array.from({length:count},(_,i)=>({...base,label:count===1?(base.label||props.chartOptions.chartTitle||'Value'):(props.labels[i]||base.label||'Value'),scale:'y',stroke:colors[i%colors.length],fill:i===0?base.fill:undefined,width:p.lineWidth,paths,spanGaps:p.gaps==='Connect gaps',points:{...base.points,show:p.showPoints},value:(_: uPlot,v: number)=>format(v)}))];
 legend.value = series.slice(1).map((item, index) => ({
   label: item.label || 'Value',
   color: item.stroke || colors[0],
   last: format(lastSample(data[index + 1])),
 }));
 const grid = { show: options.showGrid !== false, stroke: chartColor('chart-grid'), width: .6 };
 plot = new uPlot({
   width, height,
   padding: [12, 10, 0, 0],
   tzDate: ts => uPlot.tzDate(new Date(ts * 1000), props.timezone === 'Browser' ? Intl.DateTimeFormat().resolvedOptions().timeZone : props.timezone),
   legend: { show: false },
   series,
   scales: { x: { time: true }, y: { auto: true } },
   axes: [
     { stroke: chartColor('muted'), font: '11px Roboto', grid, ticks: { show: false },
       size: u => timeSpan(u) > 86400 ? 42 : 30,
       values: (u, ticks) => ticks.map(ts => chartTimeLabel(ts * 1000, timeSpan(u), props.timezone, true)) },
     { stroke: chartColor('muted'), font: '11px Roboto', grid: { ...grid }, ticks: { show: false },
       side: options.axisPlacement === 'right' ? 1 : 3,
       show: options.axisPlacement !== 'hidden',
       label: options.axisLabel || undefined,
       size: (_, labels) => Math.max(44, ...(labels || []).map(value => String(value).length * 6 + 12)),
       values: (_, ticks) => ticks.map(format) },
   ],
   hooks: { setCursor: [u => {
     const at = u.cursor.idx, left = u.cursor.left ?? -1, top = u.cursor.top ?? -1;
     if (at == null || left < 0 || top < 0) {
       hoverValues.value = [];
       tooltip.value = { visible: false };
       return;
     }
     hoverValues.value = u.data.slice(1).map(values => format(values[at]));
     if (options.tooltipMode === 'hidden') return;
     const root = host.getBoundingClientRect(), over = u.over.getBoundingClientRect();
     let items = legend.value.map((item, index) => ({
       ...item,
       label: props.labels[index] ? item.label + ' {' + props.labels[index] + '}' : item.label,
       value: format(u.data[index + 1][at]),
     }));
     if (options.tooltipMode === 'nearest') {
       let distance = Infinity;
       let nearest = -1;
       for (let index = 0; index < items.length; index++) {
         const value = u.data[index + 1][at];
         if (value == null) continue;
         const candidate = Math.abs(top - u.valToPos(value, 'y'));
         if (candidate < distance) { distance = candidate; nearest = index; }
       }
       if (nearest < 0) { tooltip.value = { visible: false }; return; }
       items = [items[nearest]];
     }
     tooltip.value = {
       visible: true,
       x: Math.max(8, Math.min(over.left - root.left + left + 14, root.width - Math.min(420, root.width - 16) - 8)),
       y: Math.max(8, Math.min(over.top - root.top + top + 16, root.height - Math.min(32 + items.length * 26, 200) - 8)),
       time: chartTimeLabel(u.data[0][at] * 1000, timeSpan(u), props.timezone),
       items,
     };
   }] },
 }, data, plotHost.value);
}
onMounted(()=>{observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(draw);});if(plotHost.value)observer.observe(plotHost.value);draw();});
watch(()=>[props.chartData,props.chartOptions,props.processing,props.labels,props.timezone,palette.value],draw,{deep:true,flush:"post"});
onBeforeUnmount(()=>{observer?.disconnect();cancelAnimationFrame(resizeFrame);plot?.destroy();});
</script>
<style scoped lang="scss">
.dashboard-plot{width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;position:relative;display:flex;flex-direction:column}.plot-canvas{flex:1;min-height:0;min-width:0}.plot-legend{height:26px;flex-shrink:0;display:flex;align-items:center;gap:14px;padding:0 12px;overflow:auto;font-size:12px;color:rgb(var(--v-theme-muted));white-space:nowrap}.legend-series{display:inline-flex;align-items:center;gap:6px;min-width:0}.legend-series i{display:inline-block;width:12px;height:4px;flex-shrink:0}.legend-label{max-width:280px;overflow:hidden;text-overflow:ellipsis}
.legend-right{flex-direction:row}.legend-right .plot-legend{height:auto;max-width:32%;flex-direction:column;align-items:stretch;gap:7px;padding:12px 8px}.legend-right .legend-label{flex:1}
.plot-tooltip{position:absolute;z-index:4;pointer-events:none;background:rgb(var(--v-theme-surface));color:rgb(var(--v-theme-on-surface));border:1px solid rgb(var(--v-theme-border));border-radius:3px;box-shadow:0 4px 14px #0004;padding:9px 11px;max-width:calc(100% - 16px);width:420px;max-height:min(240px,calc(100% - 16px));overflow:hidden;font-size:12px}.plot-tooltip strong{display:block;margin-bottom:7px;font-weight:500;color:rgb(var(--v-theme-muted))}.tooltip-row{display:flex;gap:7px;align-items:center;margin-top:5px}.tooltip-row i{width:12px;height:4px;flex-shrink:0}.tooltip-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.tooltip-value{white-space:nowrap;font-variant-numeric:tabular-nums}
</style>
