// store/index.js
import { defineStore } from 'pinia';

export const useDeviceStore = defineStore('device', {  
  state: () => ({
    deviceData: {
      id: null,
      ip: null,
      hardware: null,
    },
  }),
  actions: {
    setDeviceData(deviceData) {
      this.deviceData = deviceData;
    },
  },
});
