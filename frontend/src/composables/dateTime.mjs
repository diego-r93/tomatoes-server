// Shared timestamp display helpers. Stored timestamps remain unchanged.
export function displayDate(value) {
  if (value === null || value === undefined || value === '') return null;
  let normalized = value;
  // Legacy SQLite timestamps are UTC but omit the timezone suffix.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) normalized = value.replace(' ', 'T') + 'Z';
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}
function parts(value, timezone) {
  const date = displayDate(value);
  if (!date) return null;
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone === 'Browser' ? undefined : timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
export function formatDateTime(value, timezone = 'Browser', fallback = '—') { const p = parts(value, timezone); return p ? `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}` : fallback; }
export function formatDate(value, timezone = 'Browser', fallback = '—') { const p = parts(value, timezone); return p ? `${p.year}-${p.month}-${p.day}` : fallback; }
export function formatTime(value, timezone = 'Browser', fallback = '—') { const p = parts(value, timezone); return p ? `${p.hour}:${p.minute}:${p.second}` : fallback; }

// Device clocks without an offset are wall time, not UTC instants.
export function formatDeviceTime(value) {
  if (typeof value === 'string' && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const wall = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.\d+)?$/);
    return wall ? `${wall[1]} ${wall[2]} (device time)` : `${value} (as reported)`;
  }
  return formatDateTime(value);
}

// Short chart windows only need the clock; longer windows also need a date.
export function chartTimeLabel(value, spanSeconds, timezone = 'Browser', multiline = false) {
  if (!(spanSeconds > 86400)) return formatTime(value, timezone);
  return multiline ? `${formatTime(value, timezone)}\n${formatDate(value, timezone)}` : formatDateTime(value, timezone);
}
