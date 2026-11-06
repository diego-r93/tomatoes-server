FROM node:24.22.2 AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive
COPY tsconfig.json ./
COPY src/ ./src/
RUN yarn build

FROM node:24.22.2 AS runtime
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --production=true && yarn cache clean
COPY --from=build /app/dist/ ./dist/

# Keep the existing SQLite database and its WAL files in the Compose bind mount.
WORKDIR /backend
ENV NODE_ENV=production
CMD ["node", "/app/dist/server.js"]
