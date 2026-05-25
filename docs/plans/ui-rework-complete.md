# UI Rework — COMPLETE

**Date:** 2026-05-25
**Final commit:** `d82ab14`
**Status:** ✓ Every classic page has a v2 counterpart. Migration is total.

## What shipped

**88 v2 pages** across 20 directories. Every classic route — admin, anonymous, internal tooling — now has a v2 counterpart. Pure-black chrome, ui/monomi primitives only, react-hook-form + zod for forms, token utilities throughout.

## Waves

| Wave | Pages | Scope |
|---|---:|---|
| 0 (foundation) | — | Design tokens, 21 shadcn primitives, 12 Monomi primitives, ESLint guard, v2 routing infra, StyleGuidePage |
| 1 | 2 | LoginPage + DashboardPage |
| 2 | 3 | Sales LIST pages (Invoices, Quotations, Clients) |
| 2.5 | 3 | Sales DETAIL pages |
| 3 | 9 | Sales CRUD forms (Create + Edit + shared Form × 3 entities) |
| 4 | 10 | Projects + Expenses full CRUD + ExpenseCategories |
| 5 | 15 | Vendors CRUD + Users CRUD + Settings + Assets CRUD |
| 6 | 6 | Reports (4 flavors) + Calendars (general + content) |
| 7 | 10 | Call Sheets + Decks + Shot Lists + Media + Collection + Milestone Analytics |
| 8 | 27 | Accounting suite (20) + Guest/Public (3) + Project calendars (2) + Internal tooling (2) |

## Entities with full v2 CRUD coverage

Quotations · Invoices · Clients · Projects · Expenses · Vendors · Users · Assets · Decks · Shot Lists · Call Sheets · Media Collaboration · Settings · Reports · Calendars · Milestone Analytics

**Plus Wave 8 surface area:**
Chart of Accounts · Journal Entries (+ Adjusting Wizard) · Trial Balance · General Ledger · Income Statement · Balance Sheet · Cash Flow Statement · Accounts Receivable (+ Aging) · Accounts Payable (+ Aging) · Depreciation · ECL Provision · Cash Receipts · Cash Disbursements · Cash & Bank Balance · Bank Reconciliations · Bank Transfers · Project-scoped Calendar · Project-scoped Content Calendar · Public Project View · Guest Project View · Guest Invite Accept · Media Downloader · Pinterest Downloader

## Brand discipline applied uniformly

- Sidebar + topbar + main canvas all `bg-bg-base` (pure black `#030303`)
- Navy `#131936` reserved for accents: hover wash, focus rings, AuroraBackground orbs, active nav indicators
- Card surfaces: `bg-bg-raised` (#1A1A1F), borders `border-border-subtle/default/strong` (10/18/30% cream opacity)
- Cream `#F6F3E8` primary text and accent line color (chart strokes, primary CTAs)
- Editorial typographic hierarchy: eyebrow labels (10px/0.16em uppercase) + tight tracking on display weights
- Section-level rhythm (mb-12) distinct from item-level (gap-3/5)

## Deferred (scope-limited; mostly heavy-feature parity with classic)

- Drag-and-drop reorder across editors (Decks/Shot Lists/Call Sheets/Media)
- html2canvas PDF snapshots — uses server-side PDF instead
- Chunked / presigned-URL media uploads (replaced with sequential POST in v2)
- Lightbox + video frame drawings + bulk-download jobs
- Real-time collaboration features
- Auto-fill in Call Sheets (weather, sun times, hospitals, address autocomplete)
- Multi-scene grouping with INT/EXT metadata
- ReportBuilder canvas with widget palette (basic builder shipped)
- Custom-range time filter on Milestone Analytics (pinned to 90 days; matches classic)

These are documented in-file with `Scope note:` comments where applicable. Footer banners on builder/editor pages point users to the classic v1 page for advanced features.

## What was NOT migrated

Nothing. Every classic page now has a v2 counterpart.

Note: the v2 guest/public pages live under `frontend/src/pages/v2/guest/` rather than `v2/public/` because `public/` is gitignored repo-wide (it traps Vite/Gatsby/Next public directories). The route paths still mirror classic: `/v2/guest/accept`, `/v2/guest/project/:projectId`, `/v2/shared/:token`.

## Route guard

`V2RouteGuard.tsx` uses a hybrid match:

- `MIGRATED_EXACT` set for static paths (e.g. `/v2/invoices`, `/v2/settings`)
- `MIGRATED_PATTERNS` regex array for parameterized paths (`/v2/invoices/:id`, `/v2/projects/:id/edit`, etc.)
- `MIGRATED_NEW_PATHS` set for `/new` create forms + category pages
- `NOT_YET_MIGRATED` escape hatch (currently empty)
- `isV2Migrated(pathname)` exported function consolidates the lookup

Anything outside these matchers redirects to the classic equivalent (strips `/v2` prefix).

## Build status

- `npx tsc --noEmit` clean across 80+ v2 files
- `npm run build` 22.6s — main chunk ~9.5 MB (gzip ~1.86 MB)
- All v2 pages are `React.lazy`-imported with `Suspense` + `PageLoader`

## Next steps (when user is ready)

1. Visual review pass on the v2 pages they haven't seen yet (everything past DashboardPage)
2. Consider extracting recurring inline-patterns into real primitives — `<Textarea>`, `<NumberInput>` with IDR formatter, `<ProjectPicker>` combobox — only if they hurt
3. Flip the default `monomi.ui` localStorage value once feature parity is verified end-to-end
4. Audit deferred features list with stakeholders; decide which to port back vs accept as v2-divergent
