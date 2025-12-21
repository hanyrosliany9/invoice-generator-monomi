# Hybrid Development - Quick Start (5 minutes)

**Hybrid Development** = Infrastructure in Docker + App on your machine = Fast iteration!

## One-Time Setup

```bash
# 1. Copy environment file
cp .env.development .env

# 2. Start Docker services (DB + Redis)
./scripts/manage-dev-infra.sh start

# 3. Install backend dependencies (Puppeteer will auto-download Chromium ~200MB)
cd backend && npm install

# 4. Setup database
npx prisma migrate deploy
npm run db:seed

# 5. Install frontend dependencies
cd ../frontend && npm install
```

## Daily Development

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run start:dev
# Open: http://localhost:5000/api/docs
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
# Open: http://localhost:3000
```

**Done!** Both have hot-reload. Edit files and see changes instantly.

## Stopping

```bash
# Stop Docker services (keeps data)
./scripts/manage-dev-infra.sh stop

# Or clean everything (deletes database data!)
./scripts/manage-dev-infra.sh clean
```

## Useful Commands

| Task | Command |
|------|---------|
| **Check services** | `./scripts/manage-dev-infra.sh status` |
| **View logs** | `./scripts/manage-dev-infra.sh logs -f` |
| **Database shell** | `./scripts/manage-dev-infra.sh db-shell` |
| **Create migration** | `cd backend && npx prisma migrate dev --name description` |
| **Reset database** | `cd backend && npm run db:reset` |
| **Run tests** | `cd backend && npm test` or `cd frontend && npm test` |

## Switching Modes

**To Full Docker** (slower, but exact prod environment):
```bash
./scripts/manage-dev-infra.sh stop
docker compose -f docker-compose.dev.yml up -d
```

**Back to Hybrid** (faster):
```bash
docker compose -f docker-compose.dev.yml down
./scripts/manage-dev-infra.sh start
cd backend && npm run start:dev
cd frontend && npm run dev
```

## Troubleshooting

**"Cannot connect to database"**
```bash
./scripts/manage-dev-infra.sh status    # Check if running
./scripts/manage-dev-infra.sh start     # Start if not
```

**"Port already in use"**
```bash
lsof -i :5000        # Check what's using port
kill -9 <PID>        # Kill it
```

**"Module not found" after git pull**
```bash
cd backend && npm install
cd ../frontend && npm install
```

**Puppeteer errors**
```bash
cd backend
rm -rf node_modules
npm install   # Auto-downloads Chromium
```

## Performance

- **Backend reload**: 1-2 seconds (TypeScript hot-reload)
- **Frontend reload**: <1 second (Vite HMR)
- **First build**: ~30 seconds (initial npm install)
- **Database startup**: ~5 seconds

See [HYBRID_DEVELOPMENT_SETUP.md](./HYBRID_DEVELOPMENT_SETUP.md) for detailed guide.
