# Base image: Debian "slim" with Node 22 already installed.
# Debian (glibc) rather than Alpine (musl) so the native "bcrypt" module
# uses its prebuilt binary instead of needing a C compiler in the image.
FROM node:22-slim

# All following commands run inside /app in the image's filesystem.
WORKDIR /app

# Copy ONLY the manifest + lockfile first. Docker caches each build step
# ("layer"); as long as these two files don't change, the expensive
# "npm ci" below is reused from cache even when your source code changes.
COPY package*.json ./

# "ci" = clean, reproducible install straight from package-lock.json.
# "--omit=dev" skips devDependencies (we run plain "node", not nodemon).
RUN npm ci --omit=dev

# Now copy the rest of the source. This layer changes often, but it's cheap.
# .dockerignore controls what is excluded from this copy.
COPY . .

# Documentation only: says "this app listens on 4586". It does NOT publish
# the port to the host — docker-compose.yml does that.
EXPOSE 4586

# The process the container runs. Array form = no shell wrapper.
CMD ["node", "index.js"]
