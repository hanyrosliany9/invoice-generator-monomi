# Multi-stage build for production
FROM node:20-alpine AS base

# Install system dependencies including Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    git \
    openssl \
    openssl-dev

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001

WORKDIR /app

# Backend build stage
FROM base AS backend-build

# Copy backend package files
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install backend dependencies (including dev dependencies for build)
RUN cd backend && npm ci

# Copy backend source
COPY backend/ ./backend/

# Generate Prisma client
RUN cd backend && npx prisma generate

# Build backend
RUN cd backend && npm run build

# Prune dev dependencies after build
RUN cd backend && npm prune --production

# Frontend build stage
FROM base AS frontend-build

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies (including dev for build tools like tsc, vite)
# Use install instead of ci due to lock file complexity
RUN cd frontend && npm install --ignore-scripts --no-audit --no-fund --legacy-peer-deps

# Copy frontend source
COPY frontend/ ./frontend/

# Build frontend
RUN cd frontend && npm run build

# Development stage
FROM base AS development

# Copy package files for both backend and frontend
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies (including dev dependencies) with clean cache
RUN cd backend && npm cache clean --force && npm install --no-audit --no-fund
RUN cd frontend && npm cache clean --force && npm install --legacy-peer-deps --no-audit --no-fund

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY shared/ ./shared/

# Create necessary directories with proper permissions for Vite
RUN mkdir -p uploads storage logs backend/dist frontend/.vite frontend/node_modules/.vite backend/.tmp && \
    chmod -R 755 uploads storage logs backend/dist frontend/.vite backend/.tmp

# Change ownership to app user
RUN chown -R appuser:appuser /app

USER appuser

# Expose ports
EXPOSE 3000 5000 9229

# Default command (will be overridden by docker-compose)
CMD ["tail", "-f", "/dev/null"]

# Production stage
FROM base AS production

# Copy built applications from build stages
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package*.json ./backend/
COPY --from=backend-build /app/backend/prisma ./backend/prisma

COPY --from=frontend-build /app/frontend/dist ./frontend/dist
COPY --from=frontend-build /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-build /app/frontend/package*.json ./frontend/

# Copy shared files
COPY shared/ ./shared/

# Create necessary directories
RUN mkdir -p uploads storage logs backup

# Create nginx config directory
RUN mkdir -p /etc/nginx/conf.d

# Copy frontend server script (CommonJS format for ES module package)
COPY frontend/server.cjs ./frontend/

# Change ownership to app user
RUN chown -R appuser:appuser /app

USER appuser

# Expose ports (3000 for frontend, 5000 for backend)
EXPOSE 3000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start production server with database migrations
# Run migrations before starting the app to ensure schema is current
CMD sh -c "cd backend && npx prisma migrate deploy && npx prisma generate && node dist/src/main.js"