import { onBeforeUnmount, onMounted, ref } from 'vue';
import { http } from '@/services/http-common';
import { boardConnection } from './boardConnectionUtils.mjs';

// Read the existing discovery monitor; do not publish commands or discovery requests.
export function useBoardConnections() {
  const snapshot = ref(null), loading = ref(false), error = ref(''), clock = ref(Date.now());
  let request, controller, refreshTimer, clockTimer, disposed = false, clockOffset = 0;
  function refreshConnections() {
    if (request || disposed) return request;
    loading.value = true;
    controller = new AbortController();
    request = http.get('/api/alerts/settings', { signal: controller.signal, timeout: 10000 }).then(({ data, headers }) => {
      if (disposed) return;
      if (!Array.isArray(data.devices) || typeof data.monitor?.running !== 'boolean' || typeof data.mqtt?.mqttConnected !== 'boolean') throw new Error('Invalid connection information');
      // Use server time so a different browser clock does not mark boards offline.
      const serverTime = Date.parse(headers.date);
      clockOffset = Number.isFinite(serverTime) ? serverTime - Date.now() : 0;
      clock.value = Date.now() + clockOffset;
      snapshot.value = { devices: data.devices, monitorRunning: data.monitor.running, mqttConnected: data.mqtt.mqttConnected, lastDiscovery: data.mqtt.lastDiscovery, checkedAt: clock.value, error: false };
      error.value = '';
    }).catch(issue => {
      if (disposed || issue.code === 'ERR_CANCELED') return;
      snapshot.value = { ...snapshot.value, error: true };
      error.value = 'Board connection status is unavailable. Pump schedules can still be viewed and edited.';
    }).finally(() => { if (!disposed) { loading.value = false; request = null; } });
    return request;
  }
  const connectionFor = code => boardConnection(code, snapshot.value, clock.value);
  const resume = () => { if (!document.hidden) { clock.value = Date.now() + clockOffset; refreshConnections(); } };
  onMounted(() => {
    refreshConnections();
    clockTimer = setInterval(() => { clock.value = Date.now() + clockOffset; }, 1000);
    refreshTimer = setInterval(() => { if (!document.hidden) refreshConnections(); }, 30000);
    document.addEventListener('visibilitychange', resume);
  });
  onBeforeUnmount(() => { disposed = true; controller?.abort(); clearInterval(refreshTimer); clearInterval(clockTimer); document.removeEventListener('visibilitychange', resume); });
  return { connectionFor, refreshConnections, loading, error };
}
