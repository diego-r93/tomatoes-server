<template>
 <v-dialog :model-value="true" max-width="600" persistent scrollable><v-card class="contact-dialog"><v-card-title>{{ initial?.id?'Edit contact point':'New contact point' }}</v-card-title><v-card-text>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
  <v-form id="contact-form" @submit.prevent="save">
   <div class="contact-form-grid"><v-text-field v-model="form.name" label="Contact point name" maxlength="80" variant="outlined" /><v-select v-model="form.kind" label="Channel" :items="[{title:'Email',value:'email'},{title:'WhatsApp',value:'whatsapp'}]" variant="outlined" /></div>
   <div v-if="!ready" class="callout">{{ form.kind==='email'?'Configure SMTP in the backend environment before sending email.':'WhatsApp setup is pending. Configure your Meta account, sender, access token and approved template before enabling delivery.' }}</div>
   <v-textarea v-model="recipients" :label="form.kind==='email'?'Email recipients':'Phone numbers'" :hint="form.kind==='email'?'One email address per line.':'One international number per line, including + and country code.'" persistent-hint rows="3" variant="outlined" />
   <template v-if="form.kind==='whatsapp'"><v-row><v-col cols="12" sm="7"><v-text-field v-model="form.template" label="Approved template name" variant="outlined" /></v-col><v-col cols="12" sm="5"><v-text-field v-model="form.language" label="Template language" variant="outlined" /></v-col></v-row><p class="text-body-small">Use an approved template with six body parameters: rule name, state, severity, target, reading and condition. Sender credentials are configured separately on the server.</p><v-checkbox v-model="form.consent" label="These recipients agreed to receive WhatsApp alerts." hide-details /></template>
   <v-switch v-model="form.enabled" label="Enable contact point" color="primary" hide-details />
  </v-form>
 </v-card-text><v-card-actions><v-spacer /><v-btn :disabled="busy" @click="$emit('close')">Cancel</v-btn><v-btn form="contact-form" type="submit" color="primary" variant="flat" :loading="busy">Save contact point</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup>
import { computed,ref } from 'vue';
import { alertService,alertError } from '@/services/alertService';
const props=defineProps({initial:Object,initialKind:{type:String,default:'email'},settings:Object}),emit=defineEmits(['close','saved']);
const form=ref(props.initial?JSON.parse(JSON.stringify(props.initial)):{name:'',kind:props.initialKind,enabled:false,consent:false,recipients:[],template:'tomatoes_alert_status',language:'en_US'}),recipients=ref(form.value.recipients.join('\n')),busy=ref(false),error=ref('');
const ready=computed(()=>form.value.kind==='email'?props.settings?.email:props.settings?.whatsapp?.configured);
async function save(){busy.value=true;error.value='';try{await alertService.save('contacts',{...form.value,recipients:recipients.value.split(/[\n,;]/).map(item=>item.trim()).filter(Boolean)});emit('saved');}catch(issue){error.value=alertError(issue);}finally{busy.value=false;}}
</script>

<style scoped lang="scss">
.contact-dialog{border:1px solid rgb(var(--v-theme-border));}.contact-form-grid{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:16px;}.callout{border-left:2px solid rgb(var(--v-theme-secondary));padding:10px 14px;background:rgba(var(--v-theme-secondary),.06);margin:0 0 20px;color:rgb(var(--v-theme-muted));font-size:12px;line-height:1.6;}
@media(max-width:500px){.contact-form-grid{grid-template-columns:1fr;gap:0;}}
</style>
