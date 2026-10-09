import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AdClick, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AdTrackingConfig, allowedPageUrl, resolveAdTrackingConfig } from "./ad-tracking.config";
import { Attribution, AttributedPlatform, decideAttribution } from "./ad-attribution";
import { SKIP_META_ATTRIBUTED_TIKTOK, ttclidFromUrl } from "./tiktok-events.payload";
import { resolveTikTokEventsConfig } from "./tiktok-events.config";
import { ParsedTrackEvent } from "./track-event.payload";
import { InMemoryTrackCounters, ipBucket, TrackCounters } from "./track-limits";
import {
  SKIP_DUPLICATE_CLICK_ID,
  SKIP_DUPLICATE_VISIT_LEAD,
  SKIP_IP_LEAD_CAP,
  SKIP_LIMITER_UNAVAILABLE,
  SKIP_UNVERIFIED_VISIT,
  USER_AGENT_MAX,
  WebClick,
} from "./web-capi.payload";
import { extractRefCode, normalizeRefCode } from "./ref-code";
import { AutoLeadService } from "./auto-lead.service";
import { attachClickInTx, confirmKodeInTx } from "./click-link";

/** Unlinked WhatsApp taps (rows with a ref) are kept this long for linking. */
export const AD_CLICK_RETENTION_DAYS = 30;
/** Visit rows without a WhatsApp tap can never be linked: kept only briefly. */
export const AD_CLICK_NO_REF_RETENTION_HOURS = 48;
/** Click-time website Lead rows whose click is still unlinked are dropped after this. */
export const ORPHAN_WEB_EVENT_RETENTION_DAYS = 7;
/** Time budget of one PII scrub run for the per-row pageUrl rewrite. */
export const PII_SCRUB_BUDGET_MS = 20_000;
const PII_SCRUB_BATCH = 500;
/** A click-time Lead is forwarded only after a PageView this much earlier. */
export const LEAD_MIN_PAGEVIEW_AGE_MS = 3000;
/** Forwarded click-time Leads per network (IPv4 address / IPv6 /64) per hour. */
export const LEAD_IP_CAP_PER_HOUR = 10;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

type Tx = Prisma.TransactionClient;

/** "dropped": acknowledged but not stored (global new-row cap reached). */
export type RecordOutcome = "ok" | "duplicate" | "conflict" | "dropped";

export interface ClickContext {
  ip: string | null;
  userAgent: string | null;
}

/** A first-of-its-kind visit event to send (batched) to Meta. */
export interface VisitEventToSend {
  name: "PageView" | "ViewContent" | "EngagedVisit";
  eventId: string;
  eventTime: Date;
  click: WebClick;
  /** Who gets this visit: TIKTOK -> TikTok ViewContent only; META / NONE -> Meta as before. */
  platform?: AttributedPlatform;
}

export interface RecordResult {
  outcome: RecordOutcome;
  visitEvent?: VisitEventToSend;
}

export interface AdClickPreview {
  ref: string;
  createdAt: Date;
  pageUrl: string | null;
  campaignCode: string | null;
  campaign: { id: string; name: string; code: string } | null;
  instagramHandle: string | null;
  /** True when no lead holds this click yet (so it can still be linked). */
  available: boolean;
  /**
   * The click belongs to a lead auto-created from the landing-page form that
   * is still waiting for its WhatsApp chat: the chat fills that lead in (or
   * merges it into the lead that already has the number) instead of creating
   * a new one.
   */
  waitingLead: { id: string; name: string; instagramHandle: string | null } | null;
}

/** Result of the click-time Lead gate (see leadSkipReason). */
export interface LeadGate {
  /** null: forward the click-time Lead to Meta; else the SKIPPED reason. */
  skip: string | null;
  /** The tap may get an auto-created CRM lead (no Meta click id needed). */
  autoLead: boolean;
}

const VISIT_FLAG = {
  PageView: "pageViewAt",
  ViewContent: "viewContentAt",
  EngagedVisit: "engagedAt",
} as const;

interface ClickFields {
  pageUrl: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
  ttclid: string | null;
  clientIp: string | null;
  userAgent: string | null;
  campaignCode: string | null;
}

const isUniqueViolation = (error: unknown) =>
  (error as { code?: string })?.code === "P2002";

/** Fields the event knows that the row does not have yet. */
function missingFields(row: AdClick, fields: ClickFields): Record<string, unknown> {
  const fill: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && (row as unknown as Record<string, unknown>)[k] == null) fill[k] = v;
  }
  return fill;
}

/** The Meta click id: fbclid, else the last part of _fbc ("fb.1.<ms>.<fbclid>"). */
export function metaClickId(
  fbclid: string | null | undefined,
  fbc: string | null | undefined,
): string | null {
  if (fbclid) return fbclid;
  if (!fbc) return null;
  const parts = fbc.split(".");
  return parts.length >= 4 ? parts.slice(3).join(".") || null : null;
}

/** pageUrl without its fbclid / ttclid query parameters (used when PII retention ends). */
export function stripClickIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    u.searchParams.delete("fbclid");
    u.searchParams.delete("ttclid");
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Landing-page visits and WhatsApp taps: storage, the tap's website Lead
 * event, and linking a tap to the CRM lead created from the matching chat.
 */
@Injectable()
export class AdClickService {
  private readonly logger = new Logger(AdClickService.name);
  private readonly counters: TrackCounters;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(TrackCounters) counters?: TrackCounters,
    @Optional() private readonly autoLeads?: AutoLeadService,
  ) {
    this.counters = counters ?? new InMemoryTrackCounters();
  }

  config(): AdTrackingConfig {
    return resolveAdTrackingConfig();
  }

  // ---------------------------------------------------------------------
  // public event endpoint
  // ---------------------------------------------------------------------

  private async resolveCampaignCode(utmCampaign: string | null): Promise<string | null> {
    if (!utmCampaign) return null;
    // All digits = a Meta campaign id ({{campaign.id}} in the ad URL) of a linked campaign: explicit, wins over a code.
    if (/^\d{5,25}$/.test(utmCampaign)) {
      const m = await this.prisma.campaign.findFirst({
        where: { OR: [{ metaCampaignId: utmCampaign }, { tiktokCampaignId: utmCampaign }] },
        select: { code: true },
      });
      if (m) return m.code;
    }
    const c = await this.prisma.campaign.findFirst({
      where: { code: { equals: utmCampaign, mode: "insensitive" } },
      select: { code: true },
    });
    return c?.code ?? null;
  }

  /**
   * Global cap on NEW ad_clicks rows (all instances: a fixed 1-minute window
   * in Redis). Over the cap the event is acknowledged and dropped. If the
   * counter store fails the row is allowed: the per-network throttler, which
   * uses the same store, guards the endpoint first.
   */
  private async allowNewRow(cfg: AdTrackingConfig): Promise<boolean> {
    try {
      const n = await this.counters.increment("new-clicks", 60_000);
      if (n <= cfg.maxNewClicksPerMin) return true;
      if (n === cfg.maxNewClicksPerMin + 1) {
        this.logger.warn(
          `New ad click cap reached (${cfg.maxNewClicksPerMin}/min): new visits are dropped until the window resets`,
        );
      }
      return false;
    } catch (error) {
      this.logger.warn(`Ad click cap counter unavailable: ${(error as Error).message}`);
      return true;
    }
  }

  /**
   * The visit's row (its first row), created by the first event of the visit.
   * Race-safe: the creating insert carries visitKey = visitId (unique), so two
   * concurrent first events make one row and the loser reads the winner's.
   * Returns null when a new row would exceed the global cap.
   */
  private async ensureVisitRow(
    visitId: string,
    fields: ClickFields,
    now: Date,
    cfg: AdTrackingConfig,
    attr?: Attribution,
  ): Promise<AdClick | null> {
    const existing = await this.prisma.adClick.findFirst({
      where: { visitId },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;
    if (!(await this.allowNewRow(cfg))) return null;
    try {
      return await this.prisma.adClick.create({
        data: {
          visitId,
          visitKey: visitId,
          createdAt: now,
          ...fields,
          ...(attr ? { attributedPlatform: attr.platform, attributionReason: attr.reason } : {}),
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const row = await this.prisma.adClick.findUnique({ where: { visitKey: visitId } });
        if (row) return row;
      }
      throw error;
    }
  }

  /**
   * Records one landing-page event.
   *  - PageView / ViewContent / EngagedVisit: the visit row is created by the
   *    visit's first event; each of these is accepted ONCE per visit (the
   *    result carries `visitEvent` only for the first), the rest are duplicates.
   *  - Lead (WhatsApp tap): fills ref/eventId (+ Instagram/brand/category) on
   *    the visit row, or on a new row for a second tap in the same visit, and
   *    stores the website Lead event: PENDING_CONFIG when it may be forwarded
   *    to Meta, SKIPPED (+ reason) otherwise (see leadSkipReason). A tap that
   *    passes the auto-lead gate also gets a waiting CRM lead (AutoLeadService)
   *    once the click is committed. Idempotent on eventId; a different eventId
   *    for an existing ref (or the reverse) is a conflict.
   * The page URL is kept only when its origin is an allowed landing page.
   */
  async recordEvent(ev: ParsedTrackEvent, ctx: ClickContext): Promise<RecordResult> {
    const now = new Date();
    const cfg = this.config();
    const campaignCode = await this.resolveCampaignCode(ev.utmCampaign);
    // the snippet sends the persisted ttclid; a ttclid in the landing URL itself counts too
    // (never from a URL that was cut short: the ttclid could be cut with it)
    if (!ev.ttclid && !ev.pageUrlTruncated) ev = { ...ev, ttclid: ttclidFromUrl(ev.pageUrl) };
    // The browser normally sends _fbc; rebuild it from fbclid when only the
    // raw click id reached us (format: fb.<subdomain index>.<ms>.<fbclid>).
    const fbc = ev.fbc ?? (ev.fbclid ? `fb.1.${now.getTime()}.${ev.fbclid}` : null);
    const fields: ClickFields = {
      pageUrl: allowedPageUrl(ev.pageUrl, cfg),
      referrer: ev.referrer,
      utmSource: ev.utmSource,
      utmMedium: ev.utmMedium,
      utmCampaign: ev.utmCampaign,
      utmContent: ev.utmContent,
      utmTerm: ev.utmTerm,
      fbclid: ev.fbclid,
      fbc,
      fbp: ev.fbp,
      ttclid: ev.ttclid,
      clientIp: ctx.ip,
      userAgent: ctx.userAgent ? ctx.userAgent.slice(0, USER_AGENT_MAX) : null,
      campaignCode,
    };
    const attr = this.attribution(ev, null, now);
    if (ev.name === "Lead") return this.recordLead(ev, ctx, fields, now, cfg);

    let row = await this.ensureVisitRow(ev.visitId, fields, now, cfg, attr);
    if (!row) return { outcome: "dropped" };
    // later events may carry identifiers the first one lacked
    const fill = missingFields(row, fields);
    if (Object.keys(fill).length) {
      row = await this.prisma.adClick.update({ where: { id: row.id }, data: fill });
    }
    const flag = VISIT_FLAG[ev.name];
    const claimed = await this.prisma.adClick.updateMany({
      where: { id: row.id, [flag]: null },
      data: { [flag]: now },
    });
    if (claimed.count === 0) return { outcome: "duplicate" };
    return {
      outcome: "ok",
      visitEvent: {
        name: ev.name,
        eventId: ev.eventId,
        eventTime: now,
        click: {
          visitId: ev.visitId,
          pageUrl: fields.pageUrl ?? row.pageUrl,
          fbc: fbc ?? row.fbc,
          fbp: ev.fbp ?? row.fbp,
          clientIp: ctx.ip ?? row.clientIp,
          userAgent: fields.userAgent ?? row.userAgent,
          campaignCode: row.campaignCode ?? campaignCode,
          ttclid: ev.ttclid ?? row.ttclid,
          referrer: ev.referrer ?? row.referrer,
        },
        platform: row.attributedPlatform ?? attr.platform,
      },
    };
  }

  /** Last-touch platform of this event (see ad-attribution.ts). */
  private attribution(ev: ParsedTrackEvent, visitUrl: string | null, now: Date): Attribution {
    return decideAttribution({
      tapUrl: ev.pageUrl,
      visitUrl,
      referrer: ev.referrer,
      hasFbId: !!(ev.fbclid || ev.fbc),
      fbTouchAt: ev.fbTouchAt,
      ttTouchAt: ev.ttTouchAt,
      // TikTok counts only while its Events config is READY: otherwise nothing changes for Meta
      tiktokEnabled: resolveTikTokEventsConfig().state === "READY",
      now,
    });
  }

  /** duplicate (same tap again) / conflict (ref or eventId used by another tap) / null (new). */
  private async tapOutcome(ref: string, eventId: string): Promise<RecordOutcome | null> {
    const existing = await this.prisma.adClick.findFirst({
      where: { OR: [{ ref }, { eventId }] },
      select: { ref: true, eventId: true },
    });
    if (!existing) return null;
    return existing.ref === ref && existing.eventId === eventId ? "duplicate" : "conflict";
  }

  private async recordLead(
    ev: ParsedTrackEvent,
    ctx: ClickContext,
    fields: ClickFields,
    now: Date,
    cfg: AdTrackingConfig,
  ): Promise<RecordResult> {
    const ref = ev.ref as string;
    const known = await this.tapOutcome(ref, ev.eventId);
    if (known) return { outcome: known };

    const preAttr = this.attribution(ev, null, now);
    const visitRow = await this.ensureVisitRow(ev.visitId, fields, now, cfg, preAttr);
    if (!visitRow) return { outcome: "dropped" };
    // The platform is decided for THIS tap: the ad parameters of this event's URL; only when it
    // has none, the visit's first URL; only when neither has any, the newest stored touch.
    // Parameters of different URLs are never combined.
    const attr = this.attribution(ev, visitRow.pageUrl, now);
    const tap = {
      ref,
      eventId: ev.eventId,
      instagramHandle: ev.instagramHandle,
      brandName: ev.brandName,
      category: ev.category,
      attributedPlatform: attr.platform,
      attributionReason: attr.reason,
    };
    let autoLeadClickId: string | null = null;
    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        // Atomic: only a visit row that holds no tap yet takes this one; a
        // concurrent (or later) tap of the same visit gets a row of its own.
        const took = await tx.adClick.updateMany({
          where: { id: visitRow.id, ref: null },
          data: tap,
        });
        let click: AdClick;
        if (took.count === 1) {
          const fill = missingFields(visitRow, fields);
          click = Object.keys(fill).length
            ? await tx.adClick.update({ where: { id: visitRow.id }, data: fill })
            : ({ ...visitRow, ...tap } as AdClick);
        } else {
          if (!(await this.allowNewRow(cfg))) return "dropped" as const;
          click = await tx.adClick.create({
            data: { visitId: ev.visitId, createdAt: now, ...fields, ...tap },
          });
        }
        const { skip, autoLead } = await this.leadSkipReason(tx, visitRow, click, ctx, now, attr.platform);
        autoLeadClickId = autoLead ? click.id : null;
        const toTikTok = attr.platform === "TIKTOK";
        // A TikTok-attributed tap sends nothing to Meta: the row stays as a visible SKIPPED marker.
        await tx.metaEventOutbox.create({
          data: {
            leadId: null,
            adClickId: click.id,
            route: "WEBSITE",
            eventName: "Lead",
            eventTime: now,
            status: skip || toTikTok ? "SKIPPED" : "PENDING_CONFIG",
            lastError: toTikTok ? SKIP_META_ATTRIBUTED_TIKTOK : skip,
            payload: { event_name: "Lead" },
            dedupeKey: `click:${ev.eventId}`,
          },
        });
        if (toTikTok) {
          await tx.tikTokEventOutbox.create({
            data: {
              leadId: null,
              adClickId: click.id,
              eventName: "Contact",
              eventTime: now,
              status: skip ? "SKIPPED" : "PENDING_CONFIG",
              lastError: skip,
              payload: { event: "Contact" },
              dedupeKey: `click:${ev.eventId}`,
            },
          });
        }
        return "ok" as const;
      });
      if (outcome === "ok" && autoLeadClickId) await this.autoCreateLead(autoLeadClickId, ctx, now);
      return { outcome };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { outcome: (await this.tapOutcome(ref, ev.eventId)) ?? "conflict" };
      }
      throw error;
    }
  }

  /**
   * Auto-creates the CRM lead of a gated tap, after the click is committed.
   * Never fails the request: on any error the click stays stored and staff
   * can still link it by pasting the chat. Logs carry no visitor data.
   */
  private async autoCreateLead(clickId: string, ctx: ClickContext, now: Date): Promise<void> {
    if (!this.autoLeads) return;
    try {
      await this.autoLeads.createForTap(clickId, ctx.userAgent, now);
    } catch (error) {
      this.logger.warn(`Auto-lead for a landing-page tap failed: ${(error as Error).message}`);
    }
  }

  /**
   * The click-time Lead gate. Every Lead is stored and stays linkable in the
   * CRM. `skip` is null when the Lead may be forwarded to Meta, else the
   * SKIPPED reason; forwarding needs ALL of:
   *  1. a PageView of the same visit, from the same network (IPv4 address /
   *     IPv6 /64), at least LEAD_MIN_PAGEVIEW_AGE_MS earlier;
   *  2. no Lead of this visit forwarded yet (atomic claim on the visit row);
   *  3. at most LEAD_IP_CAP_PER_HOUR verified first taps per network per hour;
   *  4. when the visit carries a Meta click id (fbclid / _fbc): no Lead
   *     forwarded for that click id in the last 24 h (organic visits have
   *     none and are not refused for it).
   * `autoLead` (a waiting CRM lead may be created) needs 1, the visit's FIRST
   * tap (the one the visit row took, atomically) and 3, but no Meta click id.
   * The counters for 3 and 4 live in Redis; when it cannot be reached neither
   * happens (fail closed). A refusal after the visit claim releases it.
   */
  private async leadSkipReason(
    tx: Tx,
    visitRow: AdClick,
    click: AdClick,
    ctx: ClickContext,
    now: Date,
    platform: AttributedPlatform = "META",
  ): Promise<LeadGate> {
    const network = ipBucket(ctx.ip);
    const pageViewAt = visitRow.pageViewAt;
    if (
      !network ||
      !pageViewAt ||
      ipBucket(visitRow.clientIp) !== network ||
      now.getTime() - pageViewAt.getTime() < LEAD_MIN_PAGEVIEW_AGE_MS
    ) {
      return { skip: SKIP_UNVERIFIED_VISIT, autoLead: false };
    }

    // the visit row takes exactly one tap (conditional update on ref null)
    const firstTap = click.id === visitRow.id;
    const first = await tx.adClick.updateMany({
      where: { id: visitRow.id, leadForwardedAt: null },
      data: { leadForwardedAt: now },
    });
    const claimed = first.count === 1;
    if (!claimed && !firstTap) return { skip: SKIP_DUPLICATE_VISIT_LEAD, autoLead: false };

    let reason: string | null = claimed ? null : SKIP_DUPLICATE_VISIT_LEAD;
    let ipCapped = true;
    try {
      // one budget per network for forwarded Leads and auto-created leads
      ipCapped =
        (await this.counters.increment(`lead-ip:${network}`, HOUR_MS)) > LEAD_IP_CAP_PER_HOUR;
      if (!reason && ipCapped) reason = SKIP_IP_LEAD_CAP;
      // the duplicate-click-id guard uses the id of the platform that gets the tap
      const clickId =
        platform === "TIKTOK"
          ? (click.ttclid ?? visitRow.ttclid)
          : metaClickId(click.fbclid ?? visitRow.fbclid, click.fbc ?? visitRow.fbc);
      if (!reason && clickId) {
        const key = createHash("sha256").update(clickId).digest("hex").slice(0, 32);
        const counter = platform === "TIKTOK" ? `lead-click:tt:${key}` : `lead-click:${key}`;
        if ((await this.counters.increment(counter, DAY_MS)) > 1) {
          reason = SKIP_DUPLICATE_CLICK_ID;
        }
      }
    } catch (error) {
      this.logger.warn(`Lead rate-limit store unavailable: ${(error as Error).message}`);
      reason = SKIP_LIMITER_UNAVAILABLE;
      ipCapped = true;
    }
    if (reason && claimed) {
      await tx.adClick.updateMany({
        where: { id: visitRow.id, leadForwardedAt: now },
        data: { leadForwardedAt: null },
      });
    }
    return { skip: reason, autoLead: firstTap && !ipCapped };
  }

  // ---------------------------------------------------------------------
  // linking
  // ---------------------------------------------------------------------

  /** Click preview for a code found in pasted text (quick-add chip). */
  async previewForText(text: string | null | undefined): Promise<AdClickPreview | null> {
    const ref = extractRefCode(text);
    return ref ? this.preview(ref) : null;
  }

  async preview(ref: string): Promise<AdClickPreview | null> {
    const code = normalizeRefCode(ref);
    if (!code) return null;
    const click = await this.prisma.adClick.findUnique({
      where: { ref: code },
      select: {
        ref: true,
        createdAt: true,
        pageUrl: true,
        campaignCode: true,
        leadId: true,
        instagramHandle: true,
        lead: { select: { id: true, name: true, instagramHandle: true, awaitingWhatsapp: true } },
      },
    });
    if (!click) return null;
    const campaign = click.campaignCode
      ? await this.prisma.campaign.findFirst({
          where: { code: { equals: click.campaignCode, mode: "insensitive" } },
          select: { id: true, name: true, code: true },
        })
      : null;
    return {
      ref: code,
      createdAt: click.createdAt,
      pageUrl: click.pageUrl,
      campaignCode: click.campaignCode,
      campaign,
      instagramHandle: click.instagramHandle,
      available: !click.leadId,
      waitingLead: click.lead?.awaitingWhatsapp
        ? { id: click.lead.id, name: click.lead.name, instagramHandle: click.lead.instagramHandle }
        : null,
    };
  }

  /**
   * The Kode was confirmed for this lead (pasted chat / staff): attaches its
   * click as KODE (see attachClickInTx), or upgrades the lead's own HANDLE /
   * AUTO_CREATE click to KODE. Returns the click, or null when the code is
   * unknown or already linked to another lead. A lead may hold several clicks.
   */
  async linkInTx(tx: Tx, rawRef: string, leadId: string) {
    const ref = normalizeRefCode(rawRef);
    if (!ref) return null;
    const click = await tx.adClick.findUnique({ where: { ref } });
    if (!click || (click.leadId && click.leadId !== leadId)) return null;
    if (click.leadId === leadId) {
      await confirmKodeInTx(tx, ref, leadId);
      return click;
    }
    if (!(await attachClickInTx(tx, click, leadId, "KODE"))) return null;
    return { ...click, leadId };
  }

  /**
   * Manual / ingest link of a code to an existing lead: links the click, marks
   * the lead as a website lead (unless it is a CTWA lead), fills in the
   * campaign when the lead has none, and writes a timeline row.
   * Returns "linked" | "not_found" | "taken".
   */
  async linkLead(
    leadId: string,
    rawRef: string,
    actorId: string | null,
  ): Promise<"linked" | "not_found" | "taken"> {
    const ref = normalizeRefCode(rawRef);
    if (!ref) return "not_found";
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.adClick.findUnique({
        where: { ref },
        select: { leadId: true },
      });
      if (!before) return "not_found" as const;
      if (before.leadId === leadId) {
        // staff confirm a tap already on this lead (e.g. an unverified HANDLE tap)
        await confirmKodeInTx(tx, ref, leadId);
        return "linked" as const;
      }
      if (before.leadId) return "taken" as const;
      const click = await this.linkInTx(tx, ref, leadId);
      if (!click) return "taken" as const;
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        select: { ctwaClid: true, source: true, campaignId: true, campaignCode: true },
      });
      const data: Prisma.LeadUncheckedUpdateInput = {};
      if (lead && !lead.ctwaClid && lead.source !== "WHATSAPP_CTWA") data.source = "WEBSITE";
      if (lead && !lead.campaignId && click.campaignCode) {
        const campaign = await tx.campaign.findFirst({
          where: { code: { equals: click.campaignCode, mode: "insensitive" } },
          select: { id: true, code: true },
        });
        if (campaign) {
          data.campaignId = campaign.id;
          data.campaignCode = campaign.code;
          data.campaignSource = "AUTO";
        }
      }
      if (Object.keys(data).length) await tx.lead.update({ where: { id: leadId }, data });
      await tx.leadActivity.create({
        data: { leadId, type: "NOTE", body: `@lead.adClickLinked: ${ref}`, actorId },
      });
      return "linked" as const;
    });
  }


  // ---------------------------------------------------------------------
  // retention + stats
  // ---------------------------------------------------------------------

  /** Nightly: drop what can no longer be linked, then end PII retention on linked clicks. */
  @Cron("20 3 * * *", { name: "ad-click-retention" })
  async purgeCron(): Promise<void> {
    try {
      const n = await this.purgeUnlinked();
      if (n) this.logger.log(`Purged ${n} unlinked ad click(s)`);
      const scrubbed = await this.scrubLinkedClickPii();
      if (scrubbed) this.logger.log(`Removed device identifiers from ${scrubbed} linked ad click(s)`);
    } catch (error) {
      this.logger.warn(`Ad click purge failed: ${(error as Error).message}`);
    }
    try {
      const closed = (await this.autoLeads?.closeStale()) ?? 0;
      if (closed) this.logger.log(`Closed ${closed} waiting lead(s) that never sent the WhatsApp message`);
    } catch (error) {
      this.logger.warn(`Waiting lead cleanup failed: ${(error as Error).message}`);
    }
  }

  /**
   * Unlinked clicks are only useful for linking:
   *  - visit rows without a WhatsApp tap (ref null) go after 48 hours;
   *  - unlinked taps (ref set) after AD_CLICK_RETENTION_DAYS;
   *  - click-time website Lead rows of a click that is still unlinked after
   *    7 days, or as soon as their click is gone. Rows of a linked click are
   *    kept (linkInTx sets their leadId; rows linked before that existed are
   *    protected by the adClick.leadId check).
   * Returns the number of ad_clicks rows deleted.
   */
  async purgeUnlinked(now: Date = new Date()): Promise<number> {
    const t = now.getTime();
    const res = await this.prisma.adClick.deleteMany({
      where: {
        leadId: null,
        OR: [
          { ref: null, createdAt: { lt: new Date(t - AD_CLICK_NO_REF_RETENTION_HOURS * HOUR_MS) } },
          { createdAt: { lt: new Date(t - AD_CLICK_RETENTION_DAYS * DAY_MS) } },
        ],
      },
    });
    // after the clicks: deleting a click nulls adClickId on its outbox rows
    const orphans = await this.prisma.metaEventOutbox.deleteMany({
      where: {
        route: "WEBSITE",
        leadId: null,
        OR: [
          { adClickId: null },
          {
            adClick: { leadId: null },
            createdAt: { lt: new Date(t - ORPHAN_WEB_EVENT_RETENTION_DAYS * DAY_MS) },
          },
        ],
      },
    });
    // TikTok click-time Contact rows follow the same rule
    await this.prisma.tikTokEventOutbox.deleteMany({
      where: {
        leadId: null,
        OR: [
          { adClickId: null },
          {
            adClick: { leadId: null },
            createdAt: { lt: new Date(t - ORPHAN_WEB_EVENT_RETENTION_DAYS * DAY_MS) },
          },
        ],
      },
    });
    if (orphans.count) {
      this.logger.log(
        `Purged ${orphans.count} website Lead event row(s) of unlinked or deleted ad clicks`,
      );
    }
    return res.count;
  }

  /**
   * Linked clicks older than AD_CLICK_PII_RETENTION_DAYS (default 90) lose the
   * device identifiers: clientIp, userAgent, fbclid, fbc, fbp, ttclid, referrer, and
   * the fbclid / ttclid parameters of pageUrl (rewritten in batches until done or
   * PII_SCRUB_BUDGET_MS is spent; the next night continues). Later website
   * stage events for such a lead go out with the hashed lead data and
   * external_id only. Returns the rows whose identifiers were nulled.
   */
  async scrubLinkedClickPii(
    now: Date = new Date(),
    days?: number,
    budgetMs: number = PII_SCRUB_BUDGET_MS,
  ): Promise<number> {
    const started = Date.now();
    const retention = days ?? this.config().piiRetentionDays;
    const cutoff = new Date(now.getTime() - retention * DAY_MS);
    const res = await this.prisma.adClick.updateMany({
      where: {
        leadId: { not: null },
        createdAt: { lt: cutoff },
        OR: [
          { clientIp: { not: null } },
          { userAgent: { not: null } },
          { fbclid: { not: null } },
          { fbc: { not: null } },
          { fbp: { not: null } },
          { ttclid: { not: null } },
          { referrer: { not: null } },
        ],
      },
      data: { clientIp: null, userAgent: null, fbclid: null, fbc: null, fbp: null, ttclid: null, referrer: null },
    });
    // Keyset pagination by id: every row is visited at most once per run, so
    // the loop ends even when a URL cannot be cleaned (it is nulled instead).
    let afterId: string | null = null;
    while (Date.now() - started < budgetMs) {
      const batch: Array<{ id: string; pageUrl: string | null }> = await this.prisma.adClick.findMany({
        where: {
          leadId: { not: null },
          createdAt: { lt: cutoff },
          OR: [{ pageUrl: { contains: "fbclid=" } }, { pageUrl: { contains: "ttclid=" } }],
          ...(afterId ? { id: { gt: afterId } } : {}),
        },
        select: { id: true, pageUrl: true },
        orderBy: { id: "asc" },
        take: PII_SCRUB_BATCH,
      });
      for (const row of batch) {
        const cleaned = row.pageUrl ? stripClickIdFromUrl(row.pageUrl) : null;
        await this.prisma.adClick.update({
          where: { id: row.id },
          data: {
            pageUrl: cleaned && !cleaned.includes("fbclid=") && !cleaned.includes("ttclid=") ? cleaned : null,
          },
        });
      }
      if (batch.length < PII_SCRUB_BATCH) break;
      afterId = batch[batch.length - 1].id;
    }
    return res.count;
  }

  async stats(now: Date = new Date()) {
    const since = new Date(now.getTime() - 7 * DAY_MS);
    // visit rows without a tap are kept 48 h, so page views are counted over that window
    const since48h = new Date(now.getTime() - AD_CLICK_NO_REF_RETENTION_HOURS * HOUR_MS);
    const [pageViews48h, clicks7d, linked7d, linkedTotal, qualifiedSent, groups, autoLeads7d, waitingNow] =
      await Promise.all([
      this.prisma.adClick.count({ where: { pageViewAt: { gte: since48h } } }),
      this.prisma.adClick.count({ where: { createdAt: { gte: since }, ref: { not: null } } }),
      this.prisma.adClick.count({ where: { createdAt: { gte: since }, leadId: { not: null } } }),
      this.prisma.adClick.count({ where: { leadId: { not: null } } }),
      this.prisma.metaEventOutbox.count({
        where: { route: "WEBSITE", eventName: "QualifiedLead", status: "SENT" },
      }),
      this.prisma.metaEventOutbox.groupBy({
        by: ["status"],
        where: { route: "WEBSITE" },
        _count: { _all: true },
      }),
      this.prisma.lead.count({ where: { autoCreated: true, createdAt: { gte: since } } }),
      this.prisma.lead.count({ where: { awaitingWhatsapp: true } }),
    ]);
    const events: Record<string, number> = {
      PENDING_CONFIG: 0,
      QUEUED: 0,
      SENT: 0,
      FAILED: 0,
      SKIPPED: 0,
    };
    for (const g of groups) events[g.status] = g._count._all;
    const lastSent = await this.prisma.metaEventOutbox.findFirst({
      where: { route: "WEBSITE", status: "SENT" },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true, eventName: true },
    });
    const lastFailed = await this.prisma.metaEventOutbox.findFirst({
      where: { route: "WEBSITE", status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true, eventName: true, lastError: true },
    });
    return {
      pageViews48h,
      clicks7d,
      qualifiedSent,
      linked7d,
      linkedTotal,
      autoLeads7d,
      waitingNow,
      events,
      lastSentAt: lastSent?.sentAt ?? null,
      lastFailed: lastFailed
        ? { at: lastFailed.updatedAt, eventName: lastFailed.eventName, error: lastFailed.lastError }
        : null,
    };
  }
}
