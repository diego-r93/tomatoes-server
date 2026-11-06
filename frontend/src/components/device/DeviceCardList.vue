<template>

  <v-container fluid class="devices-page app-page">

    <AppPageHeader title="Devices / List" icon="mdi-chip"><template #actions><v-btn variant="outlined" size="small" icon rounded="sm" aria-label="Device display settings" @click="settingsOpen = true"><v-icon icon="mdi-cog-outline" /><v-tooltip activator="parent">Display settings</v-tooltip></v-btn><v-btn variant="outlined" size="small" icon rounded="sm" aria-label="Refresh devices" :loading="loading" :disabled="loading || sending" @click="refresh"><v-icon icon="mdi-sync" /><v-tooltip activator="parent">Refresh devices</v-tooltip></v-btn></template></AppPageHeader>

    <header class="app-page-heading"><div><h1 class="app-page-title">Devices</h1><p>Your controllers, connections and outputs in one place.</p></div><span v-if="hasLoaded" class="inventory-count">{{ devices.length }} known {{ devices.length === 1 ? 'device' : 'devices' }}</span></header>

    <v-alert v-if="notice" color="secondary" variant="tonal" closable class="mb-4" role="status" @click:close="notice = ''">{{ notice }}</v-alert>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">{{ error }}<template #append><v-btn variant="text" :disabled="loading" @click="refresh">Retry</v-btn></template></v-alert>

    <div v-if="initialLoading" class="app-loading-state" role="status"><v-progress-circular :size="52" :width="4" indeterminate color="secondary" /><h2 class="app-section-title">Loading devices…</h2><p>Waiting for device responses.</p></div>

    <template v-else>

      <div class="devices-tools"><v-text-field v-model="query" label="Search devices" placeholder="Hostname, IP or MAC address" prepend-inner-icon="mdi-magnify" clearable hide-details /><v-select v-model="settings.sort" label="Sort by" :items="sortOptions" hide-details /><v-select v-model="settings.pageSize" label="Per page" :items="[8, 16, 32]" hide-details /></div>

      <div class="connection-filters" role="group" aria-label="Filter devices"><v-btn v-for="option in filters" :key="option.value" size="small" :variant="filter === option.value ? 'tonal' : 'text'" :color="filter === option.value ? 'primary' : undefined" :aria-pressed="filter === option.value" @click="filter = option.value">{{ option.title }}<span class="filter-count">{{ counts[option.value] }}</span></v-btn></div>

      <div class="inventory-meta"><span aria-live="polite">{{ filtered.length }} {{ filtered.length === 1 ? 'device' : 'devices' }} in this view</span><span>{{ lastRefresh ? `Last refreshed ${lastSeenLabel(lastRefresh, clock)}` : 'Not refreshed yet' }}{{ settings.refreshSeconds ? ` · Auto-refresh ${settings.refreshSeconds}s` : '' }}</span></div>

      <v-progress-linear v-if="loading" indeterminate color="secondary" class="mb-3" aria-label="Refreshing devices" />

      <div class="device-inventory" :class="{ 'device-inventory--details': selectedDevice }">

        <div class="inventory-results">

          <div v-if="!filtered.length" class="app-empty-state app-panel"><v-icon :icon="devices.length ? 'mdi-magnify' : 'mdi-chip'" size="26" color="muted" /><h2 class="app-section-title">{{ devices.length ? 'No matching devices' : error ? 'Device discovery unavailable' : 'No devices found' }}</h2><p>{{ devices.length ? 'Try another hostname, address or connection filter.' : 'Check that your ESP32 boards are powered on and connected to the MQTT broker.' }}</p><v-btn v-if="devices.length" variant="text" @click="clearSearch">Clear search and filters</v-btn><v-btn v-else :disabled="loading" variant="text" @click="refresh">Refresh devices</v-btn></div>

          <template v-else>

            <v-card v-if="settings.layout === 'details'" variant="outlined" class="device-table-card" :style="{ minHeight: `${42 + capacity * 64}px` }"><v-table class="device-table"><thead><tr><th>Device</th><th>Connection</th><th class="network-column">Network</th><th class="outputs-column">Outputs</th><th>Details</th></tr></thead><tbody><tr v-for="device in paged" :key="device.key" :class="{ 'selected-row': selectedKey === device.key }"><td class="device-identity"><button type="button" class="device-name" @click="selectedKey = device.key">{{ device.host }}</button><small v-if="settings.showMac">{{ device.mac || 'No MAC reported' }}</small></td><td><span class="connection-status" :class="{ 'connection-status--online': responding(device) }">{{ responding(device) ? 'Online' : 'Not seen' }}</span><small>{{ lastSeenLabel(device.receivedAt, clock) }}</small></td><td class="network-column"><span class="signal-reading" :class="{ 'text-warning': responding(device) && weakSignal(device) }"><v-icon icon="mdi-wifi" size="15" /> {{ responding(device) ? signalText(device) : '—' }}</span><small>{{ device.ip || 'No IP reported' }}</small></td><td class="outputs-column">{{ responding(device) ? `${device.outputs.filter(output => output.state === true).length} / ${device.outputs.length} ON` : 'Last state' }}</td><td><v-btn variant="text" size="small" @click="selectedKey = device.key">View</v-btn></td></tr></tbody></v-table></v-card>

            <div v-else class="device-cards"><DeviceCard v-for="device in paged" :key="device.key" :device="device" :online="responding(device)" :selected="selectedKey === device.key" :clock="clock" :show-mac="settings.showMac" @select="selectedKey = $event" /><div v-for="slot in capacity - paged.length" :key="`slot-${slot}`" class="device-card-placeholder" aria-hidden="true" /></div>

            <nav class="inventory-pagination" aria-label="Device list pages"><span>{{ (page - 1) * settings.pageSize + 1 }}–{{ Math.min(page * settings.pageSize, filtered.length) }} of {{ filtered.length }} devices</span><v-pagination v-model="page" :length="pageCount" :total-visible="5" rounded="sm" active-color="primary" aria-label="Device pages" /></nav>

          </template>

        </div>

        <DeviceDetails v-if="selectedDevice" :device="selectedDevice" :online="responding(selectedDevice)" :clock="clock" :pending="pending" :sending="sending" :all-off-pending="Boolean(pendingAll[selectedDevice.key])" @all-off="openCommand" :can-update-firmware="canManage" @close="selectedKey = ''" @change="openCommand" @information="openInformation" @firmware="openFirmware" />

      </div>

      <footer class="devices-footer"><span>Tomatoes v1.0.0</span><span>Online: replied within 90 seconds · Not seen: no recent reply</span></footer>

    </template>

    <v-dialog :model-value="overlayKind === 'information'" max-width="680" aria-label="Device information" @update:model-value="!$event && closeOverlay()"><v-card title="Device information"><v-card-text><DeviceInformation v-if="overlayDevice" :device="overlayDevice" :online="responding(overlayDevice)" :clock="clock" /><div v-else class="overlay-unavailable"><v-progress-circular v-if="loading" indeterminate color="secondary" /><p>{{ loading ? 'Waiting for the device to respond…' : 'This device is not available in the current discovery results.' }}</p><v-btn v-if="!loading" variant="text" @click="refresh">Refresh devices</v-btn></div></v-card-text><v-card-actions><v-spacer /><v-btn color="primary" @click="closeOverlay">Close</v-btn></v-card-actions></v-card></v-dialog>

    <v-dialog :model-value="overlayKind === 'firmware'" :persistent="firmwareBusy" max-width="760" aria-label="Firmware update" @update:model-value="!$event && closeOverlay()"><v-card><v-card-title class="firmware-dialog-title"><span>Firmware update</span><v-btn icon="mdi-close" size="small" variant="text" :disabled="firmwareBusy" aria-label="Close firmware update" @click="closeOverlay" /></v-card-title><v-card-text><FirmwareUpload v-if="firmwareTarget && overlayKind === 'firmware'" :key="firmwareTarget.host" :device="firmwareTarget" :online="Boolean(overlayDevice && responding(overlayDevice) && overlayDevice.ip === firmwareTarget.ip)" @busy="firmwareBusy = $event" @completed="firmwareCompleted" /><div v-else class="overlay-unavailable"><v-progress-circular v-if="loading" indeterminate color="secondary" /><p>{{ loading ? 'Waiting for the device to respond…' : 'Select a responding device to upload an image.' }}</p><v-btn v-if="!loading" variant="text" @click="refresh">Refresh devices</v-btn></div></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="firmwareBusy" @click="closeOverlay">Close</v-btn></v-card-actions></v-card></v-dialog>

    <v-dialog v-model="settingsOpen" max-width="480"><v-card title="Device display settings"><v-card-text><v-select v-model="settings.layout" label="Layout" :items="layoutOptions" /><v-select v-model="settings.refreshSeconds" label="Auto-refresh" :items="refreshOptions" /><v-switch v-model="settings.showMac" label="Show MAC addresses" color="primary" hide-details /><p class="settings-note">Preferences are saved in this browser. Connection status is based on discovery responses, not a continuous heartbeat. A refresh failure keeps the last known data.</p></v-card-text><v-card-actions><v-spacer /><v-btn color="primary" @click="settingsOpen = false">Done</v-btn></v-card-actions></v-card></v-dialog>

    <v-dialog v-model="commandOpen" max-width="480" persistent><v-card :title="command?.allOff ? 'Turn all outputs off?' : 'Confirm manual output'"><v-card-text><p v-if="command?.allOff">Turn off every reported output on <strong>{{ command.host }}</strong>?</p><p v-else>Set <strong>{{ command?.host }} · GPIO {{ command?.gpio }}</strong> to <strong>{{ command?.target ? 'ON' : 'OFF' }}</strong>?</p><p class="settings-note">This sends a real manual command to the ESP32. The displayed state changes only when the device reports it.</p><v-alert v-if="commandError" type="error" variant="tonal" class="mt-4">{{ commandError }}</v-alert></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="sending" @click="commandOpen = false">Cancel</v-btn><v-btn color="primary" :disabled="sending" :loading="sending" @click="confirmCommand">{{ command?.allOff ? 'Confirm all OFF' : command?.target ? 'Confirm ON' : 'Confirm OFF' }}</v-btn></v-card-actions></v-card></v-dialog>

  </v-container>

</template>

<script setup>
import Authentication from '@/services/auth';
const canManage = Boolean(Authentication.currentUser?.isAdmin);
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';

import { computed, reactive, ref, watch } from 'vue';

import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import DeviceCard from './DeviceCard.vue';

import DeviceDetails from './DeviceDetails.vue';

import DeviceInformation from './DeviceInformation.vue';

import FirmwareUpload from './FirmwareUpload.vue';

import { useDeviceInventory } from '@/composables/useDeviceInventory';

import { isResponding, lastSeenLabel, signalText, weakSignal } from '@/composables/deviceInventoryUtils';

import { useDeviceStore } from '@/store/deviceData';

const router = useRouter(), route = useRoute(), deviceStore = useDeviceStore();

const { devices, loading, initialLoading, hasLoaded, error, notice, clock, lastRefresh, pending, pendingAll, sending, refresh, setRefreshInterval, sendOutput, sendAllOff } = useDeviceInventory();

const query = ref(''), filter = ref('all'), page = ref(1), selectedKey = ref(''), settingsOpen = ref(false), commandOpen = ref(false), command = ref(null), commandError = ref('');

const settings = reactive({ layout: 'details', sort: 'host', pageSize: 8, showMac: false, refreshSeconds: 0 });

const preferenceKey = 'tomatoes.devices.preferences.v1';

try { const stored = JSON.parse(localStorage.getItem(preferenceKey) || '{}'); for (const [key, values] of Object.entries({ layout: ['details', 'cards'], sort: ['host', 'signal', 'status'], pageSize: [8, 16, 32], showMac: [false, true], refreshSeconds: [0, 15, 30, 60] })) if (values.includes(stored[key])) settings[key] = stored[key]; } catch { /* Use defaults when preferences are unavailable. */ }

watch(settings, value => { try { localStorage.setItem(preferenceKey, JSON.stringify(value)); } catch { /* Display preferences still work in memory. */ } }, { deep: true });

watch(() => settings.refreshSeconds, setRefreshInterval, { immediate: true });

const responding = device => isResponding(device, clock.value);

const filters = [{ title: 'All devices', value: 'all' }, { title: 'Online', value: 'online' }, { title: 'Not seen', value: 'unseen' }, { title: 'Weak signal', value: 'weak' }];

const sortOptions = [{ title: 'Hostname', value: 'host' }, { title: 'Strongest signal', value: 'signal' }, { title: 'Online first', value: 'status' }];

const layoutOptions = [{ title: 'List and details', value: 'details' }, { title: 'Compact cards', value: 'cards' }];

const refreshOptions = [{ title: 'Off', value: 0 }, { title: 'Every 15 seconds', value: 15 }, { title: 'Every 30 seconds', value: 30 }, { title: 'Every minute', value: 60 }];

const counts = computed(() => ({ all: devices.value.length, online: devices.value.filter(responding).length, unseen: devices.value.filter(device => !responding(device)).length, weak: devices.value.filter(device => responding(device) && weakSignal(device)).length }));

const filtered = computed(() => {

  const term = (query.value || '').trim().toLowerCase();

  return devices.value.filter(device => `${device.host} ${device.ip} ${device.mac}`.toLowerCase().includes(term) && (filter.value === 'all' || filter.value === 'online' && responding(device) || filter.value === 'unseen' && !responding(device) || filter.value === 'weak' && responding(device) && weakSignal(device))).sort((a, b) => settings.sort === 'signal' ? (b.rssi ?? -Infinity) - (a.rssi ?? -Infinity) || a.host.localeCompare(b.host) : settings.sort === 'status' ? Number(responding(b)) - Number(responding(a)) || a.host.localeCompare(b.host) : a.host.localeCompare(b.host));

});

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / settings.pageSize)));

const paged = computed(() => filtered.value.slice((page.value - 1) * settings.pageSize, page.value * settings.pageSize));

const capacity = computed(() => Math.min(settings.pageSize, filtered.value.length));

const selectedDevice = computed(() => devices.value.find(device => device.key === selectedKey.value));

watch([query, filter, () => settings.pageSize, () => settings.sort], () => { page.value = 1; });

watch(pageCount, count => { page.value = Math.min(page.value, count); });

watch(filtered, list => { if (selectedKey.value && !list.some(device => device.key === selectedKey.value)) selectedKey.value = ''; });

function clearSearch() { query.value = ''; filter.value = 'all'; }

function openCommand(draft) { command.value = draft; commandError.value = ''; commandOpen.value = true; }

async function confirmCommand() { if (!command.value || sending.value) return; commandError.value = ''; try { const draft = command.value; if (draft.allOff) await sendAllOff(draft.deviceKey); else await sendOutput(draft.deviceKey, draft.gpio, draft.target, draft.originalState); commandOpen.value = false; } catch (issue) { commandError.value = issue.response?.data?.message || issue.message || 'The command could not be submitted.'; } }

const overlayKind = ref(''), overlayHost = ref(''), firmwareTarget = ref(null), firmwareBusy = ref(false);

onBeforeRouteLeave(() => !firmwareBusy.value);

const overlayDevice = computed(() => devices.value.find(device => device.host === overlayHost.value) || (deviceStore.deviceData?.host === overlayHost.value && deviceStore.deviceData.outputs ? deviceStore.deviceData : null));

function openInformation(device) { if (firmwareBusy.value) return; deviceStore.setDeviceData(device); overlayHost.value = device.host; overlayKind.value = 'information'; }

function openFirmware(device) { if (!canManage || firmwareBusy.value || !responding(device) || !device.ip) return; deviceStore.setDeviceData(device); overlayHost.value = device.host; firmwareTarget.value = { ...device }; overlayKind.value = 'firmware'; }

function closeOverlay() {

  if (firmwareBusy.value) return;

  overlayKind.value = ''; firmwareTarget.value = null;

  if (['information', 'firmware'].includes(route.query.panel)) { const query = { ...route.query }; delete query.panel; delete query.device; router.replace({ path: '/device', query }); }

}

function firmwareCompleted() { notice.value = `The upload to ${firmwareTarget.value?.host} completed. The device may restart; refresh discovery to check its connection.`; }

watch([() => route.query.panel, () => route.query.device, devices], ([panel, host]) => {

  if (!['information', 'firmware'].includes(panel) || typeof host !== 'string' || firmwareBusy.value) return;

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

.inventory-count { color: rgb(var(--v-theme-muted)); font-size: 12px; border: 1px solid rgb(var(--v-theme-border)); border-radius: 4px; padding: 4px 9px; }.devices-tools { display: grid; grid-template-columns: minmax(220px, 1fr) 190px 130px; gap: 12px; margin-bottom: 20px; }.connection-filters { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }.filter-count { margin-left: 8px; padding: 0 4px; border-radius: 3px; background: rgba(var(--v-theme-on-surface), .05); font-size: 12px; }.inventory-meta { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12px; color: rgb(var(--v-theme-muted)); margin-bottom: 12px; }.device-inventory { display: grid; gap: 20px; align-items: start; }.device-inventory--details { grid-template-columns: minmax(0, 1fr) 320px; }.inventory-results { min-width: 0; }.device-table-card { border-color: rgb(var(--v-theme-border)); }.device-table { background: transparent; }.device-table :deep(table) { width: 100%; table-layout: fixed; }.device-table :deep(td) { height: 64px; }.device-table :deep(th:first-child) { width: 30%; }.device-table :deep(th:nth-child(2)) { width: 17%; }.device-table :deep(th:last-child) { width: 13%; }.device-table :deep(td) { overflow-wrap: anywhere; }.device-table :deep(td small) { display: block; color: rgb(var(--v-theme-muted)); font-size: 12px; margin-top: 4px; }.device-name { border: 0; padding: 0; text-align: left; color: inherit; background: transparent; font-weight: 500; overflow-wrap: anywhere; }.device-name:hover { text-decoration: underline; }.selected-row { background: rgb(var(--v-theme-selection)); }.connection-status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: rgb(var(--v-theme-muted)); white-space: nowrap; }.connection-status:before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }.connection-status--online { color: rgb(var(--v-theme-success)); }.signal-reading { white-space: nowrap; font-size: 12px; }.device-inventory--details .network-column, .device-inventory--details .outputs-column { display: none; }.device-inventory--details .device-table :deep(th:first-child) { width: 48%; }.device-inventory--details .device-table :deep(th:nth-child(2)) { width: 30%; }.device-inventory--details .device-table :deep(th:last-child) { width: 22%; }

.device-cards { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }.device-inventory--details .device-cards { grid-template-columns: repeat(2,minmax(0,1fr)); }.device-card-placeholder { min-height: 184px; }.inventory-pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; color: rgb(var(--v-theme-muted)); font-size: 12px; }.devices-footer { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12px; color: rgb(var(--v-theme-muted)); margin-top: 24px; }.settings-note { color: rgb(var(--v-theme-muted)); font-size: 12px; margin-top: 14px; }

@media(max-width:1100px) { .device-inventory--details { grid-template-columns: minmax(0,1fr); }.device-inventory--details>:last-child { grid-row: 1; }.device-inventory--details .device-cards { grid-template-columns: repeat(3,minmax(0,1fr)); }.device-inventory--details .network-column,.device-inventory--details .outputs-column { display: table-cell; }.device-inventory--details .device-table :deep(th:first-child) { width: 30%; }.device-inventory--details .device-table :deep(th:nth-child(2)) { width: 17%; }.device-inventory--details .device-table :deep(th:last-child) { width: 13%; } }

@media(max-width:700px) { .devices-tools { grid-template-columns: 1fr 1fr; }.devices-tools>:first-child { grid-column: 1 / -1; }.device-cards,.device-inventory--details .device-cards { grid-template-columns: repeat(2,minmax(0,1fr)); }.network-column,.outputs-column,.device-inventory--details .network-column,.device-inventory--details .outputs-column { display: none; }.device-table :deep(th:first-child),.device-inventory--details .device-table :deep(th:first-child) { width: 46%; }.device-table :deep(th:nth-child(2)),.device-inventory--details .device-table :deep(th:nth-child(2)) { width: 31%; }.device-table :deep(th:last-child),.device-inventory--details .device-table :deep(th:last-child) { width: 23%; }.device-table :deep(td) { font-size: 12px; }.device-table :deep(td .v-btn) { min-width: 40px; padding-inline: 5px; }.inventory-pagination { justify-content: center; }.device-identity small { display: none!important; } }

@media(max-width:450px) { .device-cards,.device-inventory--details .device-cards { grid-template-columns: minmax(0,1fr); }.device-table :deep(td),.device-table :deep(th) { padding-inline: 6px; }.connection-status { gap: 4px; }.device-table :deep(td small) { font-size: 11px; }.devices-footer { font-size: 11px; } }

</style>

