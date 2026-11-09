import { http } from './http-common';
import { turnOffOutputs, updateGpio } from './gpioCommands';
import { getDeviceDiscovery } from './deviceDiscovery';

class MqttDataService {
  subscribe() { return http.get('/mqtt'); }
  publish(data) { return http.post('/mqtt', data); }
  updateGpio(id, data) { return updateGpio(id, data); }
  turnOffOutputs(host) { return turnOffOutputs(host); }
  getPumpDriver(options = {}) { return http.get('/mqtt/pump-driver', options); }
  getAll(options = {}) { return getDeviceDiscovery(options); }
}
export default new MqttDataService();
