# syntax=docker/dockerfile:1

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ curl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy workspace files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/*/package.json packages/
COPY apps/web/package.json apps/web/
COPY apps/indexer/package.json apps/indexer/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY . .

# Generate Prisma client
RUN pnpm --filter @ember/indexer exec prisma generate

# Build the indexer
RUN pnpm --filter @ember/indexer run build

# Prune production dependencies
RUN pnpm --filter @ember/indexer exec pnpm prune --prod

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 indexer

# Copy built application
COPY --from=builder --chown=indexer:nodejs /app/apps/indexer/dist ./dist
COPY --from=builder --chown=indexer:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=indexer:nodejs /app/packages/ui/dist ./packages/ui/dist
COPY --from=builder --chown=indexer:nodejs /app/apps/web/dist ./apps/web/dist

# Copy Prisma schema for migrations
COPY --from=builder --chown=indexer:nodejs /app/apps/indexer/prisma ./prisma

USER indexer

CMD ["node", "dist/index.js"]
