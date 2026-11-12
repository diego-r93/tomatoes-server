<template>
 <v-dialog :model-value="true" max-width="600" persistent scrollable><v-card class="contact-dialog"><v-card-title>{{ t(initial?.id?'Edit contact point':'New contact point') }}</v-card-title><v-card-text>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ t(error) }}</v-alert>
  <v-form id="contact-form" @submit.prevent="save">
   <div class="contact-form-grid"><v-text-field v-model="form.name" :label="t('Contact point name')" maxlength="80" variant="outlined" /><v-select v-model="form.kind" :label="t('Channel')" :items="[{title: t('Email'),value:'email'},{title:'Telegram',value:'telegram'}]" variant="outlined" /></div>
   <div v-if="!ready" class="callout">{{ t(form.kind==='email'?'Configure SMTP in the backend environment before sending email.':'Configure the Telegram bot on the server before sending alerts.') }}</div>
   <v-textarea v-model="recipients" :label="t(form.kind==='email'?'Email recipients':'Telegram chat IDs')" :hint="t(form.kind==='email'?'One email address per line.':'Enter one numeric chat ID per line. Group IDs can be negative.')" persistent-hint rows="3" variant="outlined" />
   <template v-if="form.kind==='telegram'">
    <p class="text-body-small mt-4">{{ t('Start the bot in a private chat or add it to your group before saving the chat ID.') }}</p>
    <v-checkbox v-model="form.consent" :label="t('These recipients agreed to receive Telegram alerts.')" hide-details />
   </template>
   <v-switch v-model="form.enabled" :label="t('Enable contact point')" color="primary" hide-details />
  </v-form>
 </v-card-text><v-card-actions><v-spacer /><v-btn :disabled="busy" @click="$emit('close')">{{ t('Cancel') }}</v-btn><v-btn form="contact-form" type="submit" color="primary" variant="flat" :loading="busy">{{ t('Save contact point') }}</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { computed,ref } from 'vue';
import { alertService,alertError } from '@/services/alertService';
import type { AlertSettings, Contact, ContactDraft, ContactKind } from '@/services/alertService';

const { t } = useLanguage();
const props = withDefaults(defineProps<{ initial?: Contact | null; initialKind?: ContactKind; settings?: Partial<AlertSettings> }>(), { initialKind: 'email' });
const emit = defineEmits<{ close: []; saved: [] }>();
const form=ref<ContactDraft>(props.initial?{...props.initial}:{name:'',kind:props.initialKind,enabled:false,consent:false,recipients:[]}),recipients=ref(form.value.recipients.join('\n')),busy=ref(false),error=ref('');
const ready=computed(()=>form.value.kind==='email'?props.settings?.email:props.settings?.telegram?.configured);
async function save(){busy.value=true;error.value='';try{await alertService.saveContact({...form.value,recipients:recipients.value.split(/[\n,;]/).map(item=>item.trim()).filter(Boolean)});emit('saved');}catch(issue){error.value=alertError(issue);}finally{busy.value=false;}}
</script>

<style scoped lang="scss">
.contact-dialog{border:1px solid rgb(var(--v-theme-border));}.contact-form-grid{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:16px;}.callout{border-left:2px solid rgb(var(--v-theme-secondary));padding:10px 14px;background:rgba(var(--v-theme-secondary),.06);margin:0 0 20px;color:rgb(var(--v-theme-muted));font-size:12px;line-height:1.6;}
@media(max-width:500px){.contact-form-grid{grid-template-columns:1fr;gap:0;}}
</style>
