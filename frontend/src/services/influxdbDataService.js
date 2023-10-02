import { http } from "./http-common"

class MqttDataService {
  getData(data) {
    return http.post("/influx", data)
  }
}

export default new MqttDataService()