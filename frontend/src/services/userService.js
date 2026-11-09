import { http } from './http-common';

const publicRequest = { skipAuth: true };
class UserService {
  /**
   * @param {{ identifier: string, password: string }} data
   * @returns {Promise<import('axios').AxiosResponse<import('./userTypes').LoginResponse>>}
   */
  login(data) { return http.post('/api/users/login', data, publicRequest); }
  /** @returns {Promise<import('axios').AxiosResponse<import('./userTypes').UserSession>>} */
  me() { return http.get('/api/users/me'); }
  refresh() { return http.post('/api/users/refresh'); }
  logout(token) { return http.post('/api/users/logout', {}, { headers: { Authorization: `Bearer ${token}` }, skipUnauthorized: true }); }
  getAll() { return http.get('/api/users'); }
  get(id) { return http.get(`/api/users/${id}`); }
  update(id, data) { return http.put(`/api/users/${id}`, data); }
  delete(id) { return http.delete(`/api/users/${id}`); }
  setEnabled(id, enabled) { return http.patch(`/api/users/${id}/status`, { enabled }); }
  updatePassword(data) { return http.put('/api/users/update-password', data); }
  sessions(id) { return http.get(`/api/users/${id}/sessions`); }
  revokeSessions(id, sessionId) { return http.delete(`/api/users/${id}/sessions${sessionId ? `/${sessionId}` : ''}`); }
  /**
   * @param {number} id
   * @param {import('./userTypes').ActivityFilters} params
   * @param {AbortSignal} signal
   * @returns {Promise<import('axios').AxiosResponse<import('./userTypes').ActivityPage>>}
   */
  activity(id, params, signal) { return http.get(`/api/users/${id}/activity`, { params, signal }); }
  groups() { return http.get('/api/groups'); }
  saveGroup(id, data) { return id ? http.put(`/api/groups/${id}`, data) : http.post('/api/groups', data); }
  deleteGroup(id) { return http.delete(`/api/groups/${id}`); }
  membership(id, groupIds) { return http.put(`/api/users/${id}/membership`, { groupIds }); }
  settings() { return http.get('/api/users/settings'); }
  invitations() { return http.get('/api/invitations'); }
  invite(data) { return http.post('/api/invitations', data); }
  resendInvitation(id) { return http.post(`/api/invitations/${id}/resend`); }
  revokeInvitation(id) { return http.delete(`/api/invitations/${id}`); }
  invitationInfo(token) { return http.get(`/api/invitations/${encodeURIComponent(token)}`, publicRequest); }
  acceptInvitation(token, data) { return http.post(`/api/invitations/${encodeURIComponent(token)}/accept`, data, publicRequest); }
  requestPasswordReset(email) { return http.post('/api/users/request-password-reset', { email }, publicRequest); }
  adminPasswordReset(id) { return http.post(`/api/users/${id}/password-reset`); }
  resetPassword(token, password) { return http.post(`/api/users/password-reset/${encodeURIComponent(token)}`, { password }, publicRequest); }
  create() { return Promise.reject(new Error('An invitation is required to create an account.')); }
}
export default new UserService();
