<template>
  <div class="setup-grid">
    <section class="setup-panel"><h2>{{ t('Your reference solutions') }}</h2>
      <v-table><thead><tr><th>{{ t('Purpose') }}</th><th>{{ t('Reference') }}</th></tr></thead><tbody>
        <tr><td>{{ t('pH calibration') }}</td><td>pH 7 → 4 → 10</td></tr>
        <tr><td>{{ t('Conductivity calibration') }}</td><td>Akso · 1413 µS/cm · 25 °C</td></tr>
        <tr><td>{{ t('Electrode storage') }}</td><td>KCl · 3 M</td></tr>
      </tbody></v-table>
      <p class="setup-muted mt-4">{{ t('Use the exact reference values, temperature table, lot and expiry on each bottle. Nominal pH 4, 7 and 10 are not automatically 4.01, 7.00 and 10.01.') }}</p>
      <p class="setup-muted mt-3">{{ t('KCl 3 M is for compatible electrode storage or filling. It is not offered as a calibration standard.') }}</p>
    </section>
    <section class="setup-panel"><h2>{{ t('Preparation checklist') }}</h2>
      <ul class="setup-list"><li>{{ t('Use fresh aliquots. Rinse between solutions and never return used solution to the bottle.') }}</li><li>{{ t('Keep the temperature probe in the same solution and wait for stable readings.') }}</li><li>{{ t('Review reference values and probe identity before starting. Previous calibration stays active until a validated replacement is confirmed.') }}</li></ul>
    </section>
    <section class="setup-panel"><h2>{{ t('pH calibration') }}</h2>
      <p>{{ t('Start with pH 7 for offset, then pH 4 and pH 10 for the acidic and alkaline response. A two-point 7 + 4 or 7 + 10 procedure can be offered for the intended range.') }}</p>
      <p class="setup-muted mt-3">{{ t('Buffer temperature corrections must match the actual bottles. No additional pH buffers are required for this plan.') }}</p>
      <v-btn disabled class="mt-4" variant="outlined">{{ t('Start pH calibration') }}</v-btn>
    </section>
    <section class="setup-panel"><h2>{{ t('Conductivity calibration') }}</h2>
      <p>{{ t('Use the Akso 1413 µS/cm standard at 25 °C, or its certified value at the measured temperature. First validate excitation, electronics and temperature readings, then calibrate the cell constant.') }}</p>
      <p class="setup-muted mt-3">{{ t('A second standard near the operating range can verify performance later. A dry cell check does not replace the electrical system-zero procedure.') }}</p>
      <v-btn disabled class="mt-4" variant="outlined">{{ t('Start EC calibration') }}</v-btn>
    </section>
  </div>
  <section class="setup-panel mt-5"><h2>{{ t('Electronics calibration · current PCB') }}</h2>
    <v-chip size="small" variant="tonal" class="mb-3">{{ t('Bench procedure · physical jumpers') }}</v-chip>
    <p>{{ t('Separate from routine probe calibration. The guided session must confirm each physical connection and verify the expected electrical reading before accepting a point.') }}</p>
    <ol class="setup-list mt-4"><li>{{ t('Confirm the PCB revision and identify J4 reference paths and J2 zero/measurement positions against the schematic.') }}</li><li>{{ t('At the bench, select the 20 Ω and 200 Ω reference paths in turn to characterize the actual front end.') }}</li><li>{{ t('Use the verified J2 system-zero position when instructed; an open cell is a different condition.') }}</li><li>{{ t('Restore the normal probe connections and verify measurements before returning to service.') }}</li></ol>
    <p class="setup-muted">{{ t('This page is a preparation guide, not an active jumper procedure. Pin-level instructions and acceptance limits will be enabled only after validation on the assembled PCB.') }}</p>
    <v-btn disabled variant="outlined" class="mt-4">{{ t('Start electronics calibration') }}</v-btn>
  </section>
  <p class="setup-muted mt-4">{{ t('Future PCB: switch reference and zero paths electronically, preserving isolation and accounting for switch resistance and leakage. Solution immersion remains a physical step.') }}</p>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const { t } = useLanguage();
</script>
