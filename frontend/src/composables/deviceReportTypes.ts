import type { PulseResult } from '@/services/pumpHistory';

export type DriverResult = PulseResult | 'waiting' | 'unobserved';

interface DriverRegisters {
  active?: number;
  fault?: number;
  status?: number;
}

export interface DriverPulse {
  startAt: number | null;
  endAt: number | null;
  expectedAt?: number;
  start: DriverRegisters;
  end: DriverRegisters;
  result: DriverResult;
  endReceived: boolean;
}

export interface PumpDriverReport {
  code: string;
  pump: string;
  result: DriverResult;
  latest: DriverPulse | null;
  history: DriverPulse[];
}

export interface DeviceDriverReport {
  host: string;
  pumps: PumpDriverReport[];
}

export interface RegisteredBoard {
  host: string;
  status: 'pending' | 'approved' | 'removed';
  online: boolean;
  firstSeen: string | null;
  approvedAt?: string;
  restoredAt?: string;
  model?: string;
  fw?: string;
  psramMB?: number;
  factoryAuthenticated?: boolean;
}
