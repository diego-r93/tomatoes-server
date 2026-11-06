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

    <v-alert type="info" variant="tonal" class="mb-4">
      Approval and removal will be available once the broker can enforce registration decisions.
    </v-alert>
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
              <th scope="col">PSRAM</th><th scope="col">First seen</th><th scope="col">Connection</th>
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
            </tr>
            <tr v-if="!section.boards.length && !loading">
              <td colspan="6">{{ section.empty }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </section>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';
import { formatDateTime } from '@/composables/dateTime.mjs';
import { http } from '@/services/http-common';

const boards = ref([]);
const loading = ref(false);
const error = ref('');
let controller;

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
