import { http } from './http-common';

class MqttDataService {
  subscribe() { return http.get('/mqtt'); }
  publish(data) { return http.post('/mqtt', data); }
  updateGpio(id, data) { return http.patch(`/mqtt/${encodeURIComponent(id)}`, data, { timeout: 10000 }); }
  turnOffOutputs(host) { return http.patch(`/mqtt/${encodeURIComponent(host)}/outputs/off`, undefined, { timeout: 10000 }); }
  getPumpDriver(options = {}) { return http.get('/mqtt/pump-driver', options); }
  getAll(options = {}) { return http.get('/mqtt/getdevices', options); }
}
export default new MqttDataService();
