import { chmodSync, closeSync, mkdirSync, mkdtempSync, openSync, renameSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Database, OPEN_READONLY } from 'sqlite3';
import { usersDatabasePath } from './config/path';

function openReadOnly(path: string): Promise<Database> {
  return new Promise((resolve, reject) => {
    const db = new Database(path, OPEN_READONLY, error => error ? reject(error) : resolve(db));
    db.configure('busyTimeout', 5000);
  });
}

function closeDatabase(db: Database): Promise<void> {
  return new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
}

async function backup() {
  const source = usersDatabasePath();
  if (source === ':memory:') throw new Error('A persistent SQLite database is required.');
  const root = resolve('.sqlite-backups');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  chmodSync(root, 0o700);
  const directory = mkdtempSync(join(root, 'snapshot-'));
  const temporary = join(directory, 'users.partial.db');
  const destination = join(directory, 'users.db');

  try {
    closeSync(openSync(temporary, 'wx', 0o600));
    const db = await openReadOnly(source);
    try {
      await new Promise<void>((resolve, reject) => {
        db.run('VACUUM INTO ?', [temporary], error => error ? reject(error) : resolve());
      });
    } finally {
      await closeDatabase(db);
    }

    const copy = await openReadOnly(temporary);
    try {
      await new Promise<void>((resolve, reject) => {
        copy.get<{ integrity_check: string }>('PRAGMA integrity_check', (error, row) => {
          if (error) reject(error);
          else if (row?.integrity_check !== 'ok') reject(new Error('The SQLite backup failed its integrity check.'));
          else resolve();
        });
      });
    } finally {
      await closeDatabase(copy);
    }

    renameSync(temporary, destination);
    console.log(destination);
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

backup().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'SQLite backup failed.');
  process.exitCode = 1;
});
