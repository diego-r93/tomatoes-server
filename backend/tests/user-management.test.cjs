const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');

test('user management integration with a legacy SQLite database and local SMTP', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tomatoes-users-'));
  process.env.USERS_DB_PATH = path.join(directory, 'users.db');
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.APP_PUBLIC_URL = 'http://tomatoes.example';
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_FROM = 'tomatoes@example.com';
  process.env.SMTP_AUTH_TYPE = 'login';
  process.env.SMTP_REQUIRE_TLS = 'false';
  process.env.SMTP_SECURE = 'false';
  delete process.env.SMTP_USER; delete process.env.SMTP_PASS;
  const legacy = new sqlite3.Database(process.env.USERS_DB_PATH);
  const legacyHash = await bcrypt.hash('legacy-pass-123', 10);
  await new Promise((resolve, reject) => legacy.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, firstName TEXT, lastName TEXT, phone TEXT, state TEXT, fbId TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`, error => error ? reject(error) : resolve()));
  await new Promise((resolve, reject) => legacy.run('INSERT INTO users (email,password,firstName,lastName) VALUES (?,?,?,?)', ['legacy@example.com', legacyHash, 'Legacy', 'Grower'], error => error ? reject(error) : resolve()));
  await new Promise(resolve => legacy.close(resolve));
  const messages = [], sockets = new Set(); let rejectMail = false;
  const smtp = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    socket.write('220 localhost ESMTP test\r\n'); let buffer = '', data = false, message = '';
    socket.on('data', chunk => {
      buffer += chunk.toString(); let boundary;
      while ((boundary = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        if (data) {
          if (line === '.') { messages.push(message); message = ''; data = false; socket.write('250 Message accepted\r\n'); }
          else message += line + '\r\n';
        } else if (/^EHLO|^HELO/i.test(line)) socket.write('250-localhost\r\n250 8BITMIME\r\n');
        else if (/^MAIL FROM/i.test(line)) socket.write('250 OK\r\n');
        else if (/^RCPT TO/i.test(line)) socket.write(rejectMail ? '550 Rejected for test\r\n' : '250 OK\r\n');
        else if (/^DATA$/i.test(line)) { data = true; socket.write('354 End with dot\r\n'); }
        else if (/^QUIT$/i.test(line)) { socket.write('221 Bye\r\n'); socket.end(); }
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  process.env.SMTP_PORT = String(smtp.address().port);
  let server, db;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => smtp.close(resolve));
    if (db) await new Promise(resolve => db.close(resolve));
    const expectedPrefix = path.resolve(os.tmpdir()) + path.sep + 'tomatoes-users-';
    assert(path.resolve(directory).startsWith(expectedPrefix), 'Cleanup must stay in the test directory');
    fs.rmSync(directory, { recursive: true, force: true });
  });
  process.env.DOCKER_INFLUXDB_INIT_HOST = 'localhost';
  process.env.DOCKER_INFLUXDB_INIT_PORT = '8086';
  const { createApp } = require('../src/app');
  const { mountRoutes } = require('../src/routes');
  const { usersReady, run, get } = require('../src/users/database');
  const { userError } = require('../src/users/http');
  db = require('../src/database/sqlite/config/db.config').default;
  await usersReady;
  const app = createApp({ origin: process.env.APP_PUBLIC_URL, mountRoutes, errorHandler: userError });
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function request(method, url, body, token) {
    const response = await fetch(origin + url, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.24', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0.0.0', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null };
  }
  const expect = (result, status) => { assert.equal(result.status, status, result.body?.message); return result.body; };
  const mailToken = kind => {
    const message = messages.at(-1).replace(/=\r\n/g, '');
    const match = message.match(new RegExp(`/${kind}/([a-f0-9]{64})`)); assert(match, 'A one-use link must be included in the local email'); return match[1];
  };
  let admin, oldUser, group, invitation, inviteToken, member;
  try {
    await t.test('production HTTP app mounts protected routes and applies portal CORS', async () => {
      const response = await fetch(origin + '/dashboards/library', { headers: { origin: process.env.APP_PUBLIC_URL } });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('access-control-allow-origin'), process.env.APP_PUBLIC_URL);
      assert.equal((await response.json()).message, 'Please sign in to continue.');
      expect(await request('GET', '/boards'), 401);
    });
    await t.test('migration preserves legacy account and passwords and adds one protected administrator', async () => {
      assert.equal((await get('SELECT password FROM users WHERE email=?', ['legacy@example.com'])).password, legacyHash);
      assert.equal((await get('SELECT COUNT(*) AS count FROM users WHERE is_builtin=1')).count, 1);
      oldUser = expect(await request('POST', '/api/users/login', { email: 'legacy@example.com', password: 'legacy-pass-123' }), 200);
      admin = expect(await request('POST', '/api/users/login', { identifier: 'admin', password: 'admin' }), 200);
      assert(admin.isAdmin && admin.isBuiltin); assert(!('password' in admin));
      assert.equal(admin.lastLoginIp, '198.51.100.24'); assert.equal(admin.browser, 'Chrome');
      assert(admin.lastLoginAt && admin.expiresAt);
      expect(await request('GET', '/api/users'), 401);
      expect(await request('GET', '/api/users', undefined, oldUser.accessToken), 403);
      expect(await request('PUT', `/api/users/${admin.id}`, { username: 'renamed' }, admin.accessToken), 403);
      for (const change of [{ firstName: 'Changed' }, { email: 'changed@example.com' }, { phone: '123', state: 'Changed' }]) expect(await request('PUT', `/api/users/${admin.id}`, change, admin.accessToken), 403);
      assert.equal(expect(await request('GET', `/api/users/${admin.id}`, undefined, admin.accessToken), 200).firstName, 'System');
      expect(await request('PATCH', `/api/users/${admin.id}/status`, { enabled: false }, admin.accessToken), 403);
      expect(await request('DELETE', `/api/users/${admin.id}`, undefined, admin.accessToken), 403);
      expect(await request('PUT', '/api/users/update-password', { oldPassword: 'admin', newPassword: 'new-password' }, admin.accessToken), 403);
      expect(await request('POST', '/api/users', { email: 'anonymous@example.com', password: 'password-123' }), 403);
    });
    await t.test('dashboard reads preserve access, saved queries and schema responses', async subtest => {
      const Dashboard = require('../src/database/dashboard/models/dashboard.model').default;
      const sensorData = require('../src/database/influxdb/models/sensorDataModel').default;
      const { client } = require('../src/database/influxdb/config/influxdb');
      const memberToken = oldUser.accessToken;
      const charts = [{ id: 7, query: 'range(start: v.timeRangeStart, stop: v.timeRangeStop) |> aggregateWindow(every: v.windowPeriod)' }];
      const dashboard = { _id: 'example', name: 'Example', charts };
      const rows = [{ _field: 'temperature', _value: 27 }];
      const calls = [];
      subtest.mock.method(Dashboard, 'aggregate', async () => [{ _id: 'example', name: 'Example', panelCount: 1 }]);
      subtest.mock.method(Dashboard, 'findById', id => {
        const lean = async () => id === 'example' ? dashboard : null;
        return { lean, select: field => { assert.equal(field, 'charts'); return { lean }; } };
      });
      subtest.mock.method(sensorData, 'getSensorData', async query => { calls.push(query); return rows; });
      subtest.mock.method(client, 'getQueryApi', () => ({ collectRows: async flux => {
        calls.push(flux);
        return (flux.includes('measurementFieldKeys') ? ['temperature'] : ['_measurement', 'host']).map(_value => ({ _value }));
      } }));
      try {
        assert.deepEqual(expect(await request('GET', '/dashboards/library', undefined, memberToken), 200), [{ _id: 'example', name: 'Example', panelCount: 1 }]);
        assert.deepEqual(expect(await request('GET', '/dashboards/library/example', undefined, memberToken), 200), dashboard);
        assert.deepEqual(expect(await request('GET', '/dashboards/library/example/export', undefined, memberToken), 200), charts);
        expect(await request('GET', '/dashboards/library/missing', undefined, memberToken), 404);
        const payload = { dashboardId: 'example', panelId: '7', start: '-1h', stop: 'now()', window: '30s', query: 'Untrusted draft' };
        expect(await request('POST', '/influx/panel', payload), 401);
        expect(await request('POST', '/influx', payload, memberToken), 403);
        expect(await request('POST', '/influx/panel', { ...payload, start: 'invalid' }, memberToken), 400);
        expect(await request('POST', '/influx/panel', { ...payload, panelId: 'missing' }, memberToken), 404);
        assert.equal(calls.length, 0);
        assert.deepEqual(expect(await request('POST', '/influx/panel', payload, memberToken), 200), rows);
        assert.deepEqual(calls, ['range(start: -1h, stop: now()) |> aggregateWindow(every: 30s)']);
        expect(await request('GET', '/dashboards/schema?bucket=test&measurement=sensor', undefined, memberToken), 403);
        assert.deepEqual(expect(await request('GET', '/dashboards/schema?bucket=test&measurement=sensor', undefined, admin.accessToken), 200),
          { bucket: 'test', measurement: 'sensor', fields: ['temperature'], tags: ['host'] });
      } finally {
        subtest.mock.restoreAll();
      }
    });
    await t.test('profiles sanitize private fields; groups preserve account data and reject privilege changes', async () => {
      const list = expect(await request('GET', '/api/users', undefined, admin.accessToken), 200);
      assert(list.every(user => !('password' in user) && !('token_hash' in user)));
      const changed = expect(await request('PUT', `/api/users/${oldUser.id}`, { firstName: 'Updated', phone: '', isAdmin: true }, oldUser.accessToken), 200);
      assert.equal(changed.firstName, 'Updated'); assert.equal(changed.phone, ''); assert.equal(changed.isAdmin, false);
      expect(await request('PUT', `/api/users/${admin.id}`, { firstName: 'Attacker' }, oldUser.accessToken), 403);
      group = expect(await request('POST', '/api/groups', { name: 'Growers', description: 'Daily operation', memberIds: [oldUser.id] }, admin.accessToken), 201);
      const groups = expect(await request('GET', '/api/groups', undefined, admin.accessToken), 200);
      assert(groups.find(g => g.id === group.id).memberIds.includes(oldUser.id));
      const builtIn = groups.find(g => g.isBuiltin);
      expect(await request('DELETE', `/api/groups/${builtIn.id}`, undefined, admin.accessToken), 403);
      expect(await request('PUT', `/api/users/${oldUser.id}/membership`, { groupIds: [builtIn.id] }, admin.accessToken), 400);
    });
    await t.test('SMTP configuration, invitations, token rotation, atomic acceptance and group membership', async () => {
      const settings = expect(await request('GET', '/api/users/settings', undefined, admin.accessToken), 200); assert(settings.configured);
      invitation = expect(await request('POST', '/api/invitations', { email: 'new@example.com', groupIds: [group.id], expiresInDays: 3, message: '<script>escaped</script>' }, admin.accessToken), 201);
      assert.equal(invitation.deliveryStatus, 'sent'); assert(!('token_hash' in invitation));
      inviteToken = mailToken('invite');
      const raw = await get('SELECT token_hash FROM user_invitations WHERE id=?', [invitation.id]); assert.notEqual(raw.token_hash, inviteToken);
      expect(await request('POST', '/api/invitations', { email: 'new@example.com' }, admin.accessToken), 409);
      expect(await request('POST', `/api/invitations/${invitation.id}/resend`, {}, admin.accessToken), 200);
      const replacement = mailToken('invite'); assert.notEqual(replacement, inviteToken);
      expect(await request('GET', `/api/invitations/${inviteToken}`), 410); inviteToken = replacement;
      const info = expect(await request('GET', `/api/invitations/${inviteToken}`), 200); assert.equal(info.email, 'new@example.com');
      const attempts = await Promise.all([1, 2].map(() => request('POST', `/api/invitations/${inviteToken}/accept`, { username: 'new.grower', firstName: 'New', lastName: 'Grower', password: 'new-password-123' })));
      assert.deepEqual(attempts.map(result => result.status).sort(), [201, 410]);
      member = attempts.find(result => result.status === 201).body;
      assert.equal(member.groups[0].id, group.id); assert(member.emailVerified); assert(!('password' in member));
      const records = expect(await request('GET', '/api/invitations', undefined, admin.accessToken), 200); assert.equal(records[0].status, 'accepted');
    });
    await t.test('SMTP failures are visible, expiry and revocation reject links, missing configuration is explicit', async () => {
      rejectMail = true;
      expect(await request('POST', '/api/invitations', { email: 'failure@example.com' }, admin.accessToken), 502);
      let record = (expect(await request('GET', '/api/invitations', undefined, admin.accessToken), 200)).find(i => i.email === 'failure@example.com');
      assert.equal(record.deliveryStatus, 'failed'); rejectMail = false;
      expect(await request('POST', `/api/invitations/${record.id}/resend`, {}, admin.accessToken), 200); const raw = mailToken('invite');
      await run('UPDATE user_invitations SET expires_at=? WHERE id=?', ['2000-01-01T00:00:00.000Z', record.id]);
      expect(await request('GET', `/api/invitations/${raw}`), 410);
      expect(await request('POST', `/api/invitations/${record.id}/resend`, {}, admin.accessToken), 200); const renewed = mailToken('invite');
      expect(await request('DELETE', `/api/invitations/${record.id}`, undefined, admin.accessToken), 204);
      expect(await request('GET', `/api/invitations/${renewed}`), 410);
      const host = process.env.SMTP_HOST; delete process.env.SMTP_HOST;
      expect(await request('POST', '/api/invitations', { email: 'missing@example.com' }, admin.accessToken), 503); process.env.SMTP_HOST = host;
    });
    await t.test('sessions record activity, refresh on the server and become unusable after revocation or disable', async () => {
      const login = expect(await request('POST', '/api/users/login', { identifier: 'new.grower', password: 'new-password-123' }), 200);
      const second = expect(await request('POST', '/api/users/login', { identifier: 'new.grower', password: 'new-password-123' }), 200);
      const sessions = expect(await request('GET', `/api/users/${member.id}/sessions`, undefined, second.accessToken), 200);
      assert.equal(sessions.length, 2); assert(sessions.some(s => s.current)); assert.equal(sessions[0].loginIp, '198.51.100.24');
      expect(await request('POST', '/api/users/refresh', {}, second.accessToken), 200);
      expect(await request('DELETE', `/api/users/${member.id}/sessions/${login.sessionId}`, undefined, admin.accessToken), 200);
      expect(await request('GET', '/api/users/me', undefined, login.accessToken), 401);
      expect(await request('GET', '/boards', undefined, login.accessToken), 401);
      expect(await request('GET', '/api/users/me', undefined, second.accessToken), 200);
      expect(await request('PATCH', `/api/users/${member.id}/status`, { enabled: false }, admin.accessToken), 200);
      expect(await request('GET', '/api/users/me', undefined, second.accessToken), 401);
      expect(await request('POST', '/api/users/login', { identifier: 'new.grower', password: 'new-password-123' }), 401);
      expect(await request('PATCH', `/api/users/${member.id}/status`, { enabled: true }, admin.accessToken), 200);
      const events = expect(await request('GET', `/api/users/${member.id}/activity`, undefined, admin.accessToken), 200);
      assert(events.some(event => event.action === 'session.revoked')); assert(events.some(event => event.action === 'user.disabled'));
    });
    await t.test('password reset is one-use, revokes sessions and leaves admin untouched; deleting a group keeps users', async () => {
      const before = expect(await request('POST', '/api/users/login', { identifier: 'new.grower', password: 'new-password-123' }), 200);
      expect(await request('POST', `/api/users/${member.id}/password-reset`, {}, admin.accessToken), 202); const reset = mailToken('reset-password');
      expect(await request('POST', `/api/users/password-reset/${reset}`, { password: 'changed-password-123' }), 204);
      expect(await request('POST', `/api/users/password-reset/${reset}`, { password: 'again-password-123' }), 410);
      expect(await request('GET', '/api/users/me', undefined, before.accessToken), 401);
      expect(await request('POST', '/api/users/login', { email: 'new@example.com', password: 'changed-password-123' }), 200);
      expect(await request('POST', `/api/users/${admin.id}/password-reset`, {}, admin.accessToken), 403);
      expect(await request('DELETE', `/api/groups/${group.id}`, undefined, admin.accessToken), 204);
      const kept = expect(await request('GET', `/api/users/${member.id}`, undefined, admin.accessToken), 200); assert.equal(kept.groups.length, 0);
    });
    await t.test('activity is paginated, searchable and scoped to the selected user', async () => {
      for (let index = 0; index < 105; index++) await run('INSERT INTO user_activity(subject_id,actor_id,actor_login,action,description,ip,created_at) VALUES(?,?,?,?,?,?,?)', [admin.id, member.id, 'test-actor', 'test.audit', `Fixture ${index} 100%_literal`, '203.0.113.42', '2026-01-02T12:00:00.000Z']);
      const url = `/api/users/${admin.id}/activity`;
      const first = expect(await request('GET', url+'?page=1&pageSize=10&action=test.audit', undefined, admin.accessToken), 200);
      assert.equal(first.total,105); assert.equal(first.items.length,10); assert(first.actions.includes('test.audit'));
      const second = expect(await request('GET', url+'?page=2&pageSize=10&action=test.audit', undefined, admin.accessToken), 200);
      assert.equal(second.page,2); assert(!first.items.some(item => second.items.some(other => item.id===other.id)));
      const last = expect(await request('GET', url+'?page=99&pageSize=10&action=test.audit', undefined, admin.accessToken), 200);
      assert.equal(last.page,11); assert.equal(last.items.length,5);
      const filtered = expect(await request('GET', url+'?search=203.0.113.42&from=2026-01-02T00:00:00Z&before=2026-01-03T00:00:00Z', undefined, admin.accessToken),200);
      assert.equal(filtered.total,105);
      assert.equal(expect(await request('GET',url+'?search='+encodeURIComponent('100%_literal'),undefined,admin.accessToken),200).total,105);
      assert.equal(expect(await request('GET',url+'?search='+encodeURIComponent('100%_missing'),undefined,admin.accessToken),200).total,0);
      const actor = expect(await request('GET',`/api/users/${member.id}/activity?action=test.audit`,undefined,admin.accessToken),200);
      assert.equal(actor.total,105, 'Activity includes events performed by the selected user');
      for(const query of ['page=0','pageSize=101','from=invalid','from=2026-01-03T00:00:00Z&before=2026-01-02T00:00:00Z']) expect(await request('GET',url+'?'+query,undefined,admin.accessToken),400);
      expect(await request('GET',url+'?page=1'),401);
      const memberSession = expect(await request('POST','/api/users/login',{identifier:'new.grower',password:'changed-password-123'}),200);
      expect(await request('GET',url+'?page=1',undefined,memberSession.accessToken),403);
      assert(Array.isArray(expect(await request('GET',url,undefined,admin.accessToken),200)), 'Legacy requests retain their response format');
    });
  } finally { /* Resources are closed by the test cleanup hook. */ }
});

test('empty installations create one fixed admin and restarts do not duplicate it', () => {
  const { spawnSync } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tomatoes-bootstrap-'));
  const script = `
    const assert = require('node:assert/strict');
    const { userStore } = require('./src/users/store');
    const { usersReady, get } = require('./src/users/database');
    const db = require('./src/database/sqlite/config/db.config').default;
    (async () => {
      await usersReady;
      const admin = await userStore.login('admin', 'admin', { ip: '127.0.0.1', userAgent: 'test' });
      assert(admin.isAdmin && admin.isBuiltin && admin.enabled);
      assert.equal((await get('SELECT COUNT(*) AS count FROM users')).count, 1);
      await assert.rejects(userStore.updateUser(admin.id, { firstName: 'Changed' }, admin, { ip: '', userAgent: '' }), { status: 403 });
      assert.equal((await userStore.getUser(admin.id)).firstName, 'System');
    })().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.close());
  `;
  try {
    for (let boot = 0; boot < 2; boot++) {
      const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, USERS_DB_PATH: path.join(directory, 'users.db'), JWT_SECRET: crypto.randomBytes(32).toString('hex') }, encoding: 'utf8', timeout: 30000 });
      assert.equal(result.status, 0, result.stderr || result.error?.message);
    }
  } finally {
    assert(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tomatoes-bootstrap-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
