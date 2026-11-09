<template>
  <v-dialog :model-value="true" max-width="1120" scrollable @update:model-value="!$event && emit('close')">
    <v-card class="panel-editor">
      <v-card-title class="editor-heading">{{ t(isNew ? 'Add panel' : 'Edit panel') }}<v-btn icon="mdi-close" variant="text" :aria-label="t('Close panel editor')" @click="emit('close')" /></v-card-title>
      <v-card-text>
        <div class="editor-top">
          <div><p class="muted mb-2">{{ t("Panel preview ·") }} {{ panel.visualization.type === 'time-series' ? 'uPlot' : panel.visualization.type === 'stat' ? 'Stat' : 'Gauge' }} {{ t("· live InfluxDB data") }}</p><div class="editor-preview app-panel"><PanelVisualization :chart="panel" :data="preview.data" :labels="preview.labels" :timezone="timezone" /></div></div>
          <div class="editor-fields">
            <label class="wide">{{ t("Visualization") }}<select v-model="panel.visualization.type" :disabled="!!panel.liveSource"><option v-for="item in visualizationTypes" :key="item.value" :value="item.value">{{ t(item.title) }}</option></select><small>{{ t(visualizationTypes.find(item => item.value === panel.visualization.type)?.description || '') }}</small></label>
            <label>{{ t("Panel title") }}<input v-model="panel.options.chartTitle" maxlength="200"></label>
            <label>{{ t("Unit") }}<input v-model="panel.options.unit" placeholder="°C, %, pH…"></label>
            <label>{{ t("Panel width") }}<select v-model.number="panel.layout.w"><option :value="4">{{ t("Third") }}</option><option :value="6">{{ t("Half") }}</option><option :value="12">{{ t("Full") }}</option></select></label>
            <label v-if="panel.visualization.type === 'time-series'">{{ t("Series color") }}<input v-model="color" type="color" @input="setColor"></label>
            <label v-if="panel.visualization.type === 'time-series'" class="wide">{{ t("Fill opacity ·") }} {{ opacity }}<input v-model.number="opacity" type="range" min="0" max="0.5" step="0.01" @input="setColor"></label>
          </div>
        </div>
        <section v-if="['gauge','stat'].includes(panel.visualization.type)" class="gauge-settings">
          <h3>{{ t(panel.visualization.type === 'stat' ? 'Stat options' : 'Gauge options') }}</h3>
          <p class="muted">{{ t("Calculates one value from the processed samples returned for the selected time range. Last non-null uses the latest valid sample in that result, which may already be aggregated by your query.") }}</p>
          <div class="editor-fields builder-fields">
            <label>{{ t("Calculation") }}<select v-model="panel.visualization.reducer"><option v-for="item in reducers" :key="item.value" :value="item.value">{{ t(item.title) }}</option></select></label>
            <label>{{ t("Series") }}<select v-model="panel.visualization.series"><option :value="null">{{ t("First returned series") }}</option><option v-if="panel.visualization.series && !preview.labels.includes(panel.visualization.series)" :value="panel.visualization.series">{{ panel.visualization.series }} {{ t("(not in current result)") }}</option><option v-for="label in [...new Set(preview.labels)]" :key="label" :value="label">{{ label }}</option></select><small>{{ t("Run query to load the available series.") }}</small></label>
            <label>{{ t("Base color") }}<input v-model="panel.visualization.color" type="color"></label>
            <label v-if="panel.visualization.type === 'gauge'">{{ t("Scale minimum") }}<input v-model.number="panel.visualization.min" type="number" step="any"></label>
            <label v-if="panel.visualization.type === 'gauge'">{{ t("Scale maximum") }}<input v-model.number="panel.visualization.max" type="number" step="any"></label>
            <label v-if="panel.visualization.type === 'gauge'" class="check-field"><input v-model="panel.visualization.showThresholds" type="checkbox"> {{ t("Show threshold markers") }}</label>
            <label v-if="panel.visualization.type === 'stat'" class="check-field"><input v-model="panel.visualization.sparkline" type="checkbox"> {{ t("Show sparkline") }}</label>
            <label v-if="panel.visualization.type === 'stat'">{{ t("Mark samples older than (seconds)") }}<input v-model.number="panel.visualization.staleAfterSeconds" type="number" min="1" max="604800" step="1"></label>
          </div>
          <template v-if="panel.visualization.type === 'stat'"><div class="threshold-heading"><h4>{{ t('Value mappings') }}</h4><v-btn size="small" variant="outlined" :disabled="panel.visualization.mappings.length >= 20" @click="panel.visualization.mappings.push({value:panel.visualization.mappings.length,text:''})">{{ t('Add mapping') }}</v-btn></div><div v-for="(mapping,index) in panel.visualization.mappings" :key="index" class="threshold-row"><label>{{ t('Value') }}<input v-model.number="mapping.value" type="number" step="any"></label><label>{{ t('Text') }}<input v-model="mapping.text" maxlength="80"></label><v-btn icon="mdi-close" size="small" variant="text" :aria-label="t('Remove mapping')" @click="panel.visualization.mappings.splice(index,1)"/></div></template>
          <p v-if="panel.visualization.type === 'stat'" class="muted">{{ t("Sample age uses the latest valid timestamp returned by the query, not the request time. Historical ranges and aggregated timestamps may show older data.") }}</p>
          <p class="muted">{{ t("Thresholds use the displayed unit and do not change the data. Gauge scale limits the arc only; Stat does not use a scale.") }}</p>
          <div class="threshold-heading"><h4>{{ t("Color thresholds") }}</h4><v-btn size="small" variant="outlined" prepend-icon="mdi-plus" :disabled="panel.visualization.thresholds.length >= 10" @click="addThreshold">{{ t("Add threshold") }}</v-btn></div>
          <p class="muted">{{ t("Base color applies below the first threshold. Each threshold applies at or above its value. Enter values in ascending order.") }}</p>
          <div v-for="(step,index) in panel.visualization.thresholds" :key="index" class="threshold-row">
            <label :for="'threshold-value-'+index">{{ t("Value") }}<input :id="'threshold-value-'+index" v-model.number="step.value" type="number" step="any"></label>
            <label :for="'threshold-color-'+index">{{ t("Color") }}<input :id="'threshold-color-'+index" v-model="step.color" type="color"></label>
            <v-btn icon="mdi-close" size="small" variant="text" :aria-label="t('Remove threshold {number}',{number:index+1})" @click="panel.visualization.thresholds.splice(index,1)" />
          </div>
          <p v-if="!panel.visualization.thresholds.length" class="muted">{{ t("One color for the entire scale.") }}</p>
        </section>
        <v-alert v-if="panel.liveSource" variant="tonal" class="mt-4">Live board status uses backend observations, not Flux, and ignores the selected time range.</v-alert><div v-if="!panel.liveSource" class="editor-tabs app-action-row"><v-btn v-for="name in editorTabs" :key="name" :variant="tab===name?'tonal':'text'" :color="tab===name?'primary':undefined" @click="tab=name">{{ t(name) }}</v-btn><v-spacer/><v-btn prepend-icon="mdi-database-search" variant="outlined" @click="tab='Builder';loadMeasurements()">{{ t("Browse data") }}</v-btn><v-btn prepend-icon="mdi-play-outline" variant="outlined" :loading="running" :disabled="!!validation || !panel.query.trim()" @click="run">{{ t("Run query") }}</v-btn></div>
        <div v-if="!panel.liveSource && tab==='Builder'">
          <p class="muted mb-4">{{ t("Build a query from available InfluxDB fields. Generating replaces the Flux text only when you click Generate query.") }}</p>
          <div class="editor-fields builder-fields">
            <label>{{ t("Bucket") }}<input v-model="source.bucket"><v-btn size="small" variant="text" :loading="loadingSchema" @click="loadMeasurements">{{ t("Load measurements") }}</v-btn></label>
            <label>{{ t("Measurement") }}<select v-model="source.measurement" @change="loadFields"><option value="">{{ t("Select measurement") }}</option><option v-for="name in measurements" :key="name">{{ name }}</option></select></label>
            <label>{{ t("Field") }}<select v-model="source.field"><option value="">{{ t("Select field") }}</option><option v-for="name in fields" :key="name">{{ name }}</option></select></label>
            <label>{{ t("Tag filter") }}<select v-model="source.tag" @change="loadTagValues"><option value="">{{ t("No filter") }}</option><option v-for="name in tags" :key="name">{{ name }}</option></select></label>
            <label>{{ t("Tag value") }}<select v-model="source.tagValue"><option value="">{{ t("All values") }}</option><option v-for="name in tagValues" :key="name">{{ name }}</option></select></label>
            <label>{{ t("Aggregation") }}<select v-model="source.aggregation"><option v-for="name in ['mean','min','max','sum','last','none']" :key="name" :value="name">{{ t(name) }}</option></select></label>
          </div>
          <label class="check-field"><input v-model="source.convertText" type="checkbox"> {{ t("Convert numeric text to float before aggregation") }}</label>
          <p v-if="source.measurement==='mqtt_consumer'" class="muted">{{ t("MQTT values can be text. Conversion fails for nonnumeric payloads; filter the appropriate topic first.") }}</p>
          <v-btn class="mt-4" variant="outlined" :disabled="!source.bucket || !source.measurement || !source.field" @click="generate">{{ t("Generate query") }}</v-btn>
          <p class="muted mt-3">{{ t("Schema covers the last 30 days and is limited to 300 entries per request. Empty lists can mean no recent data or insufficient access.") }}</p>
        </div>
        <div v-else-if="!panel.liveSource && tab==='Flux'"><label>{{ t("Flux query") }}<textarea v-model="panel.query" rows="11" spellcheck="false" /></label><p class="muted mt-2">{{ t("Supported time macros: v.timeRangeStart, v.timeRangeStop and v.windowPeriod. Queries without these macros keep their own time range.") }}</p></div>
        <div v-else-if="!panel.liveSource && tab==='Processing'">
          <p class="muted mb-4">{{ t("Applied after the query. Stored measurements and the Flux program stay unchanged.") }}</p>
          <div class="editor-fields builder-fields">
            <label>{{ t("Multiplier") }}<input v-model.number="panel.processing.multiplier" type="number" step="any"></label>
            <label>{{ t("Offset") }}<input v-model.number="panel.processing.offset" type="number" step="any"></label>
            <label>{{ t("Clamp minimum") }}<input v-model.number="panel.processing.minimum" type="number" step="any" :placeholder="t('No limit')"></label>
            <label>{{ t("Clamp maximum") }}<input v-model.number="panel.processing.maximum" type="number" step="any" :placeholder="t('No limit')"></label>
            <label>{{ t("Decimal places") }}<input v-model.number="panel.processing.decimals" type="number" min="0" max="6"></label>
            <label>{{ t("Line width") }}<input v-model.number="panel.processing.lineWidth" type="number" min="0.5" max="5" step="0.5"></label>
            <label>{{ t("Missing values") }}<select v-model="panel.processing.gaps"><option value="Gaps">{{ t("Gaps") }}</option><option value="Connect gaps">{{ t("Connect gaps") }}</option></select></label>
          </div>
          <div class="app-action-row mt-4"><label class="check-field"><input v-model="panel.processing.showPoints" type="checkbox"> {{ t("Show sample points") }}</label><label class="check-field"><input v-model="panel.processing.showLegend" type="checkbox"> {{ t("Show legend") }}</label></div>
        </div>
        <div v-else-if="!panel.liveSource" class="data-preview"><p class="muted mb-3">{{ t('{count} returned samples. The table shows up to 50. Values are plotted only when numeric.',{count:rows.length}) }}</p><v-table density="compact"><thead><tr><th>{{ t("Time") }}</th><th>{{ t("Field") }}</th><th>{{ t("Raw value") }}</th><th>{{ t("Plotted value") }}</th></tr></thead><tbody><tr v-for="(row,index) in rows.slice(0,50)" :key="index"><td>{{ row._time }}</td><td>{{ row._field }}</td><td>{{ row._value ?? '—' }}</td><td>{{ t(processed(row._value)) }}</td></tr><tr v-if="!rows.length"><td colspan="4">{{ t("Run query to inspect samples.") }}</td></tr></tbody></v-table></div>
        <v-alert v-if="error || validation" class="mt-4" type="error" variant="tonal" role="alert">{{ t(validation || error) }}</v-alert><p v-if="result" class="muted mt-4" role="status">{{ t(result,{count:rows.length}) }}{{ result === 'Query complete · {count} samples' && rows.some(row=>typeof row._value!=='number') ? ' · '+t('Nonnumeric samples are not plotted') : '' }}</p>
        <p class="editor-note mt-5">{{ t("Apply panel updates your draft. Save dashboard commits all changes to MongoDB.") }}</p>
      </v-card-text>
      <v-card-actions><v-spacer/><v-btn @click="emit('close')">{{ t("Cancel") }}</v-btn><v-btn color="primary" variant="flat" :disabled="!!validation || !panel.query.trim()" @click="emit('apply',chartDefinition(panel))">{{ t("Apply panel") }}</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import { ref, computed, onBeforeUnmount } from 'vue';
import { isAxiosError, isCancel } from 'axios';
import type { ChartPanelDefinition, PanelQuerySource, VisualizationSettings } from '@/composables/dashboardPanelTypes';
import type { DashboardRange } from '@/composables/dashboardStateTypes';
import type { AlignedSeries, Processing, QueryRow } from '@/composables/dashboardSeries';
import PanelVisualization from './PanelVisualization.vue';
import { visualizationFor, visualizationError, visualizationTypes, reducers } from '@/composables/panelVisualization.mjs';
import api from '@/services/dashboardDataService';
import { runDashboardQuery } from '@/services/dashboardQuery';
import { clone,processingFor,processingError,chartDefinition,buildQuery,resolveQuery,alignRows,processValue } from '@/composables/dashboardUtils.mjs';
type PanelDraft = ChartPanelDefinition & { processing: Processing; visualization: VisualizationSettings };
const editorTabs = ['Builder', 'Flux', 'Processing', 'Data preview'] as const;
const props = withDefaults(defineProps<{
  chart: ChartPanelDefinition;
  isNew?: boolean;
  bucket?: string;
  range?: DashboardRange;
  window?: string;
  timezone?: string;
}>(), { bucket: 'tomatoes', range: '-1h', window: '10s', timezone: 'Browser' });
const emit = defineEmits<{ close: []; apply: [chart: ChartPanelDefinition] }>();
const original = clone(props.chart);
const panel = ref<PanelDraft>({
  ...original,
  processing: processingFor(original),
  visualization: visualizationFor(original),
});
const tab = ref<(typeof editorTabs)[number]>(panel.value.query ? 'Flux' : 'Builder');
const rows = ref<QueryRow[]>([]);
const error = ref('');
const result = ref('');
const running = ref(false);
const loadingSchema = ref(false);
const measurements = ref<string[]>([]);
const fields = ref<string[]>([]);
const tags = ref<string[]>([]);
const tagValues = ref<string[]>([]);
const source = ref<PanelQuerySource>({bucket:props.bucket,measurement:'',field:'',tag:'',tagValue:'',aggregation:'mean',convertText:false,...panel.value.source});
const color=ref('#80cbc4'),opacity=ref(.1);const oldColor=panel.value.options.series?.[1]?.stroke;
if(oldColor && /^#[0-9a-f]{6}$/i.test(oldColor))color.value=oldColor;else{const numbers=oldColor?.match(/\d+/g);if(numbers && numbers.length>=3)color.value='#'+numbers.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');}
const oldFill=panel.value.options.series?.[1]?.fill;if(oldFill?.startsWith('rgba'))opacity.value=Number(oldFill.match(/[\d.]+/g)?.[3]??.1);else if(oldFill && /^#[0-9a-f]{8}$/i.test(oldFill))opacity.value=Math.round(parseInt(oldFill.slice(7),16)/255*100)/100;
const validation=computed(()=>!panel.value.options.chartTitle.trim()?'Enter a panel title.':processingError(panel.value)||visualizationError(panel.value));
const preview=computed<AlignedSeries>(()=>{try{return alignRows(rows.value,panel.value.processing);}catch{return {data:[[],[]],labels:[]};}});
let queryController: AbortController | undefined;
let schemaSerial = 0;
function addThreshold(){const config=panel.value.visualization;const last=config.thresholds.at(-1)?.value ?? config.min;config.thresholds.push({value:Number.isFinite(last)?Number((last+(config.max-config.min)/10).toPrecision(12)):0,color:'#f2495c'});}
function setColor(){panel.value.options.series ||= [{label:'Date'},{}];panel.value.options.series[1] ||= {};Object.assign(panel.value.options.series[1],{stroke:color.value,fill:color.value+Math.round(opacity.value*255).toString(16).padStart(2,'0')});}
function processed(value: unknown){const v=processValue(value,panel.value.processing);return v===null?'Not numeric / missing':v.toFixed(panel.value.processing.decimals);}
async function loadMeasurements(){const serial=++schemaSerial;error.value='';loadingSchema.value=true;try{const {data}=await api.schema({bucket:source.value.bucket});if(serial===schemaSerial)measurements.value=data.measurements ?? [];}catch(e){if(serial===schemaSerial)error.value=(isAxiosError<{ message?: string }>(e) ? e.response?.data?.message : '') || 'Could not load InfluxDB measurements.';}finally{if(serial===schemaSerial)loadingSchema.value=false;}}
async function loadFields(){const serial=++schemaSerial;source.value.field='';source.value.tag='';source.value.tagValue='';fields.value=[];tags.value=[];tagValues.value=[];try{const {data}=await api.schema({bucket:source.value.bucket,measurement:source.value.measurement});if(serial===schemaSerial){fields.value=data.fields ?? [];tags.value=data.tags ?? [];}}catch{if(serial===schemaSerial)error.value='Could not load fields.';}}
async function loadTagValues(){const serial=++schemaSerial;source.value.tagValue='';tagValues.value=[];if(!source.value.tag)return;try{const {data}=await api.schema({bucket:source.value.bucket,measurement:source.value.measurement,tag:source.value.tag});if(serial===schemaSerial)tagValues.value=data.values ?? [];}catch{if(serial===schemaSerial)error.value='Could not load tag values.';}}
function generate(){panel.value.query=buildQuery(source.value);panel.value.source=clone(source.value);tab.value='Flux';rows.value=[];result.value='Query generated. Run query to preview live data.';}
async function run() {
  queryController?.abort();
  const controller = new AbortController();
  queryController = controller;
  running.value = true;
  error.value = '';
  result.value = '';
  try {
    const { data } = await runDashboardQuery(
      panel.value.liveSource
        ? { path: '/dashboards/live', body: { source: panel.value.liveSource } }
        : { path: '/influx', body: { query: resolveQuery(panel.value.query, props.range, props.window, props.timezone) } },
      controller.signal,
    );
    if (controller.signal.aborted) return;
    alignRows(data, panel.value.processing);
    rows.value = data;
    result.value = 'Query complete · {count} samples';
  } catch (issue) {
    if (controller.signal.aborted || isCancel(issue)) return;
    error.value = issue instanceof Error && issue.message.includes('30 series')
      ? issue.message
      : 'Query failed. Check Flux, field types, time range and InfluxDB availability.';
  } finally {
    if (queryController === controller) {
      queryController = undefined;
      running.value = false;
    }
  }
}
if(panel.value.liveSource)void run();
onBeforeUnmount(()=>{queryController?.abort();schemaSerial++;});
</script>
<style scoped lang="scss">
.panel-editor{label{display:flex;flex-direction:column;gap:7px;color:rgb(var(--v-theme-muted));font-size:13px}input:not([type=checkbox]):not([type=range]),select,textarea{width:100%;background:rgb(var(--v-theme-background));border:1px solid rgb(var(--v-theme-border));border-radius:4px;padding:10px;color:rgb(var(--v-theme-on-surface));min-height:42px}textarea{font-family:monospace;font-size:12px;resize:vertical}input[type=color]{padding:5px!important}input[type=checkbox]{accent-color:rgb(var(--v-theme-primary))} .check-field{flex-direction:row;align-items:center;gap:8px}.muted{color:rgb(var(--v-theme-muted))}}
.editor-heading{display:flex;align-items:center;justify-content:space-between}.gauge-settings{margin-top:22px;border-top:1px solid rgb(var(--v-theme-border));padding-top:18px;display:flex;flex-direction:column;gap:14px}.threshold-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.threshold-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(70px,100px) 32px;align-items:end;gap:12px;max-width:430px}.editor-top{display:grid;grid-template-columns:1.2fr 1fr;gap:24px}.editor-preview{height:280px;padding:10px;min-width:0}.editor-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px;min-width:0}.wide{grid-column:1/-1}.editor-tabs{border-top:1px solid rgb(var(--v-theme-border));padding-top:16px;margin:24px 0}.builder-fields{grid-template-columns:repeat(3,minmax(0,1fr))}.editor-note{border-left:3px solid rgb(var(--v-theme-secondary));padding:12px;background:rgba(var(--v-theme-secondary),.07);font-size:13px}.data-preview{max-width:100%;overflow:auto}
@media(max-width:760px){.editor-top{grid-template-columns:minmax(0,1fr)}.builder-fields{grid-template-columns:1fr 1fr}}
@media(max-width:450px){.editor-fields,.builder-fields{grid-template-columns:minmax(0,1fr)}.editor-preview{height:250px}}
</style>
