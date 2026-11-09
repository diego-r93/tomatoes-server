<template>
  <section class="driver-feedback">
    <div class="feedback-header">
      <h3>{{ t('Last pump pulses') }}</h3>
      <v-btn size="small" variant="outlined" prepend-icon="mdi-history" @click="historyOpen = true">
        {{ t('Pulse history') }}
      </v-btn>
    </div>
    <p class="driver-note">{{ t('Driver feedback confirms the electrical output, not water flow. Each driver is shared by two pumps.') }}</p>
    <div v-if="device.driverPulses?.length" class="driver-pulses">
      <div v-for="pump in device.driverPulses || []" :key="pump.code" class="driver-pump">
        <div class="driver-heading"><strong>#{{ pump.pump }}</strong><v-icon :icon="pump.result === 'actuated' ? 'mdi-check-circle-outline' : driverProblem(pump.result) ? 'mdi-alert-circle-outline' : 'mdi-clock-outline'" :color="pump.result === 'actuated' ? 'success' : driverProblem(pump.result) ? 'error' : 'muted'" size="18" /></div>
        <p :class="{'text-success':pump.result === 'actuated','text-error':driverProblem(pump.result)}">{{ t(driverMessage(pump.result)) }}</p>
        <small v-if="pump.latest">{{ pump.latest.startAt ? t('Start') : t('Expected') }}: {{ pulseTime(pump.latest.startAt || pump.latest.expectedAt) }} · {{ pump.latest.endReceived ? t('End received') : t('End not received yet') }}</small>
        <details v-if="pump.latest"><summary>{{ t('Details and recent pulses') }}</summary>
          <p class="driver-registers">{{ t('Start registers') }}: active={{ pump.latest.start.active ?? '—' }}, fault={{ pump.latest.start.fault ?? '—' }}, status={{ pump.latest.start.status ?? '—' }}<br />{{ t('End registers') }}: active={{ pump.latest.end.active ?? '—' }}, fault={{ pump.latest.end.fault ?? '—' }}, status={{ pump.latest.end.status ?? '—' }}</p>
          <div v-for="(pulse, index) in [pump.latest,...pump.history].slice(0,5)" :key="index" class="driver-history"><time>{{ pulseTime(pulse.startAt || pulse.expectedAt || pulse.endAt) }}</time><span>{{ t(driverMessage(pulse.result)) }} · {{ pulse.endReceived ? t('End received') : t('End not received yet') }}</span></div>
        </details>
      </div>
    </div>
    <p v-else class="driver-note">{{ t('No pulse observed') }}</p>
    <PumpHistoryDialog v-if="historyOpen" :key="device.host" :host="device.host" @close="historyOpen = false" />
  </section>
</template>
<script setup>
import { ref } from 'vue';
import PumpHistoryDialog from './PumpHistoryDialog.vue';
import { useLanguage } from '@/composables/useLanguage';
import { formatTime, formatDateTime } from '@/composables/dateTime.mjs';
import { driverMessage, driverProblem } from '@/composables/pumpDriverFeedback.mjs';
const props = defineProps({device:{type:Object,required:true},clock:Number});
const {t} = useLanguage();
const historyOpen = ref(false);
function pulseTime(value) { return value ? (Math.abs((props.clock || Date.now()) - value) >= 86400000 ? formatDateTime(value) : formatTime(value)) : '—'; }
</script>
<style scoped lang="scss">
.driver-feedback { margin-top:18px; border-top:1px solid rgb(var(--v-theme-border)); padding-top:16px; } h3 {font-size:14px;font-weight:500;} .driver-note,.driver-registers {font-size:12px;color:rgb(var(--v-theme-muted));line-height:1.5;margin:8px 0;} .driver-pump {padding:12px 0;border-bottom:1px solid rgb(var(--v-theme-border));} .driver-heading {display:flex;align-items:center;justify-content:space-between;font-size:13px;} .driver-pump>p {font-size:13px;margin:6px 0;} small,summary {font-size:12px;color:rgb(var(--v-theme-muted));} summary {cursor:pointer;margin-top:8px;} .driver-registers {overflow-wrap:anywhere;} .driver-history {display:grid;grid-template-columns:70px 1fr;gap:8px;font-size:11px;border-top:1px solid rgb(var(--v-theme-border));padding:6px 0;}

.driver-feedback { container-type: inline-size; }
.driver-pulses { display: grid; gap: 8px 14px; align-items: start; }
.driver-pump { min-width: 0; }
.driver-history { grid-template-columns: minmax(0, 1fr); gap: 2px; }
@container (min-width: 420px) {
  .driver-pulses { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.feedback-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
</style>
