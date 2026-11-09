<template>
  <v-card elevation="0" class="retention-card custom-border">
    <h2>{{ t('Data retention') }}</h2>
    <p>{{ t('Choose how long readings and pulse history are kept. This applies to the entire installation.') }}</p>
    <form class="retention-form" @submit.prevent="requestSave">
      <v-text-field v-model="days" type="number" min="1" max="3650" step="1" required
        :disabled="loading || savedDays === null || saving" :label="t('Retention period in days')" hide-details />
      <v-btn v-if="savedDays === null && !loading" variant="outlined" @click="load">{{ t('Retry') }}</v-btn>
      <v-btn v-else type="submit" color="primary" :loading="saving" :disabled="!valid || numericDays === savedDays || loading">{{ t('Save') }}</v-btn>
    </form>
    <p v-if="savedDays === 0">{{ t('Current retention is unlimited.') }}</p>
    <v-alert v-if="error" type="error" variant="tonal" class="mt-3">{{ t(error) }}</v-alert>
    <p v-if="message" role="status">{{ t(message) }}</p>
    <v-dialog v-model="confirmOpen" max-width="440">
      <v-card :title="t('Shorten retention?')">
        <v-card-text>{{ t('Records older than the new period may be permanently deleted.') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="confirmOpen = false">{{ t('Cancel') }}</v-btn>
          <v-btn color="error" @click="save(true)">{{ t('Shorten retention') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { http } from '@/services/http-common';
import { useLanguage } from '@/composables/useLanguage';
const { t } = useLanguage();
const days = ref(''), savedDays = ref(null);
const loading = ref(false), saving = ref(false), confirmOpen = ref(false);
const error = ref(''), message = ref('');
const path = '/mqtt/history-retention';
const numericDays = computed(() => Number(days.value));
const valid = computed(() => Number.isInteger(numericDays.value) && numericDays.value >= 1 && numericDays.value <= 3650);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await http.get(path);
    savedDays.value = data.days;
    days.value = data.days || '';
  } catch {
    error.value = 'Could not load data retention.';
  } finally {
    loading.value = false;
  }
}

function requestSave() {
  if (!valid.value || saving.value || savedDays.value === null) return;
  if (savedDays.value === 0 || numericDays.value < savedDays.value) confirmOpen.value = true;
  else void save(false);
}

async function save(confirmReduction) {
  confirmOpen.value = false;
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await http.put(path, { days: numericDays.value, previousDays: savedDays.value, confirmReduction });
    savedDays.value = days.value = data.days;
    message.value = 'Data retention saved.';
  } catch (issue) {
    if (issue.response?.status === 409) {
      await load();
      if (savedDays.value !== null && !error.value) error.value = 'The retention period changed. Review it and try again.';
    } else error.value = 'Could not save data retention.';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.retention-card { padding: var(--app-panel-padding, 22px); margin-top: 18px; border-radius: 6px; }
.retention-card h2 { font-size: 16px; font-weight: 500; margin: 0; }
.retention-card p { color: rgb(var(--v-theme-muted)); margin-top: 5px; }
.retention-form { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 16px 0 4px; }
.retention-form > .v-input { flex: 0 1 240px; min-width: min(100%, 200px); }
</style>
