import { encodeSchedule } from './schedulePayload';
import type { ScheduleInput } from './schedulePayload';

const maxBytes = 3500;

interface SchedulePublisher {
  readonly connected: boolean;
  publishRetained(topic: string, payload: string): Promise<void>;
}

interface ScheduleSyncDependencies {
  boards(): Promise<ScheduleInput[]>;
  approvedHosts(): Promise<Set<string>>;
  publishedTopics(): Promise<string[]>;
  rememberTopic(topic: string): Promise<void>;
  forgetTopic(topic: string): Promise<void>;
  warn(message: string, detail: string): void;
}

export function createScheduleSync(publisher: SchedulePublisher, deps: ScheduleSyncDependencies) {
  let pending = false;
  let force = false;
  let running: Promise<void> | undefined;
  const sent = new Map<string, string>();

  async function reconcile(republish: boolean) {
    const [boards, approved] = await Promise.all([deps.boards(), deps.approvedHosts()]);
    const entries = new Map<string, NonNullable<ReturnType<typeof encodeSchedule>>>();
    for (const board of boards) {
      const entry = encodeSchedule(board);
      if (!entry || !approved.has(entry.host) || entries.has(entry.topic)) continue;
      entries.set(entry.topic, entry);
    }

    for (const topic of await deps.publishedTopics()) {
      if (entries.has(topic)) continue;
      await publisher.publishRetained(topic, '');
      await deps.forgetTopic(topic);
      sent.delete(topic);
    }

    for (const { topic, payload } of entries.values()) {
      if (!republish && sent.get(topic) === payload) continue;
      if (Buffer.byteLength(payload) > maxBytes) {
        deps.warn('MQTT schedule exceeds 3500 bytes:', topic);
        continue;
      }
      // Record the topic first so a deletion can be retried after a restart.
      await deps.rememberTopic(topic);
      await publisher.publishRetained(topic, payload);
      sent.set(topic, payload);
    }
  }

  async function drain() {
    try {
      while (pending && publisher.connected) {
        const republish = force;
        pending = force = false;
        await reconcile(republish);
      }
    } catch (error) {
      pending = force = true;
      deps.warn('MQTT schedule sync will retry:', error instanceof Error ? error.name : 'Unknown error');
    } finally {
      running = undefined;
    }
  }

  function retry() {
    if (pending && publisher.connected && !running) {
      running = drain();
    }
    return running;
  }

  function request(republish = false) {
    pending = true;
    force ||= republish;
    return retry();
  }

  return { request, retry };
}
