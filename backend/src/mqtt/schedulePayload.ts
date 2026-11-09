import { createHash } from 'node:crypto';

export interface ScheduleInput {
  pumperCode: string;
  pumperName: string;
  pulseDuration: number;
  driveTimes: readonly { time: string; state: boolean }[];
}

export function encodeSchedule(board: ScheduleInput) {
  const match = /^([a-zA-Z0-9._-]{1,128})#(0[1-4])$/.exec(board.pumperCode);
  if (!match) return null;
  const [, host, output] = match;
  const document = {
    pumperCode: board.pumperCode,
    pumperName: board.pumperName,
    pulseDuration: board.pulseDuration,
    driveTimes: board.driveTimes.map(({ time, state }) => ({ time, state })),
  };
  const version = createHash('sha256').update(JSON.stringify(document)).digest('hex').slice(0, 32);
  return {
    host,
    topic: host + '/config/' + output,
    code: board.pumperCode,
    version,
    payload: JSON.stringify({ document: { ...document, version } }),
  };
}
