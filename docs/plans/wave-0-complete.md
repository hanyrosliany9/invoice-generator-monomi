# Wave 0 — COMPLETE

**Date:** 2026-05-25  
**Status:** ✓ User visually approved StyleGuidePage. Ready for Wave 1.

## What shipped

### Investigation (Phase A)
- React 19 library compatibility audit — all libs OK
- PDF rendering source — Puppeteer server-side, fully decoupled from frontend (zero risk)
- Current AntD usage scope — 296 files import AntD, 52 distinct components in use

### Foundation (Phase B)
- Upgraded to Tailwind v4 + `@tailwindcss/vite` plugin
- Initialized shadcn/ui (New York style)
- Added Inter Tight + DM Sans + JetBrains Mono via Google Fonts
- Design tokens: `src/styles/tokens.css` + `tokens.ts` + wired into Tailwind `@theme`
- Installed 21 shadcn primitives in `src/components/ui/` (lowercase: button, card, dialog, etc.)
- Installed TanStack Table v8, react-hook-form, zod, react-day-picker, date-fns, lucide-react
- ESLint: blocks AntD imports in `src/pages/v2/**`, `src/components/monomi/**`, `src/components/ui/**`; added jsx-a11y plugin

### Spike (Phase F)
- Built `DataTable` primitive (TanStack Table wrapper)
- 500-row GeneralLedger spike — VERDICT: TanStack handles complex tables; proceed

### Monomi primitives (Phase C — 10 components)
- `GlassPanel` — the glass card primitive (backdrop blur, subtle border)
- `AuroraBackground` — animated navy + cream + cream-soft orbs
- `PageContainer` + `PageHeader` — page layout primitives
- `AppShell` + `Sidebar` + `Topbar` — main app chrome
- `MoneyDisplay` + `DateDisplay` — Indonesian formatters (tests written; runtime issue with canvas/jsdom — components work, only test runner affected)
- `EmptyState`, `UserChip`, `StatCard`
- `MonomiDatePicker` — Indonesian locale, Monday week start
- `MonomiChart` — recharts wrapper with brand colors

### v2 routing (Phase D)
- `useUiVersion` hook — localStorage-backed toggle
- `V2RouteGuard` — auto-redirects unmigrated /v2/* to classic
- `UiVersionToggle` pill in topbar (SUPER_ADMIN only initially)

### StyleGuidePage (Phase E)
- `pages/v2/StyleGuidePage.tsx` — visual veto checkpoint showcasing every primitive
- ✓ User visually approved

### Test Infrastructure (Phase G cleanup)
- Switched from `jsdom` to `happy-dom` for test environment
- Resolves canvas/native binding failures in local environment
- Components compile and render fine; test runner now works cleanly

## Known issues / deferred

- **Lint baseline**: 14k+ classic-code lint errors pre-exist. Wave 0 code is clean. We'll fix classic-code lint as we migrate pages away from AntD.

## What did NOT ship (intentionally)

- Any redesigned production page (Wave 1+ does that)
- Removal of AntD dependency (waits until ALL pages migrated)
- Light mode (killed by design decision)

## Next

Wave 1 starts in a separate session: redesign Login + Dashboard pages using the foundation built here.

See `docs/plans/2026-05-24-ui-ux-rework-design.md` §5 for full wave roadmap.

## Wave 0 Commits

Total: 25 "ui-rework" commits from start to completion.

```
9e390b5 chore(test): switch from jsdom to happy-dom for test environment
edafc52 feat(ui-rework): StyleGuidePage — veto checkpoint showcasing all primitives
ae42988 feat(ui-rework): UiVersionToggle pill in topbar (SUPER_ADMIN only initially)
c7ebc7c feat(ui-rework): v2 route prefix + per-page redirect guard
b261fa9 feat(ui-rework): useUiVersion hook (localStorage toggle)
fc70641 feat(ui-rework): MonomiChart wrapper around recharts (brand palette)
83dff35 feat(ui-rework): MonomiDatePicker — Indonesian locale, Mon week start
cccd80e feat(ui-rework): StatCard primitive (Monomi dashboard hero stats)
ad4cd1c feat(ui-rework): UserChip primitive
dad061a feat(ui-rework): EmptyState primitive
df3bdb1 feat(ui-rework): MoneyDisplay + DateDisplay formatters (with tests)
b44d886 feat(ui-rework): AppShell + Sidebar + Topbar primitives
2e95991 feat(ui-rework): PageContainer + PageHeader primitives
e86b96c feat(ui-rework): AuroraBackground primitive (animated navy/cream orbs)
3743c6b feat(ui-rework): GlassPanel primitive
8c47679 spike(ui-rework): DataTable handles GL 500-row case (VERDICT: proceed)
b9a28bd feat(ui-rework): DataTable primitive (TanStack Table wrapper)
db2f98b feat(ui-rework): ESLint rules — block antd in v2 dirs + jsx-a11y plugin
084169e feat(ui-rework): install TanStack Table, react-hook-form, zod, react-day-picker, lucide-react
2b12db6 feat(ui-rework): install shadcn/ui primitives (button, card, dialog, sheet, form, table, etc.)
2243b7b feat(ui-rework): expose tokens as Tailwind v4 utilities
8f0a52c feat(ui-rework): add Monomi design tokens (CSS + TS)
686dd6d feat(ui-rework): add Inter Tight + DM Sans + JetBrains Mono
02a406d build(ui-rework): initialize shadcn/ui (New York style)
7b9f244 build(ui-rework): upgrade to Tailwind v4 with Vite plugin
62005dd docs(ui-rework): wave 0 AntD usage audit
```
