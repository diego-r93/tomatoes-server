// Background tabs and suspended computers cannot promise continuous timer delivery.
// Catch up on return, keeping actual device responses as the only freshness evidence.
export function watchDevicePageResume({ windowTarget, documentTarget, refresh, onResume,
  lastRefresh, now = Date.now, cooldownMs = 5000 }) {
  let disposed = false, pending = null, lastAttempt = -Infinity;
  const resume = () => {
    if (disposed || documentTarget.hidden || windowTarget.navigator?.onLine === false) return;
    const timestamp = now();
    onResume(timestamp);
    if (pending || timestamp - Math.max(lastRefresh() ?? -Infinity, lastAttempt) < cooldownMs) return;
    lastAttempt = timestamp;
    pending = Promise.resolve().then(() => { if (!disposed) return refresh(); })
      .catch(() => { /* The inventory owns its error message; a later resume may retry. */ })
      .finally(() => { pending = null; });
  };
  documentTarget.addEventListener('visibilitychange', resume);
  for (const name of ['focus', 'pageshow', 'online']) windowTarget.addEventListener(name, resume);
  return () => {
    disposed = true;
    documentTarget.removeEventListener('visibilitychange', resume);
    for (const name of ['focus', 'pageshow', 'online']) windowTarget.removeEventListener(name, resume);
  };
}
