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

export interface UserSession extends UserRecord {
  sessionId: string;
}

export interface LoginResponse extends UserSession, SessionCredentials {}

export interface SessionCredentials {
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

export type UserProfileFields = Pick<UserIdentity, 'firstName' | 'lastName' | 'email' | 'username' | 'phone' | 'state'>;

interface GroupSummary {
  id: number;
  name: string;
  description: string;
  isBuiltin: boolean;
  createdAt: string;
}

export interface UserGroup extends GroupSummary {
  memberIds: number[];
}

export type GroupFields = Pick<UserGroup, 'name' | 'description' | 'memberIds'>;

export interface UserRecord extends UserIdentity {
  enabled: boolean;
  isBuiltin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  browser: string;
  os: string;
  groups: GroupSummary[];
}

export interface ActiveSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  loginIp: string;
  lastIp: string;
  browser: string;
  os: string;
  current: boolean;
}

export interface EmailConfiguration {
  configured: boolean;
  defaultInvitationDays: number;
}

export interface Invitation {
  id: number;
  email: string;
  status: 'pending' | 'expired' | 'accepted' | 'revoked';
  deliveryStatus: 'queued' | 'sent' | 'failed';
  message: string;
  expiresAt: string;
  groups: GroupSummary[];
}

export interface InvitationFields {
  email: string;
  groupIds: number[];
  expiresInDays: number;
  message: string;
}

export interface NewAccountFields {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
}

export interface PasswordFields {
  oldPassword: string;
  newPassword: string;
}
