export interface UserIdentity {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  isAdmin: boolean;
}

export interface UserSession extends UserIdentity {
  sessionId: string;
}

export interface LoginResponse extends UserSession {
  accessToken: string;
  expiresAt: string;
}

export interface ActivityFilters {
  page: number;
  pageSize: number;
  search: string;
  action: string;
  from?: string;
  before?: string;
}

export interface UserActivity {
  id: number;
  createdAt: string;
  description: string;
  action: string;
  actor: string;
  ip: string | null;
}

export interface ActivityPage {
  items: UserActivity[];
  total: number;
  page: number;
  pageSize: number;
  actions: string[];
}
