# Landing page tracking (visit -> WhatsApp chat -> CRM lead -> Meta events, server-side only)

Monomi runs Meta ads to a static landing page (`https://link.monomiagency.com`).
Every call to action opens WhatsApp (`wa.me/6285126203934` with a pre-filled
text), and the chats land on the WhatsApp Business app on a phone, so the ad
click and the chat are two unconnected things.

This feature connects them without waiting for the WhatsApp Cloud API / CTWA
Conversions API (which needs Meta business verification + app review), and
**without the Meta Pixel on the page**:

* **The landing page does not load `fbevents.js`.** One script tag
  (`monomi-track.js`) is the only tracker. It sends every event to our backend,
  and the backend sends it to the Conversions API (`action_source: "website"`)
  from the server. The snippet never calls `fbq`.
* A short code (`Kode: K7QM2X`) is written into the WhatsApp text so staff can
  link the chat to the visit when they paste it into the CRM quick-add
  (Ctrl/Cmd+Shift+L).
* When the lead reaches **Qualified** or **Won/Paid**, Monomi sends
  `QualifiedLead` / `Purchase` with the visit's identifiers plus hashed
  phone/name, so Meta can optimise for leads that really qualify or buy.

Only a Conversions API token generated in Events Manager is needed. No App
Review. The Click-to-WhatsApp route (`business_messaging`, `ctwa_clid`) is
untouched; a lead with a `ctwa_clid` always uses that route, never both.

## 1. Add the snippet to the landing page

One tag, right before `</body>` (no Meta Pixel code anywhere on the page):

```html
<script async src="https://admin.monomiagency.com/api/v1/public/track/monomi-track.js"></script>
```

CRM > Settings > "Landing page tracking" shows this exact line with a Copy
button. Optional data attributes: `data-endpoint` (default: the script's own
origin + `/api/v1/public/track/event`), `data-campaign` (fallback
`utm_campaign`), `data-whatsapp` (number for `openWhatsApp` when the page has no
`wa.me` link).

### What the snippet does

On load it:

* creates a per-visit `visitId` (uuid, `sessionStorage`);
* **generates `_fbp` itself** when none exists (nothing else sets it without the
  Pixel): `fb.1.<ms>.<10 random digits>`, a **host-only** first-party cookie (no
  `Domain` attribute, so it stays on `link.monomiagency.com` and is never sent to
  `admin.` or other subdomains), 90 days, `SameSite=Lax`, `Secure`; mirrored to
  `localStorage` and restored from there if the cookie disappears;
* turns `fbclid` into the `_fbc` cookie (`fb.1.<ms>.<fbclid>`, exact case, 90
  days, host-only, only when none exists) and keeps the `utm_*` parameters for
  the session;
* sends a `PageView` (`navigator.sendBeacon`, fallback `fetch` with `keepalive`;
  never blocks navigation, never throws).

Calls the page makes:

```js
MonomiTrack.track('ViewContent');   // e.g. portfolio link tapped / gallery scrolled into view
setTimeout(() => MonomiTrack.track('EngagedVisit'), 15000); // custom event after 15 s

// a custom qualifier sheet; call it from a real button click
MonomiTrack.openWhatsApp({
  text: 'Halo Monomi, saya mau tanya paket foto produk.',
  meta: { instagram: '@kopi.senja', brandName: 'Kopi Senja', category: 'F&B' },
  // phone: '6285126203934'   // else data-whatsapp or the first wa.me link
});
```

`track()` accepts only `ViewContent` and `EngagedVisit` (`PageView` is
automatic, `Lead` comes from the WhatsApp open). `openWhatsApp` normalises the
Instagram handle (`@Name`, `name` or an instagram.com URL -> `name`, letters,
digits, `.` and `_`, max 30), appends it as an `Instagram: @name` line plus the
`Kode: XXXXXX` line to the WhatsApp text, and sends the `Lead` event. Plain
**https** links to `wa.me`, `api.whatsapp.com`, `web.whatsapp.com` or
`whatsapp.com/send` get the code appended automatically (`http://` links are left
alone; add `data-monomi-skip` to opt a link out).

How it looks in WhatsApp:

```
Halo Monomi, saya mau tanya paket foto produk.
Instagram: @kopi.senja

Kode: K7QM2X
```

The parser also accepts `kode K7QM2X`, `Ref: K7QM2X`, `KODE=k7qm2x`. If a
customer deletes the code, staff can type it on the lead page (**Ad click >
Link ad click code**); otherwise the lead simply stays unlinked. A code links to
one lead only.

## 2. Server side

### Endpoints (public, no auth)

* `POST /api/v1/public/track/event` – `application/json` or `text/plain`
  (sendBeacon), max 4 KB. Body: `{ name, visitId, eventId, pageUrl, referrer,
  utm:{source,medium,campaign,content,term}, fbclid, fbc, fbp, ref?, meta? }`.
  `name` is whitelisted: `PageView`, `ViewContent`, `EngagedVisit`, `Lead`.
  `Lead` also needs `ref`; `meta` = `{instagram, brandName, category}` (Lead only).
  Optional fields that do not look right are dropped; `pageUrl` is stored (and
  sent to Meta) only when its origin is in `PUBLIC_TRACK_ALLOWED_ORIGINS`, else
  it is dropped and Meta gets `LANDING_PAGE_URL` as `event_source_url`; the user
  agent is cut at 512 characters. Answers `200 {ok:true}` for every valid body:
  stored, duplicate, dropped by the global cap, or a `ref`/`eventId` that clashes
  with another tap (the clash is logged without the input, and is not
  distinguishable from a fresh code, so codes cannot be probed). `400` generic
  for invalid input (never echoed), `413` above 4 KB (nginx refuses bodies over
  8 KB before the app), `403` for a browser origin that is not allowed, `429`
  above 120 requests/minute per network: per IPv4 address, per **IPv6 /64**
  (several events per visit, and mobile carriers share addresses).
  **Global cap:** at most `PUBLIC_TRACK_MAX_NEW_PER_MIN` (default 600) new
  `ad_clicks` rows per minute across all app instances (Redis counter); above it
  new visits/taps are acknowledged and dropped silently, existing visits still
  update.
* `GET /api/v1/public/track/monomi-track.js` – the snippet (ETag, 5 min cache).

CORS for these paths is its own allowlist (`PUBLIC_TRACK_ALLOWED_ORIGINS`),
registered before the app-wide CORS; no credentials. The client IP is `req.ip`
(Express trust-proxy 1: Cloudflare -> nginx `real_ip` -> app) plus the user
agent header. **Bots are dropped:** requests whose user agent is empty, headless
or a known crawler/tool are acknowledged but nothing is stored or sent.

### Data model and dedupe

`ad_clicks` is one row per visit (created by the visit's first event; later
events update it): `visitId`, `utm*`, `fbclid`, `fbc`, `fbp`, `clientIp`,
`userAgent`, `campaignCode` (the `utm_campaign` matched case-insensitively to a
CRM campaign code), `instagramHandle`, `brandName`, `category`, and once-per-visit
markers `pageViewAt` / `viewContentAt` / `engagedAt`. Only the **first**
`PageView`, `ViewContent` and `EngagedVisit` of a visit are sent to Meta. A
WhatsApp tap fills `ref` / `eventId` on the visit row (a second tap in the same
visit gets its own row); `leadId` (unique) is set when linked. The visit's first
row also carries `visitKey` (= `visitId`, unique), so concurrent first events of
a visit create one row; the tap's `ref` is assigned with a conditional update
(`ref IS NULL`), so two taps can never overwrite each other.
`meta_event_outbox.route` is `BUSINESS_MESSAGING` (CTWA, unchanged) or `WEBSITE`.

Retention (nightly, 03:20):

| data | kept |
|---|---|
| visit rows without a WhatsApp tap (`ref` null) | 48 hours |
| unlinked taps (`ref` set, no lead) | 30 days |
| click-time website `Lead` outbox rows (no CRM lead) | 7 days, or until their click is purged |
| `clientIp`, `userAgent`, `fbclid`, `fbc`, `fbp` (and `fbclid` in `pageUrl`) on linked clicks | `AD_CLICK_PII_RETENTION_DAYS` (default 90) days, then nulled |

Website stage events for a lead whose click is past that age go out with the
hashed lead data and `external_id` only.

### Events sent (`POST https://graph.facebook.com/v26.0/{META_PIXEL_ID}/events`)

All events: `action_source: "website"`, `event_source_url`, `event_id` (one per
event, for dedup safety), and `user_data` = `client_ip_address`,
`client_user_agent`, `fbc`, `fbp` (as-is, as Meta requires) and
`external_id` = SHA-256 of the `visitId`.

| event | how it is sent |
|---|---|
| `PageView`, `ViewContent`, `EngagedVisit` (custom) | high volume / low value: a small in-memory queue flushed every 10 s in batches of up to 1000 events per request; events older than 7 days are filtered out first; transient failures are retried with the same ids (3 attempts, then dropped); a restart can lose the last few seconds. Not queued while the sender is not READY. |
| `Lead` (WhatsApp tap) | durable outbox row, one event per request, at-most-once with backoff, same as the other CRM events; **forwarded only when verified** (below) |
| `QualifiedLead` (custom) | outbox, when the linked lead enters a stage mapped to it; `event_time` = the stage change |
| `Purchase` | outbox, Won stage / invoice paid; `value` + `currency: IDR` |
| LeadSubmitted stage | skipped (the `Lead` already went out at the tap) |

**Click-time Lead gating.** Every tap is stored and stays linkable in the CRM,
but its `Lead` is forwarded to Meta only if all of these hold; otherwise the
outbox row is `SKIPPED` with the reason in `lastError`:

| check | reason when it fails |
|---|---|
| a `PageView` of the same visit, from the same network (IPv4 address / IPv6 /64), at least 3 s before the tap | `SKIP_UNVERIFIED_VISIT` |
| the first forwarded `Lead` of the visit | `SKIP_DUPLICATE_VISIT_LEAD` |
| when the visit has a Meta click id (`fbclid` / `_fbc`): the first forwarded `Lead` for it in 24 h (organic visits without one are fine) | `SKIP_DUPLICATE_CLICK_ID` |
| at most 10 forwarded `Lead`s per network per hour (Redis) | `SKIP_IP_LEAD_CAP` |
| the Redis counters are reachable | `SKIP_LIMITER_UNAVAILABLE` |

When the sender becomes READY (at boot or on a change to READY), click-time
`Lead`s that waited in `PENDING_CONFIG` for more than 24 h are `SKIPPED`
(`SKIP_STALE_BEFORE_ENABLE`) instead of being sent late.

**Lanes.** The sender serves CRM stage events (`QualifiedLead`, `Purchase`)
before click-time `Lead`s and never sends more than one batch of 50 `Lead`s
before looking at the stage events again, so a `Lead` backlog cannot delay them.

**Graph denylist.** Visit events are checked against the shared Graph denylist
one by one when queued; an event that fails it is dropped, so it can never block
a batch. A `ForbiddenGraphEndpointError` is permanent everywhere (outbox row
`FAILED` at once, batch events dropped), never retried.

Stage events for a linked lead add SHA-256 hashes of `ph` (digits only, country
code, no `+`, no leading 0: `0812-3456-7890` -> `6281234567890`), `fn` / `ln`
(lowercase, punctuation removed; skipped when the name is a bare number),
`country` (`id`), and `external_id` = `[hash(visitId), hash(leadId)]`, so Meta
links the visit's events to the later CRM events. The browser events carry **no
personal data**; the Instagram handle, brand and category stay in Monomi and are
never sent to Meta. Events older than 7 days are marked SKIPPED with the reason
(Meta rejects them and a stale event would fail a whole request). The access
token goes in the `Authorization` header only, is never logged, and never reaches
the browser. The Graph call goes through the shared Graph denylist client.

Linking a visit to a lead that already moved through Qualified/Won re-routes its
earlier "no ctwa_clid" skipped events to the website route (still subject to the
7-day limit). Linking copies the Instagram handle onto the lead (shown on the
lead page as an `@handle` link, and in the quick-add chip); an
`Instagram: @handle` line in the pasted WhatsApp text is parsed too.

## 3. Environment variables (backend)

| variable | default | meaning |
|---|---|---|
| `META_PIXEL_ID` | unset | the dataset id = the existing Pixel `28492116573772457` (used server-side only) |
| `META_WEB_CAPI_TOKEN` | unset | Conversions API token generated in Events Manager |
| `META_WEB_CAPI_ENABLED` | `false` | `true` to send events |
| `META_WEB_CAPI_TEST_EVENT_CODE` | unset | Events Manager "Test events" code (remove after testing) |
| `PUBLIC_TRACK_ALLOWED_ORIGINS` | `https://link.monomiagency.com` | comma list; named https origins only (`*` is refused); `http://localhost:*` also accepted outside production |
| `LANDING_PAGE_URL` | `https://link.monomiagency.com` | base of the CRM "Copy ad link"; also the `event_source_url` sent when a page URL is not on an allowed origin |
| `PUBLIC_TRACK_MAX_NEW_PER_MIN` | `600` | global cap on new visit/tap rows per minute (all instances, Redis); above it events are acknowledged and dropped |
| `AD_CLICK_PII_RETENTION_DAYS` | `90` | days after which ip / user agent / Meta ids are nulled on linked clicks |
| `META_GRAPH_VERSION` | `v26.0` | shared with the other Meta features |
| `META_WEB_CAPI_GRAPH_BASE_URL` | unset | DEV ONLY fake Graph server, ignored in production |

States (shown in CRM settings, never fatal at boot): **OFF**, **INCOMPLETE**
(enabled, pixel or token missing), **INVALID** (malformed value / placeholder),
**READY**. While not READY, visits and taps are still stored and linked and
outbox events wait as `PENDING_CONFIG`; nothing is sent. `docker-compose.prod.yml`
passes them through; set them in the VPS `.env` (never commit the token).

## 4. Edge rate limit (Cloudflare WAF)

The app already limits the event endpoint per network and caps new rows
globally, and nginx refuses bodies over 8 KB. Add a Cloudflare rate-limiting
rule as well, so floods are absorbed at the edge before they reach the VPS
(documentation only; set it up in the Cloudflare dashboard for the
`monomiagency.com` zone):

* **Security > WAF > Rate limiting rules > Create rule**
* **If incoming requests match** (expression editor):
  `http.host eq "admin.monomiagency.com" and http.request.uri.path eq "/api/v1/public/track/event" and http.request.method eq "POST"`
  (also add `lower(http.request.uri.path) eq "/api/v1/public/track/event/"` with
  `or` if you want to cover the trailing-slash variant)
* **With the same characteristics:** IP (on plans that offer it, *IP with NAT
  support* is gentler on mobile carriers)
* **When rate exceeds:** about 60 requests per 10 seconds (a real visit sends
  2-5 events; this leaves room for many visitors behind one carrier address)
* **Then take action:** Block (or Managed Challenge for a softer start) for 1
  minute; response 429.
* Optionally a second, looser rule on the whole `/api/v1/public/track/` prefix
  (the snippet `GET` is cached for 5 minutes, so it rarely reaches the origin).

Watch **Security > Events** for the rule during the first campaign days and
loosen it if real visitors are hit.

## 5. Go-live checklist

1. Events Manager > the dataset (Pixel `28492116573772457`) > Settings >
   Conversions API > **Generate access token** -> `META_WEB_CAPI_TOKEN` on the VPS.
2. Set `META_PIXEL_ID`, `META_WEB_CAPI_ENABLED=true` and, for the first run,
   `META_WEB_CAPI_TEST_EVENT_CODE` from Events Manager > **Test events**. Restart
   the backend. CRM settings should say **Ready**.
3. Add the script tag to the landing page (and remove any Pixel code). Open the
   page: `PageView` appears under Test events (Server). Tap WhatsApp: the text
   ends with `Kode: ...` and `Lead` appears.
4. Paste the chat into quick-add: the "Linked to ad click" chip appears. Move the
   lead to Qualified, then **Send queued events now**: `QualifiedLead` appears.
5. Remove the test code, restart.
6. **Verify the domain** `link.monomiagency.com` in Business Settings > Brand
   safety > Domains (the page still has `facebook-domain-verification` content
   `PASTE_META_DOMAIN_CODE`; replace it with the code Meta shows). Server events
   with `action_source: website` are attributed best, and aggregated event
   measurement needs a verified domain.
7. Campaign: Conversion location **Website**, the dataset above, optimise for
   **Lead** first; switch to **QualifiedLead** when it arrives steadily (about 50
   a week). Use CRM Campaigns > **Copy ad link** as the ad's Website URL
   (`...?utm_source=meta&utm_medium=paid&utm_campaign=<CODE>&utm_content={{ad.id}}`).

## 6. Known limits and a later improvement

* **Ad blockers / tracking protection** may block a third-party script and
  request (`admin.monomiagency.com/.../monomi-track.js`). Visits from such
  browsers are not counted and their taps carry no code. Recommended later, not
  built yet: serve the snippet and the endpoint **first-party under the landing
  domain** through a Cloudflare route or proxy (for example
  `link.monomiagency.com/m/*` -> the backend's `/api/v1/public/track/*`), then
  use `data-endpoint` / the script `src` on that path. Cookies already live on
  the landing domain.
* Safari (ITP) caps script-set cookies at 7 days; the `visitId` and `_fbp` are
  re-created when lost, the stage events match on whatever identifiers remain.
* Without the Pixel there is no browser/server deduplication; every event has an
  `event_id` anyway, and the once-per-visit rule prevents duplicates.

## 7. Testing

* Backend: `cd backend && npx jest src/modules/ad-tracking` (snippet run in a
  fake browser incl. `_fbp` format, endpoint + CORS, whitelist, bot filter,
  per-visit dedupe, batch sender, hashing, Instagram parsing, linking, routing,
  IPv6 /64 throttling, the global cap, Lead gating, lanes, retention and PII
  removal, denylist handling).
* Local end to end without Meta: point `META_WEB_CAPI_GRAPH_BASE_URL` at a fake
  Graph server (any server answering `POST /v26.0/<pixel>/events` with
  `{"events_received":1}`), enable the feature and open a local HTML page that
  includes the snippet (`PUBLIC_TRACK_ALLOWED_ORIGINS=http://localhost:<port>`).
  Never call the real endpoints from tests.

## 8. Privacy note (not legal advice)

The snippet and the Conversions API process personal data of visitors: IP
address, user agent, a first-party visit id and Meta identifiers (`_fbp`,
`_fbc`/`fbclid`), and later a phone number and name (hashed) when the visitor
becomes a lead. Even with no Pixel on the page this is still processing for
advertising purposes. Under Indonesia's Personal Data Protection Law (UU PDP,
No. 27/2022) this needs a lawful basis, normally the visitor's consent.
Recommended before going live:

* a short notice on the landing page that cookies and similar technologies are
  used to measure and improve ads, with a link to the privacy policy, ideally
  with an accept/decline control that loads the snippet only after consent;
* the privacy policy should say what is collected (technical identifiers,
  contact details given in WhatsApp, the optional Instagram handle / brand /
  category), why, who receives it (Meta), how long it is kept (visits without a
  WhatsApp tap: 48 hours; unlinked taps: 30 days; on linked ones the device
  identifiers are removed after 90 days, the rest lives with the lead) and how
  to ask for deletion;
* the event endpoint collects no name, phone or e-mail; the Instagram handle,
  brand and category are stored in Monomi only and are never sent to Meta.

Have the final wording reviewed by someone qualified.
