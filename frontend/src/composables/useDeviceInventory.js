import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import mqttDataService from '@/services/mqttDataService';
import { isResponding, mergeDeviceDiscovery } from './deviceInventoryUtils';

export function useDeviceInventory() {
  const devices = ref([]), loading = ref(false), error = ref(''), notice = ref(''), clock = ref(Date.now()), lastRefresh = ref(null);
  const pending = ref({}), pendingAll = ref({}), sending = ref(false), hasLoaded = ref(false);
  let controller, request, refreshTimer, clockTimer, lastBulkPoll = 0;
  const pendingKey = (device, gpio) => `${device.key}:${gpio}`;
  const selectedPending = (device, gpio) => pending.value[pendingKey(device, gpio)];
  function refresh() {
    if (request) return request;
    controller = new AbortController(); loading.value = true; error.value = '';
    request = mqttDataService.getAll({ signal: controller.signal, timeout: 12000 }).then(({ data }) => {
      const timestamp = Date.now();
      devices.value = mergeDeviceDiscovery(data.devicesInformation, devices.value, timestamp);
      clock.value = timestamp; lastRefresh.value = timestamp; hasLoaded.value = true;
      for (const [key, command] of Object.entries(pending.value)) {
        const device = devices.value.find(item => item.key === command.deviceKey);
        if (device?.responded && device.outputs.some(output => output.gpio === command.gpio && output.state === command.target)) {
          delete pending.value[key]; notice.value = `Device confirmed GPIO ${command.gpio} ${command.target ? 'ON' : 'OFF'} on ${device.host}.`;
        }
      }
      for (const [key, command] of Object.entries(pendingAll.value)) {
        const device = devices.value.find(item => item.key === key);
        if (device?.responded && command.gpios.every(gpio => device.outputs.some(output => output.gpio === gpio && output.state === false))) {
          delete pendingAll.value[key];
          notice.value = `Device confirmed all requested outputs OFF on ${device.host}.`;
        }
      }
    }).catch(issue => {
      if (issue.code === 'ERR_CANCELED') return;
      error.value = issue.code === 'ECONNABORTED' ? 'Device discovery timed out. No replies may have been received. Try refreshing.' : issue.response?.data?.message || 'Could not discover devices. Check the connection and try again.';
    }).finally(() => { loading.value = false; request = null; });
    return request;
  }
  function setRefreshInterval(seconds) {
    clearInterval(refreshTimer);
    if ([15, 30, 60].includes(Number(seconds))) refreshTimer = setInterval(() => { if (!document.hidden && !sending.value) refresh(); }, Number(seconds) * 1000);
  }
  async function sendOutput(deviceKey, gpio, target, originalState) {
    const device = devices.value.find(item => item.key === deviceKey), output = device?.outputs.find(item => item.gpio === gpio);
    if (!isResponding(device, clock.value) || !output || output.state !== originalState) throw new Error('The device or output state changed. Refresh and confirm the command again.');
    if (sending.value || pendingAll.value[deviceKey] || selectedPending(device, gpio)) throw new Error('A command is already awaiting confirmation.');
    sending.value = true;
    try {
      await mqttDataService.updateGpio(device.host, { [gpio]: target });
      pending.value[pendingKey(device, gpio)] = { deviceKey, gpio, target, submittedAt: Date.now() };
      notice.value = `GPIO ${gpio} command submitted. Waiting for the device to confirm ${target ? 'ON' : 'OFF'}.`;
      refresh();
    } finally { sending.value = false; }
  }
  async function sendAllOff(deviceKey) {
    if (sending.value || pendingAll.value[deviceKey] || Object.values(pending.value).some(command => command.deviceKey === deviceKey)) {
      throw new Error('A command is already awaiting confirmation.');
    }
    sending.value = true;
    try {
      if (request) await request;
      const device = devices.value.find(item => item.key === deviceKey);
      if (!isResponding(device) || !device.outputs.length) throw new Error('The device has no recently reported outputs.');
      const { data } = await mqttDataService.turnOffOutputs(device.host);
      pendingAll.value[deviceKey] = { gpios: data.gpios, host: device.host, submittedAt: Date.now() };
      lastBulkPoll = Date.now();
      notice.value = `OFF command sent to ${device.host}. Waiting for all outputs to report OFF.`;
      refresh();
    } finally { sending.value = false; }
  }
  onMounted(() => {
    refresh();
    clockTimer = setInterval(() => {
      clock.value = Date.now();
      for (const [key, command] of Object.entries(pending.value)) if (clock.value - command.submittedAt > 30000) {
        delete pending.value[key]; notice.value = `GPIO ${command.gpio}: no device confirmation received within 30 seconds. The displayed state remains the last reported state.`;
      }
      for (const [key, command] of Object.entries(pendingAll.value)) {
        if (clock.value - command.submittedAt > 30000) {
          delete pendingAll.value[key];
          notice.value = `${command.host}: all outputs OFF could not be confirmed within 30 seconds.`;
        }
      }
      if (Object.keys(pendingAll.value).length && !request && clock.value - lastBulkPoll >= 3000) {
        lastBulkPoll = clock.value;
        refresh();
      }
    }, 1000);
  });
  onBeforeUnmount(() => { controller?.abort(); clearInterval(refreshTimer); clearInterval(clockTimer); });
  return { devices, loading, initialLoading: computed(() => loading.value && !hasLoaded.value && !devices.value.length), hasLoaded, error, notice, clock, lastRefresh, pending, pendingAll, sending, selectedPending, refresh, setRefreshInterval, sendOutput, sendAllOff };
}
