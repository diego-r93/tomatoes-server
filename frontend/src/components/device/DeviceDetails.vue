<template>
  <v-card variant="outlined" class="device-details">
    <header class="details-heading">
      <div class="details-identity">
        <h2 ref="heading" class="app-section-title" tabindex="-1">{{ t('Device details') }}</h2>
        <div class="device-summary">
          <strong class="device-host">{{ device.host }}</strong>
          <span class="connection-status" :class="{ 'connection-status--online': online }">{{ online ? t('Online') : t('Not seen') }}</span>
        </div>
      </div>
      <v-btn variant="outlined" size="small" prepend-icon="mdi-close" :aria-label="t('Close device details')" @click="$emit('close')">
        {{ t('Close') }}
      </v-btn>
    </header>
    <div class="details-body">
      <div class="details-overview">
        <dl><div><dt>{{ t('IP address') }}</dt><dd>{{ device.ip || t('Not reported') }}</dd></div><div><dt>{{ t('MAC address') }}</dt><dd>{{ device.mac || t('Not reported') }}</dd></div><div><dt>{{ t('Signal strength') }}</dt><dd :class="{ 'text-warning': online && weakSignal(device) }">{{ online ? t(signalText(device)) : '—' }}</dd></div><div><dt>{{ t('Last discovery response') }}</dt><dd>{{ lastSeenLabel(device.receivedAt, clock, t) }}</dd></div><div v-if="device.datetime"><dt>{{ t('Device timestamp') }}</dt><dd>{{ formatDeviceTime(device.datetime) }}</dd></div></dl>
        <div class="details-actions"><v-btn variant="outlined" size="small" prepend-icon="mdi-information-outline" @click="$emit('information', device)">{{ t('Information') }}</v-btn><v-btn v-if="canUpdateFirmware" variant="outlined" size="small" prepend-icon="mdi-upload" :disabled="!online || !device.ip || sending" @click="$emit('firmware', device)">{{ t('Firmware') }}</v-btn></div>
      </div>
      <div class="details-grid">
        <section class="outputs-section"><h3>{{ t('Manual outputs') }}</h3>
          <div v-for="output in device.outputs" :key="output.gpio" class="output-row"><div><span>GPIO {{ output.gpio }}</span><small>{{ output.label }}</small></div><div class="output-control"><v-switch :key="`${device.key}:${output.gpio}:${controlRevision}`" :model-value="output.state === true" color="primary" hide-details :loading="Boolean(pending[`${device.key}:${output.gpio}`])" :disabled="readonly || !online || sending || allOffPending || output.state === null || Boolean(pending[`${device.key}:${output.gpio}`])" :aria-label="`GPIO ${output.gpio} on ${device.host}`" @update:model-value="requestChange(output, $event)" /><span>{{ output.state === null ? t('Unknown') : output.state ? 'ON' : 'OFF' }}</span></div></div>
          <v-btn v-if="!readonly && device.outputs.length" class="mt-4 all-off-button" block color="error" variant="flat" size="large"
            prepend-icon="mdi-power" :loading="allOffPending"
            :disabled="!online || sending || allOffPending || device.outputs.some(output => pending[`${device.key}:${output.gpio}`])"
            @click="$emit('all-off', { deviceKey: device.key, host: device.host, allOff: true })">{{ t('Turn all outputs off') }}</v-btn>
          <p v-if="!device.outputs.length" class="details-note">{{ t('No outputs were reported by this device.') }}</p>
          <p v-else class="details-note">{{ readonly ? t('Last reported output states. Open Devices to send a manual command.') : online ? t('Every manual change requires confirmation. States update only after a device response.') : t('This device did not respond recently. Last reported states are shown; manual control is unavailable.') }}</p>
        </section>
        <PumpDriverFeedback class="details-feedback" :device="device" :clock="clock" />
      </div>
    </div>
  </v-card>
</template>
<script setup>
import PumpDriverFeedback from './PumpDriverFeedback.vue';
import { useLanguage } from '@/composables/useLanguage';
const { t } = useLanguage();

import { formatDeviceTime } from '@/composables/dateTime.mjs';
import { ref } from 'vue';
import { lastSeenLabel, signalText, weakSignal } from '@/composables/deviceInventoryUtils';
const props = defineProps({ device: { type: Object, required: true }, online: Boolean, clock: Number, pending: { type: Object, default: () => ({}) }, sending: Boolean, allOffPending: Boolean, canUpdateFirmware: Boolean, readonly: Boolean, standalone: Boolean });
const controlRevision = ref(0);
const heading = ref(null);
defineExpose({ focusHeading: () => heading.value?.focus() });
const emit = defineEmits(['close', 'change', 'all-off', 'information', 'firmware']);
function requestChange(output, value) { if (value !== output.state && !props.readonly) { controlRevision.value++; emit('change', { deviceKey: props.device.key, host: props.device.host, gpio: output.gpio, target: value, originalState: output.state }); } }
</script>
<style scoped lang="scss">
.device-details {
  container-type: inline-size;
  min-width: 0;
  border-color: rgb(var(--v-theme-border));
}

.details-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: rgb(var(--v-theme-table-header));
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

.details-identity { min-width: 0; }
.details-heading h2 { scroll-margin-block-start: 88px; }
.device-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; margin-top: 4px; }
.device-host { font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.connection-status { display: inline-flex; align-items: center; gap: 6px; color: rgb(var(--v-theme-muted)); font-size: 12px; }
.connection-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.connection-status--online { color: rgb(var(--v-theme-success)); }

.details-body { padding: 16px 18px 18px; }
.details-overview { padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid rgb(var(--v-theme-border)); }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 10px 14px; margin: 0; }
dt { font-size: 12px; color: rgb(var(--v-theme-muted)); }
dd { font-size: 12px; margin: 3px 0 0; overflow-wrap: anywhere; }
.details-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

h3 { font-size: 14px; font-weight: 500; }
.output-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgb(var(--v-theme-border)); }
.output-row small { display: block; color: rgb(var(--v-theme-muted)); font-size: 12px; margin-top: 2px; }
.output-control { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.output-control :deep(.v-switch) { flex: 0 0 auto; }
.details-note { margin: 10px 0 0; color: rgb(var(--v-theme-muted)); font-size: 12px; }
.all-off-button { font-weight: 600; }

@container (min-width: 680px) {
  .details-grid {
    display: grid;
    grid-template-columns: minmax(230px, 2fr) minmax(0, 3fr);
    align-items: start;
    gap: 20px;
  }

  .details-grid .details-feedback {
    margin-top: 0;
    border-top: 0;
    border-inline-start: 1px solid rgb(var(--v-theme-border));
    padding: 0 0 0 20px;
  }
}
</style>
