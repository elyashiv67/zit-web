# ZitWeb API. Debian "slim" (glibc) so bcrypt and sharp use their prebuilt binaries.
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app

# packages first: this layer is reused until package*.json changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# fail the build here, not on the first login or photo upload, if a native binary is missing
RUN node -e "require('sharp'); require('bcrypt')"

COPY . .
# the photos volume is mounted here; owned by the unprivileged "node" user
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node

EXPOSE 4586
CMD ["node", "index.js"]
