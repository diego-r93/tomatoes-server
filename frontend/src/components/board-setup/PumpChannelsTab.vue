<template>
  <section class="setup-panel"><h2>{{ t('Pump channels') }}</h2><p class="setup-muted mb-4">{{ t('Reported channel identity only. Manual controls and schedules remain in Devices and Database.') }}</p>
    <v-table v-if="channels.length"><thead><tr><th>{{ t('Pump code') }}</th><th>{{ t('Output') }}</th><th>GPIO</th></tr></thead><tbody><tr v-for="channel in channels" :key="channel.code"><td>{{ channel.code }}</td><td>{{ channel.label }}</td><td>{{ channel.gpio ?? '—' }}</td></tr></tbody></v-table>
    <p v-else>{{ t('No outputs were reported.') }}</p>
    <v-alert type="info" variant="tonal" class="mt-4">{{ t('TCC v2.0 has no verified per-output hardware PWM path. Peristaltic dosing and PWM need separate hardware and firmware validation.') }}</v-alert>
  </section>
</template>
<script setup lang="ts">
import type { SetupBoard } from '@/composables/boardSetupInventory';
import { computed } from 'vue';
import { useLanguage } from '@/composables/useLanguage';
import { reportedPumpChannels } from '@/composables/boardSetupInventory';
const props = defineProps<{ board: SetupBoard }>();
const { t } = useLanguage();
const channels = computed(() => reportedPumpChannels(props.board));
</script>
