<template>
  <v-card variant="outlined" class="activity-history" :title="t('Recent activity')"><v-card-text>
    <div class="activity-filters"><v-text-field v-model="search" :label="t('Search activity')" :placeholder="t('Description, actor or IP address')" prepend-inner-icon="mdi-magnify" variant="outlined" clearable hide-details/><v-select v-model="action" :label="t('Activity type')" :items="actionOptions" hide-details variant="outlined"/><v-text-field v-model="from" :label="t('From date')" type="date" hide-details variant="outlined"/><v-text-field v-model="through" :label="t('To date')" type="date" hide-details variant="outlined"/></div>
    <div class="activity-tools"><span>{{ t('Times use {timezone} · YYYY-MM-DD HH:mm:ss', { timezone }) }}</span><div><v-btn size="small" variant="text" :disabled="!hasFilters" @click="clearFilters">{{ t('Clear filters') }}</v-btn><v-btn size="small" variant="outlined" prepend-icon="mdi-refresh" :disabled="loading" @click="load">{{ t('Refresh activity') }}</v-btn></div></div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">{{ t(error) }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate :aria-label="t('Loading activity')"/>
    <v-table class="activity-table" :aria-busy="loading" :aria-label="t('User activity')"><thead><tr><th>{{ t('When') }}</th><th>{{ t('Activity') }}</th><th>{{ t('Actor') }}</th><th>{{ t('IP address') }}</th></tr></thead><tbody><tr v-for="item in items" :key="item.id"><td class="activity-date">{{ dateTime(item.createdAt, t('Never')) }}</td><td>{{ activityDescription(item) }}<small>{{ actionLabel(item.action) }}</small></td><td>{{ item.actor }}</td><td>{{ item.ip || '—' }}</td></tr><tr v-if="!items.length && !loading"><td colspan="4">{{ t(hasFilters ? 'No activity matches these filters.' : 'No recorded activity.') }}</td></tr></tbody></v-table>
    <nav class="activity-pagination" :aria-label="t('Activity pages')"><span aria-live="polite">{{ t('{start}–{end} of {total} events', { start: total ? (page-1)*pageSize+1 : 0, end: Math.min(page*pageSize,total), total }) }}</span><div><label>{{ t('Rows per page') }}<select v-model.number="pageSize" :aria-label="t('Activity rows per page')"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option></select></label><v-btn icon="mdi-chevron-left" size="small" variant="text" :aria-label="t('Previous activity page')" :disabled="loading || page === 1" @click="changePage(page-1)"/><span>{{ t('Page {page} of {total}', { page, total: pageCount }) }}</span><v-btn icon="mdi-chevron-right" size="small" variant="text" :aria-label="t('Next activity page')" :disabled="loading || page === pageCount" @click="changePage(page+1)"/></div></nav>
  </v-card-text></v-card>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { isCancel } from 'axios';
import type { ActivityFilters, UserActivity } from '@/services/userTypes';
import userService from '@/services/userService';
import { dateTime, userError } from '@/composables/userManagementUtils';

const { t } = useLanguage();
const props = defineProps({ userId: { type: Number, required: true }, refreshKey: { type: Number, default: 0 } });
const items = ref<UserActivity[]>([]), total = ref(0), page = ref(1), pageSize = ref(10), search = ref(''), action = ref(''), from = ref(''), through = ref(''), actions = ref<string[]>([]), loading = ref(false), error = ref('');
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value))), hasFilters = computed(() => Boolean(search.value || action.value || from.value || through.value));
const actionLabel = (value: string) => t(value.replace(/[._]/g, ' ').replace(/^./, character => character.toUpperCase()));
function activityDescription(item: UserActivity) {
  const descriptions = [
    [/^Signed in from (.*)$/, 'Signed in from {ip}', 'ip'],
    [/^Deleted account (.*)$/, 'Deleted account {name}', 'name'],
    [/^Saved group (.*)$/, 'Saved group {name}', 'name'],
    [/^Deleted group (.*); user accounts were kept$/, 'Deleted group {name}; user accounts were kept', 'name'],
    [/^Created invitation for (.*)$/, 'Created invitation for {email}', 'email'],
    [/^Renewed invitation for (.*)$/, 'Renewed invitation for {email}', 'email'],
    [/^Revoked invitation for (.*)$/, 'Revoked invitation for {email}', 'email'],
    [/^Email submitted for invitation (\d+)$/, 'Email submitted for invitation {id}', 'id'],
    [/^Email delivery failed for invitation (\d+)$/, 'Email delivery failed for invitation {id}', 'id'],
  ] as const;
  for (const [pattern, key, parameter] of descriptions) {
    const match = pattern.exec(item.description);
    if (match) return t(key, { [parameter]: match[1] });
  }
  return t(item.description);
}
const actionOptions = computed(() => [{title: t('All activity'),value:''}, ...actions.value.map(value => ({ title: actionLabel(value), value }))]);
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let serial = 0;
async function load() {
  clearTimeout(timer); const current = ++serial; controller?.abort(); controller = new AbortController(); loading.value = true; error.value = '';
  try {
    if (from.value && through.value && from.value > through.value) throw new Error('From date must be on or before To date.');
    const params: ActivityFilters = {page:page.value,pageSize:pageSize.value,search:search.value || '',action:action.value};
    if (from.value) params.from = new Date(from.value + 'T00:00:00').toISOString();
    if (through.value) { const end = new Date(through.value + 'T00:00:00'); end.setDate(end.getDate()+1); params.before = end.toISOString(); }
    const {data} = await userService.activity(props.userId, params, controller.signal);
    if (current !== serial) return;
    items.value = data.items; total.value = data.total; page.value = data.page; actions.value = data.actions;
  } catch (issue) { if (current === serial && !isCancel(issue)) { items.value = []; total.value = 0; page.value = 1; error.value = userError(issue); } }
  finally { if (current === serial) loading.value = false; }
}
function changePage(value: number) { page.value = value; load(); }
function clearFilters() { search.value = ''; action.value = ''; from.value = ''; through.value = ''; }
watch([search, action, from, through, pageSize], () => { page.value = 1; controller?.abort(); serial++; clearTimeout(timer); timer = setTimeout(load, 250); });
watch(() => [props.userId, props.refreshKey], () => { page.value = 1; load(); }, { immediate:true });
onBeforeUnmount(() => { clearTimeout(timer); serial++; controller?.abort(); });
</script>
<style scoped lang="scss">
.activity-history{border-color:rgb(var(--v-theme-border));margin-bottom:20px}.activity-filters{display:grid;grid-template-columns:minmax(180px,1.5fr) minmax(160px,1fr) repeat(2,minmax(145px,.8fr));gap:12px}.activity-tools,.activity-pagination,.activity-tools>div,.activity-pagination>div,.activity-pagination label{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.activity-tools,.activity-pagination{justify-content:space-between;color:rgb(var(--v-theme-muted));font-size:12px;margin:14px 0}.activity-table small{display:block;font-size:11px;color:rgb(var(--v-theme-muted));margin-top:4px}.activity-date{white-space:nowrap;font-variant-numeric:tabular-nums}.activity-pagination select{padding:4px 8px;border:1px solid rgb(var(--v-theme-border));border-radius:3px;background:rgb(var(--v-theme-background));color:inherit}.activity-pagination{margin-bottom:0}.activity-table :deep(table){min-width:680px}.activity-table :deep(td){overflow-wrap:anywhere}
@media(max-width:1000px){.activity-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:500px){.activity-filters{grid-template-columns:minmax(0,1fr)}.activity-pagination>div{gap:4px}.activity-pagination label{flex-basis:100%}}
</style>
