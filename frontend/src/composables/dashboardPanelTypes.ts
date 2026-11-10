import type uPlot from 'uplot';
import type { PlotData, Processing, QueryRow } from './dashboardSeries';
import type { LiveSource } from '@/services/dashboardQuery';

export type SeriesStyle = Omit<uPlot.Series, 'stroke' | 'fill' | 'label'> & { label?: string; stroke?: string; fill?: string };
export interface ChartOptions {
  chartTitle?: string;
  unit?: string;
  description?: string;
  transparent?: boolean;
  lineStyle?: 'linear' | 'step' | 'bars';
  tooltipMode?: 'all' | 'nearest' | 'hidden';
  legendPosition?: 'bottom' | 'right';
  legendMode?: 'list' | 'values';
  axisPlacement?: 'left' | 'right' | 'hidden';
  axisLabel?: string;
  showGrid?: boolean;
  series?: SeriesStyle[];
  axes?: { scale?: string }[];
}

export interface VisualizationSettings {
  type: 'time-series' | 'gauge' | 'stat' | 'bar-gauge' | 'table';
  orientation: 'horizontal' | 'vertical';
  pageSize: 10 | 25 | 50;
  tableOrder: 'newest' | 'oldest';
  reducer: 'last' | 'mean' | 'min' | 'max';
  series: string | null;
  min: number;
  max: number;
  color: string;
  showThresholds: boolean;
  thresholds: { value: number; color: string }[];
  mappings: { value: number; text: string }[];
  sparkline: boolean;
  staleAfterSeconds: number;
}

export interface DashboardPanelModel {
  options: ChartOptions;
  processing?: Partial<Processing>;
  visualization?: Partial<VisualizationSettings>;
  liveSource?: LiveSource;
}

export interface ReducedReading {
  value: number | null;
  timestamp: number | null;
  label: string;
}

export interface PanelQuerySource {
  bucket: string;
  measurement: string;
  field: string;
  tag: string;
  tagValue: string;
  aggregation: 'mean' | 'min' | 'max' | 'sum' | 'last' | 'none';
  convertText: boolean;
}

export interface PanelLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  i?: string | number;
}

export interface ChartPanelDefinition extends DashboardPanelModel {
  id: number | string;
  query: string;
  options: ChartOptions & { chartTitle: string };
  layout: PanelLayout;
  source?: Partial<PanelQuerySource>;
  data?: unknown[];
}

export interface PanelInspectionResult {
  data?: PlotData | [];
  labels?: string[];
  rawRows?: QueryRow[];
  durationMs?: number;
  responseBytes?: number;
  updated?: number;
  queryRange?: string;
  rangeStart?: string;
  rangeStop?: string;
  queryWindow?: string;
  resolvedQuery?: string;
  error?: string;
  loading?: boolean;
  lastAttempt?: { query?: string; range: string; window: string; durationMs: number; at: string };
}

export interface PanelInspectionSnapshot {
  chart: ChartPanelDefinition;
  result: PanelInspectionResult;
  dashboardName: string;
  timezone: string;
  range: string;
  capturedAt: number;
}

export type InspectionSource = 'chart' | 'response';
export type InspectionMetadata = [key: string, value: string | number | null | undefined];
