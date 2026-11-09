<template>
  <AppPageHeader :title="t('Board setup')" icon="mdi-tune-variant" />
  <v-container fluid class="app-page setup-page">
    <header class="app-page-heading">
      <div><h1>{{ t('Board setup') }}</h1><p>{{ t('Sensors, reference solutions and calibration preparation.') }}</p></div>
      <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="refresh">{{ t('Refresh') }}</v-btn>
    </header>
    <v-alert type="info" variant="tonal" class="mb-5">{{ t('Preparation only. Device calibration and parameter changes require firmware support and are not enabled yet.') }}</v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">{{ t(error) }}</v-alert>
    <div class="setup-selector">
      <v-select v-model="host" :items="boards" item-title="host" item-value="host" :label="t('Approved board')" variant="outlined" hide-details :disabled="loading || !boards.length" />
      <v-btn :to="{ path: '/device', query: host ? { device: host, panel: 'information' } : {} }" variant="text" prepend-icon="mdi-chip">{{ t('View devices') }}</v-btn>
    </div>
    <v-progress-linear :indeterminate="loading" :color="loading ? 'primary' : 'transparent'" class="my-3" :aria-label="t('Loading board setup')" />
    <p v-if="!loading && !error && !boards.length" class="setup-note">{{ t('Approve a board in Devices / Registration to see it here.') }}</p>
    <template v-if="board">
      <div class="setup-identity"><strong>{{ board.host }}</strong><span>{{ board.model || t('Not reported') }}</span><span>{{ t('Firmware') }}: {{ board.fw || t('Not reported') }}</span><v-chip size="small" variant="tonal" :color="online ? 'success' : undefined">{{ t(online ? 'Online' : 'Not seen recently') }}</v-chip></div>
      <v-tabs v-model="tab" class="mb-5" :aria-label="t('Board setup sections')">
        <v-tab v-for="item in tabs" :key="item.id" :value="item.id">{{ t(item.title) }}</v-tab>
      </v-tabs>
      <SensorsTab v-if="tab === 'sensors'" :board="board" />
      <CalibrationGuide v-else-if="tab === 'calibration'" :key="board.host" />
      <PumpChannelsTab v-else-if="tab === 'pumps'" :board="board" />
      <SetupHistory v-else />
    </template>
  </v-container>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLanguage } from '@/composables/useLanguage';
import { useBoardSetupInventory } from '@/composables/useBoardSetupInventory';
import { isResponding } from '@/composables/deviceInventoryUtils';
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';
import SensorsTab from './SensorsTab.vue';
import CalibrationGuide from './CalibrationGuide.vue';
import PumpChannelsTab from './PumpChannelsTab.vue';
import SetupHistory from './SetupHistory.vue';
const { t } = useLanguage();
const route = useRoute(), router = useRouter();
const { boards, loading, error, refresh } = useBoardSetupInventory();
const host = ref(typeof route.query.host === 'string' ? route.query.host : '');
const tab = ref('sensors');
const tabs = [{ id: 'sensors', title: 'Sensors' }, { id: 'calibration', title: 'Calibration' }, { id: 'pumps', title: 'Pump channels' }, { id: 'history', title: 'History' }];
const board = computed(() => boards.value.find(item => item.host === host.value));
const online = computed(() => {
  const report = board.value?.report;
  return isResponding(report && { responded: report.online !== false, receivedAt: report.receivedAt ?? null });
});
watch(boards, list => { if (!list.some(item => item.host === host.value)) host.value = list[0]?.host || ''; });
watch(host, value => { tab.value = 'sensors'; router.replace({ query: { ...route.query, host: value || undefined } }); });
watch(() => route.query.host, value => { if (typeof value === 'string') host.value = value; });
</script>
<style scoped lang="scss">
.setup-page h1{font-size:26px;font-weight:500}.setup-selector{display:flex;align-items:center;gap:16px;max-width:760px}.setup-selector .v-select{min-width:0}.setup-identity{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:8px 0 20px}.setup-identity span,.setup-note{color:rgb(var(--v-theme-muted));font-size:13px}.setup-identity strong{overflow-wrap:anywhere}.setup-page :deep(.setup-grid){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.setup-page :deep(.setup-panel){padding:22px;border:1px solid rgb(var(--v-theme-border));border-radius:4px;background:rgb(var(--v-theme-surface))}.setup-page :deep(h2){font-size:18px;font-weight:500;margin-bottom:12px}.setup-page :deep(h3){font-size:14px;font-weight:500;margin-bottom:8px}.setup-page :deep(p){line-height:1.7}.setup-page :deep(.setup-muted){color:rgb(var(--v-theme-muted));font-size:13px}.setup-page :deep(.setup-list){padding-inline-start:20px;line-height:1.8}.setup-page :deep(.setup-list li){margin-bottom:10px}@media(max-width:750px){.setup-page :deep(.setup-grid){grid-template-columns:1fr}.setup-selector{align-items:stretch;flex-direction:column}.setup-identity{gap:10px}}
</style>
