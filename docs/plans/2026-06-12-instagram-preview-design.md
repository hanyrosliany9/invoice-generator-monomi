# Instagram-Style Content Preview — Design

Date: 2026-06-12
Status: Approved

## Goal

Give the existing Content Calendar an Instagram-faithful **visual preview** layer so
planned content can be seen as it would appear once posted. Visual-only — no Meta Graph
API, no real publishing. "Posted" means the user marks an item `PUBLISHED`.

Scope decisions (from brainstorming):
- **Visual preview only** — pure frontend on existing content-calendar data + 3 tiny
  additive backend fields.
- **All four surfaces**, behaving like the real app: profile grid (3-col), single
  post / swipeable carousel, drag-to-rearrange grid, Stories + Reels.
- **Single agency profile** — one Monomi Instagram profile showing all planned content
  (no per-client picker). Profile chrome stored in `CompanySettings`.

## Approach

Extend the existing `/calendar/content` page with a new **Instagram** view mode
(alongside Month · List). Reuses the existing service, queries, filters, and
create/edit form. IG-specific UI lives in its own `InstagramPreview/` component folder.

## Data model (additive only)

`ContentCalendarItem`:
- `format ContentFormat @default(FEED)` — new enum `FEED | REEL | STORY`. Drives the
  Posts/Reels tabs and Stories row instead of guessing from media.
- `gridOrder Int?` — manual drag-to-rearrange position. Null → fall back to
  scheduled-date order (newest first, top-left).

`CompanySettings` (singleton `id="default"`):
- `instagramHandle String?`, `instagramAvatarUrl String?`, `instagramBio String?`.

Migration: `prisma migrate dev` is broken on this dev DB — hand-write idempotent SQL
(`ADD COLUMN IF NOT EXISTS`, `CREATE TYPE ... ContentFormat`), apply via `psql`, then
`prisma migrate resolve --applied`. All columns nullable/defaulted → existing rows safe.

## Backend service

- `findAll` already filters by platform; IG view passes `platforms: [INSTAGRAM]`.
- New `PATCH /content-calendar/reorder` taking `[{id, gridOrder}]`.
- `format` rides existing create/update DTOs.
- Default order: `gridOrder asc NULLS LAST, scheduledAt desc`.

## Frontend — views & components

New **Instagram** view mode on `/calendar/content`, rendered in a centered
phone-width column (~430px):

- **Profile header**: avatar, `@handle`, bio from `CompanySettings`. Real post count;
  followers/following are static placeholders styled like IG (clearly non-live).
- **Stories row**: gradient-ringed circles for `format=STORY` items, tappable.
- **Tabs**: Grid (▦) · Reels (▶).
  - Grid: 3-col square tiles of `FEED` items; IG-style corner icons (carousel/reel);
    hover shows scheduled-date + status chip (still a planner).
  - Reels: 3-col 9:16 tiles of `REEL` items.

## Interactions

- **Tile → post modal**: phone-framed post — header, media, swipeable carousel w/ dots,
  visual-only like/comment/share/save, caption with styled `@mentions`/`#hashtags`,
  "Scheduled for {date}", prev/next arrows.
- **Drag-to-rearrange** (dnd-kit): optimistic reorder, persist via `reorder` endpoint.
- **Story viewer**: fullscreen 9:16, top progress bars, tap to advance, auto-advance.
- **Reels tab**: own grid; modal opens in 9:16.
- Skeleton loading; friendly empty state.

## Error handling

- Only `platforms` ∋ INSTAGRAM items appear; no-media items get a gray placeholder tile.
- Reorder failure: revert optimistic order + toast.
- Broken/expired R2 URLs → placeholder; videos use `thumbnailUrl`.
- Reuses existing content-calendar guards — no new access surface.

## Testing

- Backend unit tests: reorder endpoint + ordering logic.
- E2E via agent-browser: grid renders, drag persists across reload, carousel swipes,
  story viewer advances.
- Test data uses `ZZ-` prefix, deleted + verified gone after.
