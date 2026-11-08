<template>
  <div class="device-information">
    <v-btn v-if="canManage" :to="{ path: '/board-setup', query: { host: device.host } }" variant="outlined" size="small" prepend-icon="mdi-tune-variant" class="mb-4">{{ t('Board setup') }}</v-btn>
    <p class="information-host">{{ device.host }}</p><p class="information-note">{{ t('Hardware identity and the latest information reported by this device.') }}</p>
    <section><h3>{{ t('Identity & network') }}</h3><dl class="information-grid"><div><dt>{{ t('Hostname') }}</dt><dd>{{ device.host }}</dd></div><div><dt>{{ t('MAC address') }}</dt><dd>{{ device.mac || t('Not reported') }}</dd></div><div><dt>{{ t('IP address') }}</dt><dd>{{ device.ip || t('Not reported') }}</dd></div><div><dt>{{ t('Discovery status') }}</dt><dd>{{ online ? t('Online') : t('Not seen recently') }}</dd></div><div><dt>{{ t('Wi-Fi signal') }}</dt><dd>{{ t(signalText(device)) }}</dd></div><div><dt>{{ t('Last discovery response') }}</dt><dd>{{ lastSeenLabel(device.receivedAt, clock, t) }}</dd></div><div><dt>{{ t('Response received at') }}</dt><dd>{{ formatDateTime(device.receivedAt, 'Browser', t('Not observed')) }}</dd></div><div v-if="device.datetime"><dt>{{ t('Device timestamp') }}</dt><dd>{{ formatDeviceTime(device.datetime) }}</dd></div></dl></section>
    <section v-if="reportedDetails.length"><h3>{{ t('Reported system information') }}</h3><dl class="information-grid"><div v-for="item in reportedDetails" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div></dl></section>
    <section><div class="outputs-heading"><h3>{{ t('Reported outputs') }}</h3><span>{{ onCount }} ON · {{ offCount }} OFF{{ unknownCount ? ' · ' + t('{count} unknown', { count: unknownCount }) : '' }}</span></div><v-table v-if="device.outputs.length" class="information-outputs"><thead><tr><th>GPIO</th><th>{{ t('Output') }}</th><th>{{ t('State') }}</th><th>{{ t('Schedule source') }}</th><th>{{ t('Reported version') }}</th><th>{{ t('Sync') }}</th></tr></thead><tbody><tr v-for="output in device.outputs" :key="output.gpio"><td>{{ output.gpio }}</td><td>{{ output.label }}</td><td>{{ output.state === null ? t('Unknown') : output.state ? 'ON' : 'OFF' }}</td><td>{{ t(scheduleInfo(output.code).source) }}</td><td>{{ scheduleInfo(output.code).version }}</td><td>{{ scheduleInfo(output.code).status }}</td></tr></tbody></v-table><p v-else class="information-note">{{ t('No outputs were reported.') }}</p></section>
    <p class="information-note">{{ t('Read-only snapshot. Connection status is based on discovery responses. Device time and server reception time may differ.') }}</p>
  </div>
</template>
<script setup>
import Authentication from '@/services/auth';
const canManage = Boolean(Authentication.currentUser?.isAdmin);
import { useLanguage } from '@/composables/useLanguage';
const { t } = useLanguage();

import { formatDateTime, formatDeviceTime } from '@/composables/dateTime.mjs';
import { computed } from 'vue';
import { lastSeenLabel, signalText } from '@/composables/deviceInventoryUtils';
const props = defineProps({ device: { type: Object, required: true }, online: Boolean, clock: Number });
const onCount = computed(() => props.device.outputs.filter(output => output.state === true).length);
const offCount = computed(() => props.device.outputs.filter(output => output.state === false).length);
const unknownCount = computed(() => props.device.outputs.filter(output => output.state === null).length);
function scheduleInfo(code) {
  const port = props.device.ports?.[code];
  const expected = props.device.scheduleVersions?.[code];
  const source = port?.configSource || 'Not reported';
  const version = port?.configVersion || '—';
  if (!expected) return { source, version, status: t('No server schedule') };
  if (!props.online) return { source, version, status: t('Awaiting device') };
  if (source !== 'mqtt') return { source, version, status: t('Waiting for MQTT') };
  return { source, version, status: version === expected ? t('In sync') : t('Version mismatch') };
}
const reportedDetails = computed(() => {
  const source = props.device;
  const fields = [
    [t('Board model'), [source.model]],
    ['MQTT TLS', [typeof source.mqttTls === 'boolean' ? (source.mqttTls ? t('On') : t('Off')) : undefined]],
    [t('Chip model'), [source.chipModel, source.chip_model, source.chip?.model]],
    [t('Firmware version'), [source.fw, source.firmwareVersion, source.firmware_version, source.firmware?.version]],
    [t('SDK version'), [source.sdkVersion, source.sdk_version]],
    [t('Reported uptime (seconds)'), [source.uptime_s]],
    [t('Reported uptime'), [source.uptime_s == null ? source.uptime : undefined]],
    [t('Last reset reason'), [source.reset]],
    [t('Free heap (bytes)'), [source.freeHeapBytes]],
    [t('Free heap (reported)'), [source.freeHeap, source.free_heap]],
    [t('CPU frequency (MHz)'), [source.cpuFrequencyMhz, source.cpu_frequency_mhz]],
  ];
  return fields.flatMap(([label, candidates]) => { const value = candidates.find(item => (typeof item === 'string' && item.trim()) || (typeof item === 'number' && Number.isFinite(item))); return value === undefined ? [] : [{ label, value }]; });
});
</script>
<style scoped lang="scss">
.information-host { font-size: 16px; font-weight: 500; overflow-wrap: anywhere; margin-bottom: 6px; }.information-note { color: rgb(var(--v-theme-muted)); font-size: 12px; margin: 0; }.device-information section { margin: 22px 0; }.device-information h3 { font-size: 14px; font-weight: 500; margin: 0 0 12px; }.information-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px 28px; margin: 0; }.information-grid dt { color: rgb(var(--v-theme-muted)); font-size: 12px; margin-bottom: 3px; }.information-grid dd { margin: 0; font-size: 13px; overflow-wrap: anywhere; }.outputs-heading { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; flex-wrap: wrap; }.outputs-heading span { font-size: 12px; color: rgb(var(--v-theme-muted)); }.information-outputs { border: 1px solid rgb(var(--v-theme-border)); border-radius: 4px; }@media(max-width:500px) { .information-grid { grid-template-columns: 1fr; gap: 14px; } }
</style>
