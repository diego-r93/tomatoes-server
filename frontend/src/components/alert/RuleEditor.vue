<template>
 <v-dialog :model-value="true" max-width="680" persistent scrollable>
  <v-card class="rule-editor"><v-card-title>{{ t(initial?.id ? 'Edit alert rule' : 'New alert rule') }}</v-card-title>
   <v-card-text><v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ t(error) }}</v-alert>
    <v-form id="rule-form" @submit.prevent="save">
     <v-select v-if="!initial?.id" v-model="template" :label="t('Start with a template')" :items="templateOptions" item-title="title" item-value="kind" variant="outlined" @update:model-value="useTemplate" />
     <v-text-field v-model="form.name" :label="t('Rule name')" maxlength="100" variant="outlined" />
     <v-row><v-col cols="12" sm="6"><v-select v-model="form.source.kind" :label="t('Data source')" :items="templateOptions" item-title="title" item-value="kind" variant="outlined" /></v-col>
      <v-col cols="12" sm="6"><v-combobox v-model="form.source.host" :label="t('Target hostname')" :items="devices.map(device=>device.host)" :hint="t('Use the exact device or Telegraf host tag.')" persistent-hint variant="outlined" /></v-col></v-row>
     <v-alert v-if="form.source.kind==='output_on'" variant="tonal" class="mb-4" color="secondary">{{ t('Counts continuously observed GPIO ON time. This does not confirm water flow. Observation restarts after a monitoring gap.') }}</v-alert>
     <v-text-field v-if="form.source.kind==='output_on'" v-model="form.source.gpio" :label="t('GPIO number')" type="number" min="0" max="255" variant="outlined" />
     <v-row v-if="form.source.kind==='pump_driver'"><v-col cols="4"><v-select v-model="form.source.pump" :label="t('Pump number')" :items="[1,2,3,4]" variant="outlined"/></v-col><v-col cols="8"><v-select v-model="form.source.condition" :label="t('Driver condition')" :items="[{title: t('Any failed actuation'),value:'failure'},{title: t('Missing driver feedback'),value:'missing'},{title: t('Pump supply absent / low'),value:'supply'},{title: t('Short circuit'),value:'short'},{title: t('Overtemperature'),value:'temperature'}]" variant="outlined"/></v-col><v-col cols="12"><p class="text-body-small">{{ t('Evaluates the latest expected or observed pulse. 1 = condition present, 0 = absent. A failure stays active until a new successful pulse. This does not confirm water flow.') }}</p></v-col></v-row>
     <v-text-field v-if="form.source.kind==='disk_usage'" v-model="form.source.path" :label="t('Disk path tag')" :hint="t('For example, / — must match the stored InfluxDB path tag.')" persistent-hint variant="outlined" />
     <v-row v-if="['metric','metric_age'].includes(form.source.kind)"><v-col cols="12" sm="6"><v-text-field v-model="form.source.measurement" :label="t('Measurement')" variant="outlined" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.source.field" :label="t('Numeric field')" variant="outlined" /></v-col><v-col v-if="form.source.kind==='metric'" cols="6"><v-text-field v-model="form.source.unit" :label="t('Display unit')" variant="outlined" /></v-col><v-col v-if="form.source.kind==='metric'" cols="6"><v-text-field v-model="form.source.scale" :label="t('Value multiplier')" type="number" variant="outlined" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.source.device" :label="t('Device tag (optional)')" :hint="t('Exact battery or collector device tag.')" variant="outlined"/></v-col><v-col cols="12"><v-text-field v-model="form.source.topic" :label="t('MQTT topic tag')" :hint="t(form.source.kind==='metric_age' ? 'Use an exact MQTT topic or device tag. Hostname must match the Telegraf host tag.' : 'Optional: select one topic when MQTT contains several sensor series.')" persistent-hint variant="outlined"/></v-col></v-row>
     <p class="text-body-small mb-3">{{ t('Thresholds are examples. Choose limits for your equipment and crop.') }}</p>
     <v-row><v-col cols="4"><v-select v-model="form.operator" :label="t('Trigger')" :items="['>','<']" variant="outlined" /></v-col><v-col cols="4"><v-text-field v-model="form.threshold" :label="t('Trigger limit')" type="number" :suffix="ruleUnit(form.source)" variant="outlined" /></v-col><v-col cols="4"><v-text-field v-model="form.recovery" :label="t('Recovery limit')" type="number" :suffix="ruleUnit(form.source)" variant="outlined" /></v-col></v-row>
     <v-row><v-col cols="12" sm="6"><v-text-field v-model="form.pendingSeconds" :label="t('Pending period (sec)')" type="number" min="0" max="86400" variant="outlined" /></v-col><v-col cols="12" sm="6"><v-select v-model="form.severity" :label="t('Severity')" :items="severityOptions" variant="outlined" /></v-col></v-row>
     <details class="evaluation-settings"><summary>{{ t('Evaluation settings') }}</summary><v-row class="mt-2"><v-col cols="12" sm="6"><v-text-field v-model="form.intervalSeconds" :label="t('Evaluate every (sec)')" type="number" min="10" max="3600" variant="outlined" /></v-col><v-col v-if="form.source.kind!=='metric_age'" cols="12" sm="6"><v-text-field v-model="form.source.freshnessSeconds" :label="t('Maximum sample age (sec)')" type="number" min="30" max="86400" variant="outlined" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.repeatSeconds" :label="t('Repeat notification (sec)')" type="number" min="900" max="604800" variant="outlined" /></v-col></v-row></details>
     <v-select v-model="form.contactIds" :label="t('External contact points')" :items="contacts" item-title="name" item-value="id" multiple chips closable-chips variant="outlined" :hint="t('In-app status and history are always available. External delivery requires a configured provider.')" persistent-hint />
     <v-switch v-model="form.enabled" :label="t('Enable evaluation')" color="primary" hide-details />
    </v-form>
   </v-card-text><v-card-actions><v-spacer /><v-btn :disabled="busy" @click="$emit('close')">{{ t('Cancel') }}</v-btn><v-btn color="primary" variant="flat" form="rule-form" type="submit" :loading="busy">{{ t('Save rule') }}</v-btn></v-card-actions>
  </v-card>
 </v-dialog>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { computed, ref } from 'vue';
import { alertService, alertError, ruleUnit } from '@/services/alertService';
import type { AlertDevice, Contact, Rule, RuleDraft, SourceKind } from '@/services/alertService';

const { t } = useLanguage();
const props = withDefaults(defineProps<{
  initial?: Rule | null;
  initialTemplate?: SourceKind;
  contacts?: Contact[];
  devices?: AlertDevice[];
}>(), { initialTemplate: 'device_age', contacts: () => [], devices: () => [] });
const emit = defineEmits<{ close: []; saved: [] }>();
const templates: { title: string; kind: SourceKind }[] = [{title:'Pump driver feedback',kind:'pump_driver'},{title:'Device not responding',kind:'device_age'},{title:'Weak Wi-Fi signal',kind:'wifi'},{title:'GPIO ON longer than expected',kind:'output_on'},{title:'Raspberry Pi CPU temperature',kind:'cpu_temperature'},{title:'Disk space usage',kind:'disk_usage'},{title:'Telemetry missing',kind:'metric_age'},{title:'Custom sensor metric',kind:'metric'}];
const templateOptions = computed(() => templates.map(item => ({ ...item, title: t(item.title) })));
const severityOptions = computed(() => (['Warning', 'Critical'] as const).map(value => ({ title: t(value), value })));
const defaults: RuleDraft = {name:'Device not responding',source:{kind:'device_age',host:'',gpio:0,pump:1,condition:'failure',device:'',path:'/',measurement:'',field:'value',topic:'',unit:'',scale:1,freshnessSeconds:180},operator:'>',threshold:120,recovery:60,pendingSeconds:60,intervalSeconds:30,repeatSeconds:3600,severity:'Warning',contactIds:[],enabled:false};
const form = ref<RuleDraft>(props.initial
  ? { ...structuredClone(defaults), ...props.initial, contactIds: [...props.initial.contactIds], source: { ...defaults.source, ...props.initial.source } }
  : structuredClone(defaults));
const template=ref(form.value.source.kind),error=ref(''),busy=ref(false);
function useTemplate(kind: SourceKind){const selected = templates.find(item=>item.kind===kind);if(!selected)return;template.value=kind;const limits={pump_driver:[0.5,0,0],device_age:[120,60,60],wifi:[-80,-72,120],output_on:[900,0,60],cpu_temperature:[75,68,120],disk_usage:[85,80,300],metric:[100,95,120],metric_age:[180,60,0]}[kind];Object.assign(form.value,{name:t(selected.title),operator:kind==='wifi'?'<':'>',threshold:limits[0],recovery:limits[1],pendingSeconds:limits[2]});form.value.source.kind=kind;if(kind==='metric_age'){form.value.source.measurement='mqtt_consumer';form.value.source.field='value';if(!form.value.source.host)form.value.source.host='raspberrypi';}}
if(!props.initial?.id)useTemplate(props.initialTemplate);
async function save(){busy.value=true;error.value='';try{await alertService.saveRule(form.value);emit('saved');}catch(issue){error.value=alertError(issue);}finally{busy.value=false;}}
</script>

<style scoped lang="scss">
.rule-editor{border:1px solid rgb(var(--v-theme-border));}.evaluation-settings{border-top:1px solid rgb(var(--v-theme-border));padding:12px 0 18px;summary{font-size:13px;color:rgb(var(--v-theme-muted));cursor:pointer;}}.text-body-small{color:rgb(var(--v-theme-muted));font-size:12px;line-height:1.6;}
</style>
