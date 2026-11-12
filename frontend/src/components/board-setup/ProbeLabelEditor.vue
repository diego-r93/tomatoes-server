<template>
  <section class="setup-panel">
    <h2>{{ t('Conductivity probe settings') }}</h2>
    <p class="setup-muted">{{ t('Use a label to identify the probe. It does not affect sensor readings.') }}</p>
    <p v-if="!supported" class="mt-3">{{ t('This board firmware does not support setup.') }}</p>
    <template v-else>
      <p v-if="!online" class="mt-3">{{ t('The board has not replied recently.') }}</p>
      <div class="d-flex align-center flex-wrap ga-3 my-4">
        <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="busy === 'read'" :disabled="!online || Boolean(busy)" @click="read">{{ t('Read board settings') }}</v-btn>
        <span v-if="settings" class="setup-muted">{{ t('Reported revision {revision}', { revision: settings.revision }) }}</span>
      </div>
      <v-form v-if="settings" @submit.prevent="request('label')">
        <v-text-field v-model="label" :label="t('Probe label')" :hint="t('An empty label clears the name on the board.')" persistent-hint counter="32" variant="outlined" :disabled="!online || Boolean(busy)" />
        <v-btn class="mt-3" type="submit" color="primary" variant="flat" :loading="busy === 'label'" :disabled="!online || Boolean(busy) || label === settings.label">{{ t('Save probe label') }}</v-btn>
      </v-form>
      <template v-if="settings">
        <v-divider class="my-5" />
        <h3>{{ t('Conductivity parameters') }}</h3>
        <v-form v-if="ecEditable && ecAvailable" @submit.prevent="request('ec')">
          <v-text-field v-for="field in ecFields" :key="field.key" v-model="ecDraft[field.key]" :label="t(field.title)"
            type="number" :min="field.min" :max="field.max" :step="field.step" :suffix="field.unit"
            required variant="outlined" density="comfortable" :disabled="!online || Boolean(busy)" />
          <v-btn type="submit" color="primary" variant="flat" :loading="busy === 'ec'" :disabled="!online || Boolean(busy) || !Object.keys(changedEc).length">{{ t('Save conductivity parameters') }}</v-btn>
        </v-form>
        <p v-else class="setup-muted">{{ t(ecEditable ? 'The board did not report all conductivity parameters.' : 'This board firmware does not support editing conductivity parameters.') }}</p>
      </template>
      <v-alert v-if="notice" class="mt-4" type="success" variant="tonal" role="status">{{ t(notice) }}</v-alert>
      <v-alert v-if="error" class="mt-4" type="warning" variant="tonal" role="alert">{{ t(error) }}</v-alert>
    </template>
  </section>
</template>

<script setup lang="ts">
import { isAxiosError } from 'axios';
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useLanguage } from '@/composables/useLanguage';
import { http } from '@/services/http-common';
import type { BoardSetupSettings } from '@/composables/boardSetupInventory';

const props = defineProps<{ host: string; supported: boolean; online: boolean; ecEditable: boolean }>();
const { t } = useLanguage();
const settings = defineModel<BoardSetupSettings | null>({ required: true });
const label = ref('');
const ecFields = [
  { key: 'k', title: 'Cell constant', min: 0.01, max: 10, step: 0.0001, unit: 'cm⁻¹' },
  { key: 'alpha', title: 'Temperature coefficient', min: 0, max: 5, step: 0.001, unit: '%/°C' },
  { key: 'tdsFactor', title: 'TDS factor', min: 0.4, max: 0.9, step: 0.001, unit: '' },
] as const;
type EcKey = typeof ecFields[number]['key'];
const ecDraft = reactive<Record<EcKey, string>>({ k: '', alpha: '', tdsFactor: '' });
const ecAvailable = computed(() => settings.value?.cellConstant != null && settings.value.temperatureCoefficient != null && settings.value.tdsFactor != null);
const changedEc = computed(() => {
  const current = settings.value;
  if (!current || !ecAvailable.value) return {};
  const reported = { k: current.cellConstant, alpha: current.temperatureCoefficient, tdsFactor: current.tdsFactor };
  const values = {
    k: ecDraft.k === '' ? NaN : Number(ecDraft.k),
    alpha: ecDraft.alpha === '' ? NaN : Number(ecDraft.alpha) / 100,
    tdsFactor: ecDraft.tdsFactor === '' ? NaN : Number(ecDraft.tdsFactor),
  };
  return Object.fromEntries(ecFields.filter(({ key }) => Math.abs((reported[key] ?? NaN) - values[key]) > 1e-12 || !Number.isFinite(values[key]))
    .map(({ key }) => [key, key === 'alpha' ? Number(values.alpha.toFixed(5)) : values[key]]));
});
const busy = ref<'read' | 'label' | 'ec' | null>(null);
const notice = ref('');
const error = ref('');
const controller = new AbortController();
onBeforeUnmount(() => controller.abort());

async function request(mode: 'read' | 'label' | 'ec') {
  if (busy.value || !props.online || !props.supported || (mode !== 'read' && !settings.value)) return;
  if (mode === 'ec' && (!props.ecEditable || !ecAvailable.value || !Object.keys(changedEc.value).length)) return;
  busy.value = mode;
  notice.value = '';
  error.value = '';
  const path = '/mqtt/setup/' + encodeURIComponent(props.host);
  const options = { signal: controller.signal, timeout: 22000 };
  try {
    const revision = settings.value?.revision;
    const response = mode === 'read'
      ? await http.get<BoardSetupSettings>(path, options)
      : await http.put<BoardSetupSettings>(
        path + (mode === 'label' ? '/ec-label' : '/ec-parameters'),
        mode === 'label' ? { revision, label: label.value } : { revision, parameters: changedEc.value }, options);
    if (!props.supported || controller.signal.aborted) return;
    settings.value = response.data;
    label.value = response.data.label;
    const { cellConstant, temperatureCoefficient, tdsFactor, outcome } = response.data;
    ecDraft.k = cellConstant == null ? '' : String(cellConstant);
    ecDraft.alpha = temperatureCoefficient == null ? '' : String(Number((temperatureCoefficient * 100).toFixed(3)));
    ecDraft.tdsFactor = tdsFactor == null ? '' : String(tdsFactor);
    if (mode === 'label') notice.value = outcome === 'unchanged' ? 'The label is already saved.' : 'Probe label verified on the board.';
    if (mode === 'ec') notice.value = outcome === 'unchanged' ? 'The conductivity parameters are already saved.' : 'Conductivity parameters verified on the board.';
  } catch (issue) {
    if (controller.signal.aborted) return;
    const status = isAxiosError(issue) ? issue.response?.status : undefined;
    if (status !== 400) settings.value = null;
    error.value = (isAxiosError<{ message?: string }>(issue) && issue.response?.data?.message)
      || (mode !== 'read' ? 'The change could not be verified. Read the settings before saving again.' : 'Could not read board settings.');
  } finally {
    busy.value = null;
  }
}

const read = () => request('read');
</script>
