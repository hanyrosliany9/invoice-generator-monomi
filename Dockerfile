# Multi-stage build for production
FROM node:20-alpine AS base

# Install system dependencies including Chromium for Puppeteer, Canvas for chart rendering, and FFmpeg for video processing
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
    openssl-dev \
    # Dependencies for canvas (chartjs-node-canvas)
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    # FFmpeg for video processing and thumbnail generation
    ffmpeg

# Install yt-dlp for media downloading (YouTube, Instagram, TikTok, Pinterest, etc.)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
# CXXFLAGS workaround for canvas package C++ compilation on Alpine (missing <cstdint> includes)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CXXFLAGS="-include cstdint"

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

# Clean Vite cache to prevent stale builds
RUN rm -rf frontend/node_modules/.vite frontend/dist

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

# DEV ONLY: Skip chown for faster builds (running as root is OK in development)
# RUN chown -R appuser:appuser /app

# USER appuser

# Expose ports
EXPOSE 3000 5000 9229

# Default command (will be overridden by docker-compose)
CMD ["tail", "-f", "/dev/null"]

# Production stage
FROM base AS production

# Copy built applications from build stages with correct ownership
COPY --chown=appuser:appuser --from=backend-build /app/backend/dist ./backend/dist
COPY --chown=appuser:appuser --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --chown=appuser:appuser --from=backend-build /app/backend/package*.json ./backend/
COPY --chown=appuser:appuser --from=backend-build /app/backend/prisma ./backend/prisma

# Copy assets (logo, templates) needed at runtime
COPY --chown=appuser:appuser --from=backend-build /app/backend/src/assets ./backend/dist/assets

COPY --chown=appuser:appuser --from=frontend-build /app/frontend/dist ./frontend/dist
COPY --chown=appuser:appuser --from=frontend-build /app/frontend/node_modules ./frontend/node_modules
COPY --chown=appuser:appuser --from=frontend-build /app/frontend/package*.json ./frontend/

# Copy shared files with correct ownership
COPY --chown=appuser:appuser shared/ ./shared/

# Copy frontend server script (CommonJS format for ES module package)
COPY --chown=appuser:appuser frontend/server.cjs ./frontend/

# Create necessary directories with correct ownership
RUN mkdir -p uploads storage logs backup && \
    chown -R appuser:appuser uploads storage logs backup

# Create nginx config directory (nginx runs as root, so no chown needed)
RUN mkdir -p /etc/nginx/conf.d

USER appuser

# Expose ports (3000 for frontend, 5000 for backend)
EXPOSE 3000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start production server with database migrations
# Run migrations before starting the app to ensure schema is current
CMD sh -c "cd backend && npx prisma migrate deploy && npx prisma generate && node dist/src/main.js"