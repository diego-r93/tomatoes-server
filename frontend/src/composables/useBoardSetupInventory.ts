import { isAxiosError } from 'axios';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { http } from '@/services/http-common';
import { getDeviceDiscovery } from '@/services/deviceDiscovery';
import type { RegisteredBoard } from './deviceReportTypes';
import type { SetupBoard } from './boardSetupInventory';
import { approvedSetupBoards } from './boardSetupInventory';

export function useBoardSetupInventory() {
  const boards = ref<SetupBoard[]>([]), loading = ref(false), error = ref('');
  let request: Promise<void> | null = null;
  let controller: AbortController | undefined;
  let timer: number | undefined;
  let disposed = false;
  function refresh() {
    if (request || disposed) return request;
    controller = new AbortController();
    const options = { signal: controller.signal, timeout: 12000 };
    loading.value = true; error.value = '';
    request = Promise.all([http.get<RegisteredBoard[]>('/mqtt/registry', options), getDeviceDiscovery(options)])
      .then(([registry, discovery]) => {
        if (!disposed) boards.value = approvedSetupBoards(registry.data, discovery.data.devicesInformation);
      }).catch((issue: unknown) => {
        if (!disposed && !(isAxiosError(issue) && issue.code === 'ERR_CANCELED')) {
          boards.value = [];
          error.value = 'Could not load board setup. Refresh to try again.';
        }
      }).finally(() => { loading.value = false; request = null; });
    return request;
  }
  function resume() { if (!document.hidden) refresh(); }
  onMounted(() => {
    refresh(); timer = window.setInterval(resume, 30000);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
  });
  onBeforeUnmount(() => {
    disposed = true; controller?.abort(); clearInterval(timer);
    document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume);
  });
  return { boards, loading, error, refresh };
}
