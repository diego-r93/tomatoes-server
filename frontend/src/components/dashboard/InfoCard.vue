<template>
  <AppPageHeader :height="dashboard && mobile ? 120 : 56" class="dashboard-appbar">
    <div class="dashboard-topbar">
      <div class="dashboard-breadcrumb"><v-icon icon="mdi-view-dashboard-outline" size="19"/><router-link to="/dashboard" :aria-label="t('Back to dashboards')">{{ dashboard ? dashboard.folder : t('Dashboards') }}</router-link><template v-if="dashboard"><span>/</span><span class="dashboard-name">{{ dashboard.name }}</span><span v-if="dirty" class="unsaved-dot" :aria-label="t('Unsaved changes')" :title="t('Unsaved changes')" /></template></div>
      <div v-if="dashboard" class="dashboard-controls">
        <v-btn v-if="canManage" icon="mdi-chart-box-plus-outline" variant="outlined" :aria-label="t('Add panel')" :title="t('Add panel')" @click="openEditor()"/>
        <v-btn v-if="canManage" icon="mdi-content-save-outline" variant="outlined" :color="dirty?'primary':undefined" :disabled="!dirty" :loading="saving" :aria-label="t('Save dashboard')" :title="t('Save dashboard')" @click="save"/>
        <v-btn v-if="canManage" icon="mdi-cog-outline" variant="outlined" :aria-label="t('Dashboard settings')" :title="t('Dashboard settings')" @click="openSettings"/>
        <DashboardTimeRange v-if="!dashboardSettings.hideTimePicker" v-model="range" :timezone="dashboardSettings.timezone"/>
        <v-btn icon="mdi-magnify-minus-outline" variant="outlined" :aria-label="t('Zoom out time range')" :title="t('Zoom out time range')" @click="zoomOut"/>
        <div class="refresh-controls"><v-btn icon="mdi-refresh" variant="outlined" :aria-label="t('Refresh panels')" :title="t('Refresh panels')" :disabled="fetching" @click="refreshData"/><select v-model="refresh" :aria-label="t('Auto refresh')"><option v-for="value in ['Off',...dashboardSettings.intervals]" :key="value" :value="value">{{ t(value) }}</option></select></div>
        <v-btn icon="mdi-monitor" variant="outlined" :aria-label="t('Toggle browser full screen')" :title="t('Full screen')" @click="toggleFullscreen"/>
        <v-menu><template #activator="{props}"><v-btn v-bind="props" icon="mdi-dots-vertical" variant="outlined" :aria-label="t('More dashboard actions')" :title="t('More dashboard actions')"/></template><v-list density="compact"><v-list-item v-if="canManage" :title="t('Data explorer')" prepend-icon="mdi-database-search" @click="openEditor()"/><v-list-item :title="t('Export charts')" prepend-icon="mdi-export" @click="exportCurrent"/><v-list-item v-if="canManage" :title="t('Duplicate')" prepend-icon="mdi-content-copy" @click="duplicate"/><v-list-item v-if="canManage" :title="t('Discard changes')" prepend-icon="mdi-undo" :disabled="!dirty" @click="dialog={kind:'discard'}"/></v-list></v-menu>
      </div>
    </div>
  </AppPageHeader>
  <section class="app-page dashboards-page" :class="{'dashboard-canvas':dashboard}">
    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-5" @click:close="error=''">{{ t(error) }}</v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" closable class="mb-5" @click:close="notice=''">{{ t(notice) }}</v-alert>
    <div v-if="loading" class="app-loading-state"><v-progress-circular indeterminate color="secondary"/><p>{{ t("Loading dashboards…") }}</p></div>
    <template v-else-if="!route.params.dashboardId">
      <header class="app-page-heading"><div><h1>{{ t("Dashboards") }}</h1><p>{{ t("Keep server health and growing systems in their own dashboards.") }}</p></div><div class="app-action-row"><v-btn variant="outlined" prepend-icon="mdi-refresh" @click="load">{{ t("Refresh") }}</v-btn><v-btn v-if="canManage" variant="outlined" prepend-icon="mdi-import" @click="importInput?.click()">{{ t("Import charts") }}</v-btn><v-btn v-if="canManage" prepend-icon="mdi-view-grid-plus" color="primary" @click="createDashboard">{{ t("New dashboard") }}</v-btn></div></header>
      <div class="library-filters"><v-text-field v-model="search" :label="t('Search dashboards, descriptions or tags')" prepend-inner-icon="mdi-magnify" variant="outlined" hide-details clearable/><v-select v-model="folder" :items="[{title:t('All folders'),value:'All folders'},...folders.map(value=>({title:value,value}))]" :label="t('Folder')" variant="outlined" hide-details/></div>
      <v-tabs :model-value="favorites?'starred':'all'" color="primary" class="library-tabs" @update:model-value="favorites=$event==='starred'"><v-tab value="all">{{ t("All dashboards") }}</v-tab><v-tab value="starred" prepend-icon="mdi-star-outline">{{ t("Starred") }}</v-tab></v-tabs>
      <div class="library-summary"><span>{{ t(filtered.length===1 ? '{count} dashboard' : '{count} dashboards', {count:filtered.length}) }}</span><span>{{ t("Tomatoes workspace") }}</span></div>
      <div class="library-list app-panel"><v-table class="dashboard-library"><thead><tr><th :aria-label="t('Starred')"/><th>{{ t("Dashboard") }}</th><th>{{ t("Folder") }}</th><th>{{ t("Panels") }}</th><th>{{ t("Updated") }}</th><th :aria-label="t('Actions')"/></tr></thead><tbody><tr v-for="item in filtered" :key="item._id"><td><v-btn :icon="item.favorite?'mdi-star':'mdi-star-outline'" :color="item.favorite?'warning':undefined" variant="text" :aria-label="t('Favorite {name}',{name:item.name})" :disabled="!canManage" @click="toggleFavorite(item)"/></td><td><router-link :to="`/dashboard/${item._id}`" class="library-name"><strong>{{ item.name }}</strong><span>{{ item.description || t('No description') }}</span></router-link></td><td><span class="folder-label"><v-icon icon="mdi-folder-outline" size="16"/> {{ item.folder }}</span></td><td><span class="mobile-column-label">{{ t("Panels:") }} </span>{{ item.panelCount ?? '—' }}</td><td class="updated-column">{{ formatDateTime(item.updatedAt) }}</td><td>
          <div class="app-action-row library-actions">
            <v-btn :to="`/dashboard/${item._id}`" variant="text" size="small">{{ t("Open") }}</v-btn>
            <v-btn v-if="canManage" class="library-delete" icon="mdi-trash-can-outline" variant="text" size="small"
              :title="t('Delete dashboard')" :aria-label="t('Delete dashboard') + ' — ' + item.name"
              @click="dialog = { kind: 'delete-dashboard', item }" />
          </div>
        </td></tr></tbody></v-table><div v-if="!filtered.length" class="app-empty-state"><h2>{{ t(favorites?'No starred dashboards':'No dashboards found') }}</h2><p>{{ t(favorites?'Star a dashboard to find it here.':'Create a dashboard or import your chart JSON.') }}</p><v-btn v-if="canManage && !favorites" color="primary" prepend-icon="mdi-view-grid-plus" @click="createDashboard">{{ t("New dashboard") }}</v-btn></div></div>
    </template>
    <template v-else-if="dashboard">
      <div v-if="!dashboard.charts.length" class="app-empty-state app-panel"><h2>{{ t("Start with your first panel") }}</h2><p>{{ t("Browse available measurements or enter your Flux query.") }}</p><v-btn v-if="canManage" color="primary" prepend-icon="mdi-plus" @click="openEditor()">{{ t("Add panel") }}</v-btn></div>
      <grid-layout v-else-if="!mobile" :layout="layout" :col-num="12" :row-height="26" :margin="[8,8]" :is-draggable="canManage" :is-resizable="canManage" :vertical-compact="true" @update:layout="updateLayout" @layout-updated="updateLayout"><grid-item v-for="{ item, chart } in gridPanels" :key="item.i" v-bind="item" :min-w="3" :min-h="8" drag-allow-from=".chart-header" drag-ignore-from="button,.v-btn" @move="layoutGesture=true" @resize="layoutGesture=true"><DashboardPanel :chart="chart" :result="results[item.i]" :editing="canManage" :timezone="dashboardSettings.timezone" @inspect="openInspector(chart)" @view="focused=item.i" @edit="openEditor(chart)" @remove="confirmRemove(chart)" @move="moveEarlier(item.i)"/></grid-item></grid-layout>
      <div v-else class="mobile-panels"><DashboardPanel v-for="chart in sortedCharts" :key="chart.id" :chart="chart" :result="results[String(chart.id)]" :editing="canManage" :timezone="dashboardSettings.timezone" @inspect="openInspector(chart)" @view="focused=String(chart.id)" @edit="openEditor(chart)" @remove="confirmRemove(chart)" @move="moveEarlier(String(chart.id))"/></div>
    </template>
    <div v-else class="app-empty-state"><h2>{{ t("Dashboard unavailable") }}</h2><v-btn @click="router.push('/dashboard')">{{ t("Back to dashboards") }}</v-btn></div>
    <input ref="importInput" hidden type="file" accept="application/json,.json" @change="importCharts">
  </section>
  <v-dialog :model-value="!!focusedChart" fullscreen :aria-label="focusedChart ? t('View panel: {name}',{name:focusedChart.options.chartTitle}) : t('View panel')" @update:model-value="!$event && (focused=null)">
    <v-card v-if="focusedChart && dashboard" class="focused-chart">
      <header class="focused-toolbar">
        <div class="focused-location"><v-btn icon="mdi-arrow-left" variant="text" size="small" class="focused-back" :aria-label="t('Back to dashboard')" :title="t('Back to dashboard')" @click="focused=null"/><span class="focused-dashboard-label" :title="dashboard.folder+' / '+dashboard.name">{{ dashboard.folder }} / {{ dashboard.name }}</span><span v-if="dirty" class="unsaved-dot" :aria-label="t('Unsaved changes')"/></div>
        <div class="dashboard-controls">
          <v-btn v-if="canManage && dirty" icon="mdi-content-save-outline" variant="outlined" color="primary" :loading="saving" :aria-label="t('Save dashboard')" :title="t('Save dashboard')" @click="save"/>
          <v-btn v-if="canManage" icon="mdi-cog-outline" variant="outlined" :aria-label="t('Edit panel')" :title="t('Panel settings')" @click="openEditor(focusedChart)"/>
          <DashboardTimeRange v-if="!dashboardSettings.hideTimePicker" v-model="range" :timezone="dashboardSettings.timezone"/>
          <v-btn icon="mdi-magnify-minus-outline" variant="outlined" :aria-label="t('Zoom out time range')" :title="t('Zoom out time range')" @click="zoomOut"/>
          <div class="refresh-controls"><v-btn icon="mdi-refresh" variant="outlined" :aria-label="t('Refresh panel')" :title="t('Refresh panel')" :disabled="fetching" @click="refreshData"/><select v-model="refresh" :aria-label="t('Auto refresh')"><option v-for="value in ['Off',...dashboardSettings.intervals]" :key="value" :value="value">{{ t(value) }}</option></select></div>
          <v-btn icon="mdi-monitor" variant="outlined" :aria-label="t('Toggle browser full screen')" :title="t('Full screen')" @click="toggleFullscreen"/>
        </div>
      </header>
      <v-alert v-if="error" type="error" variant="tonal" class="focused-error" role="alert">{{ t(error) }}</v-alert>
      <div class="focused-chart-content"><DashboardPanel :editing="canManage" :chart="focusedChart" :result="results[String(focusedChart.id)]" :timezone="dashboardSettings.timezone" @inspect="openInspector(focusedChart)" @view="undefined" @edit="openEditor(focusedChart)" @remove="confirmRemove(focusedChart)"/></div>
    </v-card>
  </v-dialog>
  <PanelInspector v-if="inspection" :snapshot="inspection" @close="inspection=null"/>
  <PanelEditor v-if="editor" :chart="editor.chart" :is-new="editor.isNew" :bucket="dashboardSettings.bucket" :range="range" :window="currentWindow" :timezone="dashboardSettings.timezone" @close="editor=null" @apply="applyPanel"/>
  <v-dialog v-model="settingsOpen" max-width="1040" scrollable><v-card v-if="settingsDraft"><v-card-title>{{ t("Dashboard settings") }}</v-card-title><v-card-text><div class="settings-layout"><nav><v-btn v-for="name in settingsTabs" :key="name" :variant="settingsTab===name?'tonal':'text'" @click="settingsTab=name">{{ t(name) }}</v-btn></nav><div class="settings-fields"><template v-if="settingsTab==='General'"><label>{{ t("Name") }}<input v-model="settingsDraft.name" maxlength="160"></label><label>{{ t("Description") }}<textarea v-model="settingsDraft.description" rows="3" maxlength="2000"/></label><label>{{ t("Folder") }}<input v-model="settingsDraft.folder" maxlength="100" list="dashboard-folders"><datalist id="dashboard-folders"><option v-for="name in folders" :key="name">{{ name }}</option></datalist></label><label>{{ t("Tags, separated by commas") }}<input v-model="tagText"></label></template><template v-else-if="settingsTab==='Time options'"><label>{{ t("Timezone") }}<select v-model="settingsDraft.settings.timezone"><option value="Browser">{{ t("Browser") }}</option><option>UTC</option><option>America/Sao_Paulo</option></select></label><label>{{ t("Default time range") }}<select v-model="settingsDraft.settings.range"><option v-for="[name,value] in timeRanges" :key="value" :value="value">{{ t(name) }}</option></select></label><label>{{ t("Default auto refresh") }}<select v-model="settingsDraft.settings.refresh" :aria-label="t('Default auto refresh')"><option v-for="value in refreshIntervals" :key="value" :value="value">{{ t(value) }}</option></select></label><label>{{ t("Available refresh intervals, separated by commas") }}<input v-model="intervalText"></label><label class="check"><input v-model="settingsDraft.settings.hideTimePicker" type="checkbox"> {{ t("Hide time picker") }}</label><label class="check"><input v-model="settingsDraft.settings.pauseHidden" type="checkbox"> {{ t("Pause refresh when this browser tab is hidden") }}</label></template><template v-else-if="settingsTab==='Data defaults'"><label>{{ t("Default bucket") }}<input v-model="settingsDraft.settings.bucket"></label><p class="muted">{{ t("Used for new panels. Existing Flux queries keep their own bucket and tag filters.") }}</p></template><pre v-else>{{ JSON.stringify(settingsDraft,null,2) }}</pre></div></div><v-alert v-if="settingsError" type="error" variant="tonal" class="mt-4">{{ t(settingsError) }}</v-alert></v-card-text><v-card-actions><v-spacer/><v-btn @click="settingsOpen=false">{{ t("Cancel") }}</v-btn><v-btn color="primary" variant="flat" @click="applySettings">{{ t("Apply settings") }}</v-btn></v-card-actions></v-card></v-dialog>
  <v-dialog :model-value="!!dialog" max-width="520" persistent><v-card v-if="dialog"><v-card-title>{{ t(dialogTitle) }}</v-card-title><v-card-text><template v-if="dialog.kind==='remove'">{{ t('Remove {name} from this dashboard? Measurements in InfluxDB stay unchanged. Save dashboard to keep the change.',{name:dialog.chart.options.chartTitle}) }}</template><template v-else-if="dialog.kind==='delete-dashboard'">{{ t('Delete {name} and its panel definitions? Measurements in InfluxDB stay unchanged. This cannot be undone.',{name:dialog.item.name}) }}</template><template v-else-if="dialog.kind==='new'"><label class="new-name">{{ t("Dashboard name") }}<input v-model="newName" maxlength="160" @keydown.enter="confirmDialog"></label></template><template v-else>{{ t("Discard unsaved changes? You can export your draft before leaving.") }}</template></v-card-text><v-card-actions><v-spacer/><v-btn @click="cancelDialog">{{ t("Cancel") }}</v-btn><v-btn v-if="dialog.kind==='leave'" variant="outlined" @click="exportCurrent">{{ t("Export draft") }}</v-btn><v-btn color="primary" variant="flat" :loading="saving" @click="confirmDialog">{{ t(dialog.kind==='new'?'Create dashboard':dialog.kind==='remove'?'Remove panel':dialog.kind==='delete-dashboard'?'Delete dashboard':'Discard changes') }}</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup lang="ts">
import { isAxiosError, isCancel } from 'axios';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { GridItem, GridLayout } from 'grid-layout-plus';
import { useDisplay } from 'vuetify';
import Authentication from '@/services/auth';
import api from '@/services/dashboardDataService';
import { runDashboardQuery } from '@/services/dashboardQuery';
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';
import { formatDateTime } from '@/composables/dateTime.mjs';
import { useLanguage } from '@/composables/useLanguage';
import { rangeBounds, rangeWindow } from '@/composables/dashboardTimeRange.mjs';
import { alignRows, chartDefinition, clone, downloadJson, newChart, processingFor, refreshIntervals, resolveQuery, settingsFor, timeRanges } from '@/composables/dashboardUtils.mjs';
import type { ChartPanelDefinition, PanelInspectionResult, PanelInspectionSnapshot, PanelLayout } from '@/composables/dashboardPanelTypes';
import type { DashboardDocument, DashboardRange, DashboardSettings, DashboardSummary } from '@/composables/dashboardStateTypes';
import DashboardPanel from './DashboardPanel.vue';
import PanelEditor from './PanelEditor.vue';
import PanelInspector from './PanelInspector.vue';
import DashboardTimeRange from './DashboardTimeRange.vue';

type GridPanelLayout = PanelLayout & { i: string };
type DashboardDialog =
  | { kind: 'remove'; chart: ChartPanelDefinition }
  | { kind: 'delete-dashboard'; item: DashboardSummary }
  | { kind: 'discard' | 'leave' | 'new' };

const { t } = useLanguage();
const canManage = Boolean(Authentication.currentUser?.isAdmin);
const route = useRoute();
const router = useRouter();
const display = useDisplay();
const mobile = computed(() => display.width.value < 760);

const library = ref<DashboardSummary[]>([]);
const dashboard = ref<DashboardDocument | null>(null);
const saved = ref<DashboardDocument | null>(null);
const results = ref<Partial<Record<string, PanelInspectionResult>>>({});
const layout = ref<GridPanelLayout[]>([]);
const range = ref<DashboardRange>('-1h');
const refresh = ref('Off');
const focused = ref<string | null>(null);
const inspection = ref<PanelInspectionSnapshot | null>(null);
const editor = ref<{ chart: ChartPanelDefinition; isNew: boolean } | null>(null);
const dialog = ref<DashboardDialog | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const settingsDraft = ref<(DashboardDocument & { settings: DashboardSettings }) | null>(null);
const settingsTabs = ['General', 'Time options', 'Data defaults', 'JSON model'] as const;
const settingsTab = ref<(typeof settingsTabs)[number]>('General');
const loading = ref(false);
const saving = ref(false);
const dirty = ref(false);
const layoutGesture = ref(false);
const fetching = ref(false);
const settingsOpen = ref(false);
const error = ref('');
const notice = ref('');
const search = ref<string | null>('');
const folder = ref('All folders');
const favorites = ref(false);
const newName = ref('');
const settingsError = ref('');
const tagText = ref('');
const intervalText = ref('');

let timer: ReturnType<typeof setInterval> | undefined;
let loadSerial = 0;
let fetchSerial = 0;
let leaveResolve: ((leave: boolean) => void) | undefined;
const controllers = new Set<AbortController>();
let isAlive = true;

const dashboardSettings = computed(() => settingsFor(dashboard.value));
const folders = computed(() => [...new Set(library.value.map(item => item.folder))].sort());
const filtered = computed(() => library.value.filter(item =>
  (folder.value === 'All folders' || item.folder === folder.value)
  && (!favorites.value || item.favorite)
  && [item.name, item.description, item.folder, ...item.tags].join(' ').toLowerCase().includes((search.value || '').toLowerCase()),
));
const focusedChart = computed(() => focused.value === null ? undefined : chartById(focused.value));
const sortedCharts = computed(() => [...(dashboard.value?.charts ?? [])].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x));
const gridPanels = computed(() => layout.value.flatMap(item => {
  const chart = chartById(item.i);
  return chart ? [{ item, chart }] : [];
}));
const currentWindow = computed(() =>
  timeRanges.find(([, value]) => value === range.value)?.[2] || rangeWindow(range.value, dashboardSettings.value.timezone),
);
const dialogTitles = {
  remove: 'Remove panel?', 'delete-dashboard': 'Delete dashboard?',
  discard: 'Discard changes?', leave: 'Unsaved changes', new: 'New dashboard',
};
const dialogTitle = computed(() => dialog.value ? dialogTitles[dialog.value.kind] : '');
const layoutKeys = ['x', 'y', 'w', 'h'] as const;

function responseMessage(issue: unknown) {
  return isAxiosError<{ message?: string }>(issue) ? issue.response?.data?.message : undefined;
}

function message(issue: unknown) {
  return responseMessage(issue) || 'The operation failed. Your draft has been kept. Please try again.';
}

function chartById(id: string) {
  return dashboard.value?.charts.find(chart => String(chart.id) === id);
}

function resetLayout() {
  layoutGesture.value = false;
  layout.value = dashboard.value?.charts.map(chart => ({ ...clone(chart.layout), i: String(chart.id) })) ?? [];
}

function abortQueries() {
  fetchSerial++;
  for (const controller of controllers) controller.abort();
  controllers.clear();
  fetching.value = false;
}

async function load() {
  const serial = ++loadSerial;
  abortQueries();
  loading.value = true;
  error.value = '';
  editor.value = null;
  focused.value = null;
  inspection.value = null;

  try {
    const id = route.params.dashboardId;
    if (typeof id === 'string' && id) {
      const { data } = await api.get(id);
      if (serial !== loadSerial) return;
      dashboard.value = data;
      saved.value = clone(data);
      range.value = dashboardSettings.value.range;
      refresh.value = dashboardSettings.value.refresh;
      dirty.value = false;
      results.value = {};
      resetLayout();
      if (route.query.panel) focused.value = String(route.query.panel);
      if (canManage && route.query.edit) {
        const chart = chartById(String(route.query.edit));
        if (chart) openEditor(chart);
      }
      await nextTick();
      if (serial === loadSerial) {
        loading.value = false;
        void refreshData();
      }
    } else {
      const { data } = await api.list();
      if (serial !== loadSerial) return;
      library.value = data;
      dashboard.value = null;
      saved.value = null;
      dirty.value = false;
      refresh.value = 'Off';
    }
  } catch (issue) {
    if (serial === loadSerial) {
      error.value = message(issue);
      dashboard.value = null;
      saved.value = null;
    }
  } finally {
    if (serial === loadSerial) loading.value = false;
  }
}

async function refreshData() {
  const current = dashboard.value;
  if (!current || loading.value || fetching.value || !isAlive) return;
  const { _id: dashboardId } = current;
  const charts = clone(current.charts);
  const queryRange = clone(range.value);
  const queryTimezone = dashboardSettings.value.timezone;
  const queryNow = Date.now();

  let bounds: ReturnType<typeof rangeBounds>;
  let window: string;
  try {
    bounds = rangeBounds(queryRange, queryTimezone, queryNow);
    window = currentWindow.value;
  } catch (issue) {
    error.value = issue instanceof Error ? issue.message : message(issue);
    return;
  }

  const rangeDescription = typeof queryRange === 'string' ? queryRange : bounds.label;
  const serial = ++fetchSerial;
  fetching.value = true;
  let index = 0;

  async function worker() {
    while (index < charts.length && serial === fetchSerial) {
      const chart = charts[index++];
      const id = String(chart.id);
      const controller = new AbortController();
      const started = performance.now();
      let resolvedQuery = '';
      controllers.add(controller);
      results.value[id] = { ...results.value[id], loading: true, error: '' };

      try {
        if (!chart.query.trim()) throw new Error('No query configured.');
        resolvedQuery = resolveQuery(chart.query, queryRange, window, queryTimezone, queryNow);
        const savedPanel = { dashboardId, panelId: id };
        const { data } = await runDashboardQuery(
          chart.liveSource ? { path: '/dashboards/live', body: savedPanel }
            : canManage ? { path: '/influx', body: { query: resolvedQuery } }
            : { path: '/influx/panel', body: { ...savedPanel, start: bounds.start, stop: bounds.stop, window } },
          controller.signal,
        );
        if (serial !== fetchSerial) return;
        const durationMs = Math.round(performance.now() - started);
        const aligned = alignRows(data, processingFor(chart));
        results.value[id] = {
          ...aligned,
          rawRows: data,
          resolvedQuery,
          queryRange: rangeDescription,
          rangeStart: data[0]?._start || bounds.startISO,
          rangeStop: data[0]?._stop || bounds.stopISO,
          queryWindow: window,
          durationMs,
          responseBytes: new TextEncoder().encode(JSON.stringify(data)).length,
          loading: false,
          updated: Date.now(),
          error: data.length && !aligned.data.slice(1).some(values => values.some(value => value !== null))
            ? 'The query returned no numeric values. Check the field type.' : '',
        };
      } catch (issue) {
        if (serial !== fetchSerial || isCancel(issue)) return;
        const error = chart.liveSource ? responseMessage(issue) || 'Could not load live board observations.'
          : issue instanceof Error && issue.message.includes('30 series') ? issue.message
          : 'Could not query InfluxDB. Check the query and connection.';
        results.value[id] = {
          ...results.value[id],
          loading: false,
          lastAttempt: {
            query: resolvedQuery, range: rangeDescription, window,
            durationMs: Math.round(performance.now() - started), at: new Date().toISOString(),
          },
          error,
        };
      } finally {
        controllers.delete(controller);
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(3, charts.length) }, worker));
  } finally {
    if (serial === fetchSerial) fetching.value = false;
  }
}

function openInspector(chart: ChartPanelDefinition) {
  if (!dashboard.value) return;
  const { timezone } = dashboardSettings.value;
  inspection.value = {
    chart: clone(chart),
    result: clone(results.value[String(chart.id)] || {}),
    dashboardName: dashboard.value.name,
    timezone,
    range: typeof range.value === 'string' ? range.value : rangeBounds(range.value, timezone).label,
    capturedAt: Date.now(),
  };
}

function markDirty() {
  dirty.value = true;
}

function updateLayout(next: PanelLayout[]) {
  if (!dashboard.value || !layoutGesture.value) return;
  layoutGesture.value = false;
  let changed = false;
  for (const item of next) {
    const chart = chartById(String(item.i));
    if (chart && layoutKeys.some(key => chart.layout[key] !== item[key])) {
      chart.layout = { ...chart.layout, x: item.x, y: item.y, w: item.w, h: item.h, i: String(chart.id) };
      changed = true;
    }
  }
  if (changed) {
    layout.value = next.map(item => ({ ...item, i: String(item.i) }));
    markDirty();
  }
}

function moveEarlier(id: string) {
  const sorted = sortedCharts.value;
  const index = sorted.findIndex(chart => String(chart.id) === id);
  if (index < 1) return;
  [sorted[index - 1], sorted[index]] = [sorted[index], sorted[index - 1]];
  let x = 0, y = 0, rowHeight = 0;
  for (const chart of sorted) {
    if (x + chart.layout.w > 12) {
      y += rowHeight;
      x = 0;
      rowHeight = 0;
    }
    chart.layout.x = x;
    chart.layout.y = y;
    x += chart.layout.w;
    rowHeight = Math.max(rowHeight, chart.layout.h);
  }
  resetLayout();
  markDirty();
}

function zoomOut() {
  try {
    if (typeof range.value === 'string') {
      const index = timeRanges.findIndex(([, value]) => value === range.value);
      range.value = timeRanges[Math.min(index + 1, timeRanges.length - 1)][1];
    } else {
      const { timezone } = dashboardSettings.value;
      const bounds = rangeBounds(range.value, timezone);
      const padding = (bounds.stopMs - bounds.startMs) / 2;
      const candidate = {
        from: new Date(bounds.startMs - padding).toISOString(),
        to: new Date(bounds.stopMs + padding).toISOString(),
      };
      rangeBounds(candidate, timezone);
      range.value = candidate;
    }
  } catch (issue) {
    error.value = issue instanceof Error ? issue.message : message(issue);
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    error.value = 'Full screen is unavailable in this browser.';
  }
}

function openEditor(chart?: ChartPanelDefinition) {
  if (!canManage || !dashboard.value) return;
  editor.value = { chart: chart ? clone(chart) : newChart(dashboard.value.charts), isNew: !chart };
}

function applyPanel(chart: ChartPanelDefinition) {
  if (!dashboard.value) return;
  abortQueries();
  const charts = dashboard.value.charts;
  const index = charts.findIndex(item => String(item.id) === String(chart.id));
  if (index < 0) charts.push(chart);
  else charts[index] = chart;
  markDirty();
  resetLayout();
  editor.value = null;
  void refreshData();
}

function confirmRemove(chart: ChartPanelDefinition) {
  dialog.value = { kind: 'remove', chart };
}

async function save() {
  const current = dashboard.value;
  if (!current || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const payload = { ...clone(current), charts: current.charts.map(chartDefinition) };
    const { data } = await api.save(payload);
    const latest = dashboard.value;
    if (!isAlive || latest?._id !== payload._id) return;

    const unchanged = JSON.stringify({ ...clone(latest), charts: latest.charts.map(chartDefinition) }) === JSON.stringify(payload);
    saved.value = clone(data);
    if (unchanged) {
      dashboard.value = data;
      dirty.value = false;
      notice.value = 'Dashboard saved to MongoDB.';
      resetLayout();
    } else {
      latest.revision = data.revision;
      latest.updatedAt = data.updatedAt;
      markDirty();
      notice.value = 'Dashboard saved. Newer changes are still unsaved.';
    }
  } catch (issue) {
    error.value = message(issue);
  } finally {
    saving.value = false;
  }
}

function createDashboard() {
  newName.value = '';
  dialog.value = { kind: 'new' };
}

async function duplicate() {
  if (!dashboard.value) return;
  const copy = clone(dashboard.value);
  const payload = { ...copy, _id: undefined, revision: undefined, name: copy.name + ' (copy)' };
  try {
    const { data } = await api.save(payload);
    await router.push('/dashboard/' + data._id);
  } catch (issue) {
    error.value = message(issue);
  }
}

function exportCurrent() {
  if (dashboard.value) downloadJson(dashboard.value.charts.map(chartDefinition), 'charts.json');
}

async function toggleFavorite(item: DashboardSummary) {
  try {
    const { data } = await api.get(item._id);
    data.favorite = !data.favorite;
    await api.save(data);
    await load();
  } catch (issue) {
    error.value = message(issue);
  }
}

function cancelDialog() {
  dialog.value = null;
  leaveResolve?.(false);
  leaveResolve = undefined;
}

async function confirmDialog() {
  const action = dialog.value;
  if (!action || saving.value) return;
  error.value = '';
  if (action.kind === 'remove') {
    if (!dashboard.value) return;
    abortQueries();
    const id = String(action.chart.id);
    dashboard.value.charts = dashboard.value.charts.filter(chart => String(chart.id) !== id);
    if (focused.value === id) focused.value = null;
    delete results.value[id];
    resetLayout();
    markDirty();
    dialog.value = null;
    void refreshData();
  } else if (action.kind === 'discard') {
    if (!saved.value) return;
    dashboard.value = clone(saved.value);
    dirty.value = false;
    dialog.value = null;
    abortQueries();
    resetLayout();
    void refreshData();
  } else if (action.kind === 'leave') {
    dirty.value = false;
    dialog.value = null;
    leaveResolve?.(true);
    leaveResolve = undefined;
  } else {
    saving.value = true;
    try {
      if (action.kind === 'delete-dashboard') {
        await api.remove(action.item);
        dialog.value = null;
        await load();
      } else if (action.kind === 'new' && newName.value.trim()) {
        const { data } = await api.save({
          name: newName.value, description: '', folder: 'General', tags: [], settings: settingsFor(null), charts: [],
        });
        dialog.value = null;
        await router.push('/dashboard/' + data._id);
      }
    } catch (issue) {
      error.value = message(issue);
      dialog.value = null;
    } finally {
      saving.value = false;
    }
  }
}

function openSettings() {
  if (!dashboard.value) return;
  const draft = clone(dashboard.value);
  settingsDraft.value = { ...draft, settings: settingsFor(draft) };
  tagText.value = dashboard.value.tags.join(', ');
  intervalText.value = settingsDraft.value.settings.intervals.join(', ');
  settingsTab.value = 'General';
  settingsError.value = '';
  settingsOpen.value = true;
}

function applySettings() {
  const draft = settingsDraft.value;
  if (!draft) return;
  const intervals = [...new Set(intervalText.value.split(',').map(value => value.trim()).filter(Boolean))];
  const defaultRefresh = draft.settings.refresh;
  if (!draft.name.trim() || !intervals.length || intervals.some(value => !refreshIntervals.slice(1).includes(value))
    || (defaultRefresh !== 'Off' && !intervals.includes(defaultRefresh))) {
    settingsError.value = 'Enter a name and valid refresh intervals. The default refresh must appear in the list.';
    return;
  }
  draft.tags = tagText.value.split(',').map(value => value.trim()).filter(Boolean);
  draft.settings.intervals = intervals;
  dashboard.value = draft;
  range.value = draft.settings.range;
  refresh.value = defaultRefresh;
  settingsOpen.value = false;
  markDirty();
}

async function importValue(charts: unknown, name: string) {
  if (!Array.isArray(charts)) throw new Error('Expected the original chart JSON array.');
  const definitions: unknown[] = charts;
  const { data } = await api.save({
    name, folder: 'General', description: 'Imported chart definitions.', tags: ['imported'],
    settings: settingsFor(null), charts: definitions.map(chartDefinition),
  });
  await router.push('/dashboard/' + data._id);
}

async function importCharts(event: Event) {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  try {
    if (!file) return;
    if (file.size > 1500000) throw new Error('The JSON file is too large.');
    const charts: unknown = JSON.parse(await file.text());
    await importValue(charts, file.name.replace(/\.json$/i, ''));
  } catch (issue) {
    error.value = responseMessage(issue) || (issue instanceof Error ? issue.message : message(issue));
  } finally {
    input.value = '';
  }
}

function routeGuard() {
  if (saving.value && dirty.value) return false;
  if (!dirty.value) return true;
  return new Promise<boolean>(resolve => {
    leaveResolve?.(false);
    leaveResolve = resolve;
    dialog.value = { kind: 'leave' };
  });
}

function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
}

onBeforeRouteLeave(routeGuard);
onBeforeRouteUpdate((to, from) => to.params.dashboardId === from.params.dashboardId || routeGuard());
watch(() => route.params.dashboardId, load);
watch([range, () => dashboardSettings.value.timezone], () => {
  abortQueries();
  void refreshData();
});
watch(refresh, value => {
  clearInterval(timer);
  const match = /^(\d+)(s|m|h)$/.exec(value);
  if (!match) return;
  const unit = match[2];
  const unitMs = unit === 's' ? 1000 : unit === 'm' ? 60000 : 3600000;
  timer = setInterval(() => {
    if (!editor.value && !inspection.value && !settingsOpen.value && !dialog.value
      && (!document.hidden || !dashboardSettings.value.pauseHidden)) void refreshData();
  }, Number(match[1]) * unitMs);
});

onMounted(() => {
  try { localStorage.removeItem('tomatoesDashboard'); } catch { /* Browser storage may be unavailable. */ }
  window.addEventListener('beforeunload', beforeUnload);
  void load();
});
onBeforeUnmount(() => {
  isAlive = false;
  loadSerial++;
  abortQueries();
  clearInterval(timer);
  window.removeEventListener('beforeunload', beforeUnload);
  leaveResolve?.(false);
});
</script>
<style scoped lang="scss">
.app-page.dashboard-canvas{padding:8px 16px 16px}.app-page.dashboards-page{width:100%;max-width:none;margin-inline:0}.app-page.dashboards-page:not(.dashboard-canvas){max-width:var(--app-content-width,1440px);margin-inline:auto}.muted{color:rgb(var(--v-theme-muted))}.library-filters{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:16px;margin-bottom:22px}.library-row{display:flex;align-items:center;gap:20px;padding:16px;border-bottom:1px solid rgb(var(--v-theme-border));min-width:0}.library-row:last-child{border:0}.library-name{display:flex;flex:1;flex-direction:column;min-width:0;text-decoration:none;color:rgb(var(--v-theme-on-surface));gap:5px;overflow-wrap:anywhere}.library-name span,.library-name small{color:rgb(var(--v-theme-muted));font-size:13px}.folder-label{display:flex;gap:6px;align-items:center;min-width:100px;font-size:13px}.dashboard-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;border-bottom:1px solid rgb(var(--v-theme-border));padding-bottom:16px;margin-bottom:20px}.dashboard-toolbar label{display:flex;gap:10px;align-items:center;font-size:13px;color:rgb(var(--v-theme-muted))}select,input,textarea{background:rgb(var(--v-theme-background));color:rgb(var(--v-theme-on-surface));border:1px solid rgb(var(--v-theme-border));border-radius:4px;padding:9px 12px;min-width:0;max-width:100%}.vgl-layout{margin:-8px}.vgl-item{min-width:0}.mobile-panels{display:grid;gap:18px}.mobile-panels :deep(.chart-panel){height:340px}.focused-chart{padding:0;height:100dvh;max-height:100dvh;min-height:0;background:rgb(var(--v-theme-background));display:flex;flex-direction:column;overflow:hidden}.focused-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 12px;min-height:56px;flex-shrink:0;border-bottom:1px solid rgb(var(--v-theme-border))}.focused-location{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.focused-back{flex-shrink:0}.focused-dashboard-label{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.focused-chart-content{flex:1;min-height:0;padding:6px;display:flex;overflow:hidden}.focused-chart-content>.chart-panel{width:100%;flex:1}.focused-error{margin:6px;flex-shrink:0}.settings-layout{display:grid;grid-template-columns:180px minmax(0,1fr);gap:24px;min-height:300px}.settings-layout nav{display:flex;flex-direction:column;align-items:stretch;gap:6px}.settings-fields{display:flex;flex-direction:column;gap:18px;min-width:0}.settings-fields label,.new-name{display:flex;flex-direction:column;gap:7px;font-size:13px}.settings-fields pre{overflow:auto;font-size:12px;max-height:450px}.settings-fields .check{flex-direction:row;align-items:center}
.dashboard-topbar{display:flex;align-items:center;justify-content:space-between;width:100%;gap:16px;padding:0 16px;min-width:0}.dashboard-breadcrumb{display:flex;align-items:center;gap:10px;min-width:0;font-size:15px}.dashboard-breadcrumb a{color:rgb(var(--v-theme-on-surface));text-decoration:none}.dashboard-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dashboard-controls{display:flex;align-items:center;gap:6px;flex-shrink:0}.dashboard-controls :deep(.v-btn){width:34px!important;min-width:34px;height:32px!important;border-radius:3px;padding:0}.dashboard-controls :deep(.v-icon){font-size:18px}.dashboard-controls :deep(.time-range-button.v-btn){width:auto!important;min-width:0!important}.compact-select{display:flex;align-items:center;gap:5px;border:1px solid rgb(var(--v-theme-border));border-radius:3px;padding:0 8px;height:32px}.compact-select select,.refresh-controls select{font-size:12px;padding:4px;border:0;min-height:30px;color:rgb(var(--v-theme-muted))}.refresh-controls{display:flex;align-items:center;border:1px solid rgb(var(--v-theme-border));border-radius:3px;height:32px}.refresh-controls :deep(.v-btn){border:0;border-right:1px solid rgb(var(--v-theme-border));border-radius:0}.unsaved-dot{width:7px;height:7px;background:rgb(var(--v-theme-warning));border-radius:50%;flex-shrink:0}
.library-tabs :deep(.v-tab){border-radius:0}.library-tabs{border-bottom:1px solid rgb(var(--v-theme-border));margin-top:16px}.library-summary{display:flex;align-items:center;justify-content:space-between;color:rgb(var(--v-theme-muted));font-size:13px;margin:18px 0 12px}.dashboard-library :deep(th){font-weight:500;white-space:nowrap}.dashboard-library :deep(td){padding-block:16px}.dashboard-library :deep(td:first-child){width:54px}.dashboard-library :deep(td:nth-child(2)){width:45%}.mobile-column-label{display:none}
.library-delete{margin-inline-start:auto}
@media(max-width:760px){.dashboard-library :deep(thead){display:none}.dashboard-library :deep(table),.dashboard-library :deep(tbody){display:block;width:100%}.dashboard-library :deep(tbody tr){display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:6px 8px;padding:12px;border-bottom:1px solid rgb(var(--v-theme-border))}.dashboard-library :deep(td){padding:0!important;border:0!important;height:auto!important;min-width:0;width:auto!important}.dashboard-library :deep(td:nth-child(1)){grid-column:1;grid-row:1}.dashboard-library :deep(td:nth-child(2)){grid-column:2;grid-row:1}.dashboard-library :deep(td:nth-child(3)){grid-column:2;grid-row:2}.dashboard-library :deep(td:nth-child(4)){grid-column:3;grid-row:2;font-size:12px}.dashboard-library :deep(td:nth-child(5)){grid-column:2 / -1;grid-row:3;font-size:12px;color:rgb(var(--v-theme-muted))}.dashboard-library :deep(td:nth-child(6)){grid-column:3;grid-row:1}.dashboard-library :deep(td:nth-child(6) .app-action-row){gap:0}.dashboard-library :deep(td:nth-child(6) .v-btn){min-width:26px;padding:0 4px}.mobile-column-label{display:inline}.library-summary{gap:8px}.library-summary>span:last-child{display:none}.dashboard-topbar{flex-wrap:wrap;gap:8px;padding:8px 12px}.dashboard-breadcrumb{width:100%;font-size:14px}.dashboard-controls{gap:4px;max-width:100%;flex-wrap:wrap}.dashboard-controls :deep(.v-btn){width:30px!important;min-width:30px;height:30px!important}.compact-select{padding:0 4px}.compact-select select{max-width:128px}.app-page.dashboard-canvas{padding:8px}.mobile-panels{gap:8px}.library-filters{grid-template-columns:minmax(0,1fr)}.library-row{flex-wrap:wrap;gap:12px}.library-name{flex-basis:65%}.library-row .folder-label{margin-left:52px}.library-row>.muted{display:none}.settings-layout{grid-template-columns:minmax(0,1fr)}.settings-layout nav{flex-direction:row;flex-wrap:wrap}.focused-chart{padding:0}.focused-toolbar{flex-wrap:wrap;padding:8px 12px;gap:8px}.focused-location{flex-basis:100%}.focused-dashboard-label{font-size:14px}.focused-chart-content{padding:4px}.dashboard-toolbar label{flex-wrap:wrap}}
</style>
