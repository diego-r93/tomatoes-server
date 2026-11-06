import { NextFunction, Request, Response } from 'express';
import { userStore } from './store';
import { ClientInfo, HttpError, SessionRow, UserRow } from './types';

export type AuthContext = { user: UserRow; session: SessionRow };
export const context = (res: Response) => res.locals.auth as AuthContext;
export function clientInfo(req: Request): ClientInfo {
  return { ip: (req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '').slice(0, 80), userAgent: String(req.headers['user-agent'] || '').slice(0, 512) };
}
export const endpoint = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { handler(req, res).catch(next); };
// Express middleware needs to continue after successful authentication.
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const value = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!value || value.length > 4096) return next(new HttpError(401, 'Please sign in to continue.'));
  userStore.authenticate(value, clientInfo(req)).then(auth => { res.locals.auth = auth; next(); }).catch(next);
}
export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (!context(res).user.is_admin) return next(new HttpError(403, 'Administrator access is required.'));
  next();
}
export function requireSelfOrAdmin(res: Response, id: number) {
  if (!context(res).user.is_admin && context(res).user.id !== id) throw new HttpError(403, 'You cannot access another account.');
}
// Preserve existing device API clients while enforcing revocation on requests
// that present a web session. Management routes always require authentication.
export function validatePresentedSession(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) return next();
  authenticate(req, res, next);
}
export function rateLimit(limit: number, windowMs = 15 * 60000, keyFor = (req: Request, _res: Response) => clientInfo(req).ip) {
  const attempts = new Map<string, { count: number; until: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFor(req, res), time = Date.now();
    if (attempts.size > 5000) for (const [ip, entry] of attempts) if (entry.until < time) attempts.delete(ip);
    if (attempts.size > 10000) attempts.clear();
    let entry = attempts.get(key);
    if (!entry || entry.until <= time) { entry = { count: 0, until: time + windowMs }; attempts.set(key, entry); }
    if (++entry.count > limit) { res.setHeader('Retry-After', Math.ceil((entry.until - time) / 1000)); return next(new HttpError(429, 'Too many attempts. Please try again later.')); }
    next();
  };
}
export function userError(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) { res.status(error.status).json({ message: error.message }); return; }
  if (error instanceof SyntaxError) { res.status(400).json({ message: 'The request body is invalid.' }); return; }
  console.error('User management request failed:', error instanceof Error ? error.name : 'Unknown error');
  res.status(500).json({ message: 'The operation could not be completed. Please try again.' });
}
