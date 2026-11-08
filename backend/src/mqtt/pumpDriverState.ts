export type DriverValues = { active?: number; fault?: number; status?: number };
export type Pulse = { startAt: number | null; endAt: number | null; expectedAt?: number; source?: string; start: DriverValues; end: DriverValues };
export type PumpState = { code: string; latest: Pulse; history: Pulse[]; lastObservedAt: number };
export type DriverEvent = { host: string; pump: string; stage: 'start' | 'end'; item: keyof DriverValues; value: number; at: number };

export function parseDriverEvent(topic: string, payload: Buffer, retained = false, at = Date.now()): DriverEvent | null {
  const match = /^sensors\/(esp32[A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]{0,100})\/pump\/(0[1-4])\/(start|end)\/(active|fault|status)$/.exec(topic);
  if (!match || retained || payload.length > 3 || !/^(?:0|[1-9][0-9]{0,2})$/.test(payload.toString()) || !Number.isFinite(at)) return null;
  const value = Number(payload.toString());
  if (value > 255 || (match[4] === 'active' && value > 1)) return null;
  return { host: match[1], pump: match[2], stage: match[3] as DriverEvent['stage'], item: match[4] as keyof DriverValues, value, at };
}

export function pulseResult(pulse: Pulse | undefined, now = Date.now()) {
  if (!pulse) return 'unobserved';
  if (pulse.startAt === null) return pulse.expectedAt === undefined ? 'unobserved' : now - pulse.expectedAt >= 5000 ? 'missing' : 'waiting';
  const fault = (pulse.start.fault ?? 0) | (pulse.end.fault ?? 0);
  if (fault & 4) return 'short';
  if (fault & 2) return 'temperature';
  if (pulse.start.active === undefined || pulse.start.fault === undefined) return now - pulse.startAt >= 5000 ? 'incomplete' : 'waiting';
  if (pulse.start.active === 0 && (pulse.start.fault & 8)) return 'supply-missing';
  if (fault & 8) return 'supply-low';
  return pulse.start.active === 1 ? 'actuated' : 'not-actuated';
}

export class PumpDriverTracker {
  states = new Map<string, PumpState>();
  private archive(state: PumpState) { state.history = [state.latest, ...state.history].slice(0, 9); }
  expect(code: string, at: number, source: string) {
    const state = this.states.get(code);
    if (state?.latest.startAt !== null && state?.latest.startAt !== undefined && state.latest.startAt >= at - 1000) return false;
    if (state?.latest.expectedAt !== undefined && Math.abs(state.latest.expectedAt - at) < 5000) return false;
    const latest: Pulse = { startAt: null, endAt: null, expectedAt: at, source, start: {}, end: {} };
    if (state) { this.archive(state); state.latest = latest; }
    else this.states.set(code, { code, latest, history: [], lastObservedAt: 0 });
    return true;
  }
  ingest(event: DriverEvent) {
    const code = event.host + '#' + event.pump;
    let state = this.states.get(code);
    if (state && event.at < state.lastObservedAt) return false;
    if (!state) { state = { code, latest: { startAt: null, endAt: null, start: {}, end: {} }, history: [], lastObservedAt: 0 }; this.states.set(code, state); }
    if (event.stage === 'start') {
      if (state.latest.startAt !== null && (state.latest.endAt !== null || event.at - state.latest.startAt > 2000)) {
        this.archive(state); state.latest = { startAt: null, endAt: null, start: {}, end: {} };
      } else if (state.latest.endAt !== null) {
        this.archive(state); state.latest = { startAt: null, endAt: null, start: {}, end: {} };
      }
      state.latest.startAt ??= event.at;
    } else state.latest.endAt ??= event.at;
    state.latest[event.stage][event.item] = event.value;
    state.lastObservedAt = event.at;
    return true;
  }
  snapshot(code: string, now = Date.now()) {
    const state = this.states.get(code);
    const latest = state?.latest;
    return { code, pump: code.split('#')[1], result: pulseResult(latest, now),
      latest: latest ? { ...latest, result: pulseResult(latest, now), endReceived: latest.endAt !== null } : null,
      history: (state?.history ?? []).map(pulse => ({ ...pulse, result: pulseResult(pulse, now), endReceived: pulse.endAt !== null })) };
  }
}

// Match only recently due wall-clock schedules; never invent pulses from downtime.
export function recentlyDue(times: { time: string; state: boolean }[], now: number, timezone: string, since: number) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  const seconds = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return times.flatMap(entry => {
    if (!entry.state || !/^\d{2}:\d{2}:\d{2}$/.test(entry.time)) return [];
    const [h,m,s] = entry.time.split(':').map(Number);
    if (h > 23 || m > 59 || s > 59) return [];
    const age = (seconds - h * 3600 - m * 60 - s + 86400) % 86400;
    const at = Math.floor(now / 1000) * 1000 - age * 1000;
    return age <= 10 && at >= since ? [at] : [];
  });
}
