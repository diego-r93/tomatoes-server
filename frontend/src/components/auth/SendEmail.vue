<template><v-container fluid class="auth-page d-flex align-center justify-center pa-4"><v-card class="auth-card pa-6" width="100%" max-width="440" title="Reset password"><v-card-text><p class="mb-4">Request a one-time reset link. Open it while connected to the Tomatoes network.</p><v-alert v-if="message" type="success" variant="tonal" class="mb-4">{{ message }}</v-alert><v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert><v-form @submit.prevent="submit"><v-text-field v-model="email" label="Email" autocomplete="email" :rules="[validEmail]" :disabled="loading" /><v-btn type="submit" block color="primary" :loading="loading" :disabled="loading">Send reset email</v-btn></v-form></v-card-text><v-card-actions><v-btn to="/login" variant="text">Back to login</v-btn></v-card-actions></v-card></v-container></template>
<script setup lang="ts">
import { ref } from 'vue';
import type { SubmitEventPromise } from 'vuetify';
import userService from '@/services/userService';
import { userError, validEmail } from '@/composables/userManagementUtils';

const email = ref('');
const loading = ref(false);
const error = ref('');
const message = ref('');

async function submit(event: SubmitEventPromise) {
  if (!(await event).valid || loading.value) return;
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    message.value = (await userService.requestPasswordReset(email.value)).data.message;
  } catch (issue) {
    error.value = userError(issue);
  } finally {
    loading.value = false;
  }
}
</script>
