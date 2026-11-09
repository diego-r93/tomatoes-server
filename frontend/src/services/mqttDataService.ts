import type { AxiosRequestConfig } from 'axios';
import type { DeviceDriverReport } from '@/composables/deviceReportTypes';
import { http } from './http-common';
import { turnOffOutputs, updateGpio } from './gpioCommands';
import { getDeviceDiscovery } from './deviceDiscovery';

class MqttDataService {
  updateGpio = updateGpio;
  turnOffOutputs = turnOffOutputs;
  getPumpDriver(options: AxiosRequestConfig = {}) { return http.get<{ devices: DeviceDriverReport[] }>('/mqtt/pump-driver', options); }
  getAll = getDeviceDiscovery;
}
export default new MqttDataService();
