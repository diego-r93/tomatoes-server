<template>
 <v-dialog :model-value="true" max-width="650" scrollable @update:model-value="$emit('close')"><v-card class="message-dialog"><v-card-title tag="h2">{{ kind==='whatsapp'?'WhatsApp notification preview':'Notification preview' }}</v-card-title><v-card-text>
  <p class="preview-note">{{ rules.length?'Preview only':'Example message' }} · No message will be sent.</p>
  <v-select v-if="rules.length" v-model="ruleId" label="Alert rule" :items="rules" item-title="name" item-value="id" variant="outlined" class="mt-5" />
  <v-select v-model="phase" label="Message state" :items="['Firing','No data','Error','Resolved']" variant="outlined" class="mt-4" />
  <p v-if="kind!=='inapp'" class="preview-note mb-3">Recipient: {{ contact?.recipients?.join(', ')||'Not set' }}<template v-if="kind==='whatsapp'"> · Template: {{ contact?.template||'tomatoes_alert_status' }} · {{ contact?.language||'en_US' }}</template></p>
  <article class="message-body"><h3>Tomatoes: {{ phase }} — {{ rule.name }}</h3><dl><div><dt>State</dt><dd>{{ phase }}</dd></div><div><dt>Severity</dt><dd>{{ rule.severity }}</dd></div><div><dt>Target</dt><dd>{{ target }}</dd></div><div><dt>Reading</dt><dd>{{ reading }}</dd></div><div><dt>Condition</dt><dd>{{ condition }}</dd></div></dl></article>
  <div class="callout">{{ rules.length?'This preview uses the selected rule configuration. Changing the preview state does not change the rule.':'No rules exist yet. The message above uses clearly illustrative values and does not create an alert.' }}</div>
  <p class="preview-note">Recovery notifications identify the incident as Resolved. External delivery requires an enabled contact point and a configured sender.</p>
 </v-card-text><v-card-actions><v-spacer /><v-btn variant="outlined" @click="$emit('close')">Close</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup lang="ts">
import { computed,ref } from 'vue';
import { ruleUnit } from '@/services/alertService';
import type { Contact, NotificationKind, Rule } from '@/services/alertService';
const props = withDefaults(defineProps<{ kind?: NotificationKind; contact?: Contact | null; rules?: Rule[] }>(),
  { kind: 'inapp', rules: () => [] });
defineEmits<{ close: [] }>();
const ruleId=ref(props.rules[0]?.id??null),phase=ref<'Firing' | 'No data' | 'Error' | 'Resolved'>('Firing');
type PreviewRule = Pick<Rule, 'name' | 'severity' | 'value' | 'operator' | 'threshold' | 'recovery' | 'pendingSeconds'> & {
  source: Pick<Rule['source'], 'kind' | 'host' | 'gpio' | 'pump' | 'condition' | 'measurement' | 'unit'>;
};
const rule=computed<PreviewRule>(()=>props.rules.find(item=>item.id===ruleId.value)||{name:'Example temperature alert',severity:'Warning',source:{kind:'cpu_temperature',host:'example-host'},value:80,operator:'>',threshold:75,recovery:68,pendingSeconds:120});
const target=computed(()=>`${rule.value.source.host}${rule.value.source.gpio!==undefined?` / GPIO ${rule.value.source.gpio}`:''}`);
const reading=computed(()=>rule.value.value===null?'Not available':`${Number(rule.value.value.toFixed(2))} ${ruleUnit(rule.value.source)}`);
const condition=computed(()=>`${rule.value.operator} ${rule.value.threshold} ${ruleUnit(rule.value.source)} for ${rule.value.pendingSeconds} sec; recovery ${rule.value.recovery} ${ruleUnit(rule.value.source)}`);
</script>
<style scoped lang="scss">
.message-dialog{border:1px solid rgb(var(--v-theme-border));}.preview-note{margin:0;color:rgb(var(--v-theme-muted));font-size:13px;line-height:1.6;}.message-body{border:1px solid rgb(var(--v-theme-border));border-radius:4px;padding:18px;background:rgb(var(--v-theme-background));h3{font-size:15px;font-weight:500;margin:0 0 16px;}dl>div{display:grid;grid-template-columns:85px minmax(0,1fr);gap:12px;margin-top:10px;font-size:13px;}dt{font-weight:500;}dd{margin:0;overflow-wrap:anywhere;}}.callout{border-left:2px solid rgb(var(--v-theme-secondary));padding:10px 14px;background:rgba(var(--v-theme-secondary),.06);margin:18px 0;color:rgb(var(--v-theme-muted));font-size:12px;line-height:1.6;}
@media(max-width:450px){.message-body dl>div{grid-template-columns:1fr;gap:3px;}}
</style>
