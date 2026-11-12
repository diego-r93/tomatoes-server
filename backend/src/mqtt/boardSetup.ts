import { randomUUID } from 'node:crypto';
import { recentDevice } from '../alerts/sources';
import { access } from '../users/database';
import type { AuthContext } from '../users/http';
import { activity } from '../users/store';
import { HttpError } from '../users/types';
import { deviceAdmission, isFactoryHostname } from './deviceRegistry';
import { readSetup, setProbeLabel, setupTransport, validProbeLabel, validRevision } from './setupTransport';
import type { SetupOperation } from './setupTransport';

const operations = new Set<string>();

async function withSetup<T>(host: string, action: (exchange: Parameters<typeof readSetup>[0]) => Promise<T>) {
  if (!isFactoryHostname(host)) throw new HttpError(404, 'Board not found.');
  if (operations.has(host)) throw new HttpError(409, 'A board setup request is already in progress.');
  operations.add(host);
  try {
    async function exchange(id: string, op: SetupOperation, rev?: number, label?: string) {
      if (await deviceAdmission(host) !== 'approved') throw new HttpError(404, 'Board not found.');
      const device = await recentDevice(host);
      if (!device) throw new HttpError(409, 'The board has not replied recently.');
      if (!Array.isArray(device.caps) || !device.caps.includes('setup.v1')) {
        throw new HttpError(409, 'This board firmware does not support setup.');
      }
      return setupTransport.request(host, id, op, rev, label);
    }
    return await action(exchange);
  } finally {
    operations.delete(host);
  }
}

export const boardSetupSettings = (host: string) => withSetup(host, readSetup);

export function updateBoardProbeLabel(host: string, input: { label?: unknown; revision?: unknown } | undefined, actor: AuthContext['user']) {
  const { label, revision } = input ?? {};
  if (!validProbeLabel(label)) throw new HttpError(400, 'Use at most 32 printable ASCII characters with no leading or trailing spaces.');
  if (!validRevision(revision) || revision === 0xffffffff) throw new HttpError(400, 'Read the current board settings first.');
  const requestId = randomUUID();
  return withSetup(host, async exchange => {
    const description = host + ' / ' + requestId + ' / revision ' + revision;
    const audit = (result: string) => access(() => activity(actor, 'Board setup', description + ' / ' + result));
    await audit('Requested EC label change');
    let result;
    try {
      result = await setProbeLabel(exchange, requestId, revision, label);
    } catch (error) {
      await audit(error instanceof HttpError ? 'HTTP ' + error.status + ' / ' + error.message : 'Unexpected error');
      throw error;
    }
    await audit(result.outcome + ' at revision ' + result.revision);
    return result;
  });
}
