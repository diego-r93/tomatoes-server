<template>
  <v-dialog :model-value="true" max-width="1120" scrollable @update:model-value="!$event && emit('close')">
    <v-card class="panel-editor">
      <v-card-title class="editor-heading">{{ isNew ? 'Add panel' : 'Edit panel' }}<v-btn icon="mdi-close" variant="text" aria-label="Close panel editor" @click="emit('close')" /></v-card-title>
      <v-card-text>
        <div class="editor-top">
          <div><p class="muted mb-2">Panel preview · uPlot · live InfluxDB data</p><div class="editor-preview app-panel"><Chart :chart-options="panel.options" :chart-data="preview.data" :labels="preview.labels" :processing="panel.processing" :timezone="timezone" /></div></div>
          <div class="editor-fields">
            <label>Panel title<input v-model="panel.options.chartTitle" maxlength="200"></label>
            <label>Unit<input v-model="panel.options.unit" placeholder="°C, %, pH…"></label>
            <label>Panel width<select v-model.number="panel.layout.w"><option :value="4">Third</option><option :value="6">Half</option><option :value="12">Full</option></select></label>
            <label>Series color<input v-model="color" type="color" @input="setColor"></label>
            <label class="wide">Fill opacity · {{ opacity }}<input v-model.number="opacity" type="range" min="0" max="0.5" step="0.01" @input="setColor"></label>
          </div>
        </div>
        <div class="editor-tabs app-action-row"><v-btn v-for="name in ['Builder','Flux','Processing','Data preview']" :key="name" :variant="tab===name?'tonal':'text'" :color="tab===name?'primary':undefined" @click="tab=name">{{ name }}</v-btn><v-spacer/><v-btn prepend-icon="mdi-database-search" variant="outlined" @click="tab='Builder';loadMeasurements()">Browse data</v-btn><v-btn prepend-icon="mdi-play-outline" variant="outlined" :loading="running" :disabled="!!validation || !panel.query.trim()" @click="run">Run query</v-btn></div>
        <div v-if="tab==='Builder'">
          <p class="muted mb-4">Build a query from available InfluxDB fields. Generating replaces the Flux text only when you click Generate query.</p>
          <div class="editor-fields builder-fields">
            <label>Bucket<input v-model="source.bucket"><v-btn size="small" variant="text" :loading="loadingSchema" @click="loadMeasurements">Load measurements</v-btn></label>
            <label>Measurement<select v-model="source.measurement" @change="loadFields"><option value="">Select measurement</option><option v-for="name in measurements" :key="name">{{ name }}</option></select></label>
            <label>Field<select v-model="source.field"><option value="">Select field</option><option v-for="name in fields" :key="name">{{ name }}</option></select></label>
            <label>Tag filter<select v-model="source.tag" @change="loadTagValues"><option value="">No filter</option><option v-for="name in tags" :key="name">{{ name }}</option></select></label>
            <label>Tag value<select v-model="source.tagValue"><option value="">All values</option><option v-for="name in tagValues" :key="name">{{ name }}</option></select></label>
            <label>Aggregation<select v-model="source.aggregation"><option v-for="name in ['mean','min','max','sum','last','none']" :key="name">{{ name }}</option></select></label>
          </div>
          <label class="check-field"><input v-model="source.convertText" type="checkbox"> Convert numeric text to float before aggregation</label>
          <p v-if="source.measurement==='mqtt_consumer'" class="muted">MQTT values can be text. Conversion fails for nonnumeric payloads; filter the appropriate topic first.</p>
          <v-btn class="mt-4" variant="outlined" :disabled="!source.bucket || !source.measurement || !source.field" @click="generate">Generate query</v-btn>
          <p class="muted mt-3">Schema covers the last 30 days and is limited to 300 entries per request. Empty lists can mean no recent data or insufficient access.</p>
        </div>
        <div v-else-if="tab==='Flux'"><label>Flux query<textarea v-model="panel.query" rows="11" spellcheck="false" /></label><p class="muted mt-2">Supported time macros: v.timeRangeStart, v.timeRangeStop and v.windowPeriod. Queries without these macros keep their own time range.</p></div>
        <div v-else-if="tab==='Processing'">
          <p class="muted mb-4">Applied after the query. Stored measurements and the Flux program stay unchanged.</p>
          <div class="editor-fields builder-fields">
            <label>Multiplier<input v-model.number="panel.processing.multiplier" type="number" step="any"></label>
            <label>Offset<input v-model.number="panel.processing.offset" type="number" step="any"></label>
            <label>Clamp minimum<input v-model.number="panel.processing.minimum" type="number" step="any" placeholder="No limit"></label>
            <label>Clamp maximum<input v-model.number="panel.processing.maximum" type="number" step="any" placeholder="No limit"></label>
            <label>Decimal places<input v-model.number="panel.processing.decimals" type="number" min="0" max="6"></label>
            <label>Line width<input v-model.number="panel.processing.lineWidth" type="number" min="0.5" max="5" step="0.5"></label>
            <label>Missing values<select v-model="panel.processing.gaps"><option>Gaps</option><option>Connect gaps</option></select></label>
          </div>
          <div class="app-action-row mt-4"><label class="check-field"><input v-model="panel.processing.showPoints" type="checkbox"> Show sample points</label><label class="check-field"><input v-model="panel.processing.showLegend" type="checkbox"> Show legend</label></div>
        </div>
        <div v-else class="data-preview"><p class="muted mb-3">{{ rows.length }} returned samples. The table shows up to 50. Values are plotted only when numeric.</p><v-table density="compact"><thead><tr><th>Time</th><th>Field</th><th>Raw value</th><th>Plotted value</th></tr></thead><tbody><tr v-for="(row,index) in rows.slice(0,50)" :key="index"><td>{{ row._time }}</td><td>{{ row._field }}</td><td>{{ row._value ?? '—' }}</td><td>{{ processed(row._value) }}</td></tr><tr v-if="!rows.length"><td colspan="4">Run query to inspect samples.</td></tr></tbody></v-table></div>
        <v-alert v-if="error || validation" class="mt-4" type="error" variant="tonal" role="alert">{{ validation || error }}</v-alert><p v-if="result" class="muted mt-4" role="status">{{ result }}</p>
        <p class="editor-note mt-5">Apply panel updates your draft. Save dashboard commits all changes to MongoDB.</p>
      </v-card-text>
      <v-card-actions><v-spacer/><v-btn @click="emit('close')">Cancel</v-btn><v-btn color="primary" variant="flat" :disabled="!!validation || !panel.query.trim()" @click="emit('apply',chartDefinition(panel))">Apply panel</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script setup>
import { ref,computed,onBeforeUnmount } from 'vue';
import Chart from './Chart.vue';
import api from '@/services/dashboardDataService';
import { http } from '@/services/http-common';
import { clone,processingFor,processingError,chartDefinition,buildQuery,resolveQuery,alignRows,processValue } from '@/composables/dashboardUtils.mjs';
const props=defineProps({chart:{type:Object,required:true},isNew:Boolean,bucket:{type:String,default:'tomatoes'},range:{type:[String,Object],default:'-1h'},window:{type:String,default:'10s'},timezone:{type:String,default:'Browser'}}),emit=defineEmits(['close','apply']);
const panel=ref(clone(props.chart));panel.value.processing=processingFor(panel.value);
const tab=ref(panel.value.query?'Flux':'Builder'),rows=ref([]),error=ref(''),result=ref(''),running=ref(false),loadingSchema=ref(false),measurements=ref([]),fields=ref([]),tags=ref([]),tagValues=ref([]);
const source=ref({bucket:props.bucket,measurement:'',field:'',tag:'',tagValue:'',aggregation:'mean',convertText:false,...panel.value.source});
const color=ref('#80cbc4'),opacity=ref(.1);const oldColor=panel.value.options.series?.[1]?.stroke;
if(/^#[0-9a-f]{6}$/i.test(oldColor||''))color.value=oldColor;else{const numbers=oldColor?.match(/\d+/g);if(numbers?.length>=3)color.value='#'+numbers.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');}
const oldFill=panel.value.options.series?.[1]?.fill;if(oldFill?.startsWith('rgba'))opacity.value=Number(oldFill.match(/[\d.]+/g)?.[3]??.1);else if(/^#[0-9a-f]{8}$/i.test(oldFill||''))opacity.value=Math.round(parseInt(oldFill.slice(7),16)/255*100)/100;
const validation=computed(()=>!panel.value.options.chartTitle.trim()?'Enter a panel title.':processingError(panel.value));
const preview=computed(()=>{try{return alignRows(rows.value,panel.value.processing);}catch{return {data:[[],[]],labels:[]};}});
let queryController,schemaSerial=0;
function setColor(){panel.value.options.series ||= [{label:'Date'},{}];panel.value.options.series[1] ||= {};Object.assign(panel.value.options.series[1],{stroke:color.value,fill:color.value+Math.round(opacity.value*255).toString(16).padStart(2,'0')});}
function processed(value){const v=processValue(value,panel.value.processing);return v===null?'Not numeric / missing':v.toFixed(panel.value.processing.decimals);}
async function loadMeasurements(){const serial=++schemaSerial;error.value='';loadingSchema.value=true;try{const {data}=await api.schema({bucket:source.value.bucket});if(serial===schemaSerial)measurements.value=data.measurements;}catch(e){if(serial===schemaSerial)error.value=e.response?.data?.message||'Could not load InfluxDB measurements.';}finally{if(serial===schemaSerial)loadingSchema.value=false;}}
async function loadFields(){const serial=++schemaSerial;source.value.field='';source.value.tag='';source.value.tagValue='';fields.value=[];tags.value=[];tagValues.value=[];try{const {data}=await api.schema({bucket:source.value.bucket,measurement:source.value.measurement});if(serial===schemaSerial){fields.value=data.fields;tags.value=data.tags;}}catch{if(serial===schemaSerial)error.value='Could not load fields.';}}
async function loadTagValues(){const serial=++schemaSerial;source.value.tagValue='';tagValues.value=[];if(!source.value.tag)return;try{const {data}=await api.schema({bucket:source.value.bucket,measurement:source.value.measurement,tag:source.value.tag});if(serial===schemaSerial)tagValues.value=data.values;}catch{if(serial===schemaSerial)error.value='Could not load tag values.';}}
function generate(){panel.value.query=buildQuery(source.value);panel.value.source=clone(source.value);tab.value='Flux';rows.value=[];result.value='Query generated. Run query to preview live data.';}
async function run(){queryController?.abort();queryController=new AbortController();running.value=true;error.value='';result.value='';try{const {data}=await http.post('/influx',{query:resolveQuery(panel.value.query,props.range,props.window,props.timezone)},{signal:queryController.signal,timeout:30000});alignRows(data,panel.value.processing);rows.value=data;result.value=`Query complete · ${data.length} samples${data.some(row=>typeof row._value!=='number')?' · nonnumeric samples are not plotted':''}`;}catch(e){if(e.code!=='ERR_CANCELED')error.value=e.message?.includes('30 series')?e.message:'Query failed. Check Flux, field types, time range and InfluxDB availability.';}finally{running.value=false;}}
onBeforeUnmount(()=>{queryController?.abort();schemaSerial++;});
</script>
<style scoped lang="scss">
.panel-editor{label{display:flex;flex-direction:column;gap:7px;color:rgb(var(--v-theme-muted));font-size:13px}input:not([type=checkbox]):not([type=range]),select,textarea{width:100%;background:rgb(var(--v-theme-background));border:1px solid rgb(var(--v-theme-border));border-radius:4px;padding:10px;color:rgb(var(--v-theme-on-surface));min-height:42px}textarea{font-family:monospace;font-size:12px;resize:vertical}input[type=color]{padding:5px!important}input[type=checkbox]{accent-color:rgb(var(--v-theme-primary))} .check-field{flex-direction:row;align-items:center;gap:8px}.muted{color:rgb(var(--v-theme-muted))}}
.editor-heading{display:flex;align-items:center;justify-content:space-between}.editor-top{display:grid;grid-template-columns:1.2fr 1fr;gap:24px}.editor-preview{height:280px;padding:10px;min-width:0}.editor-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px;min-width:0}.wide{grid-column:1/-1}.editor-tabs{border-top:1px solid rgb(var(--v-theme-border));padding-top:16px;margin:24px 0}.builder-fields{grid-template-columns:repeat(3,minmax(0,1fr))}.editor-note{border-left:3px solid rgb(var(--v-theme-secondary));padding:12px;background:rgba(var(--v-theme-secondary),.07);font-size:13px}.data-preview{max-width:100%;overflow:auto}
@media(max-width:760px){.editor-top{grid-template-columns:minmax(0,1fr)}.builder-fields{grid-template-columns:1fr 1fr}}
@media(max-width:450px){.editor-fields,.builder-fields{grid-template-columns:minmax(0,1fr)}.editor-preview{height:250px}}
</style>
