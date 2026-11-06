<template><v-container fluid class="auth-page d-flex align-center justify-center pa-4"><v-card class="auth-card pa-6" max-width="440" width="100%" title="Choose a new password"><v-card-text><v-alert v-if="done" type="success" variant="tonal">Password updated. Sign in with your new password.</v-alert><template v-else><v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert><v-form @submit.prevent="submit"><v-text-field v-model="password" label="New password" type="password" autocomplete="new-password" :rules="[passwordRule]" :disabled="busy" /><v-text-field v-model="repeat" label="Confirm password" type="password" autocomplete="new-password" :rules="[value => value === password || 'Passwords must match.']" :disabled="busy" /><v-btn type="submit" block color="primary" :loading="busy" :disabled="busy">Update password</v-btn></v-form></template></v-card-text><v-card-actions><v-btn to="/login">Back to login</v-btn></v-card-actions></v-card></v-container></template>
<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import userService from '@/services/userService';
import { userError } from '@/composables/userManagementUtils';
const token = useRoute().params.token, password = ref(''), repeat = ref(''), busy = ref(false), done = ref(false), error = ref('');
const passwordRule = value => (value?.length >= 8 && new TextEncoder().encode(value).length <= 72) || 'Use at least 8 characters and no more than 72 bytes.';
async function submit(event) { if (!(await event).valid || busy.value) return; busy.value = true; error.value = ''; try { await userService.resetPassword(token, password.value); password.value = ''; repeat.value = ''; done.value = true; } catch (issue) { error.value = userError(issue); } finally { busy.value = false; } }
</script>
