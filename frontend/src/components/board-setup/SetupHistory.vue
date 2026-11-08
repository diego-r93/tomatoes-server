<template>
  <section class="setup-panel"><h2>{{ t('Calibration history is not available yet') }}</h2><p>{{ t('The current firmware does not report versioned calibration records. Existing calibration status is unknown; it is not marked as calibrated or uncalibrated.') }}</p><p class="setup-muted mt-4">{{ t('Future records will include the operator, probe, reference solutions, quality, coefficients and device-confirmed revision. Saving on the server alone will not count as applied.') }}</p></section>
</template>
<script setup>
import { useLanguage } from '@/composables/useLanguage';
const { t } = useLanguage();
</script>
