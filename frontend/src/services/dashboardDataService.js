import { http } from "./http-common";

class DashboardService {
  getcharts() {
    return http.get("/dashboards");
  }  
  
  saveCharts(chartsJSON) {
    return http.post('/dashboards/saveCharts', chartsJSON);
  }
}

export default new DashboardService();