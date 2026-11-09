import { http } from './http-common';
import type { ChartPanelDefinition } from '@/composables/dashboardPanelTypes';
import type { DashboardDocument, DashboardSummary, DashboardWrite } from '@/composables/dashboardStateTypes';

export default {
  list: () => http.get<DashboardSummary[]>('/dashboards/library'),
  get: (id: string) => http.get<DashboardDocument>('/dashboards/library/' + encodeURIComponent(id)),
  save: (dashboard: DashboardWrite) => dashboard._id
    ? http.put<DashboardDocument>('/dashboards/library/' + encodeURIComponent(dashboard._id), dashboard)
    : http.post<DashboardDocument>('/dashboards/library', dashboard),
  remove: (dashboard: Pick<DashboardSummary, '_id' | 'revision'>) => http.delete<void>(
    '/dashboards/library/' + encodeURIComponent(dashboard._id),
    { params: { revision: dashboard.revision } },
  ),
  export: (id: string) => http.get<ChartPanelDefinition[]>('/dashboards/library/' + encodeURIComponent(id) + '/export'),
  schema: (params: { bucket: string; measurement?: string; tag?: string }) =>
    http.get<{ measurements?: string[]; fields?: string[]; tags?: string[]; values?: string[] }>('/dashboards/schema', { params }),
  getcharts: () => http.get<ChartPanelDefinition[]>('/dashboards'),
};
