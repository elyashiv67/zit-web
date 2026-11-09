# 1) build the React app (dev dependencies are needed for the build)
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_URL stays unset: the app calls /api on its own domain
RUN npm run build

# 2) serve it. The config is mounted from deploy/nginx.conf.template (docker-compose.yml)
FROM nginx:1.28-alpine
COPY --from=build /app/dist /usr/share/nginx/html/zit-web
