<template>
  <p class="setup-muted mb-4">{{ t('Chip detection does not confirm that a probe is connected or that its readings are valid.') }}</p>
  <div class="setup-grid">
    <section v-for="sensor in sensors" :key="sensor.key" class="setup-panel">
      <h2>{{ t(sensor.title) }}</h2><p class="setup-muted">{{ sensor.chip }}</p>
      <dl><dt>{{ t('Chip detection') }}</dt><dd>{{ t(chipPresence(board.report, sensor.key)) }}</dd><dt>{{ t('Probe validity') }}</dt><dd>{{ t('Not verified by this firmware') }}</dd></dl>
      <p class="setup-muted">{{ t(sensor.note) }}</p>
      <p class="mt-4">{{ t('Applied calibration') }}: {{ t('Not reported') }}</p>
    </section>
    <section class="setup-panel"><h2>{{ t('Probe profiles') }}</h2><p>{{ t('Probe identity, cell constant, temperature coefficients and calibration records will be editable after firmware readback is available.') }}</p><p class="setup-muted mt-3">{{ t('Existing readings and settings have not been changed.') }}</p></section>
  </div>
</template>
<script setup lang="ts">
import type { SetupBoard } from '@/composables/boardSetupInventory';
import { useLanguage } from '@/composables/useLanguage';
import { chipPresence } from '@/composables/boardSetupInventory';
defineProps<{ board: SetupBoard }>();
const { t } = useLanguage();
const sensors = [
 { key: 'ph', title: 'pH probe', chip: 'CN0326 · AD7793', note: 'PT1000 validity is required for the current pH circuit. Internal ADC temperature is a separate diagnostic.' },
 { key: 'ec', title: 'Conductivity probe', chip: 'CN0411 · AD7124', note: 'The current conductivity circuit uses an NTC temperature input. A detected ADC does not prove a connected cell.' },
 { key: 'sht35', title: 'Air temperature and humidity', chip: 'SHT35', note: 'Factory-calibrated digital sensor. No pH or conductivity reference solution is used here.' },
] as const;
</script>
<style scoped lang="scss">dl{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}dt{color:rgb(var(--v-theme-muted));font-size:13px}dd{margin:0;font-size:13px}@media(max-width:420px){dl{grid-template-columns:1fr;gap:6px}}</style>
