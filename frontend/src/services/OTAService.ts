import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { http } from './http-common';

export interface FirmwareUploadResult {
  ok?: boolean;
  sha256?: string;
  confirmation?: string;
  error?: string;
  message?: string;
}

export default {
  uploadFile(host: string, formData: FormData, onUploadProgress: (event: AxiosProgressEvent) => void) {
    const config: AxiosRequestConfig & { skipUnauthorized: boolean } = {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 200000,
      skipUnauthorized: true,
    };
    return http.post<FirmwareUploadResult>('/ota/' + encodeURIComponent(host) + '/firmware', formData, config);
  },
};
