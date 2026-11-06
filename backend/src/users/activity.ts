import { access, all, get } from './database';
import { HttpError, text } from './types';

function integer(value: unknown, fallback: number, max: number, name: string) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new HttpError(400, `Invalid ${name}.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new HttpError(400, `Invalid ${name}.`);
  return number;
}
function dateBound(value: unknown) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new HttpError(400, 'Use an ISO UTC date for activity filters.');
  const normalized = new Date(value).toISOString();
  if (normalized.slice(0, 19) !== value.slice(0, 19)) throw new HttpError(400, 'Invalid activity date.');
  return normalized;
}
export function activityPage(id: number, query: Record<string, unknown>) {
  const requested = integer(query.page, 1, 1000000, 'activity page'), pageSize = integer(query.pageSize, 10, 100, 'activity page size');
  const search = text(query.search, 200), action = text(query.action, 80), from = dateBound(query.from), before = dateBound(query.before);
  if (from && before && from >= before) throw new HttpError(400, 'The activity start date must be earlier than the end date.');
  return access(async () => {
    const clauses = ['(subject_id=? OR actor_id=?)'], params: unknown[] = [id, id];
    if (action) { clauses.push('action=?'); params.push(action); }
    if (from) { clauses.push('created_at>=?'); params.push(from); }
    if (before) { clauses.push('created_at<?'); params.push(before); }
    if (search) { const pattern = '%' + search.replace(/[\\%_]/g, match => '\\' + match) + '%'; clauses.push("(description LIKE ? ESCAPE '\\' OR actor_login LIKE ? ESCAPE '\\' OR ip LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\')"); params.push(pattern, pattern, pattern, pattern); }
    const where = clauses.join(' AND '), count = await get<{ total: number }>(`SELECT COUNT(*) AS total FROM user_activity WHERE ${where}`, params), total = count!.total;
    const page = Math.min(requested, Math.max(1, Math.ceil(total / pageSize)));
    const items = await all(`SELECT id,action,description,actor_login AS actor,ip,created_at AS createdAt FROM user_activity WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    const actions = (await all<{ action: string }>('SELECT DISTINCT action FROM user_activity WHERE subject_id=? OR actor_id=? ORDER BY action', [id, id])).map(row => row.action);
    return { items, total, page, pageSize, actions };
  });
}
