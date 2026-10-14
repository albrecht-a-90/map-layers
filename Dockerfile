# Build: Node + Yarn 4 (corepack) → static files. Serve: nginx.
#   docker compose up --build   → http://localhost:8080

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
# HUSKY=0: no git hooks inside the image
RUN HUSKY=0 yarn install --immutable
COPY . .
RUN yarn build

FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -q --spider http://127.0.0.1/ || exit 1
