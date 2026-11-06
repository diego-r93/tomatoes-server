import { http } from './http-common';
export default {
  list: () => http.get('/dashboards/library'),
  get: id => http.get(`/dashboards/library/${encodeURIComponent(id)}`),
  save: dashboard => dashboard._id ? http.put(`/dashboards/library/${encodeURIComponent(dashboard._id)}`, dashboard) : http.post('/dashboards/library', dashboard),
  remove: dashboard => http.delete(`/dashboards/library/${encodeURIComponent(dashboard._id)}`, { params: { revision: dashboard.revision } }),
  export: id => http.get(`/dashboards/library/${encodeURIComponent(id)}/export`),
  schema: params => http.get('/dashboards/schema', { params }),
  getcharts: () => http.get('/dashboards'),
};
