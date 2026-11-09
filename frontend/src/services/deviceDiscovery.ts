import type { AxiosRequestConfig } from 'axios';
import { http } from './http-common';

interface DeviceDiscoveryResponse {
  devicesNumber: number;
  devicesInformation: unknown;
}

export function getDeviceDiscovery(options: AxiosRequestConfig = {}) {
  return http.get<DeviceDiscoveryResponse>('/mqtt/getdevices', options);
}
