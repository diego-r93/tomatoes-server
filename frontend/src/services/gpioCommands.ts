import { http } from './http-common';

export function updateGpio(host: string, outputs: Record<number, boolean>) {
  return http.patch<unknown>(`/mqtt/${encodeURIComponent(host)}`, outputs, { timeout: 10000 });
}

export function turnOffOutputs(host: string) {
  return http.patch<{ gpios: number[] }>(`/mqtt/${encodeURIComponent(host)}/outputs/off`, undefined, { timeout: 10000 });
}
