<template>
  <v-menu v-model="open" :close-on-content-click="false" location="bottom end">
    <template #activator="{props: menuProps}"><v-btn v-bind="menuProps" class="time-range-button" variant="outlined" :aria-label="t('Time range: {range}',{range:label})"><v-icon icon="mdi-clock-outline" size="16"/><span>{{ label }}</span><v-icon icon="mdi-chevron-down" size="14"/></v-btn></template>
    <v-card class="time-range-picker">
      <v-form class="custom-range" @submit.prevent="apply">
        <h2>{{ t("Custom time range") }}</h2>
        <label class="time-label">{{ t("From") }}<div class="time-field"><input v-model="from" :aria-label="t('From')" placeholder="now-1h" spellcheck="false"><input class="calendar-input" :style="{ colorScheme: calendarScheme }" type="datetime-local" step="1" :aria-label="t('Choose From date')" :value="calendarValue(from)" @change="from = readCalendar($event)"></div></label>
        <label class="time-label">{{ t("To") }}<div class="time-field"><input v-model="to" :aria-label="t('To')" placeholder="now" spellcheck="false"><input class="calendar-input" :style="{ colorScheme: calendarScheme }" type="datetime-local" step="1" :aria-label="t('Choose To date')" :value="calendarValue(to)" @change="to = readCalendar($event)"></div></label>
        <p class="time-hint">{{ t('Dates use {timezone}. Examples: now-90m, now-2d, or 2026-11-02 08:00:00.',{timezone:timezoneName(timezone)}) }}</p>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3" role="alert">{{ t(error) }}</v-alert>
        <v-btn type="submit" color="primary" class="apply-range">{{ t("Apply time range") }}</v-btn>
      </v-form>
      <section class="quick-range-section" :aria-label="t('Quick ranges')">
        <v-text-field v-model="search" :aria-label="t('Search quick ranges')" :placeholder="t('Search quick ranges')" prepend-inner-icon="mdi-magnify" clearable hide-details variant="outlined" density="compact" class="quick-range-search"/>
        <div class="quick-ranges"><v-btn v-for="[title, value] in filteredRanges" :key="value" variant="text" size="small" :aria-pressed="modelValue === value" @click="emit('update:modelValue', value); open = false">{{ t(title) }}</v-btn><p v-if="!filteredRanges.length" class="empty-search" role="status">{{ t("No quick ranges found.") }}</p></div>
      </section>
    </v-card>
  </v-menu>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const {t} = useLanguage();
import { computed, ref, watch } from 'vue';
import { useTheme } from 'vuetify';
import { timeRanges } from '@/composables/dashboardUtils.mjs';
import { parseTime, rangeBounds, timeInput, timezoneName } from '@/composables/dashboardTimeRange.mjs';
import type { DashboardRange } from '@/composables/dashboardStateTypes';

const props = withDefaults(defineProps<{ modelValue: DashboardRange; timezone?: string }>(), { timezone: 'Browser' });
const emit = defineEmits<{ 'update:modelValue': [range: DashboardRange] }>();
const theme = useTheme(), calendarScheme = computed(() => theme.current.value.dark ? 'dark' : 'light');
const open = ref(false), from = ref('now-1h'), to = ref('now'), error = ref(''), search = ref<string | null>('');
const filteredRanges = computed(() => { const term = (search.value || '').trim().toLowerCase(); return timeRanges.filter(([title, value]) => `${t(title)} ${title} ${value}`.toLowerCase().includes(term)); });
const label = computed(() => typeof props.modelValue === 'string' ? t(timeRanges.find(([, value]) => value === props.modelValue)?.[0] || 'now' + props.modelValue) : `${props.modelValue.from} → ${props.modelValue.to}`);
watch(open, value => { if (value) { from.value = typeof props.modelValue === 'string' ? 'now' + props.modelValue : props.modelValue.from; to.value = typeof props.modelValue === 'string' ? 'now' : props.modelValue.to; error.value = ''; search.value = ''; } });
function readCalendar(event: Event) {
  return event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value.replace('T', ' ') : '';
}
function calendarValue(value: string) { try { return timeInput(parseTime(value, props.timezone), props.timezone); } catch { return ''; } }
function apply() { try { const candidate = { from: from.value.trim(), to: to.value.trim() }; rangeBounds(candidate, props.timezone); emit('update:modelValue', candidate); open.value = false; } catch (issue) { error.value = issue instanceof Error ? issue.message : 'Invalid time range.'; } }
</script>
<style scoped lang="scss">
.time-range-button{height:32px!important;width:auto!important;min-width:0!important;max-width:360px!important;padding:0 8px!important;font-size:12px;color:rgb(var(--v-theme-muted));border-radius:3px}.time-range-button :deep(.v-btn__content){gap:6px;min-width:0;max-width:100%}.time-range-button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.time-range-picker{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);padding:0;width:660px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 80px);overflow:auto;background:rgb(var(--v-theme-surface))}.time-range-picker h2{font-size:14px;font-weight:500;margin:0 0 12px}.time-label{display:block;font-size:12px;color:rgb(var(--v-theme-muted));margin-bottom:14px}.time-field{display:flex;align-items:center;border:1px solid rgb(var(--v-theme-border));border-radius:3px;background:rgb(var(--v-theme-background));margin-top:5px}.time-field>input:first-child{background:transparent;border:0;min-width:0;width:100%;padding:9px 10px;color:rgb(var(--v-theme-on-surface));font-size:13px}.calendar-input{background:transparent;border:0;width:38px;min-width:38px;height:34px;padding:6px;border-left:1px solid rgb(var(--v-theme-border))}.calendar-input::-webkit-datetime-edit{display:none}.calendar-input::-webkit-calendar-picker-indicator{margin:0}.time-hint{font-size:12px;line-height:1.6;color:rgb(var(--v-theme-muted));margin:0 0 14px}.custom-range{padding:18px;min-width:0}.quick-range-section{padding:14px 0;min-width:0;border-left:1px solid rgb(var(--v-theme-border))}.quick-range-search{margin:0 12px 10px}.quick-range-search :deep(input){font-size:12px}.quick-ranges{display:flex;flex-direction:column;gap:0;max-height:390px;overflow-y:auto;scrollbar-width:thin}.empty-search{padding:16px;font-size:12px;color:rgb(var(--v-theme-muted))}.quick-ranges :deep(.v-btn){justify-content:flex-start;font-size:13px;padding-inline:14px;min-width:0;width:100%;min-height:34px;border-radius:0}.quick-ranges [aria-pressed=true]{background:rgb(var(--v-theme-selection));color:rgb(var(--v-theme-primary))}
@media(max-width:760px){.time-range-button{max-width:230px!important}}
@media(max-width:600px){.time-range-picker{grid-template-columns:minmax(0,1fr)}.custom-range{padding:16px}.quick-range-section{border-left:0;border-top:1px solid rgb(var(--v-theme-border))}.quick-ranges{max-height:230px}}
@media(max-width:380px){.time-range-button{max-width:180px!important}}
</style>
