# UI/UX Rework — Design Document

**Date:** 2026-05-24
**Status:** Design approved by user; awaiting implementation plan.
**Author:** Claude Opus 4.7 (collaborating with user via brainstorming session)

---

## Goal

Replace the current UI (which user described as "AI-generated") with a deliberate, on-brand design language extending the dark-glassmorphism aesthetic already shipped in the public gallery (`PublicProjectViewPage`, commit `3981388`). End state: every admin page uses a consistent design system based on Monomi's brand palette.

## Locked-in decisions

| Decision | Choice | Locked |
|---|---|---|
| Aesthetic | Dark glassmorphism (extending public gallery) | ✓ |
| Light mode | Dark-only — kill light mode entirely | ✓ |
| Scope | Full rework: every admin page | ✓ |
| Component lib | Drop AntD → shadcn/ui (Radix + Tailwind) | ✓ |
| Migration approach | A — Parallel track, page-by-page via `/v2/*` route prefix | ✓ |
| Brand palette | Monomi Pantone guide (Neon Navy + Cappuccino Foam + Snow White + Black Armor Wash) | ✓ |
| Display font | Inter Tight (Syne explicitly rejected as too "fashion magazine") | ✓ |
| Semantic colors | Soft/muted (mint/amber/coral) — not standard saturated dashboard intensity | ✓ |
| User-facing toggle | Yes, `localStorage`-based, with "Back to classic" escape hatch | ✓ |

## Total effort estimate

**~45-60 working days (9-12 weeks focused, 3-4 months part-time).** 78 pages to migrate, foundation work in Wave 0 is critical for all subsequent waves to be fast.

---

## Section 1 — Design Tokens

### Color system (CSS variables)

```css
/* Brand */
--brand-navy:        #131936;   /* Neon Navy */
--brand-black:       #030303;   /* Black Armor Wash */
--brand-cream:       #F6F3E8;   /* Cappucino Foam */
--brand-white:       #FFFFFF;

/* Surfaces (dark-only, layered) */
--bg-base:           #030303;
--bg-elevated:       rgba(19, 25, 54, 0.55);
--bg-overlay:        rgba(19, 25, 54, 0.78);
--bg-glass:          rgba(255, 255, 255, 0.025);
--bg-glass-strong:   rgba(255, 255, 255, 0.045);

/* Text */
--text-primary:      #F6F3E8;
--text-secondary:    rgba(246, 243, 232, 0.65);
--text-tertiary:     rgba(246, 243, 232, 0.4);
--text-disabled:     rgba(246, 243, 232, 0.25);

/* Borders */
--border-subtle:     rgba(246, 243, 232, 0.06);
--border-default:    rgba(246, 243, 232, 0.12);
--border-strong:     rgba(246, 243, 232, 0.22);

/* Semantic — restrained / luxe */
--success: #6EE7B7;   /* mint */
--warning: #FCD34D;   /* warm amber */
--danger:  #FCA5A5;   /* coral */
--info:    #93C5FD;   /* soft sky */

/* Atmosphere (replaces public-gallery cyan/violet/green orbs with on-brand washes) */
--atmos-navy-glow:   radial-gradient(circle, rgba(19,25,54,0.55), transparent 65%);
--atmos-cream-glow:  radial-gradient(circle, rgba(246,243,232,0.08), transparent 65%);
--atmos-deep-glow:   radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%);
```

### Typography

```css
--font-display:  'Inter Tight', system-ui, sans-serif;   /* headings 600-800 */
--font-body:     'DM Sans', 'Inter', system-ui, sans-serif;   /* body 300-500 */
--font-mono:     'JetBrains Mono', 'Menlo', monospace;        /* numbers, IDs */

--text-xs: 0.75rem;   --text-sm: 0.875rem;   --text-base: 1rem;
--text-lg: 1.125rem;  --text-xl: 1.5rem;     --text-2xl: 2rem;
--text-3xl: 2.5rem;   --text-4xl: 3.5rem;
```

### Spacing, radii, blur, shadows

```css
/* 4px grid */
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
--space-12: 48px; --space-16: 64px; --space-24: 96px;

/* Radii */
--radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-xl: 24px;
--radius-full: 9999px;

/* Glass blur (matches public gallery defaults) */
--blur-light:   blur(12px) saturate(140%);
--blur-default: blur(24px) saturate(180%);
--blur-strong:  blur(36px) saturate(200%);

/* Shadows — soft, atmospheric */
--shadow-glow:     0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4);
--shadow-elevated: 0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 48px rgba(0,0,0,0.5);
--shadow-modal:    0 1px 0 rgba(255,255,255,0.08) inset, 0 32px 96px rgba(0,0,0,0.6);
```

### Files

- `frontend/src/styles/tokens.css` — CSS custom properties (source of truth)
- `frontend/src/styles/tokens.ts` — TS exports for runtime access
- `frontend/tailwind.config.ts` — extend with token mappings
- `frontend/src/styles/fonts.css` — Google Fonts (Inter Tight + DM Sans + JetBrains Mono)

---

## Section 2 — Component Primitives

### Layer 1: shadcn/ui (via `npx shadcn@latest add`)

Customized once to use our tokens. Lives in `frontend/src/components/ui/`.

`Button`, `Card`, `Dialog`, `Sheet`, `Form` + `Input` + `Label`, `Select`, `Tabs`, `DropdownMenu`, `Tooltip`, `Popover`, `Avatar`, `Badge`, `Checkbox`, `RadioGroup`, `Switch`, `Skeleton`, `Calendar`, `Toaster` (Sonner), `Progress`, `Separator`, `Command` (future).

### Layer 2: Custom Monomi primitives

Live in `frontend/src/components/monomi/`. The actual design language.

| Component | Purpose |
|---|---|
| `<AppShell>` | Layout root (sidebar + topbar + content), wires auth + i18n |
| `<Sidebar>` | Navigation, brand mark, user chip |
| `<Topbar>` | Breadcrumbs, search, notifications, avatar |
| `<PageHeader>` | Page title + breadcrumbs + actions, with aurora glow backdrop |
| `<PageContainer>` | Max-width content wrapper |
| `<GlassPanel>` | The glass card primitive (`bg-glass`, blur, border-subtle, optional gradient) |
| `<StatCard>` | Dashboard hero stats (number + label + delta + sparkline) |
| `<DataTable>` | TanStack-Table wrapper (sort/filter/columns/pagination/selection/density) |
| `<FilterBar>` | Already exists; restyle for new tokens |
| `<EmptyState>` | Illustration + title + description + CTA |
| `<AuroraBackground>` | Animated soft navy/cream glow orbs (reskin of public-gallery orbs) |
| `<MoneyDisplay>` | IDR formatting with separators, optional color-by-sign |
| `<DateDisplay>` | Bahasa date + relative time |
| `<UserChip>` | Avatar + name + role + hover popover |

### Layer 3: System replacements

| Old (AntD) | New |
|---|---|
| `Form` validation | `react-hook-form` + `zod` |
| `Table` complex features | `@tanstack/react-table` v8 |
| `DatePicker` Indonesian locale | `react-day-picker` + `date-fns/locale/id` (wrapped in `<MonomiDatePicker>`) |
| `notification`, `message` | `sonner` |
| `Layout.Sider`, `Menu` | Custom `<Sidebar>` with Radix `Collapsible` |
| `ConfigProvider` theme | CSS variables + Tailwind (no provider needed) |

### Kept as-is

- `recharts` (wrap with `<MonomiChart>` for color tokens)
- `react-big-calendar` if used (restyle only)
- Existing rich text editor
- Existing media review components (lightbox, video review modal — already redesigned)

### File layout

```
frontend/src/
├── components/
│   ├── ui/             ← shadcn primitives (generated + customized)
│   ├── monomi/         ← custom Monomi primitives (the design language)
│   └── [feature]/      ← feature components (rebuilt per page)
├── styles/
│   ├── tokens.css
│   ├── tokens.ts
│   ├── fonts.css
│   └── globals.css
├── lib/
│   ├── cn.ts           ← Tailwind class merging
│   └── format.ts       ← money/date helpers
└── pages/
    └── v2/             ← new redesigned pages
```

---

## Section 3 — Page-Level Patterns

### App Shell

Sidebar 240px (collapsed 64px), navy `--bg-elevated` background. Topbar 56px glass strip. Content area on `--bg-base` (black) with `PageContainer` max-w-1440px. AuroraBackground at z-index -1 across entire viewport.

### Four canonical page types

**1. List page** — `PageHeader` + `FilterBar` + `DataTable` in `GlassPanel`. Pagination at bottom. (Invoices, Quotations, Clients, Projects, Expenses, Assets, Vendors, Decks, etc.)

**2. Detail page** — sticky `PageHeader` with status badge + actions, tab strip below, content in `GlassPanel` sections (2-col on desktop), optional right sidebar with quick facts + actions. (InvoiceDetail, ClientDetail, ProjectDetail, MediaProjectDetail, etc.)

**3. Form page** — `PageHeader` + sticky `ProgressIndicator` (for multi-step) + stacked `GlassPanel` sections (one per logical group) + sticky bottom action bar. (InvoiceCreate, ExpenseCreate, ClientCreate, etc.)

**4. Dashboard page** — Hero row (4 `StatCard`s) + chart row (2-col, recharts in glass panels) + activity feed sidebar. (DashboardPage only.)

### Modal + Drawer patterns

- `Dialog` (centered) — max-w-md (confirm), max-w-lg (form), max-w-3xl (content/preview). Backdrop `rgba(3,3,3,0.7)` + blur. Glass-strong panel.
- `Sheet` (slide-in) — 480px wide, right side default. For detail side-panels, inline editing, bulk operations.
- Sonner toasts — bottom-right, 4s auto-dismiss, glass background, semantic icon.

### Universal states

- **Loading**: `Skeleton` matched to content shape (NOT generic spinners). Subtle cream shimmer at 5% opacity.
- **Empty**: `<EmptyState>` with line-art illustration + title + description + CTA.
- **Error**: full-page → navy gradient bg + large error code + friendly description + back-to-dashboard CTA. Inline → coral text + small icon.

### Mobile (<768px)

- Sidebar → hamburger drawer (`Sheet` slide-in from left)
- Topbar → brand + hamburger + avatar (no breadcrumbs)
- Tables → card-list view (each row as stacked card)
- Forms → single column

---

## Section 4 — Migration Mechanics

### Router-prefix strategy

New routes parallel old:
- `/` (DashboardPage classic) and `/v2` (v2/DashboardPage)
- `/invoices` (classic) and `/v2/invoices` (v2)
- All redesigned pages live under `pages/v2/*` as NEW files

Original pages stay untouched. No in-place edits = no risk to working classic UI.

### User-facing toggle

`localStorage` flag `monomi.ui=v2`. Topbar shows "✨ Try the new design" pill button. Click → flips flag, reloads. v2 nav shows "↩ Back to classic" link.

Per-page redirect: when v2 mode is on and user navigates to `/v2/foo` for a page not yet migrated, redirect to `/foo` (classic). Smooth degradation.

### Graduation per page

A v2 page graduates when:
1. Visual review approved
2. Full functional parity with old page
3. Used in real workflow by 2+ people without complaints
4. Cleanup PR: `pages/Old.tsx` deleted, `pages/v2/X.tsx` → `pages/X.tsx`, `/v2/` removed from route

### Shared concerns (UNCHANGED)

- `react-router`, `react-query`, service classes, auth, `i18next`, Zustand stores, axios.
- The rewrite is **presentation-only**. New pages call the same services with the same args.

### CI gate

ESLint rule disallowing `import ... from 'antd'` in `pages/v2/**`, `components/monomi/**`, `components/ui/**`. Prevents backsliding.

### Cleanup checkpoints

- Every 5 pages: `npm ls antd` to confirm decreasing usage.
- LAST page migrated: remove `antd` from `package.json`, delete `src/theme/`, toggle code, `/v2/` prefix, classic page files.

### Rollback

Any v2 page break → user clears `localStorage` OR clicks "Back to classic". Classic page still live at un-prefixed URL. Zero data risk.

---

## Section 5 — Page Migration Order

12 waves. Each wave ends deployable + stable. Can pause between waves.

| Wave | Scope | Pages | Effort |
|---|---|---|---|
| 0 | Foundation: tokens, fonts, shadcn, Monomi primitives, AppShell, DataTable, v2 routing, StyleGuide page | 0 | 3-5 d |
| 1 | First impressions | Login, Dashboard | 2-3 d |
| 2 | Sales daily drivers | Invoices ×4, Quotations ×4, Clients ×4 | 6-8 d |
| 3 | Projects | Projects ×4 + 2 calendar variants | 3-4 d |
| 4 | Expenses + Vendors | Expenses ×5, Vendors ×4 | 4-5 d |
| 5 | Accounting (densest) | ~20 pages (CoA, Journals, GL, statements, AR/AP, Cash, Depreciation, ECL) | 8-12 d |
| 6 | Assets | 4 pages | 2-3 d |
| 7 | Media | MediaProjectDetail (54KB), MediaCollab, Collections, Downloaders | 3-4 d |
| 8 | Production | CallSheets ×2, ShotLists ×2 | 3-4 d |
| 9 | Content | ContentCalendar (60KB), Decks, SocialMediaReports, Calendar | 4-5 d |
| 10 | Reports | Reports ×3, MilestoneAnalytics | 3 d |
| 11 | Settings + Admin | Settings, Users ×3 | 3-4 d |
| 12 | Cleanup | (none) | 1-2 d |

**78 pages total. Effort: 45-60 working days.**

### Out of scope

Public-gallery already redesigned (commit 3981388) — `PublicProjectViewPage`, `GuestProjectViewPage`, `GuestAcceptInvitePage`. Will ensure visual coherence with new admin design (same fonts, same color spirit) but not rebuild.

---

## Section 6 — Risks + Mitigations

| Risk | Mitigation |
|---|---|
| Indonesian locale DatePicker | Build `<MonomiDatePicker>` wrapper with `date-fns/locale/id` in Wave 0; test parity |
| Complex editable tables | Spike `GeneralLedgerPage` early in Wave 0 as TanStack Table proof-of-concept. Fallback: keep AntD `Table` for 1-2 pages, migrate last |
| Complex multi-step forms (InvoiceCreate) | Start with simpler create-forms in Wave 2-4 to build RHF expertise. Allocate explicit time for InvoiceCreate. Reuse Zod schemas |
| PDF generation | Verify in Wave 0 whether PDFs render via Puppeteer (server-side, safe) or browser. If browser, ensure print stylesheet strips glass effects |
| Bundle size during transition | Vite code-splits per route by default. Verify with `vite build --report` after Wave 2 |
| User confusion in half-migrated state | Per-user toggle + `/v2/X` → `/X` redirect for unmigrated pages |
| Accessibility regression | shadcn = Radix = accessibility-first by default. Add `eslint-plugin-jsx-a11y` |
| React 19 library compat | Verify each new lib (`@tanstack/react-table`, `react-hook-form`, `react-day-picker`) supports React 19 in Wave 0 |
| Recharts theming | Build `<MonomiChart>` wrapper using design tokens in Wave 1 |
| i18n strings | Reuse existing `t()` keys. New strings added to both `id.json` and `en.json` simultaneously |
| Tailwind v4 quirks | Use `shadcn@latest init` (detects v4 automatically). v4-compatible templates exist |
| Print styles for invoices | Determine PDF rendering source in Wave 0. Add `@media print` overrides if frontend-rendered |

### Accepted risks (not mitigated)

- User dislikes aesthetic after seeing it → StyleGuidePage in Wave 0 = veto checkpoint BEFORE any page work
- Performance of backdrop-filter → GPU-accelerated, profile only if reported
- Old browser support → admin app, modern browsers only
- SEO → admin behind auth, irrelevant

---

## Next step

Hand off to `writing-plans` skill to produce a granular implementation plan starting with **Wave 0 (Foundation)** as the immediate executable scope. Later waves get planned as we reach them.
