import { http } from './http-common';
import type { QueryRow } from '@/composables/dashboardSeries';

type SavedPanel = { dashboardId: string; panelId: string };
export type LiveSource = { kind: 'connection' | 'driver'; host: string; pump?: number };

type DashboardQuery =
  | { path: '/influx'; body: { query: string } }
  | { path: '/influx/panel'; body: SavedPanel & { start: string; stop: string; window: string } }
  | { path: '/dashboards/live'; body: SavedPanel | { source: LiveSource } };

export function runDashboardQuery(request: DashboardQuery, signal: AbortSignal) {
  return http.post<QueryRow[]>(request.path, request.body, { signal, timeout: 30000 });
}
