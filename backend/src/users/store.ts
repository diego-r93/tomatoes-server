import * as bcrypt from 'bcryptjs';
import { authenticateSession, sessionSeconds, sessionToken } from './sessionAuth';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { access, all, get, run } from './database';
import { ClientInfo, GroupRow, HttpError, InvitationRow, SessionRow, UserRow, browserDetails, emailAddress, idList, passwordValue, text } from './types';

const now = () => new Date().toISOString();
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('hex');
const dummyHash = bcrypt.hashSync('invalid-account-password', 10);
const userRow = async (id: number) => {
  const user = await get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) throw new HttpError(404, 'User not found.'); return user;
};
const groupsForUser = (id: number) => all<GroupRow>('SELECT g.* FROM user_groups g JOIN user_group_members m ON m.group_id = g.id WHERE m.user_id = ? ORDER BY g.name', [id]);
const groupsForInvitation = (id: number) => all<GroupRow>('SELECT g.* FROM user_groups g JOIN user_invitation_groups m ON m.group_id = g.id WHERE m.invitation_id = ? ORDER BY g.name', [id]);
const publicGroup = (group: GroupRow) => ({ id: group.id, name: group.name, description: group.description, isBuiltin: Boolean(group.is_builtin), createdAt: group.created_at });
async function publicUser(user: UserRow) {
  return {
    id: user.id, _id: String(user.id), username: user.username, login: user.username,
    email: user.email, firstName: user.firstName || '', lastName: user.lastName || '',
    phone: user.phone || '', state: user.state || '', enabled: Boolean(user.enabled),
    isBuiltin: Boolean(user.is_builtin), isAdmin: Boolean(user.is_admin), emailVerified: Boolean(user.email_verified),
    createdAt: user.createdAt, updatedAt: user.updatedAt, lastLoginAt: user.last_login_at,
    lastLoginIp: user.last_login_ip, ...browserDetails(user.last_login_agent),
    groups: (await groupsForUser(user.id)).map(publicGroup),
  };
}
async function activity(actor: UserRow, action: string, description: string, subject: number | null = actor.id, client?: ClientInfo) {
  await run('INSERT INTO user_activity (subject_id,actor_id,actor_login,action,description,ip,created_at) VALUES (?,?,?,?,?,?,?)', [subject, actor.id, actor.username, action, description, client?.ip || '', now()]);
}
async function validateGroups(ids: number[], allowBuiltin = false) {
  for (const id of ids) {
    const group = await get<GroupRow>('SELECT * FROM user_groups WHERE id = ?', [id]);
    if (!group || (!allowBuiltin && group.is_builtin)) throw new HttpError(400, 'One or more groups cannot be assigned.');
  }
}
async function replaceMembership(user: UserRow, ids: number[]) {
  if (user.is_builtin) throw new HttpError(403, 'The built-in administrator membership is fixed.');
  await validateGroups(ids);
  await run('DELETE FROM user_group_members WHERE user_id = ?', [user.id]);
  for (const id of ids) await run('INSERT INTO user_group_members (group_id,user_id) VALUES (?,?)', [id, user.id]);
}
async function uniqueEmail(email: string, except = 0) {
  if (await get('SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?', [email, except])) throw new HttpError(409, 'This email already belongs to a user.');
}
async function uniqueUsername(username: string, except = 0) {
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) throw new HttpError(400, 'Use 3–40 letters, numbers, dots, hyphens or underscores for the username.');
  if (await get('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?', [username, except])) throw new HttpError(409, 'This username is already in use.');
}
async function invitationRow(id: number) {
  const invite = await get<InvitationRow>('SELECT * FROM user_invitations WHERE id = ?', [id]);
  if (!invite) throw new HttpError(404, 'Invitation not found.'); return invite;
}
async function publicInvitation(invite: InvitationRow) {
  return { id: invite.id, email: invite.email, status: invite.status === 'pending' && Date.parse(invite.expires_at) <= Date.now() ? 'expired' : invite.status,
    deliveryStatus: invite.delivery_status, message: invite.message, expiresAt: invite.expires_at,
    createdAt: invite.created_at, sentAt: invite.sent_at, groups: (await groupsForInvitation(invite.id)).map(publicGroup) };
}
async function validInvitation(rawToken: string) {
  if (!/^[a-f0-9]{64}$/.test(rawToken)) throw new HttpError(410, 'This invitation is invalid or has expired.');
  const invite = await get<InvitationRow>('SELECT * FROM user_invitations WHERE token_hash = ?', [hashToken(rawToken)]);
  if (!invite || invite.status !== 'pending' || Date.parse(invite.expires_at) <= Date.now()) throw new HttpError(410, 'This invitation is invalid or has expired.');
  return invite;
}

export const userStore = {
  login(identifier: unknown, password: unknown, client: ClientInfo) {
    return access(async () => {
      const value = text(identifier, 254, true), pass = String(password || '');
      if (pass.length > 1024) throw new HttpError(401, 'Invalid username/email or password.');
      let user = await get<UserRow>('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [value]);
      if (!user) user = await get<UserRow>('SELECT * FROM users WHERE email = ?', [value]);
      if (!user) {
        const matches = await all<UserRow>('SELECT * FROM users WHERE lower(email) = lower(?)', [value]);
        if (matches.length === 1) user = matches[0];
      }
      const matches = await bcrypt.compare(pass, user?.password || dummyHash);
      if (!user || !matches || !user.enabled) throw new HttpError(401, 'Invalid username/email or password.');
      const id = randomUUID(), date = now(), expiresAt = new Date(Date.now() + sessionSeconds() * 1000).toISOString();
      await run('INSERT INTO user_sessions (id,user_id,created_at,last_seen_at,expires_at,login_ip,last_ip,user_agent) VALUES (?,?,?,?,?,?,?,?)', [id, user.id, date, date, expiresAt, client.ip, client.ip, client.userAgent]);
      await run('UPDATE users SET last_login_at = ?, last_login_ip = ?, last_login_agent = ? WHERE id = ?', [date, client.ip, client.userAgent, user.id]);
      await activity(user, 'login', `Signed in from ${client.ip}`, user.id, client);
      return { ...(await publicUser(await userRow(user.id))), accessToken: sessionToken(user, id), expiresAt, sessionId: id };
    }, true);
  },
  authenticate: authenticateSession,
  me(id: number, sessionId: string) { return access(async () => ({ ...(await publicUser(await userRow(id))), sessionId })); },
  refresh(id: number, sessionId: string) {
    return access(async () => {
      const user = await userRow(id), expiresAt = new Date(Date.now() + sessionSeconds() * 1000).toISOString();
      const updated = await run('UPDATE user_sessions SET expires_at = ?, last_seen_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL', [expiresAt, now(), sessionId, id]);
      if (!user.enabled || !updated.changes) throw new HttpError(401, 'Please sign in again.');
      return { accessToken: sessionToken(user, sessionId), expiresAt };
    });
  },
  listUsers() { return access(async () => Promise.all((await all<UserRow>('SELECT * FROM users ORDER BY is_builtin DESC, username')).map(publicUser))); },
  getUser(id: number) { return access(async () => publicUser(await userRow(id))); },
  updateUser(id: number, input: Record<string, unknown>, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      const user = await userRow(id);
      if (user.is_builtin) throw new HttpError(403, 'The built-in administrator profile is read-only.');
      const username = text(input.username ?? user.username, 40, true);
      await uniqueUsername(username, id);
      const email = emailAddress(input.email ?? user.email); await uniqueEmail(email, id);
      const firstName = text(input.firstName ?? user.firstName, 80), lastName = text(input.lastName ?? user.lastName, 80);
      if (!firstName && !lastName) throw new HttpError(400, 'Enter the user name.');
      await run('UPDATE users SET username=?,email=?,firstName=?,lastName=?,phone=?,state=?,email_verified=?,updatedAt=? WHERE id=?', [username, email, firstName, lastName, text(input.phone ?? user.phone, 40), text(input.state ?? user.state, 100), email === user.email ? user.email_verified : 0, now(), id]);
      await activity(actor, 'profile.updated', 'Updated profile information', id, client);
      return publicUser(await userRow(id));
    }, true);
  },
  setEnabled(id: number, enabled: unknown, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      const user = await userRow(id);
      if (user.is_builtin) throw new HttpError(403, 'The built-in admin cannot be disabled.');
      if (typeof enabled !== 'boolean') throw new HttpError(400, 'Invalid account status.');
      await run('UPDATE users SET enabled=?,updatedAt=? WHERE id=?', [Number(enabled), now(), id]);
      if (!enabled) await run('UPDATE user_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL', [now(), id]);
      await activity(actor, enabled ? 'user.enabled' : 'user.disabled', enabled ? 'Enabled account' : 'Disabled account', id, client);
      return publicUser(await userRow(id));
    }, true);
  },
  deleteUser(id: number, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      const user = await userRow(id); if (user.is_builtin) throw new HttpError(403, 'The built-in admin cannot be deleted.');
      await activity(actor, 'user.deleted', `Deleted account ${user.username}`, id, client);
      await run('DELETE FROM users WHERE id=?', [id]);
    }, true);
  },
  changePassword(id: number, oldPassword: unknown, newPassword: unknown, actor: UserRow, sessionId: string, client: ClientInfo) {
    return access(async () => {
      const user = await userRow(id); if (user.is_builtin) throw new HttpError(403, 'The built-in admin password is fixed.');
      if (!await bcrypt.compare(String(oldPassword || ''), user.password)) throw new HttpError(400, 'The current password is incorrect.');
      await run('UPDATE users SET password=?,updatedAt=? WHERE id=?', [await bcrypt.hash(passwordValue(newPassword), 10), now(), id]);
      await run('UPDATE user_sessions SET revoked_at=? WHERE user_id=? AND id!=? AND revoked_at IS NULL', [now(), id, sessionId]);
      await activity(actor, 'password.changed', 'Changed password and revoked other sessions', id, client);
    }, true);
  },
  sessions(id: number, current: string) {
    return access(async () => {
      await userRow(id);
      return (await all<SessionRow>('SELECT * FROM user_sessions WHERE user_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY last_seen_at DESC', [id, now()])).map(session => ({ id: session.id, createdAt: session.created_at, lastSeenAt: session.last_seen_at, expiresAt: session.expires_at, loginIp: session.login_ip, lastIp: session.last_ip, ...browserDetails(session.user_agent), current: session.id === current }));
    });
  },
  revokeSessions(id: number, target: string | null, actor: UserRow, current: string, client: ClientInfo) {
    return access(async () => {
      await userRow(id);
      const affected = await all<{ id: string }>(`SELECT id FROM user_sessions WHERE user_id=? AND revoked_at IS NULL${target ? ' AND id=?' : ''}`, target ? [id, target] : [id]);
      await run(`UPDATE user_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL${target ? ' AND id=?' : ''}`, target ? [now(), id, target] : [now(), id]);
      await activity(actor, 'session.revoked', target ? 'Revoked one session' : 'Revoked all sessions', id, client);
      return { revokedCurrent: affected.some(session => session.id === current) };
    }, true);
  },
  activity(id: number) { return access(() => all('SELECT id,action,description,actor_login AS actor,ip,created_at AS createdAt FROM user_activity WHERE subject_id=? OR actor_id=? ORDER BY id DESC LIMIT 100', [id, id])); },
  groups() {
    return access(async () => Promise.all((await all<GroupRow>('SELECT * FROM user_groups ORDER BY is_builtin DESC,name')).map(async group => ({ ...publicGroup(group), memberIds: (await all<{ user_id: number }>('SELECT user_id FROM user_group_members WHERE group_id=?', [group.id])).map(row => row.user_id) }))));
  },
  saveGroup(id: number | null, input: Record<string, unknown>, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      let group = id ? await get<GroupRow>('SELECT * FROM user_groups WHERE id=?', [id]) : undefined;
      if (id && !group) throw new HttpError(404, 'Group not found.');
      const name = text(input.name, 60, true), description = text(input.description, 500), members = idList(input.memberIds || []);
      const duplicate = (await all<GroupRow>('SELECT * FROM user_groups')).find(g => g.id !== id && g.name.toLowerCase() === name.toLowerCase());
      if (duplicate) throw new HttpError(409, 'A group with this name already exists.');
      if (group?.is_builtin) {
        const existing = (await all<{ user_id: number }>('SELECT user_id FROM user_group_members WHERE group_id=?', [id])).map(row => row.user_id).sort();
        if (name !== group.name || JSON.stringify([...members].sort()) !== JSON.stringify(existing)) throw new HttpError(403, 'The built-in group name and membership are fixed.');
      }
      for (const member of members) { const user = await userRow(member); if (user.is_builtin && !group?.is_builtin) throw new HttpError(400, 'The built-in admin membership is fixed.'); }
      if (id) await run('UPDATE user_groups SET name=?,description=? WHERE id=?', [name, description, id]);
      else { id = (await run('INSERT INTO user_groups (name,description,created_at) VALUES (?,?,?)', [name, description, now()])).id; }
      await run('DELETE FROM user_group_members WHERE group_id=?', [id]);
      for (const member of members) await run('INSERT INTO user_group_members (group_id,user_id) VALUES (?,?)', [id, member]);
      await activity(actor, 'group.saved', `Saved group ${name}`, null, client);
      return { id };
    }, true);
  },
  deleteGroup(id: number, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      const group = await get<GroupRow>('SELECT * FROM user_groups WHERE id=?', [id]);
      if (!group) throw new HttpError(404, 'Group not found.');
      if (group.is_builtin) throw new HttpError(403, 'The built-in group cannot be deleted.');
      await run('DELETE FROM user_groups WHERE id=?', [id]);
      await activity(actor, 'group.deleted', `Deleted group ${group.name}; user accounts were kept`, null, client);
    }, true);
  },
  membership(id: number, groups: unknown, actor: UserRow, client: ClientInfo) {
    return access(async () => { await replaceMembership(await userRow(id), idList(groups)); await activity(actor, 'membership.updated', 'Updated group membership', id, client); }, true);
  },
  invitations() { return access(async () => Promise.all((await all<InvitationRow>('SELECT * FROM user_invitations ORDER BY id DESC')).map(publicInvitation))); },
  createInvitation(input: Record<string, unknown>, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      const email = emailAddress(input.email); await uniqueEmail(email);
      if (await get("SELECT id FROM user_invitations WHERE lower(email)=lower(?) AND status='pending' AND expires_at>?", [email, now()])) throw new HttpError(409, 'A pending invitation already exists. Use Resend instead.');
      const groups = idList(input.groupIds || []); await validateGroups(groups);
      const days = Number(input.expiresInDays ?? process.env.INVITE_EXPIRY_DAYS ?? 7);
      if (!Number.isInteger(days) || days < 1 || days > 30) throw new HttpError(400, 'Invitation validity must be between 1 and 30 days.');
      const rawToken = token(), hash = hashToken(rawToken), expires = new Date(Date.now() + days * 86400000).toISOString();
      const inserted = await run('INSERT INTO user_invitations (email,token_hash,message,expires_at,created_at,invited_by,validity_days) VALUES (?,?,?,?,?,?,?)', [email, hash, text(input.message, 1000), expires, now(), actor.id, days]);
      for (const group of groups) await run('INSERT INTO user_invitation_groups (invitation_id,group_id) VALUES (?,?)', [inserted.id, group]);
      await activity(actor, 'invitation.created', `Created invitation for ${email}`, null, client);
      return { invitation: await publicInvitation(await invitationRow(inserted.id)), rawToken, hash };
    }, true);
  },
  resendInvitation(id: number, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      const invite = await invitationRow(id); if (invite.status !== 'pending') throw new HttpError(409, 'Only pending or expired invitations can be resent.');
      await uniqueEmail(invite.email);
      const rawToken = token(), hash = hashToken(rawToken), days = invite.validity_days;
      await run("UPDATE user_invitations SET token_hash=?,expires_at=?,delivery_status='queued',sent_at=NULL WHERE id=?", [hash, new Date(Date.now() + days * 86400000).toISOString(), id]);
      await activity(actor, 'invitation.resent', `Renewed invitation for ${invite.email}`, null, client);
      return { invitation: await publicInvitation(await invitationRow(id)), rawToken, hash };
    }, true);
  },
  invitationDelivery(id: number, hash: string, sent: boolean, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      await run("UPDATE user_invitations SET delivery_status=?,sent_at=? WHERE id=? AND token_hash=? AND status='pending'", [sent ? 'sent' : 'failed', sent ? now() : null, id, hash]);
      await activity(actor, sent ? 'invitation.sent' : 'invitation.failed', sent ? `Email submitted for invitation ${id}` : `Email delivery failed for invitation ${id}`, null, client);
      return publicInvitation(await invitationRow(id));
    }, true);
  },
  revokeInvitation(id: number, actor: UserRow, client: ClientInfo) {
    return access(async () => {
      const invite = await invitationRow(id); if (invite.status !== 'pending') throw new HttpError(409, 'This invitation is no longer pending.');
      await run("UPDATE user_invitations SET status='revoked' WHERE id=?", [id]);
      await activity(actor, 'invitation.revoked', `Revoked invitation for ${invite.email}`, null, client);
    }, true);
  },
  invitationInfo(rawToken: string) { return access(async () => publicInvitation(await validInvitation(rawToken))); },
  acceptInvitation(rawToken: string, input: Record<string, unknown>, client: ClientInfo) {
    return access(async () => {
      const invite = await validInvitation(rawToken); await uniqueEmail(invite.email);
      const username = text(input.username, 40, true); if (username.toLowerCase() === 'admin') throw new HttpError(400, 'This username is reserved.');
      await uniqueUsername(username);
      const firstName = text(input.firstName, 80, true), lastName = text(input.lastName, 80), password = passwordValue(input.password);
      const inserted = await run('INSERT INTO users (email,password,username,firstName,lastName,phone,email_verified) VALUES (?,?,?,?,?,?,1)', [invite.email, await bcrypt.hash(password, 10), username, firstName, lastName, text(input.phone, 40)]);
      const user = await userRow(inserted.id);
      await replaceMembership(user, (await groupsForInvitation(invite.id)).filter(group => !group.is_builtin).map(group => group.id));
      await run("UPDATE user_invitations SET status='accepted' WHERE id=? AND status='pending'", [invite.id]);
      await activity(user, 'invitation.accepted', 'Accepted invitation and created account', user.id, client);
      return publicUser(user);
    }, true);
  },
  createPasswordReset(email: string, actor?: UserRow, client?: ClientInfo) {
    return access(async () => {
      const matches = await all<UserRow>('SELECT * FROM users WHERE lower(email)=lower(?)', [email]);
      if (matches.length !== 1 || !matches[0].enabled || matches[0].is_builtin) return null;
      const user = matches[0], rawToken = token();
      await run('UPDATE user_password_resets SET used_at=? WHERE user_id=? AND used_at IS NULL', [now(), user.id]);
      await run('INSERT INTO user_password_resets (user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?)', [user.id, hashToken(rawToken), new Date(Date.now() + 30 * 60000).toISOString(), now()]);
      await activity(actor || user, 'password.reset_requested', 'Requested a password reset', user.id, client);
      return { rawToken, email: user.email };
    }, true);
  },
  resetPassword(rawToken: string, password: unknown, client: ClientInfo) {
    return access(async () => {
      const reset = /^[a-f0-9]{64}$/.test(rawToken) ? await get<{ id: number; user_id: number; used_at: string | null; expires_at: string }>('SELECT * FROM user_password_resets WHERE token_hash=?', [hashToken(rawToken)]) : undefined;
      if (!reset || reset.used_at || Date.parse(reset.expires_at) <= Date.now()) throw new HttpError(410, 'This reset link is invalid or has expired.');
      const user = await userRow(reset.user_id);
      if (!user.enabled || user.is_builtin) throw new HttpError(403, 'Password reset is not available for this account.');
      await run('UPDATE users SET password=?,updatedAt=? WHERE id=?', [await bcrypt.hash(passwordValue(password), 10), now(), user.id]);
      await run('UPDATE user_password_resets SET used_at=? WHERE user_id=? AND used_at IS NULL', [now(), user.id]);
      await run('UPDATE user_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL', [now(), user.id]);
      await activity(user, 'password.reset', 'Reset password and revoked all sessions', user.id, client);
    }, true);
  },
};

