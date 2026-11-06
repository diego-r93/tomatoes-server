<template>
  <v-card variant="outlined" class="device-details">
    <div class="details-heading"><h2 class="app-section-title">Device details</h2><v-btn variant="text" size="small" icon="mdi-close" aria-label="Close device details" @click="$emit('close')" /></div>
    <h3 class="device-host">{{ device.host }}</h3><span class="connection-status" :class="{ 'connection-status--online': online }">{{ online ? 'Online' : 'Not seen' }}</span>
    <dl><div><dt>IP address</dt><dd>{{ device.ip || 'Not reported' }}</dd></div><div><dt>MAC address</dt><dd>{{ device.mac || 'Not reported' }}</dd></div><div><dt>Signal strength</dt><dd :class="{ 'text-warning': online && weakSignal(device) }">{{ online ? signalText(device) : '—' }}</dd></div><div><dt>Last discovery response</dt><dd>{{ lastSeenLabel(device.receivedAt, clock) }}</dd></div><div v-if="device.datetime"><dt>Device timestamp</dt><dd>{{ formatDeviceTime(device.datetime) }}</dd></div></dl>
    <section class="outputs-section"><h3>Manual outputs</h3>
      <div v-for="output in device.outputs" :key="output.gpio" class="output-row"><div><span>GPIO {{ output.gpio }}</span><small>{{ output.label }}</small></div><div class="output-control"><v-switch :key="`${device.key}:${output.gpio}:${controlRevision}`" :model-value="output.state === true" color="primary" hide-details :loading="Boolean(pending[`${device.key}:${output.gpio}`])" :disabled="readonly || !online || sending || allOffPending || output.state === null || Boolean(pending[`${device.key}:${output.gpio}`])" :aria-label="`GPIO ${output.gpio} on ${device.host}`" @update:model-value="requestChange(output, $event)" /><span>{{ output.state === null ? 'Unknown' : output.state ? 'ON' : 'OFF' }}</span></div></div>
      <v-btn v-if="!readonly && device.outputs.length" class="mt-4" variant="outlined" size="small"
        prepend-icon="mdi-power" :loading="allOffPending"
        :disabled="!online || sending || allOffPending || device.outputs.some(output => pending[`${device.key}:${output.gpio}`])"
        @click="$emit('all-off', { deviceKey: device.key, host: device.host, allOff: true })">Turn all outputs off</v-btn>
      <p v-if="!device.outputs.length" class="details-note">No outputs were reported by this device.</p>
      <p v-else class="details-note">{{ readonly ? 'Last reported output states. Open Devices to send a manual command.' : online ? 'Every manual change requires confirmation. States update only after a device response.' : 'This device did not respond recently. Last reported states are shown; manual control is unavailable.' }}</p>
    </section>
    <div class="details-actions"><v-btn variant="outlined" size="small" prepend-icon="mdi-information-outline" @click="$emit('information', device)">Information</v-btn><v-btn v-if="canUpdateFirmware" variant="outlined" size="small" prepend-icon="mdi-upload" :disabled="!online || !device.ip || sending" @click="$emit('firmware', device)">Firmware</v-btn></div>
  </v-card>
</template>
<script setup>
import { formatDeviceTime } from '@/composables/dateTime.mjs';
import { ref } from 'vue';
import { lastSeenLabel, signalText, weakSignal } from '@/composables/deviceInventoryUtils';
const props = defineProps({ device: { type: Object, required: true }, online: Boolean, clock: Number, pending: { type: Object, default: () => ({}) }, sending: Boolean, allOffPending: Boolean, canUpdateFirmware: Boolean, readonly: Boolean, standalone: Boolean });
const controlRevision = ref(0);
const emit = defineEmits(['close', 'change', 'all-off', 'information', 'firmware']);
function requestChange(output, value) { if (value !== output.state && !props.readonly) { controlRevision.value++; emit('change', { deviceKey: props.device.key, host: props.device.host, gpio: output.gpio, target: value, originalState: output.state }); } }
</script>
<style scoped lang="scss">
.device-details { padding: 18px; border-color: rgb(var(--v-theme-border)); min-width: 0; }.details-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }.device-host { font-size: 14px; font-weight: 500; margin-bottom: 8px; overflow-wrap: anywhere; }
.connection-status { display: inline-flex; align-items: center; gap: 6px; color: rgb(var(--v-theme-muted)); font-size: 12px; }.connection-status:before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }.connection-status--online { color: rgb(var(--v-theme-success)); }
dl { display: grid; gap: 14px; margin: 18px 0; }dl>div { display: flex; justify-content: space-between; gap: 12px; }dt { font-size: 12px; color: rgb(var(--v-theme-muted)); }dd { font-size: 12px; margin: 0; text-align: right; overflow-wrap: anywhere; }
.outputs-section { margin-top: 18px; border-top: 1px solid rgb(var(--v-theme-border)); padding-top: 16px; }h3 { font-size: 14px; font-weight: 500; }.output-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid rgb(var(--v-theme-border)); }.output-row small { display: block; color: rgb(var(--v-theme-muted)); font-size: 12px; margin-top: 2px; }.output-control { display: flex; align-items: center; gap: 6px; font-size: 12px; }.output-control :deep(.v-switch) { flex: 0 0 auto; }.details-note { margin: 12px 0 0; color: rgb(var(--v-theme-muted)); font-size: 12px; }.details-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }.details-actions>* { flex: 1; }
</style>
