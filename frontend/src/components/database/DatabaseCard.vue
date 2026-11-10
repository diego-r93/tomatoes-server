<template>
  <section class="pump-editor" :aria-busy="working">
    <v-btn class="back-button" variant="text" prepend-icon="mdi-arrow-left" :disabled="working" @click="emit('back')">{{ t('All pumps') }}</v-btn>
    <div class="editor-heading"><div><h1 class="app-page-title">{{ draft.pumperName }}</h1><div class="editor-meta"><code>{{ cardData.pumperCode }}</code><BoardConnectionBadge v-if="connection" :connection="connection"/><span>{{ t('Pulse') }}: <strong>{{ pulseDurationLabel }}</strong></span></div></div><div v-if="canManage" class="actions"><v-btn variant="outlined" prepend-icon="mdi-tune-variant" :disabled="working" @click="openPump">{{ t('Edit pump') }}</v-btn><v-btn color="primary" prepend-icon="mdi-plus" :disabled="working" @click="openAdd">{{ t('Add schedules') }}</v-btn></div></div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">{{ t(error) }}</v-alert>
    <nav class="period-tabs" :aria-label="t('Time of day')"><button v-for="item in periods" :key="item.value" type="button" :aria-pressed="period === item.value" :disabled="working" @click="period = item.value"><span>{{ t(item.title) }}</span><small>{{ periodCount(item) }}</small></button></nav>
    <div class="editor-filters"><v-text-field v-model="timeQuery" :label="t('Find a time')" :placeholder="t('For example, 07:30')" prepend-inner-icon="mdi-magnify" clearable hide-details variant="outlined" :disabled="working"/><v-select v-model="timeStatus" :label="t('Schedule status')" :items="statusOptions" hide-details variant="outlined" :disabled="working"/></div>
    <div class="result-count" aria-live="polite"><span>{{ t('{shown} of {total} schedules', { shown: entries.length, total: draft.driveTimes.length }) }}</span><span>{{ t('{count} enabled', { count: enabledCount }) }}</span></div>
    <div class="times-table"><table><colgroup><col class="time-column"><col><col class="actions-column"></colgroup><thead><tr><th>{{ t('Start time') }}</th><th>{{ t('Schedule status') }}</th><th class="right">{{ t('Actions') }}</th></tr></thead><tbody><tr v-for="entry in visibleEntries" :key="entry.index"><td class="numeric">{{ showSeconds ? entry.time : entry.time.slice(0, 5) }}</td><td><div class="enabled-control" :class="{'is-disabled': !entry.state}"><v-switch :model-value="Boolean(entry.state)" color="primary" hide-details :disabled="working || !canManage" :aria-label="t('Enable {time}', { time: entry.time })" @update:model-value="draft.driveTimes[entry.index].state = Boolean($event)"/><span>{{ t(entry.state ? 'Enabled' : 'Disabled') }}</span></div></td><td class="right"><v-menu v-if="canManage"><template #activator="{ props: menuProps }"><v-btn v-bind="menuProps" icon="mdi-dots-horizontal" variant="text" size="small" :disabled="working" :aria-label="t('Actions for {time}', { time: entry.time })"/></template><v-list density="compact"><v-list-item :title="t('Edit time')" prepend-icon="mdi-pencil-outline" @click="openTime(entry)"/><v-list-item :title="t('Delete time')" prepend-icon="mdi-trash-can-outline" @click="removeIndex = entry.index; deleteOpen = true"/></v-list></v-menu></td></tr><tr v-if="!entries.length"><td colspan="3" class="empty">{{ t('No schedules match this view.') }}</td></tr></tbody></table></div>
    <div class="pager"><span>{{ t('{start}–{end} of {count}', { start: rangeStart, end: rangeEnd, count: entries.length }) }}</span><div><v-btn icon="mdi-chevron-left" variant="outlined" size="small" :aria-label="t('Previous schedules')" :disabled="working || page === 1" @click="page--"/><span>{{ t('Page {page} of {total}', { page, total: pageCount }) }}</span><v-btn icon="mdi-chevron-right" variant="outlined" size="small" :aria-label="t('Next schedules')" :disabled="working || page === pageCount" @click="page++"/></div></div>
    <div v-if="canManage" class="save-bar"><span :class="{dirty}">{{ t(dirty ? 'Unsaved changes' : 'All changes saved') }}</span><div class="actions"><v-btn variant="outlined" :disabled="working || !dirty" @click="discard">{{ t('Discard') }}</v-btn><v-btn color="primary" prepend-icon="mdi-content-save-outline" :loading="working" :disabled="working || !dirty" @click="save">{{ t('Save changes') }}</v-btn></div></div>
    <div v-if="canManage" class="danger-zone"><v-btn variant="text" size="small" color="error" prepend-icon="mdi-trash-can-outline" :disabled="working" @click="deletePumpOpen = true">{{ t('Delete pump') }}</v-btn></div>
  </section>
  <v-dialog v-model="pumpOpen" max-width="480" persistent><v-card><v-card-title>{{ t('Edit pump') }}</v-card-title><v-card-text><p class="muted">{{ t('Device and channel') }}</p><code class="fixed-code">{{ cardData.pumperCode }}</code><v-form @submit.prevent="applyPump"><v-text-field v-model="nameDraft" :label="t('Pump name')" class="mt-5"/><v-text-field v-model="pulseDraft" :label="t(durationUnit === 'minutes' ? 'Pulse duration (min)' : 'Pulse duration (ms)')" type="number" min="0" step="any"/><v-alert v-if="dialogError" type="error" variant="tonal" role="alert">{{ t(dialogError) }}</v-alert><div class="dialog-actions"><v-btn @click="pumpOpen = false">{{ t('Cancel') }}</v-btn><v-btn type="submit" color="primary">{{ t('Apply changes') }}</v-btn></div></v-form></v-card-text></v-card></v-dialog>
  <v-dialog v-model="timeOpen" max-width="480" persistent><v-card><v-card-title>{{ t(editIndex === -1 ? 'Add schedules' : 'Edit time') }}</v-card-title><v-card-text><v-form @submit.prevent="applyTimes"><v-select v-if="editIndex === -1" v-model="addMode" :label="t('Schedule mode')" :items="[{title: t('One time'),value:'single'},{title: t('Repeat in a time range'),value:'repeat'}]"/><v-text-field v-model="startDraft" :label="t(addMode === 'repeat' ? 'From' : 'Start time')" type="time" step="1"/><template v-if="addMode === 'repeat'"><v-text-field v-model="endDraft" :label="t('Through')" type="time" step="1"/><v-select v-model="stepDraft" :label="t('Every (minutes)')" :items="[15, 30, 60, 120]"/><p class="muted mb-4">{{ t('{count} new start times · existing times are skipped', { count: generated.length }) }}</p></template><p v-if="editIndex === -1" class="muted mb-4">{{ t('New schedules start disabled. Changes take effect after Save changes.') }}</p><v-alert v-if="dialogError" type="error" variant="tonal" role="alert">{{ t(dialogError) }}</v-alert><div class="dialog-actions"><v-btn @click="timeOpen = false">{{ t('Cancel') }}</v-btn><v-btn type="submit" color="primary">{{ t(editIndex === -1 ? 'Add to draft' : 'Apply time') }}</v-btn></div></v-form></v-card-text></v-card></v-dialog>
  <v-dialog v-model="deleteOpen" max-width="430" persistent><v-card><v-card-title>{{ t('Delete schedule?') }}</v-card-title><v-card-text>{{ t('Remove {time} from this pump? Save changes to apply this deletion.', { time: draft.driveTimes[removeIndex]?.time }) }}</v-card-text><v-card-actions><v-spacer/><v-btn @click="deleteOpen = false">{{ t('Cancel') }}</v-btn><v-btn color="error" @click="draft.driveTimes.splice(removeIndex, 1); deleteOpen = false">{{ t('Delete schedule') }}</v-btn></v-card-actions></v-card></v-dialog>
  <v-dialog v-model="deletePumpOpen" max-width="460" persistent><v-card><v-card-title>{{ t('Delete pump?') }}</v-card-title><v-card-text>{{ t('Delete {name} and all its stored schedules? The pump will be removed immediately.', { name: cardData.pumperName }) }}<v-alert v-if="deleteError" type="error" variant="tonal" class="mt-4">{{ t(deleteError) }}</v-alert></v-card-text><v-card-actions><v-spacer/><v-btn :disabled="working" @click="deletePumpOpen = false">{{ t('Cancel') }}</v-btn><v-btn color="error" :disabled="working" :loading="working" @click="deletePump">{{ t('Delete pump') }}</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { computed, ref, watch } from 'vue';
import { isAxiosError } from 'axios';
import type { DriveTime, PumpSchedule } from '@/services/mongoDataService';
import type { ScheduleStatus } from '@/composables/boardScheduleUtils';
import type { BoardConnection } from './BoardConnectionBadge.vue';
import mongoDataService from '@/services/mongoDataService';
import BoardConnectionBadge from './BoardConnectionBadge.vue';
import { boardId, boardDetails, pulseLabel, scheduleEntries, validatedTime } from '@/composables/boardScheduleUtils';
const { language, t } = useLanguage();
const props = withDefaults(defineProps<{
  canManage?: boolean;
  connection?: BoardConnection | null;
  cardData: PumpSchedule;
  query?: string;
  status?: ScheduleStatus;
  showSeconds?: boolean;
  durationUnit?: 'minutes' | 'milliseconds';
  rows?: number;
}>(), { connection: null, query: '', status: 'all', durationUnit: 'minutes', rows: 8 });
const emit = defineEmits<{ updated: [board: PumpSchedule]; delete: [id: string]; busy: [active: boolean]; dirty: [changed: boolean]; back: [] }>();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const fields = (board: PumpSchedule) => ({ pumperName: board.pumperName, pulseDuration: board.pulseDuration, driveTimes: clone(board.driveTimes || []) });
const issueMessage = (issue: unknown) => issue instanceof Error ? issue.message : String(issue);
const baseline = ref(fields(props.cardData)), draft = ref(clone(baseline.value));
const pulseDurationLabel = computed(() => t(pulseLabel(draft.value.pulseDuration, props.durationUnit, language.value)));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(baseline.value));
watch(dirty, value => emit('dirty', value), { immediate: true });
watch(() => props.cardData, value => { if (!dirty.value) { baseline.value = fields(value); draft.value = clone(baseline.value); } });
const working = ref(false), error = ref(''), deleteError = ref('');
const period = ref('all'), timeQuery = ref(/^\d/.test(props.query) ? props.query : ''), timeStatus = ref(props.status), page = ref(1);
const periods = [{ value: 'all', title: 'All times', from: 0, to: 24 }, { value: 'night', title: 'Night', from: 0, to: 6 }, { value: 'morning', title: 'Morning', from: 6, to: 12 }, { value: 'afternoon', title: 'Afternoon', from: 12, to: 18 }, { value: 'evening', title: 'Evening', from: 18, to: 24 }];
const statusOptions = computed(() => [{ title: t('All schedules'), value: 'all' }, { title: t('Enabled'), value: 'enabled' }, { title: t('Disabled'), value: 'disabled' }]);
type Period = (typeof periods)[number];
const inPeriod = (time: string, item: Period) => Number(time.slice(0, 2)) >= item.from && Number(time.slice(0, 2)) < item.to;
const periodCount = (item: Period) => draft.value.driveTimes.filter(entry => inPeriod(entry.time, item)).length;
const entries = computed(() => scheduleEntries(draft.value, timeQuery.value || '', timeStatus.value).filter(entry => inPeriod(entry.time, periods.find(item => item.value === period.value) ?? periods[0])));
const enabledCount = computed(() => draft.value.driveTimes.filter(entry => entry.state).length);
const pageCount = computed(() => Math.max(1, Math.ceil(entries.value.length / props.rows)));
const visibleEntries = computed(() => entries.value.slice((page.value - 1) * props.rows, page.value * props.rows));
const rangeStart = computed(() => entries.value.length ? (page.value - 1) * props.rows + 1 : 0), rangeEnd = computed(() => Math.min(page.value * props.rows, entries.value.length));
watch([period, timeQuery, timeStatus, () => props.rows], () => { page.value = 1; });
watch(pageCount, count => { page.value = Math.min(page.value, count); });
const pumpOpen = ref(false), timeOpen = ref(false), deleteOpen = ref(false), deletePumpOpen = ref(false), dialogError = ref('');
const nameDraft = ref(''), pulseDraft = ref(''), startDraft = ref(''), endDraft = ref('18:00'), stepDraft = ref(30), addMode = ref('single'), editIndex = ref(-1), removeIndex = ref(-1);
function openPump() { nameDraft.value = draft.value.pumperName; pulseDraft.value = String(props.durationUnit === 'minutes' ? draft.value.pulseDuration / 60000 : draft.value.pulseDuration); dialogError.value = ''; pumpOpen.value = true; }
function applyPump() { try { Object.assign(draft.value, boardDetails(nameDraft.value, Math.round(Number(pulseDraft.value) * (props.durationUnit === 'minutes' ? 60000 : 1)))); pumpOpen.value = false; } catch (issue) { dialogError.value = issueMessage(issue); } }
function openAdd() { editIndex.value = -1; addMode.value = 'single'; startDraft.value = '06:00'; endDraft.value = '18:00'; stepDraft.value = 30; dialogError.value = ''; timeOpen.value = true; }
function openTime(entry: DriveTime & { index: number }) { editIndex.value = entry.index; addMode.value = 'single'; startDraft.value = entry.time; dialogError.value = ''; timeOpen.value = true; }
const seconds = (time: string) => { const [h, m, s = 0] = time.split(':').map(Number); return h * 3600 + m * 60 + s; };
const fromSeconds = (value: number) => [Math.floor(value / 3600), Math.floor(value % 3600 / 60), value % 60].map(n => String(n).padStart(2, '0')).join(':');
const generated = computed(() => { try { const start = seconds(validatedTime(startDraft.value, [])), end = seconds(validatedTime(endDraft.value, [])), step = Number(stepDraft.value) * 60; if (end < start || step < 60) return []; return Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, i) => fromSeconds(start + i * step)).filter(time => !draft.value.driveTimes.some(entry => entry.time === time)); } catch { return []; } });
function applyTimes() {
  try {
    if (editIndex.value !== -1) draft.value.driveTimes[editIndex.value].time = validatedTime(startDraft.value, draft.value.driveTimes, editIndex.value);
    else if (addMode.value === 'single') draft.value.driveTimes.push({ time: validatedTime(startDraft.value, draft.value.driveTimes), state: false });
    else { if (!generated.value.length) throw new Error('Choose a valid range containing new start times.'); draft.value.driveTimes.push(...generated.value.map(time => ({ time, state: false }))); }
    timeOpen.value = false;
  } catch (issue) { dialogError.value = issueMessage(issue); }
}
function discard() { draft.value = clone(baseline.value); error.value = ''; }
async function save() {
  if (working.value) return false;
  if (!dirty.value) return true;
  working.value = true; emit('busy', true); error.value = '';
  try {
    const payload = { ...boardDetails(draft.value.pumperName, draft.value.pulseDuration), driveTimes: clone(draft.value.driveTimes) };
    payload.driveTimes.forEach((entry, index) => validatedTime(entry.time, payload.driveTimes, index));
    // Refuse to overwrite changes made since this editor was opened.
    const current = await mongoDataService.getBoard(boardId(props.cardData));
    if (JSON.stringify(fields(current.data)) !== JSON.stringify(baseline.value)) throw new Error('This pump changed elsewhere. Copy your changes, then return to All pumps and refresh before editing again.');
    await mongoDataService.updateBoard(boardId(props.cardData), payload);
    baseline.value = clone(payload); draft.value = clone(payload);
    emit('updated', { ...props.cardData, ...payload }); return true;
  } catch (issue) { error.value = isAxiosError(issue) && issue.response ? 'The change could not be saved. Your draft is still here; try again.' : issueMessage(issue); return false; }
  finally { working.value = false; emit('busy', false); }
}
async function deletePump() {
  if (working.value) return;
  working.value = true; emit('busy', true); deleteError.value = '';
  try { await mongoDataService.deleteBoard(boardId(props.cardData)); baseline.value = clone(draft.value); deletePumpOpen.value = false; emit('dirty', false); emit('delete', boardId(props.cardData)); }
  catch { deleteError.value = 'The pump could not be deleted. Try again.'; }
  finally { working.value = false; emit('busy', false); }
}
defineExpose({ save, discard });
</script>
<style scoped lang="scss">
.pump-editor{min-width:0}.back-button{margin-left:-12px;margin-bottom:12px}.editor-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}.editor-heading>div:first-child{min-width:0}.app-page-title{overflow-wrap:anywhere}.editor-meta{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:rgb(var(--v-theme-muted));margin-top:8px}code{overflow-wrap:anywhere}.actions,.dialog-actions{display:flex;gap:8px;flex-wrap:wrap}.dialog-actions{justify-content:flex-end;margin-top:16px}.period-tabs{display:flex;gap:0;border-bottom:1px solid rgb(var(--v-theme-border));margin-bottom:24px;flex-wrap:wrap}.period-tabs button{padding:12px;border:0;border-bottom:2px solid transparent;background:transparent;color:inherit;font:inherit;font-size:13px}.period-tabs button[aria-pressed=true]{background:rgb(var(--v-theme-selection));border-bottom-color:rgb(var(--v-theme-primary))}.period-tabs small{margin-left:8px;color:rgb(var(--v-theme-muted));font-size:12px}.editor-filters{display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:16px;margin-bottom:16px}.result-count,.pager{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;color:rgb(var(--v-theme-muted));margin:16px 0}.times-table{border:1px solid rgb(var(--v-theme-border));border-radius:4px;overflow:hidden}table{table-layout:fixed;border-collapse:collapse;width:100%;background:rgb(var(--v-theme-surface))}th,td{padding:8px 14px;border-bottom:1px solid rgb(var(--v-theme-border));text-align:left}th{background:rgb(var(--v-theme-table-header));font-size:12px;font-weight:400;color:rgb(var(--v-theme-muted));height:40px}td{height:56px;font-size:13px}tbody tr:last-child td{border-bottom:0}.right{text-align:right}.numeric{font-variant-numeric:tabular-nums;font-weight:500}.enabled-control{display:flex;align-items:center;gap:8px}.enabled-control :deep(.v-switch){flex:0 0 auto}.enabled-control>span{font-size:12px;min-width:52px}.enabled-control.is-disabled{color:rgb(var(--v-theme-muted))}.enabled-control.is-disabled :deep(.v-switch__thumb){background:rgb(var(--v-theme-muted))}.enabled-control.is-disabled :deep(.v-switch__track){background:rgb(var(--v-theme-muted))}.time-column{width:160px}.actions-column{width:88px}.pager>div{display:flex;gap:12px;align-items:center}.pager :deep(.v-btn){width:32px;height:30px;border-radius:3px}.save-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;border-top:1px solid rgb(var(--v-theme-border));margin-top:24px;padding-top:18px;font-size:12px;color:rgb(var(--v-theme-muted))}.dirty{color:rgb(var(--v-theme-warning))}.danger-zone{margin-top:32px}.muted{color:rgb(var(--v-theme-muted));font-size:12px}.fixed-code{display:block;margin-top:6px}.empty{text-align:center;padding:32px}
@media(max-width:700px){.time-column{width:96px}.actions-column{width:60px}.editor-heading{flex-direction:column}.editor-filters{grid-template-columns:1fr}.period-tabs button{padding:10px 8px}.period-tabs small{margin-left:4px}th,td{padding-inline:10px}.editor-meta{gap:8px}.save-bar{align-items:flex-start}}
</style>
