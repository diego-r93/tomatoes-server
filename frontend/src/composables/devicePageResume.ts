interface ResumeOptions {
  windowTarget: Pick<Window, 'addEventListener' | 'removeEventListener' | 'navigator'>;
  documentTarget: Pick<Document, 'addEventListener' | 'removeEventListener' | 'hidden'>;
  refresh: () => Promise<unknown> | void;
  onResume: (timestamp: number) => void;
  lastRefresh: () => number | null;
  now?: () => number;
  cooldownMs?: number;
}

// Background tabs and suspended computers cannot promise continuous timer delivery.
// Catch up on return, keeping actual device responses as the only freshness evidence.
export function watchDevicePageResume({ windowTarget, documentTarget, refresh, onResume,
  lastRefresh, now = Date.now, cooldownMs = 5000 }: ResumeOptions) {
  let disposed = false, lastAttempt = -Infinity;
  let pending: Promise<unknown> | null = null;
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
