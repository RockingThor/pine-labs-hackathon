# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace config and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/

# Copy source for shared and api
COPY packages/shared/src ./packages/shared/src
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/src ./apps/api/src

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/shared run build
RUN pnpm --filter api run db:generate
RUN pnpm --filter api run build

# Production stage
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files for production install (api + shared dependency)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/dist ./packages/shared/dist
COPY apps/api/package.json apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Install deps (include Prisma for migrate deploy at runtime)
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api exec prisma generate

WORKDIR /app/apps/api

EXPOSE 3000

# Run migrations then start the API
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm start"]
