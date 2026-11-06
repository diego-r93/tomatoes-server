export const boardId = board => String(board.id || board._id);
export const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function scheduleEntries(board, query = '', status = 'all') {
  const term = normalizeSearch(query.trim());
  const boardMatches = normalizeSearch(`${board.pumperName} ${board.pumperCode}`).includes(term);
  // Preserve the API index before filtering or sorting.
  return (board.driveTimes || []).map((entry, index) => ({ ...entry, index }))
    .filter(entry => (!term || boardMatches || String(entry.time).includes(term)) && (status === 'all' || Boolean(entry.state) === (status === 'enabled')))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)) || a.index - b.index);
}
export function matchingBoards(boards, query, status, order) {
  const result = boards.filter(board => scheduleEntries(board, query, status).length || (status === 'all' && (!query.trim() || normalizeSearch(`${board.pumperName} ${board.pumperCode}`).includes(normalizeSearch(query.trim())))));
  if (order === 'name' || order === 'code') { const key = order === 'name' ? 'pumperName' : 'pumperCode'; result.sort((a, b) => String(a[key]).localeCompare(String(b[key]))); }
  return result;
}
export function pulseLabel(value, unit = 'minutes') {
  const duration = Number(value);
  if (!Number.isFinite(duration)) return 'Not set';
  return unit === 'milliseconds' ? `${duration.toLocaleString('en-US')} ms` : `${Number((duration / 60000).toFixed(3)).toLocaleString('en-US')} min`;
}
export function boardDetails(name, duration) {
  const pumperName = String(name ?? '').trim(), pulseDuration = Number(duration);
  if (!pumperName) throw new Error('Pumper name is required.');
  if (!Number.isSafeInteger(pulseDuration) || pulseDuration <= 0) throw new Error('Pulse duration must be a positive whole number of milliseconds.');
  // Fixed device code and stored schedules must never enter this update.
  return { pumperName, pulseDuration };
}
export function validatedTime(value, times, exceptIndex = -1) {
  let time = String(value || '').trim();
  if (/^\d{2}:\d{2}$/.test(time)) time += ':00';
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) throw new Error('Enter a valid time in HH:mm:ss format.');
  if (times.some((entry, index) => index !== exceptIndex && entry.time === time)) throw new Error('This time already exists for this pump.');
  return time;
}
