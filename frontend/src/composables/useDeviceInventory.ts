import { isAxiosError } from 'axios';
import { confirmsOutputCommand } from './deviceOutputCommands';
import type { PendingAllOff, PendingOutput } from './deviceOutputCommands';
import type { DiscoveredDevice } from './deviceInventoryUtils';
import { watchDevicePageResume } from './devicePageResume.ts';
import { mergeDriverFeedback } from './pumpDriverFeedback.ts';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import mqttDataService from '@/services/mqttDataService';
import { isResponding, mergeDeviceDiscovery } from './deviceInventoryUtils';

export function useDeviceInventory() {
  const devices = ref<DiscoveredDevice[]>([]), loading = ref(false), error = ref(''), notice = ref(''), clock = ref(Date.now()), lastRefresh = ref<number | null>(null);
  const feedbackError = ref(false);
  const noticeParameters = ref<Record<string, string | number>>({});
  function notify(message: string, parameters: Record<string, string | number>) { notice.value = message; noticeParameters.value = parameters; }
  const pending = ref<Partial<Record<string, PendingOutput>>>({}), pendingAll = ref<Partial<Record<string, PendingAllOff>>>({}), sending = ref(false), hasLoaded = ref(false);
  let controller: AbortController | undefined, feedbackController: AbortController | undefined;
  let request: Promise<void> | null = null, feedbackRequest: Promise<void> | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let clockTimer: ReturnType<typeof setInterval> | undefined;
  let feedbackTimer: ReturnType<typeof setInterval> | undefined;
  let stopResumeWatch: (() => void) | undefined;
  let lastBulkPoll = 0;
  const pendingKey = (device: DiscoveredDevice, gpio: number) => `${device.key}:${gpio}`;
  const selectedPending = (device: DiscoveredDevice, gpio: number) => pending.value[pendingKey(device, gpio)];
  function refresh() {
    if (request) return request;
    controller = new AbortController(); loading.value = true; error.value = '';
    request = mqttDataService.getAll({ signal: controller.signal, timeout: 12000 }).then(({ data }) => {
      const timestamp = Date.now();
      devices.value = mergeDeviceDiscovery(data.devicesInformation, devices.value, timestamp);
      clock.value = timestamp; lastRefresh.value = timestamp; hasLoaded.value = true;
      for (const [key, command] of Object.entries(pending.value)) {
        if (!command) continue;
        const device = devices.value.find(item => item.key === command.deviceKey);
        if (device && confirmsOutputCommand(device, command)) {
          delete pending.value[key]; notify('Device confirmed GPIO {gpio} {state} on {host}.', { gpio: command.gpio, state: command.target ? 'ON' : 'OFF', host: device.host });
        }
      }
      for (const [key, command] of Object.entries(pendingAll.value)) {
        const device = devices.value.find(item => item.key === key);
        if (device && command && confirmsOutputCommand(device, command)) {
          delete pendingAll.value[key];
          notify('Device confirmed all requested outputs OFF on {host}.', { host: device.host });
        }
      }
    }).catch((issue: unknown) => {
      const failure = isAxiosError<{ message?: string }>(issue) ? issue : undefined;
      if (failure?.code === 'ERR_CANCELED') return;
      error.value = failure?.code === 'ECONNABORTED' ? 'Device discovery timed out. No replies may have been received. Try refreshing.' : failure?.response?.data?.message || 'Could not discover devices. Check the connection and try again.';
    }).finally(() => { loading.value = false; request = null; });
    return request;
  }
  function refreshFeedback() {
    if (feedbackRequest || document.hidden || !hasLoaded.value) return;
    feedbackController = new AbortController();
    feedbackRequest = mqttDataService.getPumpDriver({ signal: feedbackController.signal, timeout: 8000 }).then(({data}) => {
      devices.value = mergeDriverFeedback(devices.value, data.devices); feedbackError.value = false;
    }).catch((issue: unknown) => { if (!isAxiosError(issue) || issue.code !== 'ERR_CANCELED') feedbackError.value = true; }).finally(() => {feedbackRequest = null;});
  }
  function setRefreshInterval(seconds: number) {
    clearInterval(refreshTimer);
    if ([15, 30, 60].includes(Number(seconds))) refreshTimer = setInterval(() => { if (!document.hidden && !sending.value) refresh(); }, Number(seconds) * 1000);
  }
  async function sendOutput(deviceKey: string, gpio: number, target: boolean, originalState: boolean | null) {
    const device = devices.value.find(item => item.key === deviceKey), output = device?.outputs.find(item => item.gpio === gpio);
    if (!device || !isResponding(device, clock.value) || !output || output.state !== originalState) throw new Error('The device or output state changed. Refresh and confirm the command again.');
    if (sending.value || pendingAll.value[deviceKey] || selectedPending(device, gpio)) throw new Error('A command is already awaiting confirmation.');
    sending.value = true;
    try {
      await mqttDataService.updateGpio(device.host, { [gpio]: target });
      pending.value[pendingKey(device, gpio)] = { deviceKey, gpio, target, submittedAt: Date.now() };
      notify('GPIO {gpio} command submitted. Waiting for the device to confirm {state}.', { gpio, state: target ? 'ON' : 'OFF' });
      refresh();
    } finally { sending.value = false; }
  }
  async function sendAllOff(deviceKey: string) {
    if (sending.value || pendingAll.value[deviceKey] || Object.values(pending.value).some(command => command?.deviceKey === deviceKey)) {
      throw new Error('A command is already awaiting confirmation.');
    }
    sending.value = true;
    try {
      if (request) await request;
      const device = devices.value.find(item => item.key === deviceKey);
      if (!device || !isResponding(device) || !device.outputs.length) throw new Error('The device has no recently reported outputs.');
      const { data } = await mqttDataService.turnOffOutputs(device.host);
      pendingAll.value[deviceKey] = { gpios: data.gpios, host: device.host, submittedAt: Date.now() };
      lastBulkPoll = Date.now();
      notify('OFF command sent to {host}. Waiting for all outputs to report OFF.', { host: device.host });
      refresh();
    } finally { sending.value = false; }
  }
  onMounted(() => {
    refresh();
    stopResumeWatch = watchDevicePageResume({ windowTarget: window, documentTarget: document, refresh,
      lastRefresh: () => lastRefresh.value,
      onResume: (timestamp: number) => { clock.value = timestamp; refreshFeedback(); } });
    feedbackTimer = setInterval(refreshFeedback, 2000);
    clockTimer = setInterval(() => {
      clock.value = Date.now();
      for (const [key, command] of Object.entries(pending.value)) if (command && clock.value - command.submittedAt > 30000) {
        delete pending.value[key]; notify('GPIO {gpio}: no device confirmation received within 30 seconds. The displayed state remains the last reported state.', { gpio: command.gpio });
      }
      for (const [key, command] of Object.entries(pendingAll.value)) {
        if (command && clock.value - command.submittedAt > 30000) {
          delete pendingAll.value[key];
          notify('{host}: all outputs OFF could not be confirmed within 30 seconds.', { host: command.host });
        }
      }
      if (Object.keys(pendingAll.value).length && !request && clock.value - lastBulkPoll >= 3000) {
        lastBulkPoll = clock.value;
        refresh();
      }
    }, 1000);
  });
  onBeforeUnmount(() => { stopResumeWatch?.(); controller?.abort(); feedbackController?.abort(); clearInterval(refreshTimer); clearInterval(clockTimer); clearInterval(feedbackTimer); });
  return { devices, feedbackError, loading, initialLoading: computed(() => loading.value && !hasLoaded.value && !devices.value.length), hasLoaded, error, notice, noticeParameters, clock, lastRefresh, pending, pendingAll, sending, selectedPending, refresh, setRefreshInterval, sendOutput, sendAllOff };
}
