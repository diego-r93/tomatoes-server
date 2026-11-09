import { defineStore } from 'pinia';
import type { DiscoveredDevice } from '@/composables/deviceInventoryUtils';

export const useDeviceStore = defineStore('device', {
  state: (): { deviceData: DiscoveredDevice | null } => ({ deviceData: null }),
  actions: {
    setDeviceData(device: DiscoveredDevice) {
      this.deviceData = device;
    },
  },
});
