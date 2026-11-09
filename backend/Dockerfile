FROM node:24.22.2 AS sqlite
# Link the Node driver to the verified upstream release on every architecture.
RUN set -eu; \
    curl --fail --silent --show-error --location --retry 3 \
        https://sqlite.org/2026/sqlite-autoconf-3540100.tar.gz -o /tmp/sqlite.tar.gz; \
    test "$(openssl dgst -sha3-256 -r /tmp/sqlite.tar.gz | cut -d " " -f 1)" = \
        b6ced585c750916b1052667239a12c25a7ff34e7f06e1e6e01ecb0427657d9c4; \
    mkdir /tmp/sqlite; \
    tar -xzf /tmp/sqlite.tar.gz -C /tmp/sqlite --strip-components=1; \
    cd /tmp/sqlite; \
    CFLAGS="-O2 -fPIC" ./configure --prefix=/opt/sqlite --disable-shared --disable-readline; \
    make -j2 libsqlite3.a; \
    install -D libsqlite3.a /opt/sqlite/lib/libsqlite3.a; \
    install -D sqlite3.h /opt/sqlite/include/sqlite3.h; \
    rm -rf /tmp/sqlite /tmp/sqlite.tar.gz
ENV npm_config_build_from_source=sqlite3 npm_config_sqlite=/opt/sqlite npm_config_nodedir=/usr/local

FROM sqlite AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive
COPY tsconfig.json ./
COPY src/ ./src/
RUN yarn build

FROM sqlite AS production-deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --production=true

FROM node:24.22.2 AS runtime
WORKDIR /app
COPY --from=production-deps /app/node_modules/ ./node_modules/
# Fail the image build if the driver selected a different SQLite library.
RUN node -e 'const { Database } = require("sqlite3"); const db = new Database(":memory:"); db.get("SELECT sqlite_version() AS version", (error, row) => { if (error) throw error; if (row.version !== "3.54.1") throw new Error("Unexpected SQLite " + row.version); console.log("SQLite " + row.version); db.close(); });'
COPY --from=build /app/dist/ ./dist/

# Keep the existing SQLite database and its WAL files in the Compose bind mount.
WORKDIR /backend
ENV NODE_ENV=production
CMD ["node", "/app/dist/server.js"]
