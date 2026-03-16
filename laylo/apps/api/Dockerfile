# Stage 1: Build
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

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
