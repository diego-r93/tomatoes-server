<template>

  <v-container fluid class="devices-page app-page">

    <AppPageHeader :title="t('Devices / List')" icon="mdi-chip"><template #actions><v-btn variant="outlined" size="small" icon rounded="sm" :aria-label="t('Device display settings')" @click="settingsOpen = true"><v-icon icon="mdi-cog-outline" /><v-tooltip activator="parent">{{ t('Display settings') }}</v-tooltip></v-btn><v-btn variant="outlined" size="small" icon rounded="sm" :aria-label="t('Refresh devices')" :loading="loading" :disabled="loading || sending" @click="refresh"><v-icon icon="mdi-sync" /><v-tooltip activator="parent">{{ t('Refresh devices') }}</v-tooltip></v-btn></template></AppPageHeader>

    <header class="app-page-heading"><div><h1 class="app-page-title">{{ t('Devices') }}</h1><p>{{ t('Your controllers, connections and outputs in one place.') }}</p></div><span v-if="hasLoaded" class="inventory-count">{{ t(devices.length === 1 ? '{count} known device' : '{count} known devices', { count: devices.length }) }}</span></header>

    <v-snackbar :model-value="Boolean(notice)" class="device-command-notice" location="top center" :timeout="8000" color="secondary" :max-width="560" role="status" @update:model-value="!$event && (notice = '')">
      <template #prepend><v-icon icon="mdi-information-outline" /></template>
      {{ t(notice, noticeParameters) }}
      <template #actions><v-btn variant="text" icon="mdi-close" :aria-label="t('Close')" @click="notice = ''" /></template>
    </v-snackbar>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">{{ t(error) }}<template #append><v-btn variant="text" :disabled="loading" @click="refresh">{{ t('Retry') }}</v-btn></template></v-alert>

    <div v-if="initialLoading" class="app-loading-state" role="status"><v-progress-circular :size="52" :width="4" indeterminate color="secondary" /><h2 class="app-section-title">{{ t('Loading devices…') }}</h2><p>{{ t('Waiting for device responses.') }}</p></div>

    <template v-else>

      <div class="devices-tools"><v-text-field v-model="query" :label="t('Search devices')" :placeholder="t('Hostname, IP or MAC address')" prepend-inner-icon="mdi-magnify" clearable hide-details /><v-select v-model="settings.sort" :label="t('Sort by')" :items="sortOptions" hide-details /><v-select v-model="settings.pageSize" :label="t('Per page')" :items="[8, 16, 32]" hide-details /></div>

      <div class="connection-filters" role="group" :aria-label="t('Filter devices')"><v-btn v-for="option in filters" :key="option.value" size="small" :variant="filter === option.value ? 'tonal' : 'text'" :color="filter === option.value ? 'primary' : undefined" :aria-pressed="filter === option.value" @click="filter = option.value">{{ option.title }}<span class="filter-count">{{ counts[option.value] }}</span></v-btn></div>

      <div class="inventory-meta"><span aria-live="polite">{{ t(filtered.length === 1 ? '{count} device in this view' : '{count} devices in this view', { count: filtered.length }) }}</span><span>{{ lastRefresh ? t('Last refreshed {time}', { time: lastSeenLabel(lastRefresh, clock, t) }) : t('Not refreshed yet') }}{{ settings.refreshSeconds ? ' · ' + t('Auto-refresh {seconds}s', { seconds: settings.refreshSeconds }) : ' · ' + t('Auto-refresh off') }}</span></div>

      <div class="inventory-progress"><v-progress-linear :style="{ visibility: loading ? 'visible' : 'hidden' }" :active="loading" indeterminate color="secondary" :aria-hidden="!loading" :aria-label="t('Refreshing devices')" /></div>

      <div class="device-inventory" :class="{ 'device-inventory--details': selectedDevice }">

        <div class="inventory-results">

          <div v-if="!filtered.length" class="app-empty-state app-panel"><v-icon :icon="devices.length ? 'mdi-magnify' : 'mdi-chip'" size="26" color="muted" /><h2 class="app-section-title">{{ devices.length ? t('No matching devices') : error ? t('Device discovery unavailable') : t('No devices found') }}</h2><p>{{ devices.length ? t('Try another hostname, address or connection filter.') : t('Check that your ESP32 boards are powered on and connected to the MQTT broker.') }}</p><v-btn v-if="devices.length" variant="text" @click="clearSearch">{{ t('Clear search and filters') }}</v-btn><v-btn v-else :disabled="loading" variant="text" @click="refresh">{{ t('Refresh devices') }}</v-btn></div>

          <template v-else>

            <v-card v-if="settings.layout === 'details'" variant="outlined" class="device-table-card" :style="{ minHeight: `${42 + capacity * 64}px` }"><v-table class="device-table"><thead><tr><th>{{ t('Device') }}</th><th>{{ t('Connection') }}</th><th class="network-column">{{ t('Network') }}</th><th class="outputs-column">{{ t('Outputs') }}</th><th>{{ t('Details') }}</th></tr></thead><tbody><tr v-for="device in paged" :key="device.key" :class="{ 'selected-row': selectedKey === device.key }"><td class="device-identity"><button type="button" class="device-name" @click="selectDevice(device.key, $event)">{{ device.host }}</button><small v-if="settings.showMac">{{ device.mac || t('No MAC reported') }}</small></td><td><span class="connection-status" :class="{ 'connection-status--online': responding(device) }">{{ responding(device) ? t('Online') : t('Not seen') }}</span><small>{{ lastSeenLabel(device.receivedAt, clock, t) }}</small></td><td class="network-column"><span class="signal-reading" :class="{ 'text-warning': responding(device) && weakSignal(device) }"><v-icon icon="mdi-wifi" size="15" /> {{ responding(device) ? t(signalText(device)) : '—' }}</span><small>{{ device.ip || t('No IP reported') }}</small></td><td class="outputs-column">{{ responding(device) ? `${device.outputs.filter(output => output.state === true).length} / ${device.outputs.length} ON` : t('Last state') }}</td><td><v-btn variant="text" size="small" @click="selectDevice(device.key, $event)">{{ t('View') }}</v-btn></td></tr></tbody></v-table></v-card>

            <div v-else class="device-cards"><DeviceCard v-for="device in paged" :key="device.key" :device="device" :online="responding(device)" :selected="selectedKey === device.key" :clock="clock" :show-mac="settings.showMac" @select="selectDevice" /><div v-for="slot in capacity - paged.length" :key="`slot-${slot}`" class="device-card-placeholder" aria-hidden="true" /></div>

            <nav class="inventory-pagination" :aria-label="t('Device list pages')"><span>{{ t('{start}–{end} of {count} devices', { start: (page - 1) * settings.pageSize + 1, end: Math.min(page * settings.pageSize, filtered.length), count: filtered.length }) }}</span><v-pagination v-model="page" :length="pageCount" :total-visible="5" rounded="sm" active-color="primary" :aria-label="t('Device pages')" /></nav>

          </template>

        </div>

        <DeviceDetails v-if="selectedDevice" ref="detailsPanel" :device="selectedDevice" :online="responding(selectedDevice)" :clock="clock" :pending="pending" :sending="sending" :all-off-pending="Boolean(pendingAll[selectedDevice.key])" @all-off="openCommand" :can-update-firmware="canManage" @close="closeDeviceDetails" @change="openCommand" @information="openInformation" @firmware="openFirmware" />

      </div>

    <v-alert v-if="feedbackError" type="warning" variant="tonal" class="mt-4">{{ t('Driver feedback updates are unavailable. Last observations are shown.') }}</v-alert>
    <v-alert v-if="pumpIssues.length" type="warning" variant="tonal" class="mt-4" role="status">
      <strong>{{ t('Pump driver needs attention') }}</strong>
      <div v-for="issue in pumpIssues" :key="issue.code"><v-btn variant="text" size="small" @click="selectDevice(issue.deviceKey, $event)">{{ issue.host }} #{{ issue.pump }}</v-btn> {{ t(driverMessage(issue.result)) }}</div>
    </v-alert>
      <footer class="devices-footer"><span>Tomatoes v1.0.0</span><span>{{ t('Online: replied within 90 seconds · Not seen: no recent reply') }}</span></footer>

    </template>

    <v-dialog :model-value="overlayKind === 'information'" max-width="680" :aria-label="t('Device information')" @update:model-value="!$event && closeOverlay()"><v-card :title="t('Device information')"><v-card-text><DeviceInformation v-if="overlayDevice" :device="overlayDevice" :online="responding(overlayDevice)" :clock="clock" /><div v-else class="overlay-unavailable"><v-progress-circular v-if="loading" indeterminate color="secondary" /><p>{{ loading ? t('Waiting for the device to respond…') : t('This device is not available in the current discovery results.') }}</p><v-btn v-if="!loading" variant="text" @click="refresh">{{ t('Refresh devices') }}</v-btn></div></v-card-text><v-card-actions><v-spacer /><v-btn color="primary" @click="closeOverlay">{{ t('Close') }}</v-btn></v-card-actions></v-card></v-dialog>

    <v-dialog :model-value="overlayKind === 'firmware'" :persistent="firmwareBusy" max-width="760" :aria-label="t('Firmware update')" @update:model-value="!$event && closeOverlay()"><v-card><v-card-title class="firmware-dialog-title"><span>{{ t('Firmware update') }}</span><v-btn icon="mdi-close" size="small" variant="text" :disabled="firmwareBusy" :aria-label="t('Close firmware update')" @click="closeOverlay" /></v-card-title><v-card-text><FirmwareUpload v-if="firmwareTarget && firmwareDevice && overlayKind === 'firmware'" :key="firmwareTarget.host" :device="firmwareDevice" :online="Boolean(liveOverlayDevice?.ip && responding(liveOverlayDevice))" :refreshing="loading" :clock="clock" @busy="firmwareBusy = $event" @refresh="refresh" /><div v-else class="overlay-unavailable"><v-progress-circular v-if="loading" indeterminate color="secondary" /><p>{{ loading ? t('Waiting for the device to respond…') : t('Select a responding device to upload an image.') }}</p><v-btn v-if="!loading" variant="text" @click="refresh">{{ t('Refresh devices') }}</v-btn></div></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="firmwareBusy" @click="closeOverlay">{{ t('Close') }}</v-btn></v-card-actions></v-card></v-dialog>

    <v-dialog v-model="settingsOpen" max-width="480"><v-card :title="t('Device display settings')"><v-card-text><v-select v-model="settings.layout" :label="t('Layout')" :items="layoutOptions" /><v-select v-model="settings.refreshSeconds" :label="t('Auto-refresh')" :items="refreshOptions" /><v-switch v-model="settings.showMac" :label="t('Show MAC addresses')" color="primary" hide-details /><p class="settings-note">{{ t('Preferences are saved in this browser. Connection status is based on discovery responses, not a continuous heartbeat. A refresh failure keeps the last known data.') }}</p></v-card-text><v-card-actions><v-spacer /><v-btn color="primary" @click="settingsOpen = false">{{ t('Done') }}</v-btn></v-card-actions></v-card></v-dialog>

    <v-dialog v-model="commandOpen" max-width="480" persistent><v-card :title="allOffCommand ? t('Turn all outputs off?') : t('Confirm manual output')"><v-card-text><p v-if="allOffCommand">{{ t('Turn off every reported output on') }} <strong>{{ allOffCommand.host }}</strong>?</p><p v-else>{{ t('Set') }} <strong>{{ command?.host }} · GPIO {{ outputCommand?.gpio }}</strong> {{ t('to') }} <strong>{{ outputCommand?.target ? 'ON' : 'OFF' }}</strong>?</p><p class="settings-note">{{ t('This sends a real manual command to the ESP32. The displayed state changes only when the device reports it.') }}</p><v-alert v-if="commandError" type="error" variant="tonal" class="mt-4">{{ t(commandError) }}</v-alert></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="sending" @click="commandOpen = false">{{ t('Cancel') }}</v-btn><v-btn color="primary" :disabled="sending" :loading="sending" @click="confirmCommand">{{ allOffCommand ? t('Confirm all OFF') : outputCommand?.target ? t('Confirm ON') : t('Confirm OFF') }}</v-btn></v-card-actions></v-card></v-dialog>

  </v-container>

</template>

<script setup lang="ts">
import { isAxiosError } from 'axios';
import type { DiscoveredDevice } from '@/composables/deviceInventoryUtils';
import type { OutputCommandDraft } from '@/composables/deviceOutputCommands';
import { driverIssues, driverMessage } from '@/composables/pumpDriverFeedback.mjs';
import { useLanguage } from '@/composables/useLanguage';
const { t } = useLanguage();

import Authentication from '@/services/auth';
const canManage = Boolean(Authentication.currentUser?.isAdmin);
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';

import { computed, nextTick, reactive, ref, watch } from 'vue';

import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import DeviceCard from './DeviceCard.vue';

import DeviceDetails from './DeviceDetails.vue';

import DeviceInformation from './DeviceInformation.vue';

import FirmwareUpload from './FirmwareUpload.vue';

import { useDeviceInventory } from '@/composables/useDeviceInventory';

import { isResponding, lastSeenLabel, signalText, weakSignal } from '@/composables/deviceInventoryUtils';

import { useDeviceStore } from '@/store/deviceData';

const router = useRouter(), route = useRoute(), deviceStore = useDeviceStore();

const { devices, feedbackError, loading, initialLoading, hasLoaded, error, notice, noticeParameters, clock, lastRefresh, pending, pendingAll, sending, refresh, setRefreshInterval, sendOutput, sendAllOff } = useDeviceInventory();

const pumpIssues = computed(() => driverIssues(devices.value));

const query = ref<string | null>(''), filter = ref<DeviceFilter>('all'), page = ref(1), selectedKey = ref(''), settingsOpen = ref(false), commandOpen = ref(false), commandError = ref('');

type DeviceFilter = 'all' | 'online' | 'unseen' | 'weak';
const command = ref<OutputCommandDraft | null>(null);
const allOffCommand = computed(() => command.value && 'allOff' in command.value ? command.value : null);
const outputCommand = computed(() => command.value && 'gpio' in command.value ? command.value : null);

const preferenceKey = 'tomatoes.devices.preferences.v1';
let stored: Record<string, unknown> = {};
try {
  const parsed: unknown = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
  if (parsed && typeof parsed === 'object') stored = Object.fromEntries(Object.entries(parsed));
} catch { /* Use defaults when preferences are unavailable. */ }

function preference<T>(key: string, allowed: readonly T[], fallback: T): T {
  return allowed.find(value => value === stored[key]) ?? fallback;
}

const settings = reactive({
  layout: preference('layout', ['details', 'cards'] as const, 'details'),
  sort: preference('sort', ['host', 'signal', 'status'] as const, 'host'),
  pageSize: preference('pageSize', [8, 16, 32] as const, 8),
  showMac: preference('showMac', [false, true], false),
  refreshSeconds: preference('refreshSeconds', [0, 15, 30, 60] as const, 30),
});

watch(settings, value => { try { localStorage.setItem(preferenceKey, JSON.stringify(value)); } catch { /* Display preferences still work in memory. */ } }, { deep: true });



const responding = (device: DiscoveredDevice | null | undefined) => isResponding(device, clock.value);

const filters = computed<{ title: string; value: DeviceFilter }[]>(() => [{ title: t('All devices'), value: 'all' }, { title: t('Online'), value: 'online' }, { title: t('Not seen'), value: 'unseen' }, { title: t('Weak signal'), value: 'weak' }]);

const sortOptions = computed(() => [{ title: t('Hostname'), value: 'host' }, { title: t('Strongest signal'), value: 'signal' }, { title: t('Online first'), value: 'status' }]);

const layoutOptions = computed(() => [{ title: t('List and details'), value: 'details' }, { title: t('Compact cards'), value: 'cards' }]);

const refreshOptions = computed(() => [{ title: t('Off'), value: 0 }, { title: t('Every 15 seconds'), value: 15 }, { title: t('Every 30 seconds'), value: 30 }, { title: t('Every minute'), value: 60 }]);

const counts = computed(() => ({ all: devices.value.length, online: devices.value.filter(responding).length, unseen: devices.value.filter(device => !responding(device)).length, weak: devices.value.filter(device => responding(device) && weakSignal(device)).length }));

const filtered = computed(() => {

  const term = (query.value || '').trim().toLowerCase();

  return devices.value.filter(device => `${device.host} ${device.ip} ${device.mac}`.toLowerCase().includes(term) && (filter.value === 'all' || filter.value === 'online' && responding(device) || filter.value === 'unseen' && !responding(device) || filter.value === 'weak' && responding(device) && weakSignal(device))).sort((a, b) => settings.sort === 'signal' ? (b.rssi ?? -Infinity) - (a.rssi ?? -Infinity) || a.host.localeCompare(b.host) : settings.sort === 'status' ? Number(responding(b)) - Number(responding(a)) || a.host.localeCompare(b.host) : a.host.localeCompare(b.host));

});

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / settings.pageSize)));

const paged = computed(() => filtered.value.slice((page.value - 1) * settings.pageSize, page.value * settings.pageSize));

const capacity = computed(() => Math.min(settings.pageSize, filtered.value.length));

const selectedDevice = computed(() => devices.value.find(device => device.key === selectedKey.value));
const detailsPanel = ref<InstanceType<typeof DeviceDetails> | null>(null);

let detailsActivator: HTMLElement | null = null;

async function selectDevice(key: string, event: MouseEvent) {
  detailsActivator = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  selectedKey.value = key;
  await nextTick();
  detailsPanel.value?.focusHeading();
}

function closeDeviceDetails() {
  selectedKey.value = '';
  detailsActivator?.focus();
  detailsActivator = null;
}


watch([query, filter, () => settings.pageSize, () => settings.sort], () => { page.value = 1; });

watch(pageCount, count => { page.value = Math.min(page.value, count); });

watch(filtered, list => { if (selectedKey.value && !list.some(device => device.key === selectedKey.value)) selectedKey.value = ''; });

function clearSearch() { query.value = ''; filter.value = 'all'; }

function openCommand(draft: OutputCommandDraft) { command.value = draft; commandError.value = ''; commandOpen.value = true; }

async function confirmCommand() {
  const draft = command.value;
  if (!draft || sending.value) return;
  commandError.value = '';
  try {
    if ('allOff' in draft) await sendAllOff(draft.deviceKey);
    else await sendOutput(draft.deviceKey, draft.gpio, draft.target, draft.originalState);
    commandOpen.value = false;
  } catch (issue) {
    const response = isAxiosError<{ message?: string }>(issue) ? issue.response?.data?.message : undefined;
    commandError.value = response || (issue instanceof Error ? issue.message : '') || 'The command could not be submitted.';
  }
}

const overlayKind = ref<'' | 'information' | 'firmware'>(''), overlayHost = ref(''), firmwareTarget = ref<DiscoveredDevice | null>(null), firmwareBusy = ref(false);

onBeforeRouteLeave(() => !firmwareBusy.value);

const liveOverlayDevice = computed(() => devices.value.find(device => device.host === overlayHost.value));
const firmwareDevice = computed(() => liveOverlayDevice.value || firmwareTarget.value);
watch(() => overlayKind.value === 'firmware' ? 15 : settings.refreshSeconds, setRefreshInterval, { immediate: true });
watch(overlayKind, kind => { if (kind === 'firmware') refresh(); });

const overlayDevice = computed(() => liveOverlayDevice.value || (deviceStore.deviceData?.host === overlayHost.value ? deviceStore.deviceData : null));

function openInformation(device: DiscoveredDevice) { if (firmwareBusy.value) return; deviceStore.setDeviceData(device); overlayHost.value = device.host; overlayKind.value = 'information'; }

function openFirmware(device: DiscoveredDevice) { if (!canManage || firmwareBusy.value || !responding(device) || !device.ip) return; deviceStore.setDeviceData(device); overlayHost.value = device.host; firmwareTarget.value = { ...device }; overlayKind.value = 'firmware'; }

function closeOverlay() {

  if (firmwareBusy.value) return;

  overlayKind.value = ''; firmwareTarget.value = null;

  if (route.query.panel === 'information' || route.query.panel === 'firmware') { const query = { ...route.query }; delete query.panel; delete query.device; router.replace({ path: '/device', query }); }

}



watch([() => route.query.panel, () => route.query.device, devices], ([panel, host]) => {

  if ((panel !== 'information' && panel !== 'firmware') || typeof host !== 'string' || firmwareBusy.value) return;

  if (panel === 'firmware') {
    const device = devices.value.find(item => item.host === host);
    if (device) openFirmware(device);
    return;
  }
  overlayHost.value = host; overlayKind.value = panel;

}, { immediate: true });

watch(overlayDevice, device => { if (overlayKind.value === 'firmware' && !firmwareTarget.value && device && responding(device) && device.ip) firmwareTarget.value = { ...device }; }, { immediate: true });

</script>

<style scoped lang="scss">

.firmware-dialog-title { display: flex; justify-content: space-between; align-items: center; gap: 12px; }.overlay-unavailable { min-height: 180px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; color: rgb(var(--v-theme-muted)); }

.devices-page { --app-content-width: 1600px; }
.device-command-notice :deep(.v-snackbar__wrapper) { margin-top: 64px; width: min(560px, calc(100vw - 32px)); min-width: 0; border: 1px solid rgba(var(--v-theme-on-surface), .16); }
.device-command-notice :deep(.v-snackbar__content) { overflow-wrap: anywhere; }
.inventory-progress { height: 4px; margin-bottom: 12px; }
.inventory-count { color: rgb(var(--v-theme-muted)); font-size: 12px; border: 1px solid rgb(var(--v-theme-border)); border-radius: 4px; padding: 4px 9px; }.devices-tools { display: grid; grid-template-columns: minmax(220px, 1fr) 190px 130px; gap: 12px; margin-bottom: 20px; }.connection-filters { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }.filter-count { margin-left: 8px; padding: 0 4px; border-radius: 3px; background: rgba(var(--v-theme-on-surface), .05); font-size: 12px; }.inventory-meta { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12px; color: rgb(var(--v-theme-muted)); margin-bottom: 12px; }.device-inventory { display: grid; gap: 20px; align-items: start; }.device-inventory--details { grid-template-columns: minmax(0, 5fr) minmax(380px, 7fr); }.inventory-results { min-width: 0; }.device-table-card { border-color: rgb(var(--v-theme-border)); }.device-table { background: transparent; }.device-table :deep(table) { width: 100%; table-layout: fixed; }.device-table :deep(td) { height: 64px; }.device-table :deep(th:first-child) { width: 30%; }.device-table :deep(th:nth-child(2)) { width: 17%; }.device-table :deep(th:last-child) { width: 13%; }.device-table :deep(td) { overflow-wrap: anywhere; }.device-table :deep(td small) { display: block; color: rgb(var(--v-theme-muted)); font-size: 12px; margin-top: 4px; }.device-name { border: 0; padding: 0; text-align: left; color: inherit; background: transparent; font-weight: 500; overflow-wrap: anywhere; }.device-name:hover { text-decoration: underline; }.selected-row { background: rgb(var(--v-theme-selection)); }.connection-status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: rgb(var(--v-theme-muted)); white-space: nowrap; }.connection-status:before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }.connection-status--online { color: rgb(var(--v-theme-success)); }.signal-reading { white-space: nowrap; font-size: 12px; }.device-inventory--details .network-column, .device-inventory--details .outputs-column { display: none; }.device-inventory--details .device-table :deep(th:first-child) { width: 48%; }.device-inventory--details .device-table :deep(th:nth-child(2)) { width: 30%; }.device-inventory--details .device-table :deep(th:last-child) { width: 22%; }

.device-cards { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }.device-inventory--details .device-cards { grid-template-columns: repeat(2,minmax(0,1fr)); }.device-card-placeholder { min-height: 184px; }.inventory-pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; color: rgb(var(--v-theme-muted)); font-size: 12px; }.devices-footer { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12px; color: rgb(var(--v-theme-muted)); margin-top: 24px; }.settings-note { color: rgb(var(--v-theme-muted)); font-size: 12px; margin-top: 14px; }

@media (min-width: 1700px) {
  .device-inventory--details .network-column,
  .device-inventory--details .outputs-column { display: table-cell; }
  .device-inventory--details .device-table :deep(th:first-child) { width: 30%; }
  .device-inventory--details .device-table :deep(th:nth-child(2)) { width: 17%; }
  .device-inventory--details .device-table :deep(th:last-child) { width: 13%; }
}

@media(max-width:1100px) { .device-inventory--details { grid-template-columns: minmax(0,1fr); }.device-inventory--details>:last-child { grid-row: 1; }.device-inventory--details .device-cards { grid-template-columns: repeat(3,minmax(0,1fr)); }.device-inventory--details .network-column,.device-inventory--details .outputs-column { display: table-cell; }.device-inventory--details .device-table :deep(th:first-child) { width: 30%; }.device-inventory--details .device-table :deep(th:nth-child(2)) { width: 17%; }.device-inventory--details .device-table :deep(th:last-child) { width: 13%; } }

@media(max-width:700px) { .devices-tools { grid-template-columns: 1fr 1fr; }.devices-tools>:first-child { grid-column: 1 / -1; }.device-cards,.device-inventory--details .device-cards { grid-template-columns: repeat(2,minmax(0,1fr)); }.network-column,.outputs-column,.device-inventory--details .network-column,.device-inventory--details .outputs-column { display: none; }.device-table :deep(th:first-child),.device-inventory--details .device-table :deep(th:first-child) { width: 46%; }.device-table :deep(th:nth-child(2)),.device-inventory--details .device-table :deep(th:nth-child(2)) { width: 31%; }.device-table :deep(th:last-child),.device-inventory--details .device-table :deep(th:last-child) { width: 23%; }.device-table :deep(td) { font-size: 12px; }.device-table :deep(td .v-btn) { min-width: 40px; padding-inline: 5px; }.inventory-pagination { justify-content: center; }.device-identity small { display: none!important; } }

@media(max-width:450px) { .device-cards,.device-inventory--details .device-cards { grid-template-columns: minmax(0,1fr); }.device-table :deep(td),.device-table :deep(th) { padding-inline: 6px; }.connection-status { gap: 4px; }.device-table :deep(td small) { font-size: 11px; }.devices-footer { font-size: 11px; } }

</style>

