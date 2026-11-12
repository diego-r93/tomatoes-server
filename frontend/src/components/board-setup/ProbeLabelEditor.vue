<template>
  <section class="setup-panel">
    <h2>{{ t('Conductivity probe label') }}</h2>
    <p class="setup-muted">{{ t('Use a label to identify the probe. It does not affect sensor readings.') }}</p>
    <p v-if="!supported" class="mt-3">{{ t('This board firmware does not support setup.') }}</p>
    <template v-else>
      <p v-if="!online" class="mt-3">{{ t('The board has not replied recently.') }}</p>
      <div class="d-flex align-center flex-wrap ga-3 my-4">
        <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="busy === 'read'" :disabled="!online || Boolean(busy)" @click="read">{{ t('Read board settings') }}</v-btn>
        <span v-if="settings" class="setup-muted">{{ t('Reported revision {revision}', { revision: settings.revision }) }}</span>
      </div>
      <v-form v-if="settings" @submit.prevent="save">
        <v-text-field v-model="label" :label="t('Probe label')" :hint="t('An empty label clears the name on the board.')" persistent-hint counter="32" variant="outlined" :disabled="!online || Boolean(busy)" />
        <v-btn class="mt-3" type="submit" color="primary" variant="flat" :loading="busy === 'save'" :disabled="!online || Boolean(busy) || label === settings.label">{{ t('Save probe label') }}</v-btn>
      </v-form>
      <v-alert v-if="notice" class="mt-4" type="success" variant="tonal" role="status">{{ t(notice) }}</v-alert>
      <v-alert v-if="error" class="mt-4" type="warning" variant="tonal" role="alert">{{ t(error) }}</v-alert>
    </template>
  </section>
</template>

<script setup lang="ts">
import { isAxiosError } from 'axios';
import { onBeforeUnmount, ref } from 'vue';
import { useLanguage } from '@/composables/useLanguage';
import { http } from '@/services/http-common';

const props = defineProps<{ host: string; supported: boolean; online: boolean }>();
const { t } = useLanguage();
type Settings = { revision: number; label: string; outcome?: 'verified' | 'reconciled' | 'unchanged' };
const settings = ref<Settings | null>(null);
const label = ref('');
const busy = ref<'read' | 'save' | null>(null);
const notice = ref('');
const error = ref('');
const controller = new AbortController();
onBeforeUnmount(() => controller.abort());

async function request(mode: 'read' | 'save') {
  if (busy.value || !props.online || !props.supported) return;
  busy.value = mode;
  notice.value = '';
  error.value = '';
  const path = '/mqtt/setup/' + encodeURIComponent(props.host);
  const options = { signal: controller.signal, timeout: 22000 };
  try {
    const response = mode === 'read'
      ? await http.get<Settings>(path, options)
      : await http.put<Settings>(path + '/ec-label', { revision: settings.value?.revision, label: label.value }, options);
    settings.value = response.data;
    label.value = response.data.label;
    if (mode === 'save') notice.value = response.data.outcome === 'unchanged' ? 'The label is already saved.' : 'Probe label verified on the board.';
  } catch (issue) {
    if (controller.signal.aborted) return;
    const status = isAxiosError(issue) ? issue.response?.status : undefined;
    if (status !== 400) settings.value = null;
    error.value = (isAxiosError<{ message?: string }>(issue) && issue.response?.data?.message)
      || (mode === 'save' ? 'The change could not be verified. Read the settings before saving again.' : 'Could not read board settings.');
  } finally {
    busy.value = null;
  }
}

const read = () => request('read');
const save = () => request('save');
</script>
