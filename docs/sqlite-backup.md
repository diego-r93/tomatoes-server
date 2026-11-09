# SQLite backup and recovery

SQLite stores accounts, sessions and alerts in the database selected by USERS_DB_PATH. The default is /backend/users.db inside the backend container. On Linux the backend restricts the database and its WAL and SHM files to mode 0600. The current Compose backend runs as root.

## Create a backup

Run from the Compose project directory on the Raspberry Pi.

~~~sh
sudo docker compose exec -T backend node /app/dist/database/sqlite/backup.js
~~~

The command opens the source read-only while the backend is running. SQLite creates a consistent snapshot with VACUUM INTO and the command checks its integrity before publishing the final filename. The printed /backend/.sqlite-backups/snapshot-.../users.db path maps to ./backend/.sqlite-backups on the Pi. The backup directories use mode 0700 and the snapshot uses 0600. The directory is ignored by Git and excluded from the Docker build context.

Each run creates a separate snapshot. The command runs on demand and does not configure automatic backups. A copy on the same Pi can help recover from accidental changes. Recovery after storage failure requires a separate protected copy on other storage.

## Validate a restore

Mount the chosen snapshot read-only in a temporary container and copy it to a temporary database before opening it. Keep the container off the network. This command verifies integrity and reports counts without printing account details, credentials or rules.

~~~sh
snapshot="$PWD/backend/.sqlite-backups/snapshot-REPLACE/users.db"
sudo docker run --rm --network none -w /app \
  --mount "type=bind,source=$snapshot,target=/snapshot.db,readonly" \
  tomatoes-backend:node24 sh -ec '
    cp /snapshot.db /tmp/restored.db
    node -e "
      const { Database, OPEN_READONLY } = require(\"sqlite3\");
      const db = new Database(\"/tmp/restored.db\", OPEN_READONLY);
      db.get(\"PRAGMA integrity_check\", (error, row) => {
        if (error) throw error;
        if (row.integrity_check !== \"ok\") throw new Error(\"Integrity check failed\");
        db.get(\"SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM alert_rules) AS rules\", (error, counts) => {
          if (error) throw error;
          console.log(\"Integrity OK\", counts);
          db.close();
        });
      });
    "
  '
~~~

A functional restore test can start only the user and alert HTTP routes against that temporary copy, without starting notification workers or MQTT. This is how the admin login and authenticated rule retrieval were verified.

For a real recovery, stop the backend before replacing the active database. Move the active database and any WAL and SHM files aside as a set. Place a copy of the validated snapshot at the configured database path with mode 0600 and ownership matching the backend identity. Start the backend and verify login and rules. The snapshot is standalone and must be opened without WAL and SHM files from another database.
