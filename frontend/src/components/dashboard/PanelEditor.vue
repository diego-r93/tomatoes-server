<template>
  <div class="panel-editor">
    <header class="editor-heading">
      <div>
        <h1>{{ t(isNew ? 'Add panel' : 'Edit panel') }}</h1>
        <p class="muted">{{ t('Apply panel updates your dashboard draft. Use Save dashboard to keep your changes.') }}</p>
      </div>
      <div class="app-action-row">
        <slot name="time-range"/>
        <v-btn prepend-icon="mdi-arrow-left" variant="outlined" @click="emit('close')">{{ t('Back to dashboard') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!!validation || !panel.query.trim()" @click="emit('apply',chartDefinition(panel))">{{ t('Apply panel') }}</v-btn>
      </div>
    </header>
    <div class="editor-workspace">
      <div class="editor-main">
        <section class="editor-preview app-panel" :class="{ 'transparent-preview': panel.options.transparent }" :aria-label="t('Panel preview')">
          <header class="preview-heading">
            <div><strong>{{ panel.options.chartTitle }}</strong><p v-if="panel.options.description" class="muted">{{ panel.options.description }}</p></div>
            <v-btn v-if="panel.visualization.type !== 'table' && !panel.liveSource" size="small" prepend-icon="mdi-table" :variant="tablePreview ? 'tonal' : 'text'" :aria-pressed="tablePreview" @click="tablePreview = !tablePreview">{{ t('Table view') }}</v-btn>
          </header>
          <div class="preview-content">
            <PanelTable v-if="tablePreview && panel.visualization.type !== 'table' && !panel.liveSource" :rows="rows" :config="panel.visualization" :timezone="timezone"/>
            <PanelVisualization v-else :chart="panel" :data="preview.data" :labels="preview.labels" :raw-rows="rows" :timezone="timezone" />
          </div>
        </section>
        <section class="editor-query">
        <v-alert v-if="panel.liveSource" variant="tonal" class="mt-4">Live board status uses backend observations, not Flux, and ignores the selected time range.</v-alert><div v-if="!panel.liveSource" class="editor-tabs app-action-row"><v-btn v-for="name in visibleTabs" :key="name" :variant="tab===name?'tonal':'text'" :color="tab===name?'primary':undefined" @click="tab=name">{{ t(name) }}</v-btn><v-spacer/><v-btn prepend-icon="mdi-database-search" variant="outlined" @click="tab='Builder';loadMeasurements()">{{ t("Browse data") }}</v-btn><v-btn prepend-icon="mdi-play-outline" variant="outlined" :loading="running" :disabled="!!validation || !panel.query.trim()" @click="run">{{ t("Run query") }}</v-btn></div>
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
        <div v-else-if="!panel.liveSource" class="data-preview"><p class="muted mb-3">{{ t('{count} returned samples. The table shows up to 50. Values are plotted only when numeric.',{count:rows.length}) }}</p><v-table density="compact"><thead><tr><th>{{ t("Time") }}</th><th>{{ t("Field") }}</th><th>{{ t("Raw value") }}</th><th v-if="panel.visualization.type !== 'table'">{{ t("Plotted value") }}</th></tr></thead><tbody><tr v-for="(row,index) in rows.slice(0,50)" :key="index"><td>{{ row._time }}</td><td>{{ row._field }}</td><td>{{ row._value ?? '—' }}</td><td v-if="panel.visualization.type !== 'table'">{{ t(processed(row._value)) }}</td></tr><tr v-if="!rows.length"><td :colspan="panel.visualization.type === 'table' ? 3 : 4">{{ t("Run query to inspect samples.") }}</td></tr></tbody></v-table></div>
        <v-alert v-if="error || validation" class="mt-4" type="error" variant="tonal" role="alert">{{ t(validation || error) }}</v-alert><p v-if="result" class="muted mt-4" role="status">{{ t(result,{count:rows.length}) }}{{ result === 'Query complete · {count} samples' && panel.visualization.type !== 'table' && rows.some(row=>typeof row._value!=='number') ? ' · '+t('Nonnumeric samples are not plotted') : '' }}</p>

        </section>
      </div>
      <aside class="editor-options app-panel" :aria-label="t('Panel options')">
        <details open>
          <summary>{{ t('Visualization') }}</summary>
          <div class="visualization-choices" role="group" :aria-label="t('Visualization')">
            <button v-for="item in visualizationTypes" :key="item.value" type="button" :disabled="!!panel.liveSource && item.value !== 'stat'"
              :aria-pressed="panel.visualization.type === item.value" @click="panel.visualization.type = item.value">
              <v-icon :icon="item.icon" size="24"/>
              <span><strong>{{ t(item.title) }}</strong><small>{{ t(item.description) }}</small></span>
            </button>
          </div>
        </details>
        <details open>
          <summary>{{ t('Panel options') }}</summary>
          <div class="option-fields">
            <label>{{ t('Panel title') }}<input v-model="panel.options.chartTitle" maxlength="200"></label>
            <label>{{ t('Description') }}<textarea v-model="panel.options.description" rows="2" maxlength="1000" /></label>
            <label v-if="panel.visualization.type !== 'table'">{{ t('Unit') }}<input v-model="panel.options.unit" placeholder="°C, %, pH…"></label>
            <label>{{ t('Panel width') }}<select v-model.number="panel.layout.w"><option :value="4">{{ t('Third') }}</option><option :value="6">{{ t('Half') }}</option><option :value="12">{{ t('Full') }}</option></select></label>
            <label class="check-field"><input v-model="panel.options.transparent" type="checkbox"> {{ t('Transparent background') }}</label>
          </div>
        </details>
        <template v-if="panel.visualization.type === 'time-series'">
          <details open>
            <summary>{{ t('Panel styles') }}</summary>
            <div class="option-fields">
              <label>{{ t('Draw style') }}<select v-model="panel.options.lineStyle"><option value="linear">{{ t('Lines') }}</option><option value="step">{{ t('Steps') }}</option><option value="bars">{{ t('Bars') }}</option></select></label>
              <label>{{ t('Series color') }}<input v-model="color" type="color" @input="setColor"></label>
              <label>{{ t('Fill opacity ·') }} {{ opacity }}<input v-model.number="opacity" type="range" min="0" max="0.5" step="0.01" @input="setColor"></label>
            </div>
          </details>
          <details>
            <summary>{{ t('Tooltip') }}</summary>
            <div class="option-fields"><label>{{ t('Tooltip mode') }}<select v-model="panel.options.tooltipMode"><option value="all">{{ t('All series') }}</option><option value="nearest">{{ t('Nearest series') }}</option><option value="hidden">{{ t('Hidden') }}</option></select></label></div>
          </details>
          <details>
            <summary>{{ t('Legend') }}</summary>
            <div class="option-fields">
              <label class="check-field"><input v-model="panel.processing.showLegend" type="checkbox"> {{ t('Show legend') }}</label>
              <label>{{ t('Placement') }}<select v-model="panel.options.legendPosition"><option value="bottom">{{ t('Bottom') }}</option><option value="right">{{ t('Right') }}</option></select></label>
              <label>{{ t('Legend mode') }}<select v-model="panel.options.legendMode"><option value="list">{{ t('List') }}</option><option value="values">{{ t('List with last values') }}</option></select></label>
            </div>
          </details>
          <details>
            <summary>{{ t('Axis') }}</summary>
            <div class="option-fields">
              <label>{{ t('Placement') }}<select v-model="panel.options.axisPlacement"><option value="left">{{ t('Left') }}</option><option value="right">{{ t('Right') }}</option><option value="hidden">{{ t('Hidden') }}</option></select></label>
              <label>{{ t('Axis label') }}<input v-model="panel.options.axisLabel" maxlength="100"></label>
              <label class="check-field"><input v-model="panel.options.showGrid" type="checkbox"> {{ t('Show grid lines') }}</label>
            </div>
          </details>
        </template>
        <details v-if="panel.visualization.type === 'table'" open>
          <summary>{{ t('Table options') }}</summary>
          <div class="option-fields">
            <label>{{ t('Rows per page') }}<select v-model.number="panel.visualization.pageSize"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option></select></label>
            <label>{{ t('Time order') }}<select v-model="panel.visualization.tableOrder"><option value="newest">{{ t('Newest first') }}</option><option value="oldest">{{ t('Oldest first') }}</option></select></label>
          </div>
        </details>
        <section v-if="['gauge','stat','bar-gauge'].includes(panel.visualization.type)" class="gauge-settings">
          <h3>{{ t(panel.visualization.type === 'stat' ? 'Stat options' : 'Gauge options') }}</h3>
          <p class="muted">{{ t("Calculates one value from the processed samples returned for the selected time range. Last non-null uses the latest valid sample in that result, which may already be aggregated by your query.") }}</p>
          <div class="editor-fields builder-fields">
            <label>{{ t("Calculation") }}<select v-model="panel.visualization.reducer"><option v-for="item in reducers" :key="item.value" :value="item.value">{{ t(item.title) }}</option></select></label>
            <label>{{ t("Series") }}<select v-model="panel.visualization.series"><option :value="null">{{ t(panel.visualization.type === "bar-gauge" ? "All returned series" : "First returned series") }}</option><option v-if="panel.visualization.series && !preview.labels.includes(panel.visualization.series)" :value="panel.visualization.series">{{ panel.visualization.series }} {{ t("(not in current result)") }}</option><option v-for="label in [...new Set(preview.labels)]" :key="label" :value="label">{{ label }}</option></select><small>{{ t("Run query to load the available series.") }}</small></label>
            <label v-if="panel.visualization.type === 'bar-gauge'">{{ t("Orientation") }}<select v-model="panel.visualization.orientation"><option value="horizontal">{{ t("Horizontal") }}</option><option value="vertical">{{ t("Vertical") }}</option></select></label>
            <label>{{ t("Base color") }}<input v-model="panel.visualization.color" type="color"></label>
            <label v-if="panel.visualization.type !== 'stat'">{{ t("Scale minimum") }}<input v-model.number="panel.visualization.min" type="number" step="any"></label>
            <label v-if="panel.visualization.type !== 'stat'">{{ t("Scale maximum") }}<input v-model.number="panel.visualization.max" type="number" step="any"></label>
            <label v-if="panel.visualization.type !== 'stat'" class="check-field"><input v-model="panel.visualization.showThresholds" type="checkbox"> {{ t("Show threshold markers") }}</label>
            <label v-if="panel.visualization.type === 'stat'" class="check-field"><input v-model="panel.visualization.sparkline" type="checkbox"> {{ t("Show sparkline") }}</label>
            <label v-if="panel.visualization.type === 'stat'">{{ t("Mark samples older than (seconds)") }}<input v-model.number="panel.visualization.staleAfterSeconds" type="number" min="1" max="604800" step="1"></label>
          </div>
          <template v-if="panel.visualization.type === 'stat'"><div class="threshold-heading"><h4>{{ t('Value mappings') }}</h4><v-btn size="small" variant="outlined" :disabled="panel.visualization.mappings.length >= 20" @click="panel.visualization.mappings.push({value:panel.visualization.mappings.length,text:''})">{{ t('Add mapping') }}</v-btn></div><div v-for="(mapping,index) in panel.visualization.mappings" :key="index" class="threshold-row"><label>{{ t('Value') }}<input v-model.number="mapping.value" type="number" step="any"></label><label>{{ t('Text') }}<input v-model="mapping.text" maxlength="80"></label><v-btn icon="mdi-close" size="small" variant="text" :aria-label="t('Remove mapping')" @click="panel.visualization.mappings.splice(index,1)"/></div></template>
          <p v-if="panel.visualization.type === 'stat'" class="muted">{{ t("Sample age uses the latest valid timestamp returned by the query, not the request time. Historical ranges and aggregated timestamps may show older data.") }}</p>
          <p class="muted">{{ t("Thresholds change the display color. Scale limits apply to Gauge and Bar gauge.") }}</p>
          <div class="threshold-heading"><h4>{{ t("Color thresholds") }}</h4><v-btn size="small" variant="outlined" prepend-icon="mdi-plus" :disabled="panel.visualization.thresholds.length >= 10" @click="addThreshold">{{ t("Add threshold") }}</v-btn></div>
          <p class="muted">{{ t("Base color applies below the first threshold. Each threshold applies at or above its value. Enter values in ascending order.") }}</p>
          <div v-for="(step,index) in panel.visualization.thresholds" :key="index" class="threshold-row">
            <label :for="'threshold-value-'+index">{{ t("Value") }}<input :id="'threshold-value-'+index" v-model.number="step.value" type="number" step="any"></label>
            <label :for="'threshold-color-'+index">{{ t("Color") }}<input :id="'threshold-color-'+index" v-model="step.color" type="color"></label>
            <v-btn icon="mdi-close" size="small" variant="text" :aria-label="t('Remove threshold {number}',{number:index+1})" @click="panel.visualization.thresholds.splice(index,1)" />
          </div>
          <p v-if="!panel.visualization.thresholds.length" class="muted">{{ t("One color for the entire scale.") }}</p>
        </section>
      </aside>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { isAxiosError, isCancel } from 'axios';
import type { ChartPanelDefinition, PanelQuerySource, VisualizationSettings } from '@/composables/dashboardPanelTypes';
import type { DashboardRange } from '@/composables/dashboardStateTypes';
import type { AlignedSeries, Processing, QueryRow } from '@/composables/dashboardSeries';
import PanelVisualization from './PanelVisualization.vue';
import PanelTable from './PanelTable.vue';
import { visualizationFor, visualizationError, visualizationTypes, reducers } from '@/composables/panelVisualization.ts';
import api from '@/services/dashboardDataService';
import { runDashboardQuery } from '@/services/dashboardQuery';
import { clone,processingFor,processingError,chartDefinition,buildQuery,resolveQuery,alignRows,processValue } from '@/composables/dashboardUtils.ts';
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
  options: { lineStyle: 'linear', tooltipMode: 'all', legendPosition: 'bottom', legendMode: 'list',
    axisPlacement: 'left', showGrid: true, ...original.options },
  processing: processingFor(original),
  visualization: visualizationFor(original),
});
let initialDraft = JSON.stringify(panel.value);
defineExpose({
  hasUnsavedChanges: () => initialDraft !== JSON.stringify(panel.value),
  acceptDraft: () => { initialDraft = JSON.stringify(panel.value); },
});
const tab = ref<(typeof editorTabs)[number]>(panel.value.query ? 'Flux' : 'Builder');
const rows = ref<QueryRow[]>([]);
const tablePreview = ref(false);
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
const visibleTabs = computed<readonly (typeof editorTabs)[number][]>(() => panel.value.visualization.type === 'table' ? editorTabs.filter(name => name !== 'Processing') : editorTabs);
watch(visibleTabs, tabs => { if (!tabs.includes(tab.value)) tab.value = 'Data preview'; });
const validation=computed(()=>!panel.value.options.chartTitle.trim()?'Enter a panel title.':processingError(panel.value)||visualizationError(panel.value));
const preview=computed<AlignedSeries>(()=>{if (panel.value.visualization.type === 'table') return {data:[[],[]],labels:[]};try{return alignRows(rows.value,panel.value.processing);}catch{return {data:[[],[]],labels:[]};}});
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
    rows.value = data;
    if (panel.value.visualization.type !== 'table') alignRows(data, panel.value.processing);
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
if (panel.value.query.trim() || panel.value.liveSource) void run();
watch(() => props.range, () => { if (panel.value.query.trim() && !panel.value.liveSource) void run(); });
onBeforeUnmount(()=>{queryController?.abort();schemaSerial++;});
</script>

<style scoped lang="scss">
.panel-editor{
  label{display:flex;flex-direction:column;gap:6px;color:rgb(var(--v-theme-muted));font-size:13px}
  input:not([type=checkbox]):not([type=range]),select,textarea{width:100%;min-width:0;min-height:36px;background:rgb(var(--v-theme-background));border:1px solid rgb(var(--v-theme-border));border-radius:4px;padding:7px 9px;color:rgb(var(--v-theme-on-surface))}
  textarea{resize:vertical}
  textarea[spellcheck=false]{font-family:monospace;font-size:12px}
  input[type=color]{padding:4px!important}
  input[type=checkbox]{accent-color:rgb(var(--v-theme-primary))}
  .check-field{flex-direction:row;align-items:center;gap:8px}
  .muted{color:rgb(var(--v-theme-muted));font-size:13px}
}
.editor-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:8px 0 14px}
.editor-heading h1{font-size:22px}
.editor-heading .app-action-row{flex-wrap:wrap}
.editor-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,340px);gap:14px;align-items:start}
.editor-main,.editor-options{min-width:0}
.editor-preview{display:flex;flex-direction:column;min-width:0;height:clamp(310px,49vh,620px);padding:10px;overflow:hidden}
.preview-heading{display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:6px;overflow-wrap:anywhere}
.transparent-preview{background:transparent}
.preview-content{flex:1;min-height:0;position:relative}
.editor-options{padding:0 12px}
.editor-options details,.gauge-settings{padding:12px 0;border-bottom:1px solid rgb(var(--v-theme-border))}
.editor-options > :last-child{border-bottom:0}
.editor-options summary{font-size:14px;font-weight:600;cursor:pointer}
.option-fields,.visualization-choices,.gauge-settings{display:grid;gap:10px}
.option-fields,.visualization-choices{margin-top:10px}
.visualization-choices button{display:flex;gap:10px;align-items:center;padding:8px;text-align:start;border:1px solid rgb(var(--v-theme-border));border-radius:4px}
.visualization-choices button:hover,.visualization-choices button:focus-visible{background:rgb(var(--v-theme-hover))}
.visualization-choices button[aria-pressed=true]{border-color:rgb(var(--v-theme-primary));background:rgba(var(--v-theme-primary),.14)}
.visualization-choices button:disabled{opacity:.45}
.visualization-choices small{display:block;color:rgb(var(--v-theme-muted))}
.visualization-choices .v-icon{color:rgb(var(--v-theme-secondary))}
.threshold-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}
.threshold-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(65px,90px) 32px;align-items:end;gap:8px}
.editor-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.editor-options .editor-fields{grid-template-columns:repeat(2,minmax(0,1fr))}
.editor-tabs{border-top:1px solid rgb(var(--v-theme-border));padding-top:12px;margin:14px 0;flex-wrap:wrap}
.data-preview{max-width:100%;overflow:auto}
@media(max-width:900px){.editor-workspace{grid-template-columns:minmax(0,1fr)}.editor-main{display:contents}.editor-preview{order:0}.editor-options{order:1}.editor-query{order:2;min-width:0}.visualization-choices{grid-template-columns:repeat(2,minmax(0,1fr))}.editor-preview{height:340px}}
@media(max-width:500px){.editor-fields,.editor-options .editor-fields,.visualization-choices{grid-template-columns:minmax(0,1fr)}.editor-preview{height:280px}}
</style>
