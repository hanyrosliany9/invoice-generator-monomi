# Deck Presentation Optimization - Master Index

> **Target Executor**: Claude Code Haiku 4.5
> **Created By**: Claude Code Opus 4.5
> **Date**: 2025-12-21
> **Total Phases**: 8 (split into 12 implementation files)

## Overview

Transform the basic deck editor into a Google Slides-quality presentation tool with StudioBinder-style production templates.

## Execution Order

Execute each file in order. Each file is self-contained and should be completed before moving to the next.

| # | File | Description | Estimated Complexity | Dependencies |
|---|------|-------------|---------------------|--------------|
| 1 | `DECK_OPT_01_CANVAS_SETUP.md` | Install fabric.js, create canvas component | Medium | None |
| 2 | `DECK_OPT_02_CANVAS_ELEMENTS.md` | Text, image, shape elements on canvas | High | #1 |
| 3 | `DECK_OPT_03_CANVAS_CONTROLS.md` | Selection, keyboard shortcuts, undo/redo | High | #2 |
| 4 | `DECK_OPT_04_RICH_TEXT.md` | Tiptap rich text editor integration | Medium | #3 |
| 5 | `DECK_OPT_05_SHAPE_LIBRARY.md` | Shape picker, icons, arrows | Medium | #3 |
| 6 | `DECK_OPT_06_ASSET_BROWSER.md` | R2 media browser modal | Medium | #3 |
| 7 | `DECK_OPT_07_PROPERTIES_PANEL.md` | Element properties sidebar | Medium | #4, #5 |
| 8 | `DECK_OPT_08_TEMPLATES.md` | Mood board, shot list, storyboard templates | High | #6, #7 |
| 9 | `DECK_OPT_09_PRESENTATION.md` | Fullscreen mode, transitions | Medium | #8 |
| 10 | `DECK_OPT_10_EXPORT.md` | PDF export via Puppeteer | Medium | #9 |
| 11 | `DECK_OPT_11_COLLABORATION.md` | Real-time cursors, comments UI | High | #10 |
| 12 | `DECK_OPT_12_FIXES_POLISH.md` | Bug fixes, TypeScript errors, polish | Low | #11 |

## Current State Summary

**What Exists:**
- Backend: Complete API for decks, slides, elements, comments, collaborators
- Frontend: Basic editor with react-grid-layout (grid-locked)
- Database: Prisma models for all entities
- Storage: R2 integration ready in MediaService

**What's Wrong:**
- `react-grid-layout` forces grid snapping (not free-form)
- No rich text (plain input only)
- No shapes, icons, or drawing tools
- Templates are just strings (no actual layouts)
- No presentation mode
- No PDF export
- No keyboard shortcuts or undo/redo

## Tech Stack for Optimization

| Feature | Library | Why |
|---------|---------|-----|
| Canvas | `fabric.js` | Industry standard (Canva uses it), handles selection/rotation/resize |
| Rich Text | `@tiptap/react` | Modern, extensible, works with fabric.js text |
| Icons | `@ant-design/icons` + custom SVGs | Already in project |
| PDF Export | Puppeteer (backend) | Already installed |
| Real-time | Socket.io | Already in project |

## File Naming Convention

All optimization files follow: `DECK_OPT_##_NAME.md`

## How to Execute

```bash
# For each file:
1. Read the file completely
2. Follow steps in order
3. Test after each major step
4. Fix TypeScript errors before proceeding
5. Mark file as complete in this index
```

## Progress Tracking

- [x] `DECK_OPT_01_CANVAS_SETUP.md`
- [x] `DECK_OPT_02_CANVAS_ELEMENTS.md`
- [x] `DECK_OPT_03_CANVAS_CONTROLS.md`
- [x] `DECK_OPT_04_RICH_TEXT.md`
- [x] `DECK_OPT_05_SHAPE_LIBRARY.md`
- [x] `DECK_OPT_06_ASSET_BROWSER.md`
- [x] `DECK_OPT_07_PROPERTIES_PANEL.md`
- [x] `DECK_OPT_08_TEMPLATES.md`
- [x] `DECK_OPT_09_PRESENTATION.md`
- [x] `DECK_OPT_10_EXPORT.md`
- [x] `DECK_OPT_11_COLLABORATION.md`
- [x] `DECK_OPT_12_FIXES_POLISH.md`

## 🎉 COMPLETION STATUS: 12/12 PHASES COMPLETE (100%)

## Quick Reference

**Frontend Path**: `frontend/src/`
**Backend Path**: `backend/src/`
**Run Frontend**: `cd frontend && npm run dev` (runs on host)
**Run Backend**: `cd backend && npm run start:dev` (runs on host)
**Start Docker Services**: `docker compose -f docker-compose.dev.yml up -d`

## Environment Notes (IMPORTANT - READ THIS)

### Development Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    HOST MACHINE                         │
│  ┌─────────────────┐     ┌─────────────────┐           │
│  │    Frontend     │     │    Backend      │           │
│  │  (Vite dev)     │────▶│   (NestJS)      │           │
│  │  localhost:3001 │     │  localhost:5000 │           │
│  └─────────────────┘     └────────┬────────┘           │
│                                   │                     │
└───────────────────────────────────┼─────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────┐
│               DOCKER (docker-compose.dev.yml)           │
│                                   │                     │
│  ┌─────────────────┐     ┌───────▼─────────┐           │
│  │     Redis       │     │   PostgreSQL    │           │
│  │  localhost:6383 │     │  localhost:5436 │           │
│  └─────────────────┘     └─────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Points
- **Frontend**: Runs on HOST machine (Vite dev server) - `npm run dev`
- **Backend**: Runs on HOST machine (NestJS) - `npm run start:dev`
- **Database (PostgreSQL)**: Runs in Docker - `localhost:5436`
- **Redis**: Runs in Docker - `localhost:6383`
- **Docker Compose File**: `docker-compose.dev.yml` (NOT docker-compose.development.yml)

### Common Commands
```bash
# Start Docker services (DB + Redis only)
docker compose -f docker-compose.dev.yml up -d

# Install frontend packages (on host)
cd frontend && npm install <package>

# Install backend packages (on host)
cd backend && npm install <package>

# Run frontend dev server (on host)
cd frontend && npm run dev

# Run backend dev server (on host)
cd backend && npm run start:dev

# Run Prisma migrations (on host, connects to Docker DB)
cd backend && npx prisma migrate dev

# Check Docker services
docker compose -f docker-compose.dev.yml ps
```

### Why This Setup?
- Faster hot-reload for frontend and backend (no Docker volume sync overhead)
- Easier debugging with native Node.js
- Docker only for stateful services (DB, Redis) that don't need frequent restarts

---

## Docker Compose Configuration (IMPORTANT)

When adding new features, remember to update BOTH Docker compose files if needed:
- `docker-compose.dev.yml` - Development environment
- `docker-compose.prod.yml` - Production environment

### What to Add to Docker Compose Files

| Feature | What to Add | Where |
|---------|-------------|-------|
| New environment variables | `environment:` section | Both files |
| WebSocket (Socket.io) | Ensure port 5000 exposed | Already configured |
| Puppeteer (PDF export) | Chromium dependencies | `prod.yml` Dockerfile |
| New backend port | `ports:` mapping | Both files |
| File storage volumes | `volumes:` section | Both files |

### Required Environment Variables for New Features

Add these to both `docker-compose.dev.yml` and `docker-compose.prod.yml` in the `app` service:

```yaml
# For PDF Export (Phase 10)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium  # prod only
TEMP_EXPORT_DIR=/app/temp/exports

# For Collaboration (Phase 11)
SOCKET_IO_CORS_ORIGIN=http://localhost:3001  # dev
# SOCKET_IO_CORS_ORIGIN=https://yourdomain.com  # prod

# For R2 Asset Browser (Phase 6) - if not already present
R2_BUCKET_NAME=your-bucket
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
```

### Production Dockerfile Dependencies

For **Puppeteer** to work in production Docker, ensure the Dockerfile has:

```dockerfile
# Install Chromium for Puppeteer PDF export
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  fonts-noto-cjk \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Checklist Before Completing Each Phase

- [ ] New npm packages added to `package.json`
- [ ] Environment variables added to `.env.example`
- [ ] Environment variables added to `docker-compose.dev.yml`
- [ ] Environment variables added to `docker-compose.prod.yml`
- [ ] System dependencies added to production Dockerfile (if needed)
- [ ] Ports exposed in docker-compose (if new service)
