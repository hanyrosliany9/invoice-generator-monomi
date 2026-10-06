import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AdClick, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AdTrackingConfig, allowedPageUrl, resolveAdTrackingConfig } from "./ad-tracking.config";
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

/** Unlinked WhatsApp taps (rows with a ref) are kept this long for linking. */
export const AD_CLICK_RETENTION_DAYS = 30;
/** Visit rows without a WhatsApp tap can never be linked: kept only briefly. */
export const AD_CLICK_NO_REF_RETENTION_HOURS = 48;
/** Click-time website Lead rows (never linked to a CRM lead) are dropped after this. */
export const ORPHAN_WEB_EVENT_RETENTION_DAYS = 7;
/** A click-time Lead is forwarded only after a PageView this much earlier. */
export const LEAD_MIN_PAGEVIEW_AGE_MS = 3000;
/** Forwarded click-time Leads per network (IPv4 address / IPv6 /64) per hour. */
export const LEAD_IP_CAP_PER_HOUR = 10;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** Outbox events that exist for the website route when a lead is linked later. */
const RELINKABLE_EVENTS = ["QualifiedLead", "Purchase"];

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

/** pageUrl without its fbclid query parameter (used when PII retention ends). */
export function stripClickIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    u.searchParams.delete("fbclid");
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
  ): Promise<AdClick | null> {
    const existing = await this.prisma.adClick.findFirst({
      where: { visitId },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;
    if (!(await this.allowNewRow(cfg))) return null;
    try {
      return await this.prisma.adClick.create({
        data: { visitId, visitKey: visitId, createdAt: now, ...fields },
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
   *    to Meta, SKIPPED (+ reason) otherwise (see leadSkipReason). Idempotent
   *    on eventId; a different eventId for an existing ref (or the reverse)
   *    is a conflict.
   * The page URL is kept only when its origin is an allowed landing page.
   */
  async recordEvent(ev: ParsedTrackEvent, ctx: ClickContext): Promise<RecordResult> {
    const now = new Date();
    const cfg = this.config();
    const campaignCode = await this.resolveCampaignCode(ev.utmCampaign);
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
      clientIp: ctx.ip,
      userAgent: ctx.userAgent ? ctx.userAgent.slice(0, USER_AGENT_MAX) : null,
      campaignCode,
    };
    if (ev.name === "Lead") return this.recordLead(ev, ctx, fields, now, cfg);

    let row = await this.ensureVisitRow(ev.visitId, fields, now, cfg);
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
        },
      },
    };
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

    const visitRow = await this.ensureVisitRow(ev.visitId, fields, now, cfg);
    if (!visitRow) return { outcome: "dropped" };
    const tap = {
      ref,
      eventId: ev.eventId,
      instagramHandle: ev.instagramHandle,
      brandName: ev.brandName,
      category: ev.category,
    };
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
        const skip = await this.leadSkipReason(tx, visitRow, click, ctx, now);
        await tx.metaEventOutbox.create({
          data: {
            leadId: null,
            adClickId: click.id,
            route: "WEBSITE",
            eventName: "Lead",
            eventTime: now,
            status: skip ? "SKIPPED" : "PENDING_CONFIG",
            lastError: skip,
            payload: { event_name: "Lead" },
            dedupeKey: `click:${ev.eventId}`,
          },
        });
        return "ok" as const;
      });
      return { outcome };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { outcome: (await this.tapOutcome(ref, ev.eventId)) ?? "conflict" };
      }
      throw error;
    }
  }

  /**
   * Whether a click-time Lead may be forwarded to Meta (null) or is only
   * stored (the SKIPPED reason). Every Lead is stored and stays linkable in
   * the CRM; forwarding needs ALL of:
   *  1. a PageView of the same visit, from the same network (IPv4 address /
   *     IPv6 /64), at least LEAD_MIN_PAGEVIEW_AGE_MS earlier;
   *  2. no Lead of this visit forwarded yet (atomic claim on the visit row);
   *  3. when the visit carries a Meta click id (fbclid / _fbc): no Lead
   *     forwarded for that click id in the last 24 h (organic visits have
   *     none and are not refused for it);
   *  4. at most LEAD_IP_CAP_PER_HOUR forwarded Leads per network per hour.
   * The counters for 3 and 4 live in Redis; when it cannot be reached the
   * Lead is not forwarded. A refusal after the visit claim releases it.
   */
  private async leadSkipReason(
    tx: Tx,
    visitRow: AdClick,
    click: AdClick,
    ctx: ClickContext,
    now: Date,
  ): Promise<string | null> {
    const network = ipBucket(ctx.ip);
    const pageViewAt = visitRow.pageViewAt;
    if (
      !network ||
      !pageViewAt ||
      ipBucket(visitRow.clientIp) !== network ||
      now.getTime() - pageViewAt.getTime() < LEAD_MIN_PAGEVIEW_AGE_MS
    ) {
      return SKIP_UNVERIFIED_VISIT;
    }

    const first = await tx.adClick.updateMany({
      where: { id: visitRow.id, leadForwardedAt: null },
      data: { leadForwardedAt: now },
    });
    if (first.count === 0) return SKIP_DUPLICATE_VISIT_LEAD;

    let reason: string | null = null;
    try {
      const clickId = metaClickId(click.fbclid ?? visitRow.fbclid, click.fbc ?? visitRow.fbc);
      if (clickId) {
        const key = createHash("sha256").update(clickId).digest("hex").slice(0, 32);
        if ((await this.counters.increment(`lead-click:${key}`, DAY_MS)) > 1) {
          reason = SKIP_DUPLICATE_CLICK_ID;
        }
      }
      if (
        !reason &&
        (await this.counters.increment(`lead-ip:${network}`, HOUR_MS)) > LEAD_IP_CAP_PER_HOUR
      ) {
        reason = SKIP_IP_LEAD_CAP;
      }
    } catch (error) {
      this.logger.warn(`Lead rate-limit store unavailable: ${(error as Error).message}`);
      reason = SKIP_LIMITER_UNAVAILABLE;
    }
    if (reason) {
      await tx.adClick.updateMany({
        where: { id: visitRow.id, leadForwardedAt: now },
        data: { leadForwardedAt: null },
      });
    }
    return reason;
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
      select: { ref: true, createdAt: true, pageUrl: true, campaignCode: true, leadId: true, instagramHandle: true },
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
    };
  }

  /**
   * Atomically attaches a click to a lead. Returns the click, or null when
   * the code is unknown, already linked to another lead, or the lead already
   * has a click. Website events the lead had already earned while it was
   * unlinked (skipped as "no click") are re-routed to the website route.
   */
  async linkInTx(tx: Tx, rawRef: string, leadId: string) {
    const ref = normalizeRefCode(rawRef);
    if (!ref) return null;
    const click = await tx.adClick.findUnique({ where: { ref } });
    if (!click || (click.leadId && click.leadId !== leadId)) return null;
    if (click.leadId === leadId) return click;
    const hasOther = await tx.adClick.findUnique({
      where: { leadId },
      select: { id: true },
    });
    if (hasOther) return null;
    const claimed = await tx.adClick.updateMany({
      where: { id: click.id, leadId: null },
      data: { leadId, linkedAt: new Date() },
    });
    if (claimed.count === 0) return null;

    if (click.instagramHandle) {
      await tx.lead.updateMany({
        where: { id: leadId, instagramHandle: null },
        data: { instagramHandle: click.instagramHandle },
      });
    }
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      select: { ctwaClid: true },
    });
    if (lead && !lead.ctwaClid) {
      await tx.metaEventOutbox.updateMany({
        where: {
          leadId,
          route: "BUSINESS_MESSAGING",
          eventName: { in: RELINKABLE_EVENTS },
          status: { in: ["PENDING_CONFIG", "SKIPPED"] },
        },
        data: {
          route: "WEBSITE",
          adClickId: click.id,
          status: "PENDING_CONFIG",
          lastError: null,
          nextTryAt: null,
        },
      });
    }
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
      if (before.leadId === leadId) return "linked" as const;
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
  }

  /**
   * Unlinked clicks are only useful for linking:
   *  - visit rows without a WhatsApp tap (ref null) go after 48 hours;
   *  - unlinked taps (ref set) after AD_CLICK_RETENTION_DAYS;
   *  - click-time website Lead rows (never tied to a CRM lead) after 7 days,
   *    or as soon as their click is gone.
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
          { createdAt: { lt: new Date(t - ORPHAN_WEB_EVENT_RETENTION_DAYS * DAY_MS) } },
        ],
      },
    });
    if (orphans.count) this.logger.log(`Purged ${orphans.count} unlinked website Lead event row(s)`);
    return res.count;
  }

  /**
   * Linked clicks older than AD_CLICK_PII_RETENTION_DAYS (default 90) lose the
   * device identifiers: clientIp, userAgent, fbclid, fbc, fbp, and the fbclid
   * parameter of pageUrl. Later website stage events for such a lead go out
   * with the hashed lead data and external_id only. Returns the rows changed.
   */
  async scrubLinkedClickPii(now: Date = new Date(), days?: number): Promise<number> {
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
        ],
      },
      data: { clientIp: null, userAgent: null, fbclid: null, fbc: null, fbp: null },
    });
    const withClickId = await this.prisma.adClick.findMany({
      where: { leadId: { not: null }, createdAt: { lt: cutoff }, pageUrl: { contains: "fbclid=" } },
      select: { id: true, pageUrl: true },
      take: 1000,
    });
    for (const row of withClickId) {
      await this.prisma.adClick.update({
        where: { id: row.id },
        data: { pageUrl: row.pageUrl ? stripClickIdFromUrl(row.pageUrl) : null },
      });
    }
    return res.count;
  }

  async stats(now: Date = new Date()) {
    const since = new Date(now.getTime() - 7 * DAY_MS);
    // visit rows without a tap are kept 48 h, so page views are counted over that window
    const since48h = new Date(now.getTime() - AD_CLICK_NO_REF_RETENTION_HOURS * HOUR_MS);
    const [pageViews48h, clicks7d, linked7d, linkedTotal, qualifiedSent, groups] = await Promise.all([
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
      events,
      lastSentAt: lastSent?.sentAt ?? null,
      lastFailed: lastFailed
        ? { at: lastFailed.updatedAt, eventName: lastFailed.eventName, error: lastFailed.lastError }
        : null,
    };
  }
}
