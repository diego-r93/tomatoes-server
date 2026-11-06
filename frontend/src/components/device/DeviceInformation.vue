<template>
  <div class="device-information">
    <p class="information-host">{{ device.host }}</p><p class="information-note">Hardware identity and the latest information reported by this device.</p>
    <section><h3>Identity & network</h3><dl class="information-grid"><div><dt>Hostname</dt><dd>{{ device.host }}</dd></div><div><dt>MAC address</dt><dd>{{ device.mac || 'Not reported' }}</dd></div><div><dt>IP address</dt><dd>{{ device.ip || 'Not reported' }}</dd></div><div><dt>Discovery status</dt><dd>{{ online ? 'Online' : 'Not seen recently' }}</dd></div><div><dt>Wi-Fi signal</dt><dd>{{ signalText(device) }}</dd></div><div><dt>Last discovery response</dt><dd>{{ lastSeenLabel(device.receivedAt, clock) }}</dd></div><div><dt>Response received at</dt><dd>{{ formatDateTime(device.receivedAt, 'Browser', 'Not observed') }}</dd></div><div v-if="device.datetime"><dt>Device timestamp</dt><dd>{{ formatDeviceTime(device.datetime) }}</dd></div></dl></section>
    <section v-if="reportedDetails.length"><h3>Reported system information</h3><dl class="information-grid"><div v-for="item in reportedDetails" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div></dl></section>
    <section><div class="outputs-heading"><h3>Reported outputs</h3><span>{{ onCount }} ON · {{ offCount }} OFF{{ unknownCount ? ` · ${unknownCount} unknown` : '' }}</span></div><v-table v-if="device.outputs.length" class="information-outputs"><thead><tr><th>GPIO</th><th>Output</th><th>State</th><th>Schedule source</th><th>Reported version</th><th>Sync</th></tr></thead><tbody><tr v-for="output in device.outputs" :key="output.gpio"><td>{{ output.gpio }}</td><td>{{ output.label }}</td><td>{{ output.state === null ? 'Unknown' : output.state ? 'ON' : 'OFF' }}</td><td>{{ scheduleInfo(output.code).source }}</td><td>{{ scheduleInfo(output.code).version }}</td><td>{{ scheduleInfo(output.code).status }}</td></tr></tbody></v-table><p v-else class="information-note">No outputs were reported.</p></section>
    <p class="information-note">Read-only snapshot. Connection status is based on discovery responses. Device time and server reception time may differ.</p>
  </div>
</template>
<script setup>
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
  if (!expected) return { source, version, status: 'No server schedule' };
  if (!props.online) return { source, version, status: 'Awaiting device' };
  if (source !== 'mqtt') return { source, version, status: 'Waiting for MQTT' };
  return { source, version, status: version === expected ? 'In sync' : 'Version mismatch' };
}
const reportedDetails = computed(() => {
  const source = props.device;
  const fields = [
    ['Board model', [source.model]],
    ['MQTT TLS', [typeof source.mqttTls === 'boolean' ? (source.mqttTls ? 'On' : 'Off') : undefined]],
    ['Chip model', [source.chipModel, source.chip_model, source.chip?.model]],
    ['Firmware version', [source.fw, source.firmwareVersion, source.firmware_version, source.firmware?.version]],
    ['SDK version', [source.sdkVersion, source.sdk_version]],
    ['Reported uptime', [source.uptime]],
    ['Free heap (bytes)', [source.freeHeapBytes]],
    ['Free heap (reported)', [source.freeHeap, source.free_heap]],
    ['CPU frequency (MHz)', [source.cpuFrequencyMhz, source.cpu_frequency_mhz]],
  ];
  return fields.flatMap(([label, candidates]) => { const value = candidates.find(item => (typeof item === 'string' && item.trim()) || (typeof item === 'number' && Number.isFinite(item))); return value === undefined ? [] : [{ label, value }]; });
});
</script>
<style scoped lang="scss">
.information-host { font-size: 16px; font-weight: 500; overflow-wrap: anywhere; margin-bottom: 6px; }.information-note { color: rgb(var(--v-theme-muted)); font-size: 12px; margin: 0; }.device-information section { margin: 22px 0; }.device-information h3 { font-size: 14px; font-weight: 500; margin: 0 0 12px; }.information-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px 28px; margin: 0; }.information-grid dt { color: rgb(var(--v-theme-muted)); font-size: 12px; margin-bottom: 3px; }.information-grid dd { margin: 0; font-size: 13px; overflow-wrap: anywhere; }.outputs-heading { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; flex-wrap: wrap; }.outputs-heading span { font-size: 12px; color: rgb(var(--v-theme-muted)); }.information-outputs { border: 1px solid rgb(var(--v-theme-border)); border-radius: 4px; }@media(max-width:500px) { .information-grid { grid-template-columns: 1fr; gap: 14px; } }
</style>
