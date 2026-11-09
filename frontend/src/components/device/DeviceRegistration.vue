<template>
  <v-container fluid class="app-page">
    <AppPageHeader :title="t('Devices / Registration')" icon="mdi-chip" />
    <header class="app-page-heading">
      <div>
        <h1 class="app-page-title">{{ t('Registration') }}</h1>
        <p>{{ t('Review factory devices and installed boards.') }}</p>
      </div>
      <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="refresh"> {{ t('Refresh') }} </v-btn>
    </header>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">
      {{ t(error) }}
    </v-alert>
    <v-progress-linear v-if="loading" indeterminate :aria-label="t('Loading board registration')" />

    <section v-for="section in sections" :key="section.status" class="mt-6">
      <h2 class="app-section-title mb-3">{{ section.title }} · {{ section.boards.length }}</h2>
      <v-card variant="outlined" class="registration-panel">
        <v-table>
          <thead>
            <tr>
              <th scope="col">{{ t('Hostname') }}</th><th scope="col">{{ t('Model') }}</th><th scope="col">{{ t('Firmware') }}</th>
              <th scope="col">PSRAM</th><th scope="col">{{ t('First seen') }}</th><th scope="col">{{ t('Connection') }}</th><th scope="col">{{ t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="board in section.boards" :key="board.host" class="registration-row">
              <th scope="row">{{ board.host }}</th>
              <td>
                <span class="registration-label" aria-hidden="true">{{ t('Model') }}</span>
                {{ board.model || '—' }}
              </td>
              <td>
                <span class="registration-label" aria-hidden="true">{{ t('Firmware') }}</span>
                {{ board.fw || '—' }}
              </td>
              <td>
                <span class="registration-label" aria-hidden="true">PSRAM</span>
                {{ board.psramMB == null ? '—' : board.psramMB + ' MB' }}
              </td>
              <td>
                <span class="registration-label" aria-hidden="true">{{ t('First seen') }}</span>
                {{ formatDateTime(board.firstSeen, 'Browser', t('Not observed')) }}
              </td>
              <td>
                <span class="registration-label" aria-hidden="true">{{ t('Connection') }}</span>
                {{ connectionLabel(board) }}
              </td>
              <td class="registration-actions">
                <v-btn v-if="board.status === 'removed'" size="small" variant="text" color="primary" @click="confirm = { board, action: 'restore' }">{{ t('Restore to pending') }}</v-btn>
                <template v-else-if="board.factoryAuthenticated">
                  <v-btn v-if="board.status === 'pending'" size="small" variant="text" color="primary" @click="confirm = { board, action: 'approve' }">{{ t('Approve') }}</v-btn>
                  <v-btn v-if="board.status === 'pending'" size="small" variant="text" color="error" @click="confirm = { board, action: 'reject' }">{{ t('Reject') }}</v-btn>
                  <v-btn v-else size="small" variant="text" color="error" @click="confirm = { board, action: 'remove' }">{{ t('Remove') }}</v-btn>
                </template>
                <span v-else-if="!waitingForReconnect(board)">{{ t('Factory certificate not observed') }}</span>
              </td>
            </tr>
            <tr v-if="!section.boards.length && !loading">
              <td colspan="7">{{ section.empty }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </section>
    <v-dialog :model-value="Boolean(confirm)" :persistent="saving" max-width="480" @update:model-value="!$event && (confirm = null)">
      <v-card v-if="confirm" :title="t(actionLabels[confirm.action] + ' board?')">
        <v-card-text>
          <strong>{{ confirm.board.host }}</strong>
          <p v-if="confirm.action === 'approve'">{{ t('This grants operational access and creates any missing outputs with empty schedules.') }}</p>
          <p v-else-if="confirm.action === 'restore'">{{ t('The board can connect with its factory certificate and will need approval again. Existing pump records are kept.') }}</p>
          <p v-else>{{ t('The board is disconnected immediately and future MQTT connections are refused. Existing pump records are kept.') }}</p>
          <v-alert v-if="actionError" type="error" variant="tonal" class="mt-3">{{ t(actionError) }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="saving" @click="confirm = null">{{ t('Cancel') }}</v-btn>
          <v-btn :loading="saving" :color="['approve', 'restore'].includes(confirm.action) ? 'primary' : 'error'" @click="applyAction">{{ t(actionLabels[confirm.action]) }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { useLanguage } from '@/composables/useLanguage';
const { t } = useLanguage();

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';
import { formatDateTime } from '@/composables/dateTime.mjs';
import { http } from '@/services/http-common';

const boards = ref([]);
const loading = ref(false);
const error = ref('');
const confirm = ref(null);
const saving = ref(false);
const actionError = ref('');
const actionLabels = { approve: 'Approve', reject: 'Reject', remove: 'Remove', restore: 'Restore' };
const reconnectWaitMs = 120_000;
const now = ref(Date.now());
let controller;
let reconnectTimer;
let disposed = false;
watch(confirm, () => { actionError.value = ''; });

async function applyAction() {
  if (!confirm.value || saving.value) return;
  const { board, action } = confirm.value;
  saving.value = true;
  actionError.value = '';
  try {
    await http.patch('/mqtt/registry/' + encodeURIComponent(board.host), { action }, { timeout: 10000 });
    confirm.value = null;
    await refresh(true);
  } catch (issue) {
    actionError.value = issue.response?.data?.message || 'Could not update board registration.';
  } finally {
    saving.value = false;
  }
}

const sections = computed(() => [
  { status: 'pending', title: t('New boards'), empty: t('No boards awaiting approval.') },
  { status: 'approved', title: t('Installed boards'), empty: t('No installed boards.') },
  { status: 'removed', title: t('Removed boards'), empty: t('No removed boards.') },
].map(section => ({ ...section, boards: boards.value.filter(board => board.status === section.status) })));

function waitingForReconnect(board) {
  const since = board.status === 'pending' ? board.restoredAt : board.approvedAt;
  return board.status !== 'removed' && !board.online && since
    && now.value - Date.parse(since) < reconnectWaitMs;
}

function connectionLabel(board) {
  if (board.status === 'removed') return t('Blocked');
  if (board.online) return t('Online');
  return waitingForReconnect(board) ? t('Waiting for the board to reconnect (up to 2 min)') : t('Not seen');
}

async function refresh(force = false) {
  if (disposed || (loading.value && force !== true)) return;
  controller?.abort();
  const request = new AbortController();
  controller = request;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await http.get('/mqtt/registry', { signal: request.signal, timeout: 10000 });
    if (controller === request && !request.signal.aborted) {
      now.value = Date.now();
      boards.value = data;
    }
  } catch (issue) {
    if (controller === request && !request.signal.aborted && issue.code !== 'ERR_CANCELED') error.value = 'Could not load board registration. Try refreshing.';
  } finally {
    if (controller === request) loading.value = false;
  }
}

onMounted(() => {
  refresh();
  reconnectTimer = setInterval(() => {
    const wasWaiting = boards.value.some(waitingForReconnect);
    now.value = Date.now();
    if (wasWaiting && !saving.value) refresh();
  }, 5000);
});
onBeforeUnmount(() => {
  disposed = true;
  clearInterval(reconnectTimer);
  controller?.abort();
});
</script>

<style scoped lang="scss">
.registration-panel { border-color: rgb(var(--v-theme-border)); }
.registration-label { display: none; }

@media (max-width: 900px) {
  .registration-panel :deep(table),
  .registration-panel :deep(tbody) { display: block; }

  .registration-panel :deep(thead) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .registration-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 16px;
    padding: 16px;
  }

  .registration-row + .registration-row { border-top: 1px solid rgb(var(--v-theme-border)); }

  .registration-panel .registration-row > * {
    display: block;
    height: auto;
    padding: 0;
    border: 0;
    overflow-wrap: anywhere;
  }

  .registration-row > th,
  .registration-actions { grid-column: 1 / -1; }

  .registration-label {
    display: block;
    color: rgb(var(--v-theme-muted));
    font-size: 12px;
    margin-bottom: 2px;
  }
}
</style>
