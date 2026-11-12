<template>
  <dl v-if="settings?.ph">
    <template v-for="field in fields" :key="field.key">
      <dt>{{ t(field.label) }}</dt>
      <dd>{{ formatter.format(settings.ph[field.key]) }}{{ field.unit ? ' ' + field.unit : '' }}</dd>
    </template>
  </dl>
  <details v-if="editable && settings" class="mt-4">
    <summary>{{ t('Manual pH coefficients · bench testing') }}</summary>
    <v-form class="mt-4" @submit.prevent="write('save')">
      <v-text-field v-for="field in fields" :key="field.key" v-model="draft[field.key]"
        :label="t(field.label)" type="number" :min="field.min" :max="field.max" :step="field.step"
        :suffix="field.unit" variant="outlined" required :disabled="!online || Boolean(busy)" />
      <div class="d-flex flex-wrap ga-3">
        <v-btn type="submit" color="primary" variant="flat" :loading="busy === 'save'" :disabled="!online || Boolean(busy)">
          {{ t('Save pH coefficients') }}
        </v-btn>
      </div>
    </v-form>
  </details>
  <v-btn v-if="editable && settings?.phCalibrated === true" class="mt-4" color="warning" variant="outlined"
    :loading="busy === 'clear'" :disabled="!online || Boolean(busy)" @click="confirmClear = true">
    {{ t('Clear pH calibration') }}
  </v-btn>
  <v-dialog v-model="confirmClear" max-width="450">
    <v-card :title="t('Clear pH calibration?')" :text="t('The board will return to the theoretical Nernst response.')">
      <v-card-actions>
        <v-spacer />
        <v-btn @click="confirmClear = false">{{ t('cancel') }}</v-btn>
        <v-btn color="warning" variant="flat" :disabled="!online || Boolean(busy)" @click="clear">{{ t('Clear pH calibration') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-alert v-if="notice" class="mt-4" type="success" variant="tonal" role="status">{{ t(notice) }}</v-alert>
  <v-alert v-if="error" class="mt-4" type="warning" variant="tonal" role="alert">{{ t(error) }}</v-alert>
</template>

<script setup lang="ts">
import { isAxiosError } from 'axios';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useLanguage } from '@/composables/useLanguage';
import type { BoardSetupSettings } from '@/composables/boardSetupInventory';
import { http } from '@/services/http-common';

const props = defineProps<{ host: string; online: boolean; editable: boolean }>();
const settings = defineModel<BoardSetupSettings | null>({ required: true });
const { language, t } = useLanguage();
const formatter = computed(() => new Intl.NumberFormat(language.value, { maximumFractionDigits: 4 }));
const fields = [
  { key: 'off', label: 'pH 7 offset', min: -30, max: 30, step: 0.01, unit: 'mV' },
  { key: 'acid', label: 'Acidic slope (pH 7–4)', min: 0.85, max: 1.05, step: 0.0001, unit: '' },
  { key: 'base', label: 'Alkaline slope (pH 7–10)', min: 0.85, max: 1.05, step: 0.0001, unit: '' },
] as const;
const draft = reactive({ off: '', acid: '', base: '' });
watch(settings, value => {
  const coefficients = value?.ph ?? (value?.phCalibrated === false ? { off: 0, acid: 1, base: 1 } : null);
  for (const { key } of fields) draft[key] = coefficients ? String(coefficients[key]) : '';
}, { immediate: true });
const busy = ref<'save' | 'clear' | null>(null);
const notice = ref('');
const error = ref('');
const confirmClear = ref(false);
const controller = new AbortController();
onBeforeUnmount(() => controller.abort());

function clear() {
  confirmClear.value = false;
  void write('clear');
}

async function write(mode: 'save' | 'clear') {
  if (!props.online || !props.editable || !settings.value || busy.value) return;
  if (mode === 'clear' && settings.value.phCalibrated !== true) return;
  const path = '/mqtt/setup/' + encodeURIComponent(props.host);
  const options = { signal: controller.signal, timeout: 22000 };
  const revision = settings.value.revision;
  busy.value = mode;
  notice.value = '';
  error.value = '';
  try {
    const response = mode === 'save'
      ? await http.put<BoardSetupSettings>(path + '/ph-calibration', {
        revision, calibration: Object.fromEntries(fields.map(({ key }) => [key, draft[key] === '' ? null : Number(draft[key])])),
      }, options)
      : await http.post<BoardSetupSettings>(path + '/ph-calibration/clear', { revision }, options);
    if (controller.signal.aborted) return;
    settings.value = response.data;
    notice.value = mode === 'clear' ? 'pH calibration cleared on the board.' : 'pH coefficients verified on the board.';
  } catch (issue) {
    if (controller.signal.aborted) return;
    const response = isAxiosError<{ message?: string }>(issue) ? issue.response : undefined;
    error.value = response?.data?.message ?? 'The change could not be verified. Read the settings before saving again.';
    if (response?.status !== 400) settings.value = null;
    if (response?.status === 409 && error.value === 'Board settings changed. Read them again before saving.') {
      const current = await http.get<BoardSetupSettings>(path, options).catch(() => null);
      if (current && !controller.signal.aborted) {
        settings.value = current.data;
        error.value = 'The board settings changed. Review the values just read from the board.';
      }
    }
  } finally {
    busy.value = null;
  }
}
</script>

<style scoped lang="scss">
dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 16px; margin: 16px 0; font-size: 13px; }
dt { color: rgb(var(--v-theme-muted)); }
dd { margin: 0; }
summary { cursor: pointer; }
</style>
