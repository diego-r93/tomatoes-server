import { http } from "./http-common";

class OTAService {
  uploadFile(ip, formData, onUploadProgress) {
    // Usar o IP do dispositivo para montar a URL de destino
    const url = `http://${ip}/update`;
    return http.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  }
}

export default new OTAService();