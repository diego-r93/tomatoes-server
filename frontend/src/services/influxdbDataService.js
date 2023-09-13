import { http, httpWithAuthorization, setAuthorizationHeader } from "./http-common"

class MqttDataService {
  getData() {
    return http.get("/influx",)
  }
}

export default new MqttDataService()