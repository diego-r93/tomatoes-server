import db from '../database/sqlite/config/db.config';
import * as bcrypt from 'bcryptjs';
import { UserRow } from './types';

export const run = (sql: string, params: unknown[] = []) => new Promise<{ id: number; changes: number }>((resolve, reject) => {
  db.run(sql, params, function (this: { lastID: number; changes: number }, error: Error | null) {
    if (error) reject(error); else resolve({ id: this.lastID, changes: this.changes });
  });
});
export const get = <T>(sql: string, params: unknown[] = []) => new Promise<T | undefined>((resolve, reject) => {
  db.get(sql, params, (error, row) => error ? reject(error) : resolve(row as T | undefined));
});
export const all = <T>(sql: string, params: unknown[] = []) => new Promise<T[]>((resolve, reject) => {
  db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows as T[]));
});
const exec = (sql: string) => new Promise<void>((resolve, reject) => db.exec(sql, error => error ? reject(error) : resolve()));

async function initialize() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('CHANGE_ME')) throw new Error('JWT_SECRET must be configured before starting the user service.');
  await exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    firstName TEXT, lastName TEXT, phone TEXT, state TEXT, fbId TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );`);
  const columns = await all<{ name: string }>('PRAGMA table_info(users)');
  const additions: Record<string, string> = {
    username: 'TEXT', enabled: 'INTEGER NOT NULL DEFAULT 1', is_builtin: 'INTEGER NOT NULL DEFAULT 0',
    is_admin: 'INTEGER NOT NULL DEFAULT 0', email_verified: 'INTEGER NOT NULL DEFAULT 0',
    last_login_at: 'TEXT', last_login_ip: 'TEXT', last_login_agent: 'TEXT',
  };
  await exec('BEGIN IMMEDIATE');
  try {
    for (const [name, definition] of Object.entries(additions)) {
      if (!columns.some(column => column.name === name)) await exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
    const users = await all<UserRow>('SELECT * FROM users ORDER BY id');
    const used = new Set(users.filter(user => user.username).map(user => user.username.toLowerCase()));
    for (const user of users.filter(user => !user.username)) {
      const base = (user.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 26) || 'user');
      let username = base.length < 3 || base.toLowerCase() === 'admin' ? `${base}-${user.id}` : base;
      let suffix = 1; while (used.has(username.toLowerCase())) username = `${base}-${user.id}-${suffix++}`;
      await run('UPDATE users SET username = ? WHERE id = ?', [username, user.id]); used.add(username.toLowerCase());
    }
    await exec(`CREATE UNIQUE INDEX IF NOT EXISTS user_username_unique ON users(username COLLATE NOCASE);
      CREATE TABLE IF NOT EXISTS user_groups (
        id INTEGER PRIMARY KEY, name TEXT UNIQUE COLLATE NOCASE NOT NULL, description TEXT NOT NULL DEFAULT '',
        is_builtin INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_group_members (
        group_id INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (group_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, expires_at TEXT NOT NULL,
        login_ip TEXT NOT NULL, last_ip TEXT NOT NULL, user_agent TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS user_session_user ON user_sessions(user_id);
      CREATE TABLE IF NOT EXISTS user_invitations (
        id INTEGER PRIMARY KEY, email TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', delivery_status TEXT NOT NULL DEFAULT 'queued',
        validity_days INTEGER NOT NULL DEFAULT 7, message TEXT NOT NULL DEFAULT '', expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
        sent_at TEXT, invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS user_invitation_groups (
        invitation_id INTEGER NOT NULL REFERENCES user_invitations(id) ON DELETE CASCADE,
        group_id INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
        PRIMARY KEY (invitation_id, group_id)
      );
      CREATE TABLE IF NOT EXISTS user_password_resets (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT UNIQUE NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_activity (
        id INTEGER PRIMARY KEY, subject_id INTEGER, actor_id INTEGER,
        actor_login TEXT NOT NULL, action TEXT NOT NULL, description TEXT NOT NULL,
        ip TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS user_activity_subject ON user_activity(subject_id, created_at);
    `);
    const invitationColumns = await all<{ name: string }>('PRAGMA table_info(user_invitations)');
    if (!invitationColumns.some(column => column.name === 'validity_days')) await exec('ALTER TABLE user_invitations ADD COLUMN validity_days INTEGER NOT NULL DEFAULT 7');
    let admin = await get<UserRow>('SELECT * FROM users WHERE is_builtin = 1');
    if (!admin) {
      // Old accounts used email for login; reserve the new fixed username safely.
      const reserved = await get<UserRow>("SELECT * FROM users WHERE username='admin' COLLATE NOCASE AND is_builtin=0");
      if (reserved) {
        let replacement = `admin-${reserved.id}`, suffix = 1;
        while (await get('SELECT id FROM users WHERE username=? COLLATE NOCASE', [replacement])) replacement = `admin-${reserved.id}-${suffix++}`;
        await run('UPDATE users SET username=? WHERE id=?', [replacement, reserved.id]);
      }
      let email = 'admin@tomatoes.local';
      if (await get('SELECT id FROM users WHERE lower(email) = lower(?)', [email])) email = `admin-${Date.now()}@tomatoes.local`;
      const hash = await bcrypt.hash('admin', 10);
      const inserted = await run(`INSERT INTO users (email,password,firstName,lastName,username,enabled,is_builtin,is_admin)
        VALUES (?,?, 'System','Administrator','admin',1,1,1)`, [email, hash]);
      admin = await get<UserRow>('SELECT * FROM users WHERE id = ?', [inserted.id]);
    }
    await run('INSERT OR IGNORE INTO user_groups (name,description,is_builtin,created_at) VALUES (?,?,1,?)', ['Administrators', 'Built-in administration account.', new Date().toISOString()]);
    const group = await get<{ id: number }>('SELECT id FROM user_groups WHERE is_builtin = 1');
    await run('INSERT OR IGNORE INTO user_group_members (group_id,user_id) VALUES (?,?)', [group!.id, admin!.id]);
    await exec('COMMIT');
  } catch (error) { await exec('ROLLBACK'); throw error; }
}

export const usersReady = initialize();
// All store operations share a queue, so concurrent requests cannot interleave a
// multi-step SQLite transaction on this connection.
let tail: Promise<unknown> = usersReady;
export function access<T>(work: () => Promise<T>, transaction = false): Promise<T> {
  const next = tail.then(async () => {
    await usersReady;
    if (transaction) await exec('BEGIN IMMEDIATE');
    try {
      const result = await work();
      if (transaction) await exec('COMMIT');
      return result;
    } catch (error) { if (transaction) await exec('ROLLBACK'); throw error; }
  });
  tail = next.then(() => undefined, () => undefined);
  return next;
}

