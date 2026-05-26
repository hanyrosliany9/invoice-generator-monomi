# v2 Mobile Upgrade — Comprehensive Plan

**Date:** 2026-05-26
**Status:** Plan only — no code changes yet
**Scope:** Make all 88 v2 pages first-class on mobile (≥375px) and tablet (≥768px)

---

## 1. Current state (audit)

| Layer | Mobile-ready? | Evidence |
|---|---|---|
| `AppShell` | ❌ | `flex bg-bg-base` row layout, sidebar always visible |
| `Sidebar` | ❌ | Hard-coded `w-60` (240px), no viewport hook, `collapsed` prop unused |
| `Topbar` | ⚠️ | Only `px-5 sm:px-8` padding adapts; no mobile menu trigger |
| `PageContainer` | ✓ | `px-4 sm:px-6 lg:px-8`, capped at 1440px |
| `PageHeader` | ✓ | Title scales, actions wrap |
| `DataTable` | ❌ | `<div className="...overflow-hidden">` clips wide tables — no horizontal scroll |
| `Dialog` (shadcn) | ⚠️ | Default centered modal; not full-screen on phone |
| `GlassPanel` | ✓ | Surface-agnostic, no width assumptions |
| `StatCard` grids | ⚠️ | Each page hand-rolls `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — inconsistent |
| Forms (RHF + zod) | ⚠️ | Side-by-side label layouts in some forms collapse poorly |
| Filter/search bars | ⚠️ | Inline `flex` rows don't wrap; chip strips have no overflow strategy |

**The blocker:** the foundation (AppShell + Sidebar + Topbar) has no mobile concept. Fixing per-page responsive tweaks without first fixing the shell would leave the shell still broken at 375px. Foundation → primitives → pages, in that order.

---

## 2. Goals

1. **All 88 v2 pages usable on a 375px phone** (iPhone SE width as floor).
2. **Tablet (768px)** gets a comfortable middle layout, not phone-stretched-wide.
3. **Desktop unchanged** — no regression to existing 1024px+ experience.
4. **No new dependencies** — Sheet/Dialog/Tabs already exist in `ui/`.
5. **One pattern, applied uniformly** — pages shouldn't each invent their own collapse rules.
6. **Brand discipline maintained** — pure black canvas, navy accents only, cream text. Mobile is not a styling rewrite; it's a layout rewrite.

---

## 3. Non-goals

- No app shell rewrite for `pages/v2/auth/LoginPage`, `pages/v2/guest/*` — those are already full-screen `AuroraBackground` layouts with no sidebar to collapse.
- No PWA installability, splash screen, manifest work.
- No native gestures (swipe-to-back, pull-to-refresh).
- No bottom-tab nav variant (sidebar-drawer pattern is enough).
- No mobile-only feature divergence — same features, adapted layout.

---

## 4. Wave plan

### Wave M0 — Foundation (BLOCKING, must land first)

**Why first:** Until the AppShell knows what a mobile viewport is, nothing downstream matters.

**Files to change:**
- `src/components/monomi/AppShell.tsx`
- `src/components/monomi/Sidebar.tsx`
- `src/components/monomi/Topbar.tsx`
- `src/hooks/useIsMobile.ts` (new — viewport detection hook, MQL-based)

**Approach:**

1. **`useIsMobile` hook** — matches `(max-width: 767px)` via `window.matchMedia`. SSR-safe. Returns `boolean`. (Tailwind `md:` breakpoint is 768px, so `<768` is "mobile".)

2. **`AppShell`** — branches by viewport:
   - **Desktop (md+):** current `flex` layout, sidebar always rendered.
   - **Mobile (<md):** sidebar moves into a `<Sheet>` (shadcn drawer from the left), main content is full-width, sidebar is hidden by default and toggled via a hamburger button in the topbar.

3. **`Sidebar`** — gains an internal `variant: 'static' | 'drawer'`. Static = current desktop sidebar. Drawer = renders inside `SheetContent` with the same nav items + brand block. Sheet auto-closes on `NavLink` click (use `<SheetClose asChild>`).

4. **`Topbar`** — accepts an optional `onMenuClick` callback. When the AppShell is in mobile mode, it injects a leading `<Button variant="ghost" size="icon"><Menu /></Button>` that opens the sheet. Hidden on desktop via `md:hidden`.

5. **`PageHeader`** — title currently has `text-3xl sm:text-[34px]`, which is fine but the `flex-wrap` on the action row is too eager — actions sometimes break before the description fits. Change to: actions stack BELOW the title on mobile (`flex-col md:flex-row`), with right-alignment on desktop preserved.

**Acceptance:**
- On a 375px viewport, `/v2` dashboard shows: hamburger top-left, full-width content, no horizontal scroll.
- Tapping hamburger slides in a left drawer with all sidebar items.
- Tapping a nav item navigates and closes the drawer.
- On 1024px+, behavior is identical to today (no drawer, sidebar always visible).
- Type-check + build clean.

**LOC estimate:** ~80–120 net (mostly AppShell + Sidebar refactor, small Topbar addition, tiny hook file).

**Time estimate:** 1 focused session.

---

### Wave M1 — DataTable horizontal scroll + density

**Why second:** Every list page uses DataTable. If tables clip on mobile, list pages are unusable regardless of shell.

**Files to change:**
- `src/components/monomi/DataTable.tsx`

**Approach:**

1. Change the outer wrapper from `overflow-hidden` to `overflow-x-auto overflow-y-hidden`. Add `-webkit-overflow-scrolling: touch` via the `[scrollbar-thin]` utility (already in the project's Tailwind plugins).
2. Add `min-w-full` to the `<table>` so it doesn't collapse below container width.
3. Apply a subtle right-side gradient fade (`absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg-base/80 to-transparent pointer-events-none`) ONLY when scrollable, to hint at horizontal scrollability.
4. Switch DataTable's default `density` to `'compact'` on mobile (use the new `useIsMobile` hook).
5. Pagination row — already `flex` with text; add `flex-wrap gap-3` so it doesn't overflow.

**Acceptance:**
- A 10-column accounting table on 375px viewport scrolls horizontally smoothly.
- Header row stays aligned with body cells while scrolling.
- Pagination controls don't overflow.

**LOC estimate:** ~30 net.

---

### Wave M2 — Dialog / Sheet mobile behavior + form layout

**Why third:** Create/Edit dialogs are pervasive in CRUD pages. They need to be touch-friendly.

**Files to change:**
- `src/components/ui/dialog.tsx` (shadcn — adjust DialogContent class)
- `src/components/ui/sheet.tsx` (already exists, may need width audit)
- `src/components/monomi/FormField.tsx` if one exists, or document the inline pattern

**Approach:**

1. **Dialog** — on mobile, switch from centered modal (`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`) to bottom sheet behavior (`fixed bottom-0 left-0 right-0 rounded-b-none rounded-t-xl max-h-[90vh] overflow-y-auto`). Use `sm:` prefix to keep desktop centered.
2. **Form field grid** — wherever pages use `grid grid-cols-2 gap-4` for inputs (very common in QuotationForm, InvoiceForm, ExpenseForm), enforce `grid-cols-1 md:grid-cols-2`. Sweep via subagent.
3. **Sticky form footer** for long edit forms — on mobile, the Save/Cancel button row should `sticky bottom-0 bg-bg-base/95 backdrop-blur-md -mx-4 px-4 py-3 border-t border-border-subtle` so save is always reachable without scrolling 800px.

**Acceptance:**
- New Invoice dialog on 375px is a bottom-sheet that takes 90% of viewport height, scrolls internally.
- Two-column form fields stack to single column.
- Save button is always visible on a long form (Expense create with 12 fields).

**LOC estimate:** ~40 in primitives + ~10 per form page touched (~7 forms × 10 = 70). Total ~110.

---

### Wave M3 — Per-page sweep (parallel subagent waves, like v1→v2)

**Why last:** Foundation + primitives now correct. Sweep pages for the remaining mobile tweaks. This wave does NOT touch features or styling — purely responsive class additions.

**Pattern per page:**
- StatCard grids → normalize to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (currently inconsistent: some pages use `grid-cols-2 md:grid-cols-4`, some `grid-cols-4` always, some skip the grid entirely).
- Filter/search bar rows → `flex flex-col sm:flex-row gap-3 sm:gap-2`.
- Filter chip strips → `flex flex-wrap gap-2` (most already have this; verify).
- Page-level grids (e.g. project detail with side-rail) → `grid-cols-1 lg:grid-cols-[1fr_320px]` instead of static two-column.
- Action buttons in headers → use icon-only on mobile (`<Button size="icon" className="sm:hidden">`) + label on desktop (`<Button className="hidden sm:flex">`) for headers with 3+ actions.
- Calendar grids → already use Tailwind grid; verify on 375px (might need horizontal scroll wrapper for week/day views).
- Editor pages (Decks, ShotLists, CallSheets) — these are the trickiest; large canvases. Acceptance is "usable for review on mobile, expected to edit on tablet+". Add a banner: "Editing pengalaman terbaik di tablet/desktop."

**Page bucket breakdown (parallel waves):**

| Wave | Pages | Subagent |
|---|---:|---|
| M3.1 | Sales (Invoices, Quotations, Clients × list+detail+edit+create = 12) | Agent A |
| M3.2 | Projects, Expenses, Vendors, Users, Assets (~25) | Agent B |
| M3.3 | Accounting (20 pages) | Agent C |
| M3.4 | Reports, Calendars, Milestones, Settings, Dashboard (~12) | Agent D |
| M3.5 | Editor pages (Decks, ShotLists, CallSheets, Media — 8 pages) | Agent E (most complex, smaller bucket) |
| M3.6 | Downloaders, Guest pages (5) | Agent F |

**Acceptance per page:**
- 375px viewport: no horizontal scroll on the page itself (only inside DataTable).
- No content cut off; no overlapping elements.
- Touch targets ≥44px (verify CTA buttons).
- Page renders without console errors at all three breakpoints (375 / 768 / 1280).

**LOC estimate:** ~20–60 per page × 82 pages ≈ 2,500–5,000 LOC across all sub-waves. Mostly class-name edits, not structural.

---

### Wave M4 — Verification + commit

1. Manual smoke test at 375 / 414 (iPhone Plus) / 768 / 1024 / 1440 widths.
2. Test the golden flows:
   - Login → Dashboard → Invoices list → Invoice detail → Create invoice → save.
   - Mobile nav drawer open/close on 5 different pages.
   - DataTable horizontal scroll on Accounting/General-Ledger.
   - Bottom-sheet Dialog on New Expense.
3. Type-check + `npm run build`.
4. Commit per sub-wave (M0, M1, M2, then M3.x bundle, then M4). Push at the end.
5. Optionally deploy after smoke test passes.

**No automated mobile testing** in the plan (project doesn't have Playwright wired for v2 yet). Future work.

---

## 5. Risk register

| Risk | Mitigation |
|---|---|
| Drawer sheet conflicts with detail-panel Sheets already in use (Project/Content Calendar, Media) | Use a different `side` (`left` for nav, `right` for detail panels) and a dedicated Sheet instance per concern |
| `useIsMobile` causes hydration mismatch (SSR-style) | Project is Vite SPA, no SSR — safe; but the hook should still return `false` on first render before `useEffect`, then update |
| DataTable horizontal scroll fights the page's own scroll | Lock the table's `overflow-y: hidden` so only horizontal motion happens inside it; vertical stays on the page |
| Subagent class-name sweeps drift from the canonical responsive pattern | Pre-write a "responsive recipe" snippet in this doc, point subagents at it verbatim |
| Editor pages (Decks, ShotLists) become unusable on mobile | Accept it — show a "best viewed on tablet" banner; don't rewrite editors |
| Calendar month-grid breaks on 375px | Switch to a list-view on mobile (`block sm:hidden` for the list, `hidden sm:block` for the grid) |

---

## 6. Responsive recipe (canonical patterns to apply)

**StatCard row (3+ cards):**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-12">
```

**StatCard row (2 cards):**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
```

**Filter / search row:**
```tsx
<div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center mb-6">
  <Input className="sm:max-w-xs" />
  <Select className="sm:w-44" />
  <div className="flex flex-wrap gap-2">...chips...</div>
</div>
```

**Two-column page layout (content + rail):**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
```

**Form field row (2 fields):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

**Header actions (3+ buttons):**
```tsx
<div className="flex items-center gap-2">
  <Button className="hidden sm:inline-flex">...full label...</Button>
  <Button size="icon" className="sm:hidden"><Icon /></Button>
</div>
```

**Sticky form footer on mobile:**
```tsx
<div className="sticky bottom-0 md:static -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0 bg-bg-base/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-border-subtle flex justify-end gap-2">
  <Button variant="ghost">Batal</Button>
  <Button type="submit">Simpan</Button>
</div>
```

---

## 7. Effort summary

| Wave | Net LOC | Sessions | Risk |
|---|---:|---:|---|
| M0 Foundation | ~120 | 1 | Low |
| M1 DataTable | ~30 | 0.5 | Low |
| M2 Dialog + forms | ~110 | 1 | Medium (forms sweep) |
| M3.1–M3.6 page sweep | ~2,500–5,000 | 2–3 (parallel subagents) | Low (class-name edits) |
| M4 Verification + commit | ~0 | 1 | Low |
| **Total** | ~2,800–5,300 | **5–6 sessions** | |

---

## 8. Open questions for the user (before starting M0)

1. **Tablet sidebar:** at 768px (iPad portrait), do you want (a) sidebar drawer like phone, (b) compact icon-only sidebar like Linear, or (c) full sidebar like desktop? Recommendation: (b) `collapsed` mode auto-engaged at 768–1023px, full at 1024px+, drawer at <768px.
2. **Mobile menu position:** left drawer (matches sidebar position) vs bottom sheet? Recommendation: left drawer for familiarity.
3. **Editor pages "best viewed on tablet" banner:** acceptable to show, or do we need full mobile editing parity (much larger scope)? Recommendation: banner + lock to read-only on phone.
4. **Deploy after each wave** or **one deploy at the end?** Given Wave 8's 28-minute build cycle, batching makes sense. Recommendation: deploy after M2 (foundation+primitives complete, looks/works on mobile even if not every page is polished), then again after M3 finishes.
