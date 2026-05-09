# ============================================================
#  Frontend Dockerfile — React CRA → Nginx
# ============================================================
#  Multi-stage: build React → serve with nginx
# ============================================================

# ── Stage 1: Build React app ──
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build-time env vars (overridden by docker-compose build args)
ARG REACT_APP_API_URL=https://api.yourdomain.com/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build production bundle
RUN npm run build

# ── Stage 2: Serve with Nginx ──
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
