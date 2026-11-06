export interface UserRow {
  id: number; email: string; password: string; username: string;
  firstName: string | null; lastName: string | null; phone: string | null; state: string | null;
  createdAt: string; updatedAt: string; enabled: number; is_builtin: number; is_admin: number;
  email_verified: number; last_login_at: string | null; last_login_ip: string | null; last_login_agent: string | null;
}
export interface ClientInfo { ip: string; userAgent: string; }
export interface GroupRow { id: number; name: string; description: string; is_builtin: number; created_at: string; }
export interface SessionRow {
  id: string; user_id: number; created_at: string; last_seen_at: string; expires_at: string;
  login_ip: string; last_ip: string; user_agent: string; revoked_at: string | null;
}
export interface InvitationRow {
  id: number; email: string; token_hash: string; status: string; delivery_status: string;
  validity_days: number; message: string; expires_at: string; created_at: string; sent_at: string | null; invited_by: number;
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function browserDetails(agent: string | null) {
  const value = agent || '';
  const browser = /Edg\//.test(value) ? 'Edge' : /Firefox\//.test(value) ? 'Firefox' : /Chrome\//.test(value) ? 'Chrome' : /Safari\//.test(value) ? 'Safari' : 'Unknown browser';
  const os = /Android/.test(value) ? 'Android' : /iPhone|iPad/.test(value) ? 'iOS' : /Windows/.test(value) ? 'Windows' : /Macintosh|Mac OS/.test(value) ? 'macOS' : /Linux/.test(value) ? 'Linux' : 'Unknown OS';
  return { browser, os };
}
export function emailAddress(value: unknown): string {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  return email;
}
export function text(value: unknown, max: number, required = false): string {
  const result = String(value ?? '').trim();
  if ((required && !result) || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) throw new HttpError(400, 'One or more fields are invalid.');
  return result;
}
export function passwordValue(value: unknown): string {
  const password = String(value || '');
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'Use at least 8 characters and no more than 72 UTF-8 bytes for the password.');
  return password;
}
export function numericId(value: unknown): number {
  const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Invalid identifier.'); return id;
}
export function idList(value: unknown): number[] {
  if (!Array.isArray(value) || value.length > 1000) throw new HttpError(400, 'Invalid membership list.');
  return [...new Set(value.map(numericId))];
}

