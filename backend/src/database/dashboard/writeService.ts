import { randomUUID } from 'node:crypto';
import { HttpError } from '../../users/types';
import { validateDashboard } from './validation';
import { deleteDashboardAtRevision, insertDashboard, updateDashboardAtRevision } from './writeRepository';

export function createDashboard(body: unknown) {
  return insertDashboard(randomUUID(), validateDashboard(body));
}

export async function updateDashboard(id: string, body: unknown, author = '') {
  const revision = (body as { revision?: unknown } | null | undefined)?.revision;
  if (typeof revision !== 'number' || !Number.isInteger(revision)) {
    throw new HttpError(400, 'The dashboard revision is required.');
  }

  const saveMessage = (body as { saveMessage?: unknown }).saveMessage;
  if (saveMessage !== undefined && (typeof saveMessage !== 'string' || saveMessage.length > 500)) {
    throw new HttpError(400, 'The change message must have at most 500 characters.');
  }
  const entry = typeof saveMessage === 'string'
    ? { revision: revision + 1, message: saveMessage.trim(), author, savedAt: new Date() }
    : undefined;
  const item = await updateDashboardAtRevision(id, revision, validateDashboard(body), entry);
  if (!item) {
    throw new HttpError(409, 'This dashboard changed in another session. Export your draft, then reload before saving.');
  }
  return item;
}

export async function deleteDashboard(id: string, revision: number) {
  if (!Number.isInteger(revision)) {
    throw new HttpError(400, 'The dashboard revision is required.');
  }
  if (!await deleteDashboardAtRevision(id, revision)) {
    throw new HttpError(409, 'Dashboard changed or no longer exists. Refresh the library.');
  }
}
