# syntax=docker/dockerfile:1
# Multi-stage build for production
FROM node:20-alpine AS base

# Install system dependencies including Chromium for Puppeteer, Canvas for chart rendering, and FFmpeg for video processing
# Cache mount on the apk cache so a clean rebuild reuses already-downloaded packages
# instead of re-fetching ~200MB (chromium + native toolchain) from the mirror every time.
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    ln -sf /var/cache/apk /etc/apk/cache && \
    apk add \
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
    ffmpeg \
    # PostgreSQL client tools — pg_dump is used by the settings backup endpoint
    postgresql-client

# Install yt-dlp for media downloading (YouTube, Instagram, TikTok, Pinterest, etc.)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
# CXXFLAGS workaround for canvas package C++ compilation on Alpine (missing <cstdint> includes)
# npm_config_nodedir: use headers already in the image instead of downloading from unofficial-builds.nodejs.org
# Without this, node-gyp tries to download musl Node headers at build time and times out
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CXXFLAGS="-include cstdint" \
    npm_config_nodedir=/usr/local

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
# Cache mount on npm's download cache: clean rebuilds reuse downloaded tarballs
# even when the node_modules layer is invalidated by a package.json change.
RUN --mount=type=cache,target=/root/.npm \
    cd backend && npm ci

# Copy backend source
COPY backend/ ./backend/

# Generate Prisma client
RUN cd backend && npx prisma generate

# Build backend
RUN cd backend && npm run build

# Prune dev dependencies after build
RUN cd backend && npm prune --production

# NOTE: The frontend is built and served by its own image (frontend/Dockerfile,
# target production-node) as a separate container in docker-compose.prod.yml.
# The backend production image below is API-only (node dist/src/main.js) and does
# NOT serve any static frontend, so there is intentionally no frontend-build stage
# here — building it would just be thrown away and bloat the backend image.

# Development stage
FROM base AS development

# Copy package files for both backend and frontend
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies (including dev dependencies).
# Use a persistent npm cache mount (do NOT `npm cache clean`, which would defeat it).
RUN --mount=type=cache,target=/root/.npm \
    cd backend && npm install --no-audit --no-fund
RUN --mount=type=cache,target=/root/.npm \
    cd frontend && npm install --legacy-peer-deps --no-audit --no-fund

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

# NOTE: runtime assets (company-logo.png/svg under src/modules/pdf/assets) are now
# copied into dist by the Nest build (nest-cli.json assets includes *.png/*.svg),
# so they ship inside the `backend/dist` copy above — no separate asset COPY needed.
# (The old `COPY .../src/assets` referenced a path that never existed and broke clean builds.)

# NOTE: frontend/dist + frontend/node_modules + server.cjs are intentionally NOT
# copied here — the backend image is API-only. The frontend runs as its own
# container (frontend/Dockerfile). This keeps the backend image hundreds of MB smaller.

# Copy shared files with correct ownership
COPY --chown=appuser:appuser shared/ ./shared/

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