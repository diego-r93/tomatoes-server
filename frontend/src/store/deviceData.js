// store/index.js
import { defineStore } from 'pinia';

export const useDeviceStore = defineStore('device', {  
  state: () => ({
    deviceData: {
      host: null,
      ip: null,
    },
  }),
  actions: {
    setDeviceData(deviceData) {
      this.deviceData = deviceData;
    },
  },
});
