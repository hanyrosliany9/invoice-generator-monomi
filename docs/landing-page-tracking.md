# Landing page tracking (visit -> WhatsApp chat -> CRM lead -> Meta / TikTok events, server-side only)

> TikTok (Events API + ad spend) is documented in section 9 below. Everything above
> describes the Meta route, which is unchanged; one lead goes to ONE platform (see 9.1).

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
* A verified tap on the WhatsApp button **creates the CRM lead at once**
  ("Waiting for WhatsApp": Instagram handle, brand and category, no phone yet).
  When the chat arrives, pasting it fills the phone into that same lead (see
  "Auto-created leads" below).
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
one lead only; one lead can hold several codes (the same person tapping again).

## 2. Server side

### Endpoints (public, no auth)

* `POST /api/v1/public/track/event` – `application/json` or `text/plain`
  (sendBeacon), max 8 KB. Body: `{ name, visitId, eventId, pageUrl, referrer,
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
  for invalid input (never echoed), `413` above 8 KB (nginx refuses bodies over
  8 KB too, before the app), `403` for a browser origin that is not allowed, `429`
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
CRM campaign code, or, when it is all digits, to the CRM campaign linked to that
Meta campaign id, see "Meta Ads sync" below), `instagramHandle`, `brandName`, `category`, and once-per-visit
markers `pageViewAt` / `viewContentAt` / `engagedAt`. Only the **first**
`PageView`, `ViewContent` and `EngagedVisit` of a visit are sent to Meta. A
WhatsApp tap fills `ref` / `eventId` on the visit row (a second tap in the same
visit gets its own row); `leadId` is set when linked (a click belongs to at most
one lead, a lead may hold several clicks; the newest carries its website stage
events). The visit's first
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
| at most 10 verified first taps per network per hour (Redis; forwarded `Lead`s and auto-created leads share this budget) | `SKIP_IP_LEAD_CAP` |
| when the visit has a Meta click id (`fbclid` / `_fbc`): the first forwarded `Lead` for it in 24 h (organic visits without one are fine) | `SKIP_DUPLICATE_CLICK_ID` |
| the Redis counters are reachable | `SKIP_LIMITER_UNAVAILABLE` |

### Auto-created leads ("Waiting for WhatsApp")

The owner wants the lead on the CRM board as soon as the form is sent, before
the phone number is known. After the tap is stored, a CRM lead is created when
**all** of these hold (anything else keeps the old behaviour: the tap is stored
and staff link it by pasting the chat):

| check | |
|---|---|
| the click-time gate's PageView rule (same visit, same network, at least 3 s earlier) | as above |
| the visit's **first** tap (the one the visit row took; a second tap in the visit gets no lead) | atomic |
| the per-network hourly budget above (10 per IPv4 address / IPv6 /64) | Redis, fails closed |
| not a bot / tool user agent | also checked by the endpoint |
| fewer than `PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR` (default 60) auto-created leads this hour, all instances | Redis fixed window; fails closed; one warning per window; `0` turns the feature off |

No Meta click id is needed (organic visitors count). The public endpoint still
answers `200 {ok:true}` whatever happens, and lead creation runs after the tap
is committed, so a failure there never loses the tap.

The lead: source **Website**, the first open stage, the campaign of the click,
`instagramHandle`, brand in `company`, `category`, `phone = null`,
`awaitingWhatsapp = true`, `autoCreated = true`, unassigned. Name: the brand,
else `@handle`, else `Website visitor · <Kode>` (`nameIsPlaceholder = true`: never
hashed into `fn`/`ln`). The click (and its click-time `Lead` outbox row) is linked
at once. Timeline: "Lead created (Website)" + `@lead.fromLandingForm: <Kode>`.
**No `LeadSubmitted` is queued**, whatever the first stage maps to (the click-time
`Lead` already covers it), and nothing external happens (no outbound WhatsApp).

**Same Instagram handle.** If an open (not Won/Lost) lead already has the
handle, no new lead is made: the click is linked to that lead with an
`@lead.landingFormRepeat: <Kode>` note. Creation is serialised per handle
(transaction-scoped advisory lock). Anyone can type a public handle, so this
link is **unverified**: `ad_clicks.linkedVia = HANDLE`. A HANDLE click never
changes the lead's fields and never carries the lead's Meta events, and
pending events never move onto it; the lead page lists it as "tapped again
(not confirmed)". When the chat or staff confirm its Kode it becomes `KODE`.

**Which click carries a lead's website events** (its IP, user agent, `fbc` /
`fbp` go out with the lead's hashed phone / name): the most recent click
(by tap time) among the `KODE` clicks (Kode confirmed by the chat or staff) and
the `AUTO_CREATE` click (the tap that created the lead); never a `HANDLE` click.

**When the chat arrives** (quick-add with the Kode, the lead page's **Link ad
click code**, **Add phone** on the waiting lead, or a WhatsApp Cloud API message
carrying the Kode; one shared parser):

* **(a) the number has no open lead:** it is normalised and filled into the
  waiting lead, which stops waiting (`firstContactAt` = now, so the response
  clock starts here); the pasted message becomes its first WhatsApp activity;
  a person's name from the chat replaces the placeholder name; quick-add opens
  that lead. No new lead, no `LeadSubmitted`. **Returning client:** when the
  number only has Won / Lost leads, they are not merged into; the waiting lead
  keeps the number and stays in New as a new deal, with an
  `@lead.returningClient` history entry linking to the most recent closed lead
  (quick-add shows "Returning client: previous lead <name> (Won/Lost)").
* **(b) the number belongs to an open (not Won / Lost) lead:** that lead is
  kept (the most recent one when several are open). The
  clicks, their click-time `Lead` rows, the Instagram handle, brand, category and
  campaign move to it when it has none, and it becomes a Website lead (unless it
  is a Click-to-WhatsApp lead). The waiting lead is deleted when no staff member
  touched it; otherwise it moves to Lost with reason `Duplicate` (no Meta event).
  A `QualifiedLead` / `Purchase` the placeholder already sent or queued is
  carried over as a `SKIPPED` marker on the target
  (`SKIP_SENT_BEFORE_MERGE`), so the same person is not reported twice.
  Staff see which of the two happened.

The quick-add dialog shows "Matches waiting lead from the landing page
(@handle)" when the pasted Kode belongs to a waiting lead. Linking a WhatsApp
inbox conversation to a waiting lead follows the same rule (a conversation
without a valid number is refused). A WhatsApp message with the Kode never
touches a Won / Lost lead of the same number.

**Metrics.** Waiting leads have no wait clock, do not count as "unanswered >
15 min", are left out of the response-time stats and of the menu badge total
(they have nothing to answer yet); the board and the list show a **Waiting for
WhatsApp** badge and a filter. Staff moving a waiting lead does not count as a
first response; moving it to Won/Lost ends the waiting state.

**Cleanup.** The nightly job (03:20, with the click retention) moves waiting
leads still without a phone after `AUTO_LEAD_STALE_DAYS` (default 30) to the
first Lost stage with reason `Never sent WhatsApp`, but only leads nobody is
working on: still in the first (New) stage and without any staff-made activity
(note, call, stage move, assignment, follow-up). The record is kept; no Meta
event is queued.

**Stage events while the phone is unknown.** `QualifiedLead` / `Purchase` of a
waiting lead go on the website route as usual, without `ph` (and without
`fn`/`ln` from a placeholder name): `fbc`, `fbp`, IP, user agent and
`external_id` carry the match.

CRM settings > Landing page tracking shows "Leads created from the form, last 7
days" and how many still wait.

### Sender

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
code, no `+`, no leading 0: `0812-3456-7890` -> `6281234567890`; left out while
the lead has no number), `fn` / `ln` (lowercase, punctuation removed; skipped
when the name is a bare number or an auto-generated placeholder),
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
| `PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR` | `60` | global cap on CRM leads auto-created from landing-page taps per hour (all instances, Redis); above it the tap is stored without a lead and a warning is logged; `0` = off |
| `AUTO_LEAD_STALE_DAYS` | `30` | waiting leads with no phone after this many days move to Lost ("Never sent WhatsApp") in the nightly job |
| `META_GRAPH_VERSION` | `v26.0` | shared with the other Meta features |
| `META_AD_ACCOUNT_ID` | unset | Meta Ads sync: numeric ad account id, with or without `act_`. Unset = use the token's ad account when it sees exactly one active account, else the sync card says Incomplete |
| `META_ADS_SYNC_ENABLED` | `true` | Meta Ads sync on/off (it needs `META_SYSTEM_USER_TOKEN`, shared with auto-publishing, with `ads_read`) |
| `META_ADS_SYNC_BACKFILL_DAYS` | `90` | history pulled by the first sync run (1-365) |
| `META_WEB_CAPI_GRAPH_BASE_URL` | unset | DEV ONLY fake Graph server, ignored in production |
| `TIKTOK_*` | see 9.4 | TikTok Events API and TikTok Ads sync (all optional, OFF by default) |

States (shown in CRM settings, never fatal at boot): **OFF**, **INCOMPLETE**
(enabled, pixel or token missing), **INVALID** (malformed value / placeholder),
**READY**. While not READY, visits and taps are still stored and linked and
outbox events wait as `PENDING_CONFIG`; nothing is sent. `docker-compose.prod.yml`
passes them through; set them in the VPS `.env` (never commit the token).

### Meta Ads sync: spend and attribution by Meta campaign id

CRM settings > **Meta Ads sync** pulls ad spend from the Marketing API with the
same system user token as auto-publishing (`ads_read`; appsecret_proof and the
shared Graph denylist apply). Every 3 hours (and on **Sync now**) it reads
`act_<id>/insights?level=campaign&time_increment=1` (first run: the last
`META_ADS_SYNC_BACKFILL_DAYS`, later runs: the last 7 days, because Meta restates
recent days), `act_<id>/campaigns` and `act_<id>/ads` into `meta_ads_insights_daily`
(integer IDR per campaign per day, unique on campaign + date, so re-running never
doubles), `meta_ads_campaigns` and `meta_ads_ads` (ad id -> campaign id). A DB
lease keeps overlapping runs apart; Graph rate-limit errors (codes 4, 17, 32, 613)
back the sync off (15 min, doubling, max 3 h). Manual spend entries stay as they
are ("Log other costs") and are added to the synced spend.

Every Meta campaign that is active or has spend and is not linked yet gets a CRM
campaign (code = sanitised name, max 24 characters, `-2` suffix if taken; rename
the code any time, a Meta rename only updates the stored Meta name). Admins can
link / unlink a CRM campaign to a Meta campaign on the Campaigns page; an unlinked
Meta campaign is not auto-created again.

Attribution: a landing visit whose `utm_campaign` is all digits and equals a
linked `metaCampaignId` is stored with that campaign's code (a code typed into
`utm_campaign` still wins). Each sync also fills the campaign of earlier clicks
and of their leads, but only where the campaign is still empty (a campaign set by
staff is never overwritten). A Click-to-WhatsApp referral's `source_id` (ad id)
is mapped to its campaign through the synced ads map.

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
   page: `PageView` appears under Test events (Server). Wait a few seconds, fill
   in the form and tap WhatsApp: the text ends with `Kode: ...`, `Lead` appears,
   and the CRM board shows the lead with **Waiting for WhatsApp**.
4. Paste the chat into quick-add: the "Matches waiting lead from the landing
   page" chip appears and saving puts the number on that lead. Move the lead to
   Qualified, then **Send queued events now**: `QualifiedLead` appears.
5. Remove the test code, restart.
6. **Verify the domain** `link.monomiagency.com` in Business Settings > Brand
   safety > Domains (the page still has `facebook-domain-verification` content
   `PASTE_META_DOMAIN_CODE`; replace it with the code Meta shows). Server events
   with `action_source: website` are attributed best, and aggregated event
   measurement needs a verified domain.
7. Campaign: Conversion location **Website**, the dataset above, optimise for
   **Lead** first; switch to **QualifiedLead** when it arrives steadily (about 50
   a week). Use CRM Campaigns > **Copy ad link** as the ad's Website URL (or in
   the URL parameters). It is ONE universal link for every ad:
   `<LANDING_PAGE_URL>/?utm_source=meta&utm_medium=paid&utm_campaign={{campaign.id}}&utm_content={{ad.id}}`.
   Ads Manager fills in `{{campaign.id}}` and `{{ad.id}}` per ad, and the
   synced Meta campaign id resolves to its CRM campaign (see below). The old
   per-code link (`utm_campaign=<CODE>`) is still offered under it for channels
   outside Meta.

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
  removal, denylist handling; `auto-lead.spec.ts`: auto-created leads, their
  gate and global cap, handle dedup, fill-in / merge, null-phone payloads,
  metrics and the stale cleanup).
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
  brand and category are stored in Monomi only (on the tap and on the lead that
  is created from it) and are never sent to Meta. A lead that never sends the
  WhatsApp message is closed as Lost after 30 days and kept with the other
  leads (delete it by hand on request).

Have the final wording reviewed by someone qualified.

## 9. TikTok: Events API (server-side conversions) and ad spend sync

TikTok mirrors the Meta website route one for one: the same snippet, the same
click rows, a separate outbox table and sender, and a spend sync with the same
lease / back-off / auto-link design. Field names are those of TikTok's official
"Report events" reference (Events API 2.0, `POST
https://business-api.tiktok.com/open_api/v1.3/event/track/`, header
`Access-Token`, body `event_source: "web"`, `event_source_id` = the Pixel Code,
`data[]`).

### 9.1 One platform per lead (attribution)

A lead's events go to ONE platform: **the most recent ad touch that led the
person to convert wins.** It is decided **per click, at the moment of the
WhatsApp tap** (never per person, never by first touch) and stored on the
`ad_clicks` row as `attributedPlatform` (`META` / `TIKTOK` / `NONE`) with
`attributionReason` (`url_param` / `last_touch` / `none`). Order of the checks
(`ad-tracking/ad-attribution.ts`):

1. **The tap event's own URL**: `fbclid` or `utm_source=facebook|instagram|meta|fb|ig`
   -> Meta; `ttclid`, or `utm_source=tiktok` **together with a paid
   `utm_medium`** (`paid`, `cpc`, `paid_social`, `ads`) -> TikTok (`url_param`).
   A bare `utm_source=tiktok` (a profile bio link) is **not** an ad. Both in
   one URL: `utm_source` decides, else the referrer host (tiktok.com /
   facebook.com / instagram.com), else **Meta** (the incumbent).
2. **Only if the tap URL has no ad parameter: the visit's first URL**, with the
   same rules. Parameters of different URLs are **never merged**.
3. **Only if neither URL has any: last touch.** The snippet keeps the time of
   the last Meta touch (`fbt`) and the last TikTok touch (`ttt`, written only
   when a `ttclid` was captured) in a first-party cookie + localStorage and
   sends both; the **newer** wins (`last_touch`). The server ignores a `ttt`
   older than 30 days, and the snippet drops a stored `ttclid` that has no
   `ttt` or an expired one. A Meta click id of unknown age only wins when
   TikTok has no recent touch.
4. **Nothing** -> `NONE`: organic. Organic keeps today's Meta behaviour (Meta
   still gets PageView and the click-time Lead as before); TikTok gets nothing.

TikTok attribution applies **only while the TikTok Events config is READY**.
While it is OFF, INCOMPLETE or INVALID every TikTok signal is ignored and Meta
gets everything it always got.

The losing platform gets **nothing for that lead**, and its click ids are never
sent to the winner (no `fbc` in a TikTok event, no `ttclid` in a Meta event).
A TikTok-attributed tap leaves a SKIPPED marker row on the Meta outbox
(`SKIP_ATTRIBUTED_TIKTOK`) so the lead page explains why Meta got nothing, and
its visit sends no Meta PageView.

**Repeat conversions** (a second tap with another Kode, or a merge): the lead's
platform for FUTURE stage events is that of its **most recent KODE / AUTO_CREATE
click** (the most recent ad touch that made the person convert wins, on either platform) (`selectEventClick`, the one selection used for the platform decision and for the device data / click ids of both platforms; an unverified HANDLE click never decides). Events
already sent stay where they went; a later stage event (including the implied
CompleteRegistration) goes to the new platform. A Click-to-WhatsApp lead
(`ctwa_clid`) always stays on Meta, and so does every event while the TikTok Events config is not READY. The lead page shows
"Attributed to TikTok - last ad click before WhatsApp".

### 9.2 Event mapping

| Moment | TikTok event | When |
|---|---|---|
| Landing view | `ViewContent` | the first PageView of a TikTok-attributed visit (in-memory batch queue, up to 1000 per request) |
| WhatsApp tap | `Contact` | the tap, through the same anti-abuse gate as Meta's click-time Lead (outbox row, `click:<eventId>`) |
| Chat arrives / Kode matched, phone known | `Lead` | waiting lead filled in, merge, manual quick-add / link; once per lead (`<leadId>:Lead`) |
| Qualified (also implied: skipping past Qualified to a later or Won stage) | `CompleteRegistration` | same trigger as Meta's `QualifiedLead` (`<leadId>:CompleteRegistration`) |
| Won / invoice paid | `Purchase` | `value` (plain number), `currency: "IDR"`, `order_id` = the paid invoice number (else the lead id) |

Only standard events are used (custom events are not optimisable). EngagedVisit
and an explicit ViewContent are not forwarded to TikTok. The CRM hooks are
shared with Meta (`changeStage`, quotation approved, invoice paid, waiting-lead
phone fill, quick-add): for a TikTok lead they queue the TikTok event instead,
and Meta behaviour for Meta and organic leads is unchanged.

### 9.3 Payload and hashing

`user`: `ttclid` (raw), `phone` / `email` / `external_id` (SHA-256), `ip` and
`user_agent` (raw, from the stored click), `locale: "id-ID"` when the lead is
known. `page.url` is the stored landing URL (only on an allowed origin, else
`LANDING_PAGE_URL`) and `page.referrer`. **`_ttp` is never generated**: without
the TikTok Pixel nothing in the browser sets it, and a made-up value matches
nothing. `event_time` is the real event time in UNIX seconds (UTC).

* **Phone is E.164 WITH the "+"** (`+6281234567890`) and then SHA-256. This is
  NOT Meta's format (`normalizePhoneForMeta` strips the "+"): hashing the Meta
  form silently gives zero matches. `0812-3456-7890`, `+62 812 ...`, `62812...`
  and `812...` all become `+6281234567890`; an input that starts with "+" is kept
  as typed (so a foreign number is never turned into +62). Worked example:
  `+6281234567890` -> `62397bbd6a8c9ae53bc914a6017300eb6b13af5be20e4cc9ad2dc3d61ecb24cd`.
* Email: trimmed, lowercased, then SHA-256. `external_id`: SHA-256 of the visit
  id and of the lead id (an array).
* `event_id` is stable per event (`tt_contact_<eventId>`, `tt_lead_<leadId>`,
  `tt_qualified_<leadId>`, `tt_purchase_<leadId>`, `tt_view_<eventId>`): TikTok
  drops repeats of (pixel, event, event_id) for 48 hours, so an outbox retry is
  idempotent.

### 9.4 Environment variables

| variable | default | meaning |
|---|---|---|
| `TIKTOK_PIXEL_ID` | unset | Pixel Code (`event_source_id`) |
| `TIKTOK_EVENTS_ACCESS_TOKEN` | unset | Events API token: Events Manager > the pixel > Settings > Generate Access Token (admin / operator of the ad account) |
| `TIKTOK_EVENTS_ENABLED` | `false` | `true` to send events |
| `TIKTOK_TEST_EVENT_CODE` | unset | Events Manager > Test Events code, sent as top-level `test_event_code` (REMOVE for production) |
| `TIKTOK_EVENTS_MAX_AGE_DAYS` | `7` | older events are SKIPPED with a clear reason (TikTok documents no maximum age: open item) |
| `TIKTOK_EVENTS_API_BASE_URL` | unset | TEST/DEV ONLY fake server, ignored in production |
| `TIKTOK_ADS_SYNC_ENABLED` | `false` | spend sync on/off (OFF until set) |
| `TIKTOK_ADVERTISER_ID` | unset | the ad account (advertiser) id |
| `TIKTOK_ADS_ACCESS_TOKEN` | unset | long-term advertiser token (from "Connect TikTok Ads"); wins over a stored one |
| `TIKTOK_ADS_APP_ID`, `TIKTOK_ADS_APP_SECRET` | unset | the approved developer app, only used by "Connect TikTok Ads" |
| `TIKTOK_ADS_SYNC_BACKFILL_DAYS` | `90` | history pulled by the first run (1-365) |
| `TIKTOK_ADS_API_BASE_URL` | unset | TEST/DEV ONLY fake server, ignored in production |

States (never fatal at boot): OFF, INCOMPLETE, INVALID, READY, as for Meta.
The tokens are secrets: never logged, never returned by any API, scrubbed from
stored errors. `docker-compose.prod.yml` passes them through.

### 9.5 Sender

`TikTokEventOutbox` is a separate table (Meta's dedupe keys such as
`<leadId>:Purchase` would collide). It has the same lanes and guarantees as the
Meta website sender: stage events first, then click-time Contacts; one event per
request; a claim (`inFlightAt`) makes sending at-most-once and an interrupted
claim is retried with the same `event_id`; the first READY run skips Contacts
that waited more than 24 h; the merge SKIP markers
(`SKIP_SENT_BEFORE_MERGE`) and the cleanup of unlinked Contact rows are carried
over. Responses: code `0` = success. `40002` (invalid payload) is permanent
(FAILED, never retried); `40001` (no permission) and `40104` (token empty /
invalid) are auth problems: retried with backoff until the attempts run out and
shown on the settings card; `40100` / HTTP 429 and 5xx / network errors are
retried with backoff. In a visit batch, a `40002` that names a zero-based index
drops only that event.

### 9.6 Spend sync

`GET /open_api/v1.3/report/integrated/get/` (`report_type=BASIC`,
`data_level=AUCTION_CAMPAIGN`, `dimensions=["campaign_id","stat_time_day"]`,
metrics spend / impressions / clicks / campaign_name), paged, in 30-day chunks;
`campaign/get/` for names and status and `advertiser/info/` for currency and time
zone. First run: `TIKTOK_ADS_SYNC_BACKFILL_DAYS`; later runs re-read the last 7
days (reporting lags about 11 h and restates). Every 3 hours (Asia/Jakarta) and
on **Sync now**; DB lease; rate-limit back-off 15 min doubling to 3 h.

Storage: new `tiktok_ads_*` tables (state, campaigns, daily insights) instead of
a `platform` column on the Meta tables, because the Meta tables, their unique
keys and the working Meta sync stay untouched and the TikTok campaign id space
and status vocabulary differ. The CRM `Campaign` gets `tiktokCampaignId*` fields
and the `TIKTOK` platform; `CampaignSpendSource` gets `TIKTOK`. Auto-link /
create, `codeAuto`, the opt-out on unlink or switch and the `campaignSource`
AUTO / MANUAL rules are the Meta ones (a campaign linked to Meta is never taken
over). A landing visit whose `utm_campaign` is the numeric TikTok campaign id is
attributed to the linked campaign.

**Connect TikTok Ads** (CRM settings > TikTok, admin only): paste the `auth_code`
from the OAuth redirect; the server posts `app_id`, `secret`, `auth_code` to
`/open_api/v1.3/oauth2/access_token/` and stores the long-term token AES-256-GCM
encrypted in `tiktok_ads_sync_state` when `TOKEN_ENCRYPTION_KEY` exists (never
shown again); without the key nothing is stored and the token is shown ONCE to
copy into `TIKTOK_ADS_ACCESS_TOKEN`.

### 9.7 Ad URL, go-live and test

Ad URL parameters (no leading `?`):
`utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_ID__&utm_term=__AID__&utm_content=__CID__`
(Campaigns > Copy TikTok ad link). TikTok appends `ttclid` itself; do not add
`__CALLBACK_PARAM__`. Macros are case-sensitive.

1. Events Manager: create the Web pixel (manual / Events API), Settings >
   Generate Access Token; set `TIKTOK_PIXEL_ID`, `TIKTOK_EVENTS_ACCESS_TOKEN`,
   `TIKTOK_EVENTS_ENABLED=true` and, for the test, `TIKTOK_TEST_EVENT_CODE`.
2. Open the landing page with `?utm_source=tiktok&ttclid=test123`, tap WhatsApp,
   fill the phone, move to Qualified, mark Won, **Send queued events now**:
   ViewContent, Contact, Lead, CompleteRegistration, Purchase appear under Test
   Events (Server). Remove the test code and restart.
3. Optimise a Lead Generation campaign on Contact / Lead / CompleteRegistration.

### 9.8 Privacy, consent, retention

Same handling as Meta. The app has no per-lead consent record for Meta events
today, so none gates TikTok either; consent belongs on the landing page (see
section 8) and the privacy policy must name TikTok next to Meta and the
cross-border transfer. Retention: visits without a tap 48 h, unlinked taps 30
days (their `ttclid` goes with the row), and on linked clicks `ttclid` is nulled
and stripped from `pageUrl` with the other device identifiers after
`AD_CLICK_PII_RETENTION_DAYS`. Later stage events of such a lead go out with the
hashed phone / email and external id only. `ttclid` lives in a first-party
cookie + localStorage for 30 days (TikTok recommends at least 28).

### 9.9 Open items to confirm with a real `test_event_code`

* Maximum accepted `event_time` age / future tolerance (we skip after 7 days):
  send backdated test events (8, 29, 60 days) and record accept / reject.
* Back-office events (CompleteRegistration, Purchase days later) with the stored
  `page.url` + `ttclid` are attributed normally (check reporting after 24 h).
* Whether Ads Manager offers `CompleteRegistration` (and `Contact`) as the
  optimisation goal of a website Lead Generation campaign.
* Whether the Events Manager token expires (not documented): alert on 40001 /
  40104 (the settings card does) and keep a re-generate runbook.
* The report endpoint's exact limits (page size, max range per request, scope
  names) and the `campaign/get` / `advertiser/info` field names come from
  vendor docs and memory, not from the official pages we could read: verify with
  the first real sync; the developer app needs reporting access approval first.
* `__CID__` equals the report's `ad_id` (only the ids in `utm_*` are stored).
* CRM events / deep-funnel optimisation need a TikTok `lead_id` for Website /
  WhatsApp leads: not implemented (phase 2, only after a no-`lead_id` test event
  is accepted).
* TikTok's own WhatsApp messaging ads pass no click id and cannot feed this
  pipeline; use ads that open the landing page.

### 9.10 Testing

`cd backend && npx jest src/modules/ad-tracking src/modules/crm`: attribution
(`ad-attribution.spec.ts`), payload / hashing / config / error classification
(`tiktok-events.payload.spec.ts`), routing, outbox lanes, dedupe, staleness,
merge and sender (`tiktok-events.service.spec.ts`), snippet ttclid persistence
(`monomi-track.spec.ts`), spend sync, auto-link, attribution and the OAuth helper
(`crm/tiktok-ads/tiktok-ads.spec.ts`), stats (`crm-stats.spec.ts`). Locally,
point `TIKTOK_EVENTS_API_BASE_URL` / `TIKTOK_ADS_API_BASE_URL` at a fake server;
never call the real TikTok endpoints from tests.
