<template>
 <v-dialog :model-value="true" max-width="650" scrollable @update:model-value="$emit('close')"><v-card class="message-dialog"><v-card-title tag="h2">{{ t(kind==='telegram'?'Telegram notification preview':'Notification preview') }}</v-card-title><v-card-text>
  <p class="preview-note">{{ t(rules.length?'Preview only':'Example message') }} · {{ t('No message will be sent.') }}</p>
  <v-select v-if="rules.length" v-model="ruleId" :label="t('Alert rule')" :items="rules" item-title="name" item-value="id" variant="outlined" class="mt-5" />
  <v-select v-model="phase" :label="t('Message state')" :items="phaseOptions" variant="outlined" class="mt-4" />
  <p v-if="kind!=='inapp'" class="preview-note mb-3">{{ t('Recipient: {recipient}', { recipient: contact?.recipients?.join(', ') || t('Not set') }) }}</p>
  <article class="message-body"><h3>Tomatoes: {{ t(phase) }} — {{ ruleName }}</h3><dl><div><dt>{{ t('State') }}</dt><dd>{{ t(phase) }}</dd></div><div><dt>{{ t('Severity') }}</dt><dd>{{ t(rule.severity) }}</dd></div><div><dt>{{ t('Target') }}</dt><dd>{{ target }}</dd></div><div><dt>{{ t('Reading') }}</dt><dd>{{ t(reading) }}</dd></div><div><dt>{{ t('Condition') }}</dt><dd>{{ condition }}</dd></div></dl></article>
  <div class="callout">{{ t(rules.length?'This preview uses the selected rule configuration. Changing the preview state does not change the rule.':'No rules exist yet. The message above uses clearly illustrative values and does not create an alert.') }}</div>
  <p class="preview-note">{{ t('Recovery notifications identify the incident as Resolved. External delivery requires an enabled contact point and a configured sender.') }}</p>
 </v-card-text><v-card-actions><v-spacer /><v-btn variant="outlined" @click="$emit('close')">{{ t('Close') }}</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { computed,ref } from 'vue';
import { ruleUnit } from '@/services/alertService';
import type { Contact, NotificationKind, Rule } from '@/services/alertService';

const { t } = useLanguage();
const props = withDefaults(defineProps<{ kind?: NotificationKind; contact?: Contact | null; rules?: Rule[] }>(),
  { kind: 'inapp', rules: () => [] });
defineEmits<{ close: [] }>();
const ruleId=ref(props.rules[0]?.id??null),phase=ref<'Firing' | 'No data' | 'Error' | 'Resolved'>('Firing');
type PreviewRule = Pick<Rule, 'name' | 'severity' | 'value' | 'operator' | 'threshold' | 'recovery' | 'pendingSeconds'> & {
  source: Pick<Rule['source'], 'kind' | 'host' | 'gpio' | 'pump' | 'condition' | 'measurement' | 'unit'>;
};
const rule=computed<PreviewRule>(()=>props.rules.find(item=>item.id===ruleId.value)||{name:'Example temperature alert',severity:'Warning',source:{kind:'cpu_temperature',host:'example-host'},value:80,operator:'>',threshold:75,recovery:68,pendingSeconds:120});
const phaseOptions = computed(() => (['Firing', 'No data', 'Error', 'Resolved'] as const).map(value => ({ title: t(value), value })));
const ruleName = computed(() => props.rules.some(item => item.id === ruleId.value) ? rule.value.name : t('Example temperature alert'));
const target=computed(()=>`${rule.value.source.host}${rule.value.source.gpio!==undefined?` / GPIO ${rule.value.source.gpio}`:''}`);
const reading=computed(()=>rule.value.value===null?'Not available':`${Number(rule.value.value.toFixed(2))} ${ruleUnit(rule.value.source)}`);
const condition = computed(() => {
  const item = rule.value, unit = ruleUnit(item.source);
  return t('{condition} for {duration}; recovery {recovery}', {
    condition: [item.operator, item.threshold, unit].filter(value => value !== '').join(' '),
    duration: t('{count} sec', { count: item.pendingSeconds }),
    recovery: [item.recovery, unit].filter(value => value !== '').join(' '),
  });
});
</script>
<style scoped lang="scss">
.message-dialog{border:1px solid rgb(var(--v-theme-border));}.preview-note{margin:0;color:rgb(var(--v-theme-muted));font-size:13px;line-height:1.6;}.message-body{border:1px solid rgb(var(--v-theme-border));border-radius:4px;padding:18px;background:rgb(var(--v-theme-background));h3{font-size:15px;font-weight:500;margin:0 0 16px;}dl>div{display:grid;grid-template-columns:85px minmax(0,1fr);gap:12px;margin-top:10px;font-size:13px;}dt{font-weight:500;}dd{margin:0;overflow-wrap:anywhere;}}.callout{border-left:2px solid rgb(var(--v-theme-secondary));padding:10px 14px;background:rgba(var(--v-theme-secondary),.06);margin:18px 0;color:rgb(var(--v-theme-muted));font-size:12px;line-height:1.6;}
@media(max-width:450px){.message-body dl>div{grid-template-columns:1fr;gap:3px;}}
</style>
