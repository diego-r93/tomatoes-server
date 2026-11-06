<template>
  <v-container fluid class="app-page">
    <AppPageHeader title="Devices / Registration" icon="mdi-chip" />
    <header class="app-page-heading">
      <div>
        <h1 class="app-page-title">Registration</h1>
        <p>Review factory devices and installed boards.</p>
      </div>
      <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="refresh">
        Refresh
      </v-btn>
    </header>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">
      {{ error }}
    </v-alert>
    <v-progress-linear v-if="loading" indeterminate aria-label="Loading board registration" />

    <section v-for="section in sections" :key="section.status" class="mt-6">
      <h2 class="app-section-title mb-3">{{ section.title }} · {{ section.boards.length }}</h2>
      <v-card variant="outlined">
        <v-table>
          <thead>
            <tr>
              <th scope="col">Hostname</th><th scope="col">Model</th><th scope="col">Firmware</th>
              <th scope="col">PSRAM</th><th scope="col">First seen</th><th scope="col">Connection</th><th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="board in section.boards" :key="board.host">
              <th scope="row">{{ board.host }}</th>
              <td>{{ board.model || '—' }}</td>
              <td>{{ board.fw || '—' }}</td>
              <td>{{ board.psramMB == null ? '—' : board.psramMB + ' MB' }}</td>
              <td>{{ formatDateTime(board.firstSeen, 'Browser', 'Not observed') }}</td>
              <td>{{ board.online ? 'Online' : 'Not seen' }}</td>
              <td>
                <template v-if="board.factoryAuthenticated">
                  <v-btn v-if="board.status === 'pending'" size="small" variant="text" color="primary" @click="confirm = { board, action: 'approve' }">Approve</v-btn>
                  <v-btn v-if="board.status === 'pending'" size="small" variant="text" color="error" @click="confirm = { board, action: 'reject' }">Reject</v-btn>
                  <v-btn v-else size="small" variant="text" color="error" @click="confirm = { board, action: 'remove' }">Remove</v-btn>
                </template>
                <span v-else>Factory certificate not observed</span>
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
      <v-card v-if="confirm" :title="actionLabels[confirm.action] + ' board?'">
        <v-card-text>
          <strong>{{ confirm.board.host }}</strong>
          <p v-if="confirm.action === 'approve'">This grants operational access and creates any missing outputs with empty schedules.</p>
          <p v-else>This blocks the board at the next MQTT connection. Existing pump records are kept.</p>
          <v-alert v-if="actionError" type="error" variant="tonal" class="mt-3">{{ actionError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="saving" @click="confirm = null">Cancel</v-btn>
          <v-btn :loading="saving" :color="confirm.action === 'approve' ? 'primary' : 'error'" @click="applyAction">{{ actionLabels[confirm.action] }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
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
const actionLabels = { approve: 'Approve', reject: 'Reject', remove: 'Remove' };
let controller;
watch(confirm, () => { actionError.value = ''; });

async function applyAction() {
  if (!confirm.value || saving.value) return;
  const { board, action } = confirm.value;
  saving.value = true;
  actionError.value = '';
  try {
    await http.patch('/mqtt/registry/' + encodeURIComponent(board.host), { action }, { timeout: 10000 });
    confirm.value = null;
    await refresh();
  } catch (issue) {
    actionError.value = issue.response?.data?.message || 'Could not update board registration.';
  } finally {
    saving.value = false;
  }
}

const sections = computed(() => [
  { status: 'pending', title: 'New boards', empty: 'No boards awaiting approval.' },
  { status: 'approved', title: 'Installed boards', empty: 'No installed boards.' },
].map(section => ({ ...section, boards: boards.value.filter(board => board.status === section.status) })));

async function refresh() {
  if (loading.value) return;
  controller = new AbortController();
  loading.value = true;
  error.value = '';
  try {
    const { data } = await http.get('/mqtt/registry', { signal: controller.signal, timeout: 10000 });
    boards.value = data;
  } catch (issue) {
    if (issue.code !== 'ERR_CANCELED') error.value = 'Could not load board registration. Try refreshing.';
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
onBeforeUnmount(() => controller?.abort());
</script>
