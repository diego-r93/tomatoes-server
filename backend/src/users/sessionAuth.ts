import * as jwt from 'jsonwebtoken';
import { access, get, run } from './database';
import { ClientInfo, HttpError, SessionRow, UserRow } from './types';

export const sessionSeconds = () => Math.min(168, Math.max(1, Number(process.env.AUTH_SESSION_HOURS) || 12)) * 3600;

export function sessionToken(user: UserRow, sessionId: string) {
  return jwt.sign({ userId: user.id, sid: sessionId }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: sessionSeconds() });
}

export function authenticateSession(rawToken: string, client: ClientInfo) {
  return access(async () => {
    let claims: jwt.JwtPayload;
    try { claims = jwt.verify(rawToken, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as jwt.JwtPayload; }
    catch { throw new HttpError(401, 'Your session has expired. Please sign in again.'); }
    if (!Number.isSafeInteger(claims.userId) || typeof claims.sid !== 'string') throw new HttpError(401, 'Please sign in again.');
    const session = await get<SessionRow>('SELECT * FROM user_sessions WHERE id = ? AND user_id = ?', [claims.sid, claims.userId]);
    const user = await get<UserRow>('SELECT * FROM users WHERE id = ?', [claims.userId]);
    if (!session || session.revoked_at || Date.parse(session.expires_at) <= Date.now() || !user?.enabled) throw new HttpError(401, 'Your session is no longer active. Please sign in again.');
    if (Date.now() - Date.parse(session.last_seen_at) > 60000) await run('UPDATE user_sessions SET last_seen_at = ?, last_ip = ? WHERE id = ?', [new Date().toISOString(), client.ip, session.id]);
    return { user, session };
  });
}
