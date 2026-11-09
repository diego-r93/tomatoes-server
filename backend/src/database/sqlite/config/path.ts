export function usersDatabasePath() {
  return process.env.USERS_DB_PATH || './users.db';
}
