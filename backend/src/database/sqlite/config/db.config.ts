import { chmodSync, closeSync, fchmodSync, openSync } from 'node:fs';
import { usersDatabasePath } from './path';
import * as sqlite3 from 'sqlite3';

// Keep the existing database path; tests use a separate temporary database.
const path = usersDatabasePath();
if (path !== ':memory:') {
  // The SQLite Unix VFS uses the database mode when creating WAL and SHM.
  const file = openSync(path, 'a', 0o600);
  try {
    fchmodSync(file, 0o600);
  } finally {
    closeSync(file);
  }
  for (const suffix of ['-wal', '-shm']) {
    try {
      chmodSync(path + suffix, 0o600);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
}

const db = new sqlite3.Database(path);
db.configure('busyTimeout', 5000);

export default db;
