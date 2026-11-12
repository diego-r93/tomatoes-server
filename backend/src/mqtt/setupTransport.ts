import { randomUUID } from 'node:crypto';
import { HttpError } from '../users/types';

const maxRevision = 0xffffffff;
const timeoutMessage = 'The board did not reply to setup.';
const unknownMessage = 'The change could not be verified. Read the settings before saving again.';

export type SetupOperation = 'setup.get' | 'ec.label.set';
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
    request(host: string, id: string, op: SetupOperation, rev = 0, label?: string): Promise<Reply> {
      const send = publish;
      if (!send) throw new HttpError(503, 'Board setup MQTT is unavailable.');
      if (pending.has(host)) throw new HttpError(409, 'A board setup request is already in progress.');
      const payload = JSON.stringify({ id, op, rev, ...(label === undefined ? {} : { args: { label } }) });
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

type Exchange = (id: string, op: SetupOperation, rev?: number, label?: string) => Promise<Reply>;

export async function readSetup(exchange: Exchange) {
  const reply = await exchange(randomUUID(), 'setup.get');
  const readback = reply.readback as { label?: unknown; k?: unknown; alpha?: unknown; tdsFactor?: unknown; phCalibrated?: unknown } | undefined;
  if (!reply.ok || !validProbeLabel(readback?.label)) throw new HttpError(502, 'The board did not return valid setup settings.');
  const { label, k, alpha, tdsFactor, phCalibrated } = readback!;
  return {
    revision: reply.rev, label: label as string,
    cellConstant: typeof k === 'number' && Number.isFinite(k) ? k : null,
    temperatureCoefficient: typeof alpha === 'number' && Number.isFinite(alpha) ? alpha : null,
    tdsFactor: typeof tdsFactor === 'number' && Number.isFinite(tdsFactor) ? tdsFactor : null,
    phCalibrated: typeof phCalibrated === 'boolean' ? phCalibrated : null,
  };
}

export async function setProbeLabel(exchange: Exchange, id: string, revision: number, label: string) {
  // Read before writing to check the displayed revision and skip unchanged values.
  const current = await readSetup(exchange);
  if (current.revision !== revision) throw new HttpError(409, 'Board settings changed. Read them again before saving.');
  if (current.label === label) return { ...current, outcome: 'unchanged' as const };
  let reply: Reply | undefined;
  try { reply = await exchange(id, 'ec.label.set', revision, label); } catch (error) {
    if (!(error instanceof HttpError) || ![503, 504].includes(error.status)) throw error;
  }
  if (reply && !reply.ok) {
    if (reply.error === 'revision conflict') throw new HttpError(409, 'Board settings changed. Read them again before saving.');
    if (reply.error !== 'readback mismatch') throw new HttpError(502, 'The board rejected the label change.');
  }
  const observed = await readSetup(exchange).catch(() => {
    throw new HttpError(504, unknownMessage);
  });
  if (observed.revision !== revision + 1 || observed.label !== label || (reply?.ok && reply.rev !== observed.revision)) {
    throw new HttpError(504, unknownMessage);
  }
  return { ...observed, outcome: reply?.ok ? 'verified' as const : 'reconciled' as const };
}
