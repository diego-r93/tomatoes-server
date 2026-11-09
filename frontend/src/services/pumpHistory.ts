import { http } from './http-common';

export const pumpChannels = ['01', '02', '03', '04'] as const;
export const pulseResults = [
  'actuated', 'not-actuated', 'missing', 'incomplete',
  'supply-missing', 'supply-low', 'short', 'temperature',
] as const;

export type PumpChannel = (typeof pumpChannels)[number];
export type PulseResult = (typeof pulseResults)[number];

export interface PulseHistoryFilters {
  from: string;
  to: string;
  pump?: PumpChannel;
  result?: PulseResult;
}

export interface PulseHistoryRecord {
  _id: string;
  pump: PumpChannel;
  result: PulseResult;
  origin: 'recorded' | 'reconstructed';
  startAt: number | null;
  expectedAt?: number;
  endAt: number | null;
}

interface PulseHistoryPage {
  records: PulseHistoryRecord[];
  imported: boolean;
  hasNext: boolean;
}

const pathFor = (host: string) => '/mqtt/pump-history/' + encodeURIComponent(host);

export async function getPulseHistory(host: string, filters: PulseHistoryFilters, page: number) {
  const { data } = await http.get<PulseHistoryPage>(pathFor(host), { params: { ...filters, page } });
  return data;
}

export async function getPulseHistoryCsv(host: string, filters: PulseHistoryFilters) {
  const { data } = await http.get<Blob>(pathFor(host), {
    params: { ...filters, format: 'csv' },
    responseType: 'blob',
    timeout: 120000,
  });
  return data;
}
