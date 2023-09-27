import { http, httpWithAuthorization, setAuthorizationHeader } from "./http-common"

class NetworkDataService {
  getConfigFile(type) {
    return http.get(`/network/config/${type}`)
  }

  updateConfigFile(type, data) {
    return http.post(`/network/config/${type}`, data)
  } 
}

export default new NetworkDataService()