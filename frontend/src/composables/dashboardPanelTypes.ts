import type uPlot from 'uplot';
import type { Processing } from './dashboardSeries';
import type { LiveSource } from '@/services/dashboardQuery';

export type SeriesStyle = Omit<uPlot.Series, 'stroke' | 'fill' | 'label'> & { label?: string; stroke?: string; fill?: string };
export interface ChartOptions {
  chartTitle?: string;
  unit?: string;
  series?: SeriesStyle[];
  axes?: { scale?: string }[];
}

export interface VisualizationSettings {
  type: 'time-series' | 'gauge' | 'stat';
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
