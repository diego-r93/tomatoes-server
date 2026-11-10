<template>
  <v-dialog v-model="visible" max-width="520" persistent>
    <v-card :title="t('Invite user')"><v-card-text>
      <v-form @submit.prevent="submit">
        <v-text-field v-model="draft.email" :label="t('Email address')" type="email" :rules="[localizedRequired, localizedValidEmail]" :disabled="busy" />
        <v-select v-model="draft.groupIds" :items="groups" item-title="name" item-value="id" :label="t('Add to groups')" multiple chips :disabled="busy || loading" />
        <v-select v-model="draft.expiresInDays" :items="[1, 3, 7, 14, 30]" :label="t('Invitation validity (days)')" :disabled="busy" />
        <v-textarea v-model="draft.message" :label="t('Personal message (optional)')" rows="2" maxlength="1000" counter :disabled="busy" />
        <p class="invitation-note">{{ t('The recipient will choose their username and password. The invitation link must be opened from a network that can reach this Tomatoes server.') }}</p>
        <v-alert v-if="error" type="error" variant="tonal" class="mt-4">{{ t(error) }}</v-alert>
        <div class="invitation-actions"><v-btn :disabled="busy" @click="visible = false">{{ t('Cancel') }}</v-btn><v-btn type="submit" color="primary" :loading="busy" :disabled="loading || busy">{{ t('Send invitation') }}</v-btn></div>
      </v-form>
    </v-card-text></v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { computed, reactive, ref, watch } from 'vue';
import userService from '@/services/userService';
import { required, validEmail, userError } from '@/composables/userManagementUtils';
import type { InvitationFields, UserGroup } from '@/services/userTypes';
import type { SubmitEventPromise } from 'vuetify';

const { t } = useLanguage();
function localizedValidEmail(value: Parameters<typeof validEmail>[0]) {
  const result = validEmail(value);
  return result === true ? true : t(result);
}
function localizedRequired(value: Parameters<typeof required>[0]) {
  const result = required(value);
  return result === true ? true : t(result);
}

const props = defineProps({ modelValue: Boolean, defaultDays: { type: Number, default: 7 } });
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; created: [] }>();
const visible = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) });
const draft = reactive<InvitationFields>({ email: '', groupIds: [], expiresInDays: 7, message: '' });
const groups = ref<UserGroup[]>([]), error = ref(''), busy = ref(false), loading = ref(false);
watch(visible, async open => {
  if (!open) return;
  Object.assign(draft, { email: '', groupIds: [], expiresInDays: props.defaultDays, message: '' }); error.value = ''; loading.value = true;
  try { groups.value = (await userService.groups()).data.filter(group => !group.isBuiltin); }
  catch (issue) { error.value = userError(issue); }
  finally { loading.value = false; }
});
async function submit(event: SubmitEventPromise) {
  const result = await event; if (!result.valid || busy.value) return;
  busy.value = true; error.value = '';
  try { await userService.invite({ ...draft, groupIds: [...draft.groupIds] }); visible.value = false; emit('created'); }
  catch (issue) { error.value = userError(issue); }
  finally { busy.value = false; }
}
</script>
<style scoped lang="scss">
.invitation-note { color: rgb(var(--v-theme-muted)); font-size: 13px; margin: 0; }
.invitation-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; margin-top: 20px; }
</style>
