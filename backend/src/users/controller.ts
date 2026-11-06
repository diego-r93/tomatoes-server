import { Request, Response } from 'express';
import { userStore } from './store';
import { activityPage } from './activity';
import { clientInfo, context, requireSelfOrAdmin } from './http';
import { HttpError, emailAddress, numericId } from './types';
import { emailSettings, requireEmail, sendInvitation, sendPasswordReset } from './mail';

export async function loginUser(req: Request, res: Response) {
  res.json(await userStore.login(req.body?.identifier ?? req.body?.email, req.body?.password, clientInfo(req)));
}
export async function createUser(_req: Request, _res: Response) { throw new HttpError(403, 'An invitation is required to create an account.'); }
export async function me(_req: Request, res: Response) { const auth = context(res); res.json(await userStore.me(auth.user.id, auth.session.id)); }
export async function refresh(_req: Request, res: Response) { const auth = context(res); res.json(await userStore.refresh(auth.user.id, auth.session.id)); }
export async function logout(req: Request, res: Response) { const auth = context(res); await userStore.revokeSessions(auth.user.id, auth.session.id, auth.user, auth.session.id, clientInfo(req)); res.status(204).end(); }
export async function findAllUsers(_req: Request, res: Response) { res.json(await userStore.listUsers()); }
export async function findOne(req: Request, res: Response) { const id = numericId(req.params.id); requireSelfOrAdmin(res, id); res.json(await userStore.getUser(id)); }
export async function updateUser(req: Request, res: Response) { const id = numericId(req.params.id); requireSelfOrAdmin(res, id); res.json(await userStore.updateUser(id, req.body || {}, context(res).user, clientInfo(req))); }
export async function deleteUser(req: Request, res: Response) { await userStore.deleteUser(numericId(req.params.id), context(res).user, clientInfo(req)); res.status(204).end(); }
export async function setEnabled(req: Request, res: Response) { res.json(await userStore.setEnabled(numericId(req.params.id), req.body?.enabled, context(res).user, clientInfo(req))); }
export async function updatePassword(req: Request, res: Response) {
  const auth = context(res), id = req.body?.id ? numericId(req.body.id) : auth.user.id;
  if (id !== auth.user.id) throw new HttpError(403, 'Use an email reset for another account.');
  await userStore.changePassword(id, req.body?.oldPassword, req.body?.newPassword, auth.user, auth.session.id, clientInfo(req)); res.status(204).end();
}
export async function sessions(req: Request, res: Response) { const id = numericId(req.params.id); requireSelfOrAdmin(res, id); res.json(await userStore.sessions(id, context(res).session.id)); }
export async function revokeSessions(req: Request, res: Response) {
  const id = numericId(req.params.id); requireSelfOrAdmin(res, id);
  const auth = context(res); res.json(await userStore.revokeSessions(id, req.params.sessionId || null, auth.user, auth.session.id, clientInfo(req)));
}
export async function recentActivity(req: Request, res: Response) { const id = numericId(req.params.id); requireSelfOrAdmin(res, id); res.json(await (Object.keys(req.query).length ? activityPage(id, req.query) : userStore.activity(id))); }
export async function membership(req: Request, res: Response) { await userStore.membership(numericId(req.params.id), req.body?.groupIds, context(res).user, clientInfo(req)); res.status(204).end(); }
export async function groups(_req: Request, res: Response) { res.json(await userStore.groups()); }
export async function saveGroup(req: Request, res: Response) { const id = req.params.id ? numericId(req.params.id) : null; res.status(id ? 200 : 201).json(await userStore.saveGroup(id, req.body || {}, context(res).user, clientInfo(req))); }
export async function deleteGroup(req: Request, res: Response) { await userStore.deleteGroup(numericId(req.params.id), context(res).user, clientInfo(req)); res.status(204).end(); }
export async function settings(_req: Request, res: Response) { res.json(emailSettings()); }
export async function invitations(_req: Request, res: Response) { res.json(await userStore.invitations()); }
export async function sendInvite(req: Request, res: Response) {
  requireEmail();
  const auth = context(res), client = clientInfo(req);
  const prepared = req.params.id
    ? await userStore.resendInvitation(numericId(req.params.id), auth.user, client)
    : await userStore.createInvitation(req.body || {}, auth.user, client);
  try {
    await sendInvitation(prepared.invitation, prepared.rawToken);
  } catch {
    await userStore.invitationDelivery(prepared.invitation.id, prepared.hash, false, auth.user, client);
    throw new HttpError(502, 'The email could not be sent. The invitation is marked as failed; check email settings before resending.');
  }
  res.status(req.params.id ? 200 : 201).json(await userStore.invitationDelivery(prepared.invitation.id, prepared.hash, true, auth.user, client));
}
export async function revokeInvite(req: Request, res: Response) { await userStore.revokeInvitation(numericId(req.params.id), context(res).user, clientInfo(req)); res.status(204).end(); }
export async function invitationInfo(req: Request, res: Response) { res.json(await userStore.invitationInfo(req.params.token)); }
export async function acceptInvitation(req: Request, res: Response) { res.status(201).json(await userStore.acceptInvitation(req.params.token, req.body || {}, clientInfo(req))); }
export async function requestPasswordReset(req: Request, res: Response) {
  requireEmail();
  const email = emailAddress(req.body?.email), prepared = await userStore.createPasswordReset(email, undefined, clientInfo(req));
  if (prepared) { try { await sendPasswordReset(prepared.email, prepared.rawToken); } catch { console.error('Password reset email could not be submitted.'); } }
  // Do not reveal whether a public email address belongs to an account.
  res.status(202).json({ message: 'If this account is eligible, a reset email will be sent.' });
}
export async function adminPasswordReset(req: Request, res: Response) {
  requireEmail();
  const user = await userStore.getUser(numericId(req.params.id));
  if (user.isBuiltin || !user.enabled) throw new HttpError(403, 'Password reset is unavailable for this account.');
  const prepared = await userStore.createPasswordReset(user.email, context(res).user, clientInfo(req));
  if (!prepared) throw new HttpError(400, 'Password reset is unavailable for this email address.');
  try { await sendPasswordReset(prepared.email, prepared.rawToken); }
  catch { throw new HttpError(502, 'The reset email could not be sent. Please check email settings.'); }
  res.status(202).json({ message: 'The reset email was submitted to the email provider.' });
}
export async function resetPassword(req: Request, res: Response) { await userStore.resetPassword(req.params.token, req.body?.password, clientInfo(req)); res.status(204).end(); }
