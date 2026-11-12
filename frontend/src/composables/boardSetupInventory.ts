import type { RegisteredBoard } from './deviceReportTypes';

export type SetupSensor = 'ph' | 'ec' | 'sht35';

export interface BoardSetupSettings {
  revision: number;
  label: string;
  cellConstant: number | null;
  temperatureCoefficient: number | null;
  tdsFactor: number | null;
  phCalibrated: boolean | null;
  outcome?: 'verified' | 'reconciled' | 'unchanged';
}

interface SetupReport {
  host: string;
  online?: boolean;
  receivedAt?: number | null;
  caps?: string[];
  probes?: Partial<Record<'ph' | 'ec', unknown>>;
  sensors?: Partial<Record<SetupSensor, unknown>>;
  ports?: Record<string, { name?: string; pumperName?: string; gpio?: number | string | null }>;
}

export interface SetupBoard extends RegisteredBoard {
  report: SetupReport | null;
}

// Chip detection is not proof of an installed, valid probe.
export function approvedSetupBoards(registry: RegisteredBoard[], reports: unknown): SetupBoard[] {
  if (!Array.isArray(registry) || !Array.isArray(reports)) throw new Error('Invalid board inventory');
  const byHost = new Map((reports as SetupReport[]).map(report => [report.host, report]));
  return registry.filter(board => board.status === 'approved')
    .map(board => ({ ...board, report: byHost.get(board.host) || null }))
    .sort((a, b) => a.host.localeCompare(b.host));
}
export function chipPresence(report: SetupReport | null, sensor: SetupSensor) {
  const value = report?.sensors?.[sensor];
  return value === true ? 'Detected' : value === false ? 'Not detected' : 'Not reported';
}
export function reportedProbeValidity(report: SetupReport | null, sensor: SetupSensor) {
  const value = sensor === 'sht35' ? undefined : report?.probes?.[sensor];
  return value === true ? 'Valid' : value === false ? 'Invalid or absent' : 'Not reported';
}
export function reportedPumpChannels(board: SetupBoard) {
  return Object.entries(board?.report?.ports || {}).filter(([code]) =>
    code.startsWith(`${board.host}#`) && /^0[1-4]$/.test(code.split('#')[1])
  ).map(([code, port]) => ({ code, label: port.name || port.pumperName || code, gpio: port.gpio }));
}
