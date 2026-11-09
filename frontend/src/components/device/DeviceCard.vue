<template>
  <v-card variant="outlined" class="device-card" :class="{ 'device-card--selected': selected }">
    <div class="device-card-top"><v-icon icon="mdi-chip" size="19" color="muted" /><span class="connection-status" :class="{ 'connection-status--online': online }">{{ online ? t('Online') : t('Not seen') }}</span></div>
    <button class="device-name" type="button" @click="$emit('select', device.key, $event)">{{ device.host }}</button>
    <div class="device-card-network"><span>{{ device.ip || t('No IP reported') }}</span><span :class="{ 'text-warning': online && weakSignal(device) }"><v-icon icon="mdi-wifi" size="15" /> {{ online ? t(signalText(device)) : '—' }}</span></div>
    <p v-if="showMac" class="device-card-mac">{{ device.mac || t('No MAC reported') }}</p>
    <div class="device-card-footer"><span>{{ online ? `${device.outputs.filter(output => output.state === true).length} / ${device.outputs.length} outputs ON` : `Seen ${lastSeenLabel(device.receivedAt, clock, t)}` }}</span><v-btn variant="text" size="small" @click="$emit('select', device.key, $event)">{{ t('View') }}</v-btn></div>
  </v-card>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { lastSeenLabel, signalText, weakSignal } from '@/composables/deviceInventoryUtils';
import type { DiscoveredDevice } from '@/composables/deviceInventoryUtils';

const { t } = useLanguage();
defineProps<{
  device: DiscoveredDevice;
  online?: boolean;
  selected?: boolean;
  showMac?: boolean;
  clock?: number;
}>();
defineEmits<{ select: [key: string, event: MouseEvent] }>();
</script>
<style scoped lang="scss">
.device-card { padding: 16px; border-color: rgb(var(--v-theme-border)); }
.device-card--selected { border-color: rgb(var(--v-theme-primary)); box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary)); }
.device-card-top, .device-card-network, .device-card-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.device-card-top { margin-bottom: 15px; }.device-name { border: 0; padding: 0; background: transparent; color: inherit; text-align: left; font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }.device-name:hover { text-decoration: underline; }
.device-card-network { font-size: 12px; padding: 16px 0; }.device-card-footer { border-top: 1px solid rgb(var(--v-theme-border)); padding-top: 8px; font-size: 12px; color: rgb(var(--v-theme-muted)); }.device-card-mac { font-size: 12px; color: rgb(var(--v-theme-muted)); margin: 0 0 10px; }
.connection-status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: rgb(var(--v-theme-muted)); }.connection-status:before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }.connection-status--online { color: rgb(var(--v-theme-success)); }
</style>
