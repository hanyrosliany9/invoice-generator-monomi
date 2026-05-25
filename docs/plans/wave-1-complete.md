# Wave 1 — COMPLETE

**Date:** 2026-05-25
**Status:** ✓ Code shipped + typecheck clean + build green. Pending user visual review.

## What shipped

Two redesigned pages and the routing infrastructure to reach them, all gated behind the v2 UI toggle (no impact on classic UI).

### Pages

- **`pages/v2/auth/LoginPage.tsx`** (146 LOC)
  - Self-contained full-screen layout with own `AuroraBackground`
  - Glass card form built with `react-hook-form` + `zod` schema validation
  - Inputs use shadcn `<Input>`, label uses `<Label>`, submit `<Button>`, surface `<GlassPanel>`
  - Bahasa Indonesia copy + error messages
  - Default export so React.lazy contract is honored

- **`pages/v2/DashboardPage.tsx`** (359 LOC)
  - Four `StatCard`s at the top (revenue MTD, outstanding AR, paid invoices, active quotations)
  - `MonomiChart` line chart — monthly revenue, recharts tooltip with IDR formatting
  - Two `DataTable`s — recent quotations + recent invoices, locale-aware columns
  - Uses existing `useDashboard` hook unchanged (no backend changes)

### Routing wiring

- `App.tsx`: lazy-imports `V2LoginPage` and `V2DashboardPage`
- `/v2/login` declared **outside** the protected `isAuthenticated` block, mirroring the classic `/login` pattern — anonymous users can reach it
- `/v2` (dashboard) inside the protected block
- `V2_MIGRATED_PATHS` in `V2RouteGuard.tsx` updated so the guard does NOT redirect these paths back to classic

## Commits (in order)

- `665f925` — feat(ui-rework): v2 LoginPage (dark glass, react-hook-form, zod)
- `1c6769b` — feat(ui-rework): v2 DashboardPage (stat cards, chart, recent quotations/invoices)
- `c1c1ec8` — feat(ui-rework): wire v2 Login + Dashboard routes (Wave 1 Task 4)
- `361a8f7` — fix(ui-rework): move /v2/login outside protected block (anonymous-only)
- `7996eb9` — fix(ui-rework): TypeScript errors in v2 LoginPage + DashboardPage

## Verification

- `npx tsc --noEmit` — no errors
- `npm run build` — builds clean in ~12s

## What's NOT done (deferred)

- User visual review of `/v2/login` and `/v2` in browser (dev server was down when verification ran; user can start hybrid infra + frontend to check)
- Wave 2 (Sales pages: Invoices, Quotations, Clients) — not started

## Next wave hooks

When starting Wave 2, the pattern is:
1. Pick a page (e.g., InvoicesPage)
2. Create `pages/v2/invoices/InvoicesPage.tsx` using only `ui/` and `monomi/` primitives
3. Wire route in `App.tsx`
4. Add path to `V2_MIGRATED_PATHS`
5. ESLint will fail the build if AntD sneaks in
