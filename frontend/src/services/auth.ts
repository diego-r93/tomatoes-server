import { isAxiosError } from 'axios';
import type { LoginResponse, UserIdentity } from './userTypes';
import userService from './userService';
import { clearAuthorizationHeaders } from './http-common';

class Authentication {
  currentUser: UserIdentity | null = null;
  validatedAt = 0;
  pending: Promise<UserIdentity | null> | null = null;
  tokenRenewalInterval: number | undefined;
  constructor() {
    window.addEventListener('tomatoes:unauthorized', () => {
      this.logout({ notifyServer: false });
      window.dispatchEvent(new Event('tomatoes:session-ended'));
    });
    if (this.isAuthenticated()) this.startTokenRenewal();
  }
  isAuthenticated() {
    const expiry = Number(localStorage.getItem('tomatoesExpiration'));
    return Boolean(localStorage.getItem('tomatoesAccessToken') && expiry && Date.now() < expiry);
  }
  updateUser(user: UserIdentity) {
    this.currentUser = user;
    localStorage.setItem('tomatoesUserId', String(user.id));
    localStorage.setItem('tomatoesUserData', JSON.stringify({ id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, state: user.state, isAdmin: user.isAdmin }));
  }
  login(user: LoginResponse) {
    const expiry = Date.parse(user.expiresAt);
    if (!user.accessToken || !Number.isFinite(expiry)) throw new Error('The login response was invalid.');
    localStorage.setItem('tomatoesAccessToken', user.accessToken);
    localStorage.setItem('tomatoesExpiration', String(expiry));
    this.updateUser(user); this.validatedAt = Date.now(); this.startTokenRenewal();
  }
  async validateSession(force = false): Promise<UserIdentity | null> {
    if (!this.isAuthenticated()) return null;
    if (!force && this.currentUser && Date.now() - this.validatedAt < 30000) return this.currentUser;
    if (this.pending) return this.pending;
    this.pending = userService.me().then(({ data }) => { this.updateUser(data); this.validatedAt = Date.now(); return data; }).catch((error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 401) return null;
      throw error;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
  logout({ notifyServer = true } = {}) {
    const token = localStorage.getItem('tomatoesAccessToken');
    this.stopTokenRenewal(); this.currentUser = null; this.validatedAt = 0;
    for (const key of ['tomatoesAccessToken', 'tomatoesExpiration', 'tomatoesUserId', 'tomatoesUserData', 'tomatoesDashboard']) localStorage.removeItem(key);
    clearAuthorizationHeaders();
    if (notifyServer && token) userService.logout(token).catch(() => {});
  }
  startTokenRenewal() {
    this.stopTokenRenewal(); let ticks = 0;
    this.tokenRenewalInterval = window.setInterval(async () => {
      if (!this.isAuthenticated()) { this.logout({ notifyServer: false }); window.dispatchEvent(new Event('tomatoes:session-ended')); return; }
      try {
        if (!await this.validateSession(true)) return;
        if (++ticks % 5 === 0) {
          const { data } = await userService.refresh();
          localStorage.setItem('tomatoesAccessToken', data.accessToken);
          localStorage.setItem('tomatoesExpiration', String(Date.parse(data.expiresAt)));
        }
      } catch { /* A temporary network error does not invalidate server-side sessions. */ }
    }, 60000);
  }
  stopTokenRenewal() { clearInterval(this.tokenRenewalInterval); this.tokenRenewalInterval = undefined; }
}
export default new Authentication();

