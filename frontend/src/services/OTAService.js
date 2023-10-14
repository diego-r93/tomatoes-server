import { http } from "./http-common";

class OTAService {
  uploadFile(formData, onUploadProgress) {
    return http.post('/ota/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  }
}

export default new OTAService();
