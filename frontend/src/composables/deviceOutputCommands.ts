import type { DiscoveredDevice } from './deviceInventoryUtils';

export interface OutputDraft {
  deviceKey: string;
  host: string;
  gpio: number;
  target: boolean;
  originalState: boolean | null;
}

export interface AllOffDraft {
  deviceKey: string;
  host: string;
  allOff: true;
}

export type OutputCommandDraft = OutputDraft | AllOffDraft;
export type PendingOutput = Pick<OutputDraft, 'deviceKey' | 'gpio' | 'target'> & { submittedAt: number };
export interface PendingAllOff {
  gpios: number[];
  host: string;
  submittedAt: number;
}

export function confirmsOutputCommand(device: DiscoveredDevice | undefined, command: PendingOutput | PendingAllOff): boolean {
  if (!device?.responded || device.receivedAt === null || device.receivedAt < command.submittedAt) return false;
  if ('gpios' in command) {
    return command.gpios.every(gpio => device.outputs.some(output => output.gpio === gpio && output.state === false));
  }
  return device.outputs.some(output => output.gpio === command.gpio && output.state === command.target);
}
