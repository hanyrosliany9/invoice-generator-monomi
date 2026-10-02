# Guide screenshots

Re-runnable capture for the in-app guides (staff **Panduan** at `/panduan`, client
**Bantuan** at `/portal/bantuan`). It seeds clearly-fake `(Demo)` data through the
staff API, drives the real UI with Playwright, outlines the relevant element with an
orange numbered badge, and saves optimised WebP files to
`frontend/public/guides/<guide>/<step>.webp`. It also regenerates
`frontend/src/guides/imageManifest.ts` (image sizes, so the page never jumps).
When it finishes (or fails) it deletes the demo data.

The capture has its own `package.json` (`playwright-core`, `sharp`, `pg`), so the app's
dependencies and lockfile are untouched. The `playwright` browser must be installed
once (`npx playwright-core install chromium`) or already present in the
Playwright cache.

## Run

Needs a local stack: Postgres + Redis (`docker compose -f docker-compose.development.yml up -d`),
a backend and the Vite dev server.

```bash
# 1. backend on a free port. Point R2_* at dummies so nothing can reach real storage.
cd backend
R2_ENDPOINT=http://127.0.0.1:9 R2_PUBLIC_URL=https://media-demo.invalid \
R2_ACCESS_KEY_ID=demo R2_SECRET_ACCESS_KEY=demo R2_BUCKET_NAME=demo R2_ACCOUNT_ID=demo \
PORT=5131 FRONTEND_URL=http://localhost:5211 npx nest start > /tmp/backend.log 2>&1 &

# 2. Vite on a free port, proxied to that backend
cd frontend
VITE_PORT=5211 VITE_PROXY_TARGET=http://localhost:5131 npx vite &

# 3. capture
cd frontend/scripts/guides
npm install                       # first time only
GUIDE_API_URL=http://localhost:5131/api/v1 \
GUIDE_APP_URL=http://localhost:5211 \
GUIDE_BACKEND_LOG=/tmp/backend.log \
node capture.mjs                  # all guides
```

| Variable | Default | Meaning |
|---|---|---|
| `GUIDE_API_URL` | `http://localhost:5000/api/v1` | backend API |
| `GUIDE_APP_URL` | `http://localhost:5173` | Vite origin (staff app and `/portal`) |
| `GUIDE_ADMIN_EMAIL` / `GUIDE_ADMIN_PASSWORD` | `admin@monomi.id` / `password123` | staff login |
| `GUIDE_BACKEND_LOG` | none | backend console log; the dev mailer prints the portal's 6-digit login code there. Required for the `portal` flow |
| `GUIDE_DATABASE_URL` | `postgresql://invoiceuser:devpassword@localhost:5438/invoices` | used by seed (thumbnails) and cleanup |
| `GUIDE_DEBUG_DIR` | none | on failure, save a screenshot of every open page here |
| `GUIDE_IDS_OUT` | none | write the seeded ids to this JSON file |

Options: `node capture.mjs report planner` (only these flows; names are files in
`flows/`), `--keep` (do not clean up afterwards), `--reuse` (with `--keep` and
`GUIDE_IDS_OUT`: skip cleanup and seeding and reuse the data of the previous `--keep`
run, handy while writing a flow), `--clean-only`.

| Flow (`flows/<name>.mjs`) | Guides it produces |
|---|---|
| `report`, `planner`, `client-portal`, `media`, `portal` | laporan-bulanan, perencana-konten, konten-monomi, portal-klien, kolaborasi-media and the client guides |
| `sales` | klien-baru, proyek-baru, quotation, invoice, piutang-pembayaran |
| `finance` | pengeluaran, akuntansi-dasar, aset-penyusutan, vendor-pembelian, gaji, penjualan |
| `production` | shot-list, jadwal-syuting, call-sheet, production-hub |
| `tools` | deck-presentasi, media-downloader, dashboard-navigasi, pengguna-peran |

Staff logins are rate limited (5 per minute), so the capture signs in once through the UI
and reuses that session (`storageState`) for every browser context. Wide screens
(financial reports, deck editor) are captured at 1440 or 1920 px so nothing is clipped;
everything else is 1280 px.

## Cleanup

Everything created carries the `(Demo)` marker (clients, projects, content captions,
media projects, decks, reports, vendors, assets, expenses, staff, shot lists, schedules,
call sheets, users) or the `demo.*@contoh.co.id` e-mails.
`node cleanup.mjs` removes it by that marker and prints the remaining counts; the
capture also runs it before it starts, so a crashed run is repaired by the next one.

Cleanup deletes in foreign-key order, straight in Postgres: ledger rows and journal
entries (found through their invoice/payment/expense/salary numbers), payables, vendor
documents, expenses, payments, invoices, quotations, salary payments, staff, vendors,
assets, call sheets, media projects, decks, content, reports, projects, portal rows,
project types, clients and users. Quotation/invoice/expense numbers and counters keep
increasing; that is harmless. The cached cash/bank balances are recalculated through the
API at the end. Run it only against a development database: it matches by name.

`seed.mjs` creates the base data (clients, projects, content, media, deck, reports) and
calls `seed-business.mjs` for the business documents: quotations in every state, invoices
(draft, partly paid, paid, overdue), vendors, expenses, a shot list, a schedule, staff and
salary payments, and an asset.
The "Konten Monomi" guide edits the internal Monomi client's Instagram profile; the
original values are saved to `.capture-state.json` and restored by cleanup.

## Adding or changing a guide

1. Text: add keys under `guides.items.<slug>` in `src/i18n/locales/{id,en}.json`.
2. Structure: add an entry to the area file in `src/guides/staff/` (`sales`, `production`,
   `marketing`, `finance`, `admin`; client guides stay in `src/guides/data.ts`). Steps are
   `<slug>/<stepId>` and its `topic` is the group shown on the index.
3. Screenshot: add the step to a flow in `flows/` using `shot(page, '<slug>/<stepId>', { highlights })`.
4. Re-run the capture for that flow.
