import { onBeforeUnmount, onMounted, ref } from 'vue';
import { http } from '@/services/http-common';
import mqttDataService from '@/services/mqttDataService';
import { approvedSetupBoards } from './boardSetupInventory.mjs';

export function useBoardSetupInventory() {
  const boards = ref([]), loading = ref(false), error = ref('');
  let request, controller, timer, disposed = false;
  function refresh() {
    if (request || disposed) return request;
    controller = new AbortController();
    const options = { signal: controller.signal, timeout: 12000 };
    loading.value = true; error.value = '';
    request = Promise.all([http.get('/mqtt/registry', options), mqttDataService.getAll(options)])
      .then(([registry, discovery]) => {
        if (!disposed) boards.value = approvedSetupBoards(registry.data, discovery.data.devicesInformation);
      }).catch(issue => {
        if (issue.code !== 'ERR_CANCELED' && !disposed) {
          boards.value = [];
          error.value = 'Could not load board setup. Refresh to try again.';
        }
      }).finally(() => { loading.value = false; request = null; });
    return request;
  }
  function resume() { if (!document.hidden) refresh(); }
  onMounted(() => {
    refresh(); timer = setInterval(resume, 30000);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
  });
  onBeforeUnmount(() => {
    disposed = true; controller?.abort(); clearInterval(timer);
    document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume);
  });
  return { boards, loading, error, refresh };
}
