# Public Session landing page (link.monomiagency.com)

The Meta ads landing page for **Public Session Chap. 1**. It is a static page served by the
Cloudflare Worker `monomi-links` (Monomi Cloudflare account). It is not part of the VPS
deploy: pushing to master does not publish it.

```
site/index.html     the page (HTML, CSS and JS in one file)
site/assets/        logo, favicon, photos (WebP)
wrangler.toml       Worker config (assets-only)
deploy.sh           preview + publish helper
```

## Tracking

The page has **no Meta Pixel**. The last script tag loads the CRM snippet
`https://admin.monomiagency.com/api/v1/public/track/monomi-track.js`, which sends
PageView, ViewContent, EngagedVisit and Lead to the CRM; the CRM forwards them to the
Meta Conversions API server-side and adds a `Kode: XXXXXX` line to the WhatsApp message
so staff can link the chat to the ad click (Ctrl/⌘+Shift+L in the CRM).
A verified tap also creates the CRM lead straight away ("Waiting for WhatsApp",
with the Instagram handle, brand and category from the sheet); pasting the chat
later fills its phone in. See `docs/landing-page-tracking.md`.

Rules when editing:

- Every WhatsApp button keeps `data-cta="whatsapp" data-monomi-skip`. The page opens the
  Instagram sheet and calls `MonomiTrack.openWhatsApp()` itself; `data-monomi-skip` stops the
  snippet's generic link hook from counting the same tap twice.
- Do not add the Instagram line to the WhatsApp text when `MonomiTrack` is present; the
  snippet adds it (see `buildText(false)`).
- Keep passing `meta: { instagram, brandName, category }` to `openWhatsApp`: the CRM names
  the auto-created lead after the brand (else `@handle`) and dedups on the handle. The
  server clamps brand to 80 and category to 40 characters and shows them as plain text.
- Keep facts (price, dates, terms, FAQ answers) in sync with the SOW.
- The page origin must be listed in `PUBLIC_TRACK_ALLOWED_ORIGINS` on the VPS, or the CRM
  rejects its events with 403.

## Deploy

Needs `npx wrangler whoami` to show **Monomiagency@gmail.com's Account**.

```bash
cd landing/public-session
./deploy.sh preview     # uploads a version, prints a *.workers.dev preview URL (tracking is
                        # rejected there: that origin is not allowed, which is expected)
./deploy.sh publish     # makes the latest uploaded version live on link.monomiagency.com
npx wrangler rollback   # back to the previous version
```

Check the live page after publishing: buttons must open the Instagram sheet (not WhatsApp
directly) and the browser console must show no errors.
