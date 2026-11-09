FROM node:24.22.2 AS build
WORKDIR /frontend
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive
COPY . .
RUN yarn typecheck && yarn build --outDir dist

FROM nginx:1.30.6
COPY --from=build /frontend/dist/ /usr/share/nginx/html/
