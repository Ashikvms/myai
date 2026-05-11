# Stage 1: Build
#
# SECURITY: pin the base image to a specific SHA256 digest in production.
# The tag `node:20-alpine` floats — a registry compromise or a malicious
# new push would silently land in our build. Replace `:latest-known` with
# the output of `docker pull node:20-alpine && docker inspect --format='{{index .RepoDigests 0}}' node:20-alpine`
# before deploying.
#
# Example pinned form:
#   FROM node:20-alpine@sha256:<64-hex-digest> AS builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/ai/package.json packages/ai/
COPY packages/config/package.json packages/config/

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate Prisma client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build TypeScript
RUN cd apps/api && npx tsc

# Stage 2: Production
#
# SECURITY: same pin-by-digest guidance applies here. Use the same
# digest as the builder stage to guarantee reproducible builds.
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production deps only
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/ai/package.json packages/ai/
COPY packages/config/package.json packages/config/

RUN npm ci --ignore-scripts --omit=dev

# Copy Prisma schema and generate client
COPY apps/api/prisma/ apps/api/prisma/
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Copy built files from builder
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/shared packages/shared
COPY --from=builder /app/packages/ai packages/ai

# SECURITY: ensure runtime files are owned by `node` so the container
# can drop root before starting the app. `node:20-alpine` ships a
# non-root `node` user (uid 1000); we just need to chown.
RUN chown -R node:node /app

EXPOSE 3001

# Healthcheck — Railway / Docker Swarm / k8s-style orchestrators will
# read this. `wget` is available in node:alpine; curl is not.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# Drop privileges — must come AFTER any RUN that needs root (chown above).
USER node

CMD ["node", "apps/api/dist/index.js"]
