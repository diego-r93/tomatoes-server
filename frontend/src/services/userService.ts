import type { AxiosRequestConfig } from 'axios';
import type {
  ActiveSession, ActivityFilters, ActivityPage, EmailConfiguration, GroupFields, Invitation,
  InvitationFields, LoginResponse, NewAccountFields, PasswordFields, SessionCredentials,
  UserGroup, UserProfileFields, UserRecord, UserSession,
} from './userTypes';
import { http } from './http-common';

const publicRequest: AxiosRequestConfig = { skipAuth: true };
class UserService {
  login(data: { identifier: string; password: string }) { return http.post<LoginResponse>('/api/users/login', data, publicRequest); }
  me() { return http.get<UserSession>('/api/users/me'); }
  refresh() { return http.post<SessionCredentials>('/api/users/refresh'); }
  logout(token: string) {
    const config: AxiosRequestConfig = { headers: { Authorization: `Bearer ${token}` }, skipUnauthorized: true };
    return http.post<void>('/api/users/logout', {}, config);
  }
  getAll() { return http.get<UserRecord[]>('/api/users'); }
  get(id: string | number) { return http.get<UserRecord>(`/api/users/${id}`); }
  update(id: number, data: UserProfileFields) { return http.put<UserRecord>(`/api/users/${id}`, data); }
  delete(id: number) { return http.delete<void>(`/api/users/${id}`); }
  setEnabled(id: number, enabled: boolean) { return http.patch<UserRecord>(`/api/users/${id}/status`, { enabled }); }
  updatePassword(data: PasswordFields) { return http.put<void>('/api/users/update-password', data); }
  sessions(id: string | number) { return http.get<ActiveSession[]>(`/api/users/${id}/sessions`); }
  revokeSessions(id: number, sessionId: string | null) { return http.delete<{ revokedCurrent: boolean }>(`/api/users/${id}/sessions${sessionId ? `/${sessionId}` : ''}`); }
  activity(id: number, params: ActivityFilters, signal: AbortSignal) { return http.get<ActivityPage>(`/api/users/${id}/activity`, { params, signal }); }
  groups() { return http.get<UserGroup[]>('/api/groups'); }
  saveGroup(id: number | null, data: GroupFields) { return id ? http.put<{ id: number }>(`/api/groups/${id}`, data) : http.post<{ id: number }>('/api/groups', data); }
  deleteGroup(id: number) { return http.delete<void>(`/api/groups/${id}`); }
  membership(id: number, groupIds: number[]) { return http.put<void>(`/api/users/${id}/membership`, { groupIds }); }
  settings() { return http.get<EmailConfiguration>('/api/users/settings'); }
  invitations() { return http.get<Invitation[]>('/api/invitations'); }
  invite(data: InvitationFields) { return http.post<Invitation>('/api/invitations', data); }
  resendInvitation(id: number) { return http.post<Invitation>(`/api/invitations/${id}/resend`); }
  revokeInvitation(id: number) { return http.delete<void>(`/api/invitations/${id}`); }
  invitationInfo(token: string) { return http.get<Invitation>(`/api/invitations/${encodeURIComponent(token)}`, publicRequest); }
  acceptInvitation(token: string, data: NewAccountFields) { return http.post<UserRecord>(`/api/invitations/${encodeURIComponent(token)}/accept`, data, publicRequest); }
  requestPasswordReset(email: string) { return http.post<{ message: string }>('/api/users/request-password-reset', { email }, publicRequest); }
  adminPasswordReset(id: number) { return http.post<{ message: string }>(`/api/users/${id}/password-reset`); }
  resetPassword(token: string, password: string) { return http.post<void>(`/api/users/password-reset/${encodeURIComponent(token)}`, { password }, publicRequest); }
  create() { return Promise.reject(new Error('An invitation is required to create an account.')); }
}
export default new UserService();
