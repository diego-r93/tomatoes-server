import { randomUUID } from 'node:crypto';
import { recentDevice } from '../alerts/sources';
import { access } from '../users/database';
import type { AuthContext } from '../users/http';
import { activity } from '../users/store';
import { HttpError } from '../users/types';
import { deviceAdmission, isFactoryHostname } from './deviceRegistry';
import { clearPhCalibration, parseEcParameters, parsePhCalibration, readSetup, setEcParameters, setPhCalibration, setProbeLabel, setupTransport, validProbeLabel, validRevision } from './setupTransport';
import type { SetupOperation } from './setupTransport';

const operations = new Set<string>();
const ecParametersCapability = 'setup.ec-params.v1';
const phCalibrationCapability = 'setup.ph-cal.v1';

async function withSetup<T>(host: string, action: (exchange: Parameters<typeof readSetup>[0]) => Promise<T>, capability?: string) {
  if (!isFactoryHostname(host)) throw new HttpError(404, 'Board not found.');
  if (operations.has(host)) throw new HttpError(409, 'A board setup request is already in progress.');
  operations.add(host);
  try {
    async function exchange(id: string, op: SetupOperation, rev?: number, args?: Record<string, string | number>) {
      if (await deviceAdmission(host) !== 'approved') throw new HttpError(404, 'Board not found.');
      const device = await recentDevice(host);
      if (!device) throw new HttpError(409, 'The board has not replied recently.');
      if (!Array.isArray(device.caps) || !device.caps.includes('setup.v1')) {
        throw new HttpError(409, 'This board firmware does not support setup.');
      }
      if (capability && !device.caps.includes(capability)) {
        throw new HttpError(409, capability === phCalibrationCapability
          ? 'This board firmware does not support editing pH calibration.'
          : 'This board firmware does not support editing conductivity parameters.');
      }
      return setupTransport.request(host, id, op, rev, args);
    }
    return await action(exchange);
  } finally {
    operations.delete(host);
  }
}

export const boardSetupSettings = (host: string) => withSetup(host, readSetup);

function auditSetupWrite(host: string, revision: unknown, actor: AuthContext['user'], operation: string,
  write: (exchange: Parameters<typeof readSetup>[0], id: string, revision: number) => ReturnType<typeof setProbeLabel>,
  capability?: string) {
  if (!validRevision(revision) || revision === 0xffffffff) throw new HttpError(400, 'Read the current board settings first.');
  const requestId = randomUUID();
  return withSetup(host, async exchange => {
    const description = host + ' / ' + requestId + ' / revision ' + revision;
    const audit = (result: string) => access(() => activity(actor, 'Board setup', description + ' / ' + result));
    await audit('Requested ' + operation);
    let result;
    try {
      result = await write(exchange, requestId, revision);
    } catch (error) {
      await audit(error instanceof HttpError ? 'HTTP ' + error.status + ' / ' + error.message : 'Unexpected error');
      throw error;
    }
    await audit(result.outcome + ' at revision ' + result.revision);
    return result;
  }, capability);
}

export function updateBoardProbeLabel(host: string, input: { label?: unknown; revision?: unknown } | undefined, actor: AuthContext['user']) {
  const { label, revision } = input ?? {};
  if (!validProbeLabel(label)) throw new HttpError(400, 'Use at most 32 printable ASCII characters with no leading or trailing spaces.');
  return auditSetupWrite(host, revision, actor, 'EC label change',
    (exchange, id, rev) => setProbeLabel(exchange, id, rev, label));
}

export function updateBoardEcParameters(host: string, input: { parameters?: unknown; revision?: unknown } | undefined, actor: AuthContext['user']) {
  const parameters = parseEcParameters(input?.parameters);
  return auditSetupWrite(host, input?.revision, actor, 'EC parameter change',
    (exchange, id, rev) => setEcParameters(exchange, id, rev, parameters), ecParametersCapability);
}

export function updateBoardPhCalibration(host: string, input: { calibration?: unknown; revision?: unknown } | undefined, actor: AuthContext['user']) {
  const calibration = parsePhCalibration(input?.calibration);
  return auditSetupWrite(host, input?.revision, actor, 'pH coefficient change',
    (exchange, id, rev) => setPhCalibration(exchange, id, rev, calibration), phCalibrationCapability);
}

export function clearBoardPhCalibration(host: string, input: { revision?: unknown } | undefined, actor: AuthContext['user']) {
  return auditSetupWrite(host, input?.revision, actor, 'pH calibration reset',
    clearPhCalibration, phCalibrationCapability);
}
