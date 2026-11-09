<template><v-container fluid class="auth-page d-flex align-center justify-center pa-4"><v-card class="auth-card pa-6" max-width="520" width="100%" title="Join Tomatoes"><v-card-text><v-progress-linear v-if="loading" indeterminate /><v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert><v-alert v-if="done" type="success" variant="tonal">Your account is ready. Sign in to continue.</v-alert><template v-else-if="invitation"><p class="mb-4">Create an account for <strong>{{ invitation.email }}</strong>.</p><p v-if="invitation.message" class="mb-4 invitation-message">{{ invitation.message }}</p><v-form @submit.prevent="submit"><div class="invite-name"><v-text-field v-model="draft.firstName" label="First name" maxlength="80" /><v-text-field v-model="draft.lastName" label="Last name" maxlength="80" /></div><v-text-field v-model="draft.username" label="Username" autocomplete="username" :rules="[required]" maxlength="50" :disabled="busy" /><v-text-field v-model="draft.password" label="Password" type="password" autocomplete="new-password" :rules="[passwordRule]" :disabled="busy" /><v-text-field v-model="repeat" label="Confirm password" type="password" autocomplete="new-password" :rules="[value => value === draft.password || 'Passwords must match.']" :disabled="busy" /><v-btn type="submit" color="primary" block :loading="busy" :disabled="busy">Create account</v-btn></v-form></template></v-card-text><v-card-actions><v-btn to="/login">Back to login</v-btn></v-card-actions></v-card></v-container></template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { SubmitEventPromise } from 'vuetify';
import type { Invitation, NewAccountFields } from '@/services/userTypes';
import userService from '@/services/userService';
import { passwordRule, required, userError } from '@/composables/userManagementUtils';

const token = useRoute().params.token;
const invitation = ref<Invitation | null>(null);
const loading = ref(true);
const busy = ref(false);
const done = ref(false);
const error = ref('');
const repeat = ref('');
const draft = reactive<NewAccountFields>({ firstName: '', lastName: '', username: '', password: '' });

onMounted(async () => {
  try {
    if (typeof token !== 'string' || !token) throw new Error('This invitation is invalid or has expired.');
    invitation.value = (await userService.invitationInfo(token)).data;
  } catch (issue) {
    error.value = userError(issue);
  } finally {
    loading.value = false;
  }
});

async function submit(event: SubmitEventPromise) {
  if (!(await event).valid || busy.value || done.value || !invitation.value || typeof token !== 'string') return;
  busy.value = true;
  error.value = '';
  try {
    await userService.acceptInvitation(token, draft);
    draft.password = '';
    repeat.value = '';
    done.value = true;
  } catch (issue) {
    error.value = userError(issue);
  } finally {
    busy.value = false;
  }
}
</script>
<style scoped>.invite-name{display:flex;gap:12px}.invitation-message{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:500px){.invite-name{display:block}}</style>
