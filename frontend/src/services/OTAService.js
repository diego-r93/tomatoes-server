import axios from 'axios';

// Device uploads must not inherit the portal's bearer-token interceptor.
const deviceHttp = axios.create({ withCredentials: false, timeout: 120000 });
class OTAService {
  uploadFile(ip, formData, onUploadProgress) {
    const host = String(ip || '').trim();
    const parts = host.split('.');
    if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return Promise.reject(new Error('The device did not report a valid IPv4 address.'));
    return deviceHttp.post(`http://${host}/update`, formData, { onUploadProgress });
  }
}
export default new OTAService();
