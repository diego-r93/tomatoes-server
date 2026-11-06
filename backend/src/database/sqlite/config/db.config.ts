import * as sqlite3 from 'sqlite3';

// Keep the existing database path; tests use a separate temporary database.
const db = new sqlite3.Database(process.env.USERS_DB_PATH || './users.db');
db.configure('busyTimeout', 5000);

export default db;
