<template>
  <v-container fluid class="auth-page d-flex align-center justify-center pa-4 pa-sm-8"><v-card class="auth-card pa-4 pa-sm-6 rounded-lg" width="100%" max-width="440" elevation="3">
    <v-img src="@/assets/images/hydroponic.png" class="mx-auto" width="100" height="100" alt="Tomatoes" /><v-card-title class="text-center py-6"><h2 class="app-page-title">Welcome</h2></v-card-title>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-form @submit.prevent="submit"><v-text-field v-model="identifier" label="Username or email" autocomplete="username" :rules="[required]" :disabled="loading" /><v-text-field v-model="password" label="Password" autocomplete="current-password" :type="show ? 'text' : 'password'" :append-inner-icon="show ? 'mdi-eye' : 'mdi-eye-off'" :rules="[required]" :disabled="loading" @click:append-inner="show = !show" /><v-btn type="submit" color="primary" block size="large" :loading="loading" :disabled="loading">Log in</v-btn></v-form>
    <v-btn to="/resetpassword" variant="text" class="auth-link mt-3" block>Forgot your password?</v-btn><p class="text-center text-body-small mt-3">New here? Ask your administrator for an invitation.</p>
  </v-card></v-container>
</template>
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Authentication from '@/services/auth';
import userService from '@/services/userService';
import { required, userError } from '@/composables/userManagementUtils';
const router = useRouter(), identifier = ref(''), password = ref(''), show = ref(false), loading = ref(false), error = ref('');
async function submit(event) { if (!(await event).valid || loading.value) return; loading.value = true; error.value = ''; try { const { data } = await userService.login({ identifier: identifier.value, password: password.value }); Authentication.login(data); await router.push('/'); } catch (issue) { error.value = userError(issue); } finally { loading.value = false; } }
</script>
