import { randomUUID } from 'node:crypto';
import { HttpError } from '../users/types';

const maxRevision = 0xffffffff;
const timeoutMessage = 'The board did not reply to setup.';
const unknownMessage = 'The change could not be verified. Read the settings before saving again.';

export type SetupOperation = 'setup.get' | 'ec.label.set' | 'ec.params.set' | 'ph.cal.set' | 'ph.cal.clear';
type SetupArguments = Record<string, string | number>;

const ecFields = {
  k: { min: 0.01, max: 10, decimals: 4, readback: 'cellConstant' },
  alpha: { min: 0, max: 0.05, decimals: 5, readback: 'temperatureCoefficient' },
  tdsFactor: { min: 0.4, max: 0.9, decimals: 3, readback: 'tdsFactor' },
} as const;
type EcKey = keyof typeof ecFields;
type EcParameters = Partial<Record<EcKey, number>>;

export function parseEcParameters(input: unknown): EcParameters {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Enter at least one conductivity parameter.');
  }
  const entries = Object.entries(input);
  if (!entries.length) throw new HttpError(400, 'Enter at least one conductivity parameter.');
  for (const [key, value] of entries) {
    if (!Object.hasOwn(ecFields, key)) throw new HttpError(400, 'Unknown conductivity parameter.');
    const { min, max, decimals } = ecFields[key as EcKey];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || Number(value.toFixed(decimals)) !== value) {
      throw new HttpError(400, 'Check the conductivity parameter ranges and decimal places.');
    }
  }
  return Object.fromEntries(entries);
}
const phFields = {
  off: { min: -30, max: 30, decimals: 2 },
  acid: { min: 0.85, max: 1.05, decimals: 4 },
  base: { min: 0.85, max: 1.05, decimals: 4 },
} as const;
type PhKey = keyof typeof phFields;
type PhCalibration = Record<PhKey, number>;

function isPhCalibration(value: unknown): value is PhCalibration {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 3) return false;
  const coefficients = value as Record<string, unknown>;
  return (Object.keys(phFields) as PhKey[]).every(key => {
    const { min, max, decimals } = phFields[key];
    const number = coefficients[key];
    return typeof number === 'number' && Number.isFinite(number) && number >= min && number <= max &&
      Number(number.toFixed(decimals)) === number;
  });
}

export function parsePhCalibration(value: unknown) {
  if (!isPhCalibration(value)) throw new HttpError(400, 'Check all three pH coefficients and their decimal places.');
  return value;
}

type Publisher = (topic: string, payload: string) => Promise<unknown>;
type Reply = { ok: boolean; rev: number; error?: unknown; readback?: unknown };
type Pending = {
  id: string;
  op: SetupOperation;
  settle: (error?: Error, reply?: Reply) => void;
};

export function validRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maxRevision;
}

export function validProbeLabel(label: unknown): label is string {
  return typeof label === 'string' && /^[\x20-\x7e]{0,32}$/.test(label) && label.trim() === label;
}

export function createSetupTransport(timeoutMs = 4000) {
  let publish: Publisher | undefined;
  const pending = new Map<string, Pending>();
  return {
    setPublisher(next?: Publisher) {
      publish = next;
      if (!next) {
        for (const entry of pending.values()) entry.settle(new HttpError(503, 'Board setup MQTT is unavailable.'));
      }
    },
    request(host: string, id: string, op: SetupOperation, rev = 0, args?: SetupArguments): Promise<Reply> {
      const send = publish;
      if (!send) throw new HttpError(503, 'Board setup MQTT is unavailable.');
      if (pending.has(host)) throw new HttpError(409, 'A board setup request is already in progress.');
      const payload = JSON.stringify({ id, op, rev, ...(args === undefined ? {} : { args }) });
      if (Buffer.byteLength(payload) > 255) throw new HttpError(400, 'Board setup request is too large.');
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => settle(new HttpError(504, timeoutMessage)), timeoutMs);
        function settle(error?: Error, reply?: Reply) {
          if (pending.get(host)?.id !== id) return;
          clearTimeout(timer);
          pending.delete(host);
          if (reply) resolve(reply);
          else reject(error);
        }
        pending.set(host, { id, op, settle });
        void Promise.resolve()
          .then(() => pending.get(host)?.id === id && send(host + '/setup/req', payload))
          .catch(() => settle(new HttpError(503, 'Board setup MQTT is unavailable.')));
      });
    },
    receive(topic: string, payload: Buffer, retained: boolean) {
      if (retained || payload.length > 255) return;
      const host = /^devices\/([^/]+)\/setup$/.exec(topic)?.[1];
      const entry = host ? pending.get(host) : undefined;
      if (!entry) return;
      let data;
      try { data = JSON.parse(payload.toString()); } catch { return; }
      if (data?.id !== entry.id || data.op !== entry.op || typeof data.ok !== 'boolean' || !validRevision(data.rev)) return;
      entry.settle(undefined, data);
    },
  };
}

export const setupTransport = createSetupTransport();

type Exchange = (id: string, op: SetupOperation, rev?: number, args?: SetupArguments) => Promise<Reply>;

export async function readSetup(exchange: Exchange) {
  const reply = await exchange(randomUUID(), 'setup.get');
  const readback = reply.readback as { label?: unknown; k?: unknown; alpha?: unknown; tdsFactor?: unknown; phCalibrated?: unknown; ph?: unknown } | undefined;
  if (!reply.ok || !validProbeLabel(readback?.label)) throw new HttpError(502, 'The board did not return valid setup settings.');
  const { label, k, alpha, tdsFactor, phCalibrated, ph } = readback!;
  return {
    revision: reply.rev, label: label as string,
    cellConstant: typeof k === 'number' && Number.isFinite(k) ? k : null,
    temperatureCoefficient: typeof alpha === 'number' && Number.isFinite(alpha) ? alpha : null,
    tdsFactor: typeof tdsFactor === 'number' && Number.isFinite(tdsFactor) ? tdsFactor : null,
    phCalibrated: typeof phCalibrated === 'boolean' ? phCalibrated : null,
    ph: phCalibrated === true && isPhCalibration(ph) ? ph : null,
  };
}

type SetupSettings = Awaited<ReturnType<typeof readSetup>>;
const writeRejected = {
  'ec.label.set': 'The board rejected the label change.',
  'ec.params.set': 'The board rejected the conductivity parameters.',
  'ph.cal.set': 'The board rejected the pH calibration.',
  'ph.cal.clear': 'The board rejected the pH calibration reset.',
} as const;

async function writeSetup(exchange: Exchange, id: string, revision: number,
  op: Exclude<SetupOperation, 'setup.get'>, args: SetupArguments | undefined,
  matches: (observed: SetupSettings, previous: SetupSettings) => boolean) {
  const current = await readSetup(exchange);
  if (current.revision !== revision) throw new HttpError(409, 'Board settings changed. Read them again before saving.');
  if (matches(current, current)) return { ...current, outcome: 'unchanged' as const };
  let reply: Reply | undefined;
  try { reply = await exchange(id, op, revision, args); } catch (error) {
    if (!(error instanceof HttpError) || ![503, 504].includes(error.status)) throw error;
  }
  if (reply && !reply.ok) {
    if (reply.error === 'revision conflict') throw new HttpError(409, 'Board settings changed. Read them again before saving.');
    if (reply.error !== 'readback mismatch') {
      throw new HttpError(502, writeRejected[op]);
    }
  }
  const observed = await readSetup(exchange).catch(() => {
    throw new HttpError(504, unknownMessage);
  });
  if (observed.revision !== revision + 1 || !matches(observed, current) || (reply?.ok && reply.rev !== observed.revision)) {
    throw new HttpError(504, unknownMessage);
  }
  return { ...observed, outcome: reply?.ok ? 'verified' as const : 'reconciled' as const };
}

export function setProbeLabel(exchange: Exchange, id: string, revision: number, label: string) {
  return writeSetup(exchange, id, revision, 'ec.label.set', { label }, observed => observed.label === label);
}

export function setEcParameters(exchange: Exchange, id: string, revision: number, parameters: EcParameters) {
  const keys = Object.keys(ecFields) as EcKey[];
  return writeSetup(exchange, id, revision, 'ec.params.set', parameters, (observed, previous) =>
    keys.every(key => {
      const field = ecFields[key].readback;
      return observed[field] === (parameters[key] ?? previous[field]);
    }));
}

export function setPhCalibration(exchange: Exchange, id: string, revision: number, calibration: PhCalibration) {
  return writeSetup(exchange, id, revision, 'ph.cal.set', calibration, observed =>
    observed.phCalibrated === true && observed.ph?.off === calibration.off &&
    observed.ph.acid === calibration.acid && observed.ph.base === calibration.base);
}

export function clearPhCalibration(exchange: Exchange, id: string, revision: number) {
  return writeSetup(exchange, id, revision, 'ph.cal.clear', undefined, observed => observed.phCalibrated === false);
}
