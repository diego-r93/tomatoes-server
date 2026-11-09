<template>
  <v-dialog :model-value="true" max-width="960" scrollable :aria-label="t('Pulse history')" @update:model-value="!$event && $emit('close')">
    <v-card>
      <v-card-title>{{ t('Pulse history') }} · {{ host }}</v-card-title>
      <v-card-text>
        <form class="history-filters" @submit.prevent="applyFilters">
          <v-text-field v-model="from" type="date" :label="t('From')" hide-details required />
          <v-text-field v-model="to" type="date" :label="t('To')" hide-details required />
          <v-select v-model="pump" :items="pumpOptions" :label="t('Pump')" hide-details />
          <v-select v-model="result" :items="resultOptions" :label="t('Result')" hide-details />
          <v-btn type="submit" color="primary" :loading="loading">{{ t('Apply filters') }}</v-btn>
        </form>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ t(error) }}</v-alert>
        <v-alert v-if="!imported && !error" type="info" variant="tonal" class="mb-3">
          {{ t('Older pulse records are still being imported.') }}
        </v-alert>
        <v-table density="compact">
          <thead>
            <tr>
              <th scope="col">{{ t('Pulse time') }}</th>
              <th scope="col">{{ t('Pump') }}</th>
              <th scope="col">{{ t('Result') }}</th>
              <th scope="col">{{ t('End') }}</th>
              <th scope="col">{{ t('Record origin') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in records" :key="row._id">
              <td>{{ formatDateTime(row.startAt ?? row.expectedAt ?? row.endAt) }}</td>
              <td>#{{ row.pump }}</td>
              <td :class="{ 'text-error': driverProblem(row.result) }">{{ t(driverMessage(row.result)) }}</td>
              <td>{{ row.endAt ? formatDateTime(row.endAt) : '—' }}</td>
              <td>{{ t(row.origin === 'reconstructed' ? 'Reconstructed' : 'Recorded') }}</td>
            </tr>
            <tr v-if="!loading && !records.length">
              <td colspan="5">{{ t('No pulses match this period.') }}</td>
            </tr>
          </tbody>
        </v-table>
        <div class="history-pages">
          <v-btn variant="text" icon="mdi-chevron-left" :aria-label="t('Previous page')" :disabled="loading || page === 1" @click="load(page - 1)" />
          <span>{{ page }}</span>
          <v-btn variant="text" icon="mdi-chevron-right" :aria-label="t('Next page')" :disabled="loading || !hasNext" @click="load(page + 1)" />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn prepend-icon="mdi-download" color="primary" :disabled="!applied || loading" :loading="downloading" @click="download">{{ t('Download CSV') }}</v-btn>
        <v-spacer />
        <v-btn @click="$emit('close')">{{ t('Close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { http } from '@/services/http-common';
import { useLanguage } from '@/composables/useLanguage';
import { formatDateTime } from '@/composables/dateTime.mjs';
import { driverMessage, driverProblem } from '@/composables/pumpDriverFeedback.mjs';
import { downloadFile } from '@/composables/panelInspection.mjs';

const props = defineProps({ host: { type: String, required: true } });
defineEmits(['close']);
const { t } = useLanguage();

function localDay(date) {
  const pad = value => String(value).padStart(2, '0');
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
}

const today = new Date();
const weekStart = new Date(today);
weekStart.setDate(today.getDate() - 6);
const from = ref(localDay(weekStart)), to = ref(localDay(today));
const pump = ref(''), result = ref('');
const pumpOptions = computed(() => [{ title: t('All pumps'), value: '' }, ...['01', '02', '03', '04'].map(value => ({ title: '#' + value, value }))]);
const results = ['actuated', 'not-actuated', 'missing', 'incomplete', 'supply-missing', 'supply-low', 'short', 'temperature'];
const resultOptions = computed(() => [{ title: t('All results'), value: '' }, ...results.map(value => ({ title: t(driverMessage(value)), value }))]);
const applied = ref(null), records = ref([]), page = ref(1), hasNext = ref(false);
const imported = ref(true);
const error = ref(''), loading = ref(false), downloading = ref(false);
const path = () => '/mqtt/pump-history/' + encodeURIComponent(props.host);

function applyFilters() {
  if (loading.value) return;
  const start = new Date(from.value + 'T00:00:00');
  const end = new Date(to.value + 'T00:00:00');
  end.setDate(end.getDate() + 1);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start >= end) {
    error.value = 'Choose a valid date range.';
    return;
  }
  applied.value = { from: start.toISOString(), to: end.toISOString(), pump: pump.value || undefined, result: result.value || undefined };
  records.value = [];
  hasNext.value = false;
  void load(1);
}

async function load(nextPage) {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await http.get(path(), { params: { ...applied.value, page: nextPage } });
    records.value = data.records;
    imported.value = data.imported;
    hasNext.value = data.hasNext;
    page.value = nextPage;
  } catch {
    error.value = 'Could not load pulse history. Try again.';
  } finally {
    loading.value = false;
  }
}

async function download() {
  if (!applied.value || loading.value || downloading.value) return;
  downloading.value = true;
  error.value = '';
  try {
    const { data } = await http.get(path(), { params: { ...applied.value, format: 'csv' }, responseType: 'blob', timeout: 120000 });
    downloadFile(data, props.host + '-pump-history.csv', 'text/csv;charset=utf-8');
  } catch {
    error.value = 'Could not download pulse history. Try again.';
  } finally {
    downloading.value = false;
  }
}

onMounted(applyFilters);
</script>

<style scoped>
.history-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.history-filters > .v-btn { grid-column: 1 / -1; justify-self: start; }
.history-pages { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
@media (max-width: 500px) { .history-filters { grid-template-columns: minmax(0, 1fr); } }
</style>
