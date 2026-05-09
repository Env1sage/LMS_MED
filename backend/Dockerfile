# ============================================================
#  Backend Dockerfile — NestJS + Prisma
# ============================================================
#  Multi-stage build for smallest production image
# ============================================================

# ── Stage 1: Install deps & build ──
FROM node:22-alpine AS builder

WORKDIR /app

# Install native build deps for bcrypt, pg, etc.
RUN apk add --no-cache python3 make g++

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy prisma schema & generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source & build
COPY . .
RUN npm run build

# ── Stage 2: Production image ──
FROM node:22-alpine AS production

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Install only production deps
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    apk del python3 make g++

# Copy prisma config and schema (for migrations at startup)
COPY prisma.config.ts ./
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api || exit 1

# Start with migrations
CMD ["sh", "-c", "DATABASE_URL=$DATABASE_URL npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/src/main"]
