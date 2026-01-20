# =============================================================================
# MONOMI FINANCE - OPTIMIZED MULTI-STAGE FRONTEND DOCKERFILE
# Enterprise Production-Ready React 19 + Mantine v7 Application
# =============================================================================

# =============================================================================
# STAGE 1: BASE IMAGE WITH SYSTEM DEPENDENCIES
# =============================================================================
FROM node:20-alpine AS base

# Install minimal system dependencies
RUN apk add --no-cache \
    # Security & SSL
    ca-certificates \
    # Utilities
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S react && \
    adduser -S react -u 1001 -G react

# =============================================================================
# STAGE 2: DEPENDENCY INSTALLER
# =============================================================================
FROM base AS deps

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci --include=dev --frozen-lockfile && \
    npm cache clean --force

# =============================================================================
# STAGE 3: BUILD STAGE
# =============================================================================
FROM base AS build

WORKDIR /app

# Build arguments for Vite (must be available at build time)
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application with optimizations
RUN npm run build && \
    # Remove source maps and other dev artifacts for production
    find dist -name "*.map" -delete && \
    # Optimize bundle size
    npm run build --mode=production

# =============================================================================
# STAGE 4: PRODUCTION RUNTIME WITH NGINX
# =============================================================================
FROM nginx:alpine AS production

# Set production environment
ENV NODE_ENV=production \
    TZ=Asia/Jakarta

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create optimized nginx configuration for React SPA
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
# Monomi Finance - Production Nginx Configuration
# Optimized for React SPA with Indonesian Business Support

server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional - for production without separate backend container)
    location /api/ {
        proxy_pass http://backend:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    chown -R nginx-user:nginx-user /etc/nginx/conf.d

# Switch to non-root user
USER nginx-user

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# =============================================================================
# STAGE 5: PRODUCTION WITH NODE.JS SERVER (for docker-compose.prod.yml)
# =============================================================================
FROM base AS production-node

# Set production environment
ENV NODE_ENV=production \
    TZ=Asia/Jakarta \
    FRONTEND_PORT=3000

WORKDIR /app/frontend

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy server.cjs for serving the built files
COPY server.cjs ./server.cjs

# Set permissions
RUN chown -R react:react /app

# Switch to non-root user
USER react

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start Node.js server
CMD ["node", "server.cjs"]

# =============================================================================
# STAGE 6: DEVELOPMENT RUNTIME (DEFAULT)
# =============================================================================
FROM base AS development

# Set development environment
ENV NODE_ENV=development \
    TZ=Asia/Jakarta \
    # Vite dev server configuration
    VITE_HOST=0.0.0.0 \
    VITE_PORT=3000

WORKDIR /app

# Copy all dependencies (including dev dependencies)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code for development
COPY . .

# Set permissions
RUN chown -R react:react /app

# Switch to non-root user
USER react

# Expose port for development
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Development command with hot reload
CMD ["npm", "run", "dev"]

# =============================================================================
# BUILD TARGETS SUMMARY:
# - base: Common system dependencies
# - deps: All dependencies for building
# - build: Application compilation and optimization
# - production: Nginx-served optimized build
# - development: Development with hot reload (default)
# =============================================================================