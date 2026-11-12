<template>
  <p class="setup-muted mb-4">{{ t('Chip detection does not confirm that a probe is connected or that its readings are valid.') }}</p>
  <div class="setup-grid">
    <section v-for="sensor in sensors" :key="sensor.key" class="setup-panel">
      <h2>{{ t(sensor.title) }}</h2><p class="setup-muted">{{ sensor.chip }}</p>
      <dl><dt>{{ t('Chip detection') }}</dt><dd>{{ t(chipPresence(board.report, sensor.key)) }}</dd><dt>{{ t('Probe validity') }}</dt><dd>{{ t(reportedProbeValidity(board.report, sensor.key)) }}</dd></dl>
      <p class="setup-muted">{{ t(sensor.note) }}</p>
      <dl v-if="sensor.key === 'ph' && settings">
        <dt>{{ t('Applied calibration') }}</dt><dd>{{ t(phCalibration) }}</dd>
      </dl>
      <dl v-else-if="sensor.key === 'ec' && settings">
        <dt>{{ t('Cell constant') }}</dt><dd>{{ numberLabel(settings.cellConstant) }}<template v-if="settings.cellConstant != null"> cm⁻¹</template></dd>
        <dt>{{ t('Temperature coefficient') }}</dt><dd>{{ numberLabel(settings.temperatureCoefficient == null ? null : settings.temperatureCoefficient * 100) }}<template v-if="settings.temperatureCoefficient != null"> %/°C</template></dd>
        <dt>{{ t('TDS factor') }}</dt><dd>{{ numberLabel(settings.tdsFactor) }}</dd>
      </dl>
      <PhCalibrationEditor v-if="sensor.key === 'ph'" v-model="settings" :host="board.host" :online="online" :editable="phEditable" />
      <p v-if="sensor.key !== 'sht35' && supported && !settings" class="setup-muted mt-4">{{ t('Read board settings to see the reported values.') }}</p>
      <p v-else-if="sensor.key !== 'sht35' && settings" class="setup-muted mt-4">{{ t('Last read from the board · revision {revision}', { revision: settings.revision }) }}</p>
    </section>
    <ProbeLabelEditor v-model="settings" :host="board.host" :online="online" :supported="supported" :ec-editable="ecEditable" />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BoardSetupSettings, SetupBoard } from '@/composables/boardSetupInventory';
import { useLanguage } from '@/composables/useLanguage';
import ProbeLabelEditor from './ProbeLabelEditor.vue';
import PhCalibrationEditor from './PhCalibrationEditor.vue';
import { chipPresence, reportedProbeValidity } from '@/composables/boardSetupInventory';
const props = defineProps<{ board: SetupBoard; online: boolean }>();
const { language, t } = useLanguage();
const settings = ref<BoardSetupSettings | null>(null);
const supported = computed(() => {
  const caps = props.board.report?.caps;
  return Array.isArray(caps) && caps.includes('setup.v1');
});
const ecEditable = computed(() => supported.value && props.board.report?.caps?.includes('setup.ec-params.v1') === true);
const phEditable = computed(() => supported.value && props.board.report?.caps?.includes('setup.ph-cal.v1') === true);
watch(supported, value => { if (!value) settings.value = null; });
const phCalibration = computed(() => {
  const calibrated = settings.value?.phCalibrated;
  return calibrated === true ? 'Saved calibration' : calibrated === false ? 'Theoretical Nernst response' : 'Not reported';
});
const formatter = computed(() => new Intl.NumberFormat(language.value, { maximumFractionDigits: 4 }));
function numberLabel(value: number | null | undefined) {
  return value == null ? t('Not reported') : formatter.value.format(value);
}
const sensors = [
 { key: 'ph', title: 'pH probe', chip: 'CN0326 · AD7793', note: 'PT1000 validity is required for the current pH circuit. Internal ADC temperature is a separate diagnostic.' },
 { key: 'ec', title: 'Conductivity probe', chip: 'CN0411 · AD7124', note: 'The current conductivity circuit uses an NTC temperature input. A detected ADC does not prove a connected cell.' },
 { key: 'sht35', title: 'Air temperature and humidity', chip: 'SHT35', note: 'Factory-calibrated digital sensor. No pH or conductivity reference solution is used here.' },
] as const;
</script>
<style scoped lang="scss">dl{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}dt{color:rgb(var(--v-theme-muted));font-size:13px}dd{margin:0;font-size:13px}@media(max-width:420px){dl{grid-template-columns:1fr;gap:6px}}</style>
