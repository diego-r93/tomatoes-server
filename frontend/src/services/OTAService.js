import { http } from './http-common';

class OTAService {
  uploadFile(host, formData, onUploadProgress) {
    return http.post(`/ota/${encodeURIComponent(host)}/firmware`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress, timeout: 135000, skipUnauthorized: true,
    });
  }
}
export default new OTAService();
