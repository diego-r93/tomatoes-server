import type { ChartPanelDefinition } from './dashboardPanelTypes';

export interface CustomDashboardRange {
  from: string;
  to: string;
}

export type DashboardRange = string | CustomDashboardRange;

export interface DashboardSettings {
  range: string;
  refresh: string;
  timezone: string;
  intervals: string[];
  hideTimePicker: boolean;
  pauseHidden: boolean;
  bucket: string;
  window?: string;
}

export interface DashboardSummary {
  _id: string;
  name: string;
  description: string;
  folder: string;
  tags: string[];
  favorite: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
  panelCount?: number;
}

export interface DashboardDocument extends DashboardSummary {
  settings?: Partial<DashboardSettings>;
  saveHistory?: { revision: number; message: string; author: string; savedAt: string }[];
  charts: ChartPanelDefinition[];
}

export type DashboardWrite = Pick<DashboardDocument, 'name' | 'description' | 'folder' | 'tags' | 'settings'>
  & Partial<Pick<DashboardDocument, '_id' | 'revision' | 'favorite'>>
  & { charts: unknown[]; saveMessage?: string };
