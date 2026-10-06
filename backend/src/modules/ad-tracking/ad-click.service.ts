import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ParsedWaClick } from "./wa-click.payload";
import { extractRefCode, normalizeRefCode } from "./ref-code";

export const AD_CLICK_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;
/** Outbox events that exist for the website route when a lead is linked later. */
const RELINKABLE_EVENTS = ["QualifiedLead", "Purchase"];

type Tx = Prisma.TransactionClient;

export type RecordOutcome = "created" | "duplicate" | "conflict";

export interface ClickContext {
  ip: string | null;
  userAgent: string | null;
}

export interface AdClickPreview {
  ref: string;
  createdAt: Date;
  pageUrl: string | null;
  campaignCode: string | null;
  campaign: { id: string; name: string; code: string } | null;
  /** True when no lead holds this click yet (so it can still be linked). */
  available: boolean;
}

/**
 * Landing-page WhatsApp clicks: storage, the click-time website Lead event,
 * and linking a click to the CRM lead created from the matching chat.
 */
@Injectable()
export class AdClickService {
  private readonly logger = new Logger(AdClickService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // public click endpoint
  // ---------------------------------------------------------------------

  /**
   * Stores a click and queues its website `Lead` event (same eventId as the
   * browser Pixel Lead, so Meta deduplicates the pair). Idempotent on eventId;
   * a different eventId for an existing ref (or the reverse) is a conflict.
   */
  async record(click: ParsedWaClick, ctx: ClickContext): Promise<RecordOutcome> {
    const existing = await this.prisma.adClick.findFirst({
      where: { OR: [{ ref: click.ref }, { eventId: click.eventId }] },
      select: { ref: true, eventId: true },
    });
    if (existing) {
      return existing.ref === click.ref && existing.eventId === click.eventId
        ? "duplicate"
        : "conflict";
    }

    const campaignCode = click.utmCampaign
      ? ((
          await this.prisma.campaign.findFirst({
            where: { code: { equals: click.utmCampaign, mode: "insensitive" } },
            select: { code: true },
          })
        )?.code ?? null)
      : null;
    // The Pixel script normally sets _fbc; rebuild it from fbclid when only
    // the raw click id reached us (format: fb.<subdomain index>.<ms>.<fbclid>).
    const fbc =
      click.fbc ?? (click.fbclid ? `fb.1.${Date.now()}.${click.fbclid}` : null);
    const createdAt = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.adClick.create({
          data: {
            ref: click.ref,
            eventId: click.eventId,
            createdAt,
            pageUrl: click.pageUrl,
            referrer: click.referrer,
            utmSource: click.utmSource,
            utmMedium: click.utmMedium,
            utmCampaign: click.utmCampaign,
            utmContent: click.utmContent,
            utmTerm: click.utmTerm,
            fbclid: click.fbclid,
            fbc,
            fbp: click.fbp,
            clientIp: ctx.ip,
            userAgent: ctx.userAgent,
            meta: click.meta ?? undefined,
            campaignCode,
          },
        });
        await tx.metaEventOutbox.create({
          data: {
            leadId: null,
            adClickId: created.id,
            route: "WEBSITE",
            eventName: "Lead",
            eventTime: createdAt,
            status: "PENDING_CONFIG",
            payload: { event_name: "Lead" },
            dedupeKey: `click:${click.eventId}`,
          },
        });
      });
      return "created";
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        const again = await this.prisma.adClick.findFirst({
          where: { OR: [{ ref: click.ref }, { eventId: click.eventId }] },
          select: { ref: true, eventId: true },
        });
        return again?.ref === click.ref && again?.eventId === click.eventId
          ? "duplicate"
          : "conflict";
      }
      throw error;
    }
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
      select: { ref: true, createdAt: true, pageUrl: true, campaignCode: true, leadId: true },
    });
    if (!click) return null;
    const campaign = click.campaignCode
      ? await this.prisma.campaign.findFirst({
          where: { code: { equals: click.campaignCode, mode: "insensitive" } },
          select: { id: true, name: true, code: true },
        })
      : null;
    return {
      ref: click.ref,
      createdAt: click.createdAt,
      pageUrl: click.pageUrl,
      campaignCode: click.campaignCode,
      campaign,
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

  /** Unlinked clicks are only useful for linking; drop them after 30 days. */
  @Cron("20 3 * * *", { name: "ad-click-retention" })
  async purgeCron(): Promise<void> {
    try {
      const n = await this.purgeUnlinked();
      if (n) this.logger.log(`Purged ${n} unlinked ad click(s) older than ${AD_CLICK_RETENTION_DAYS} days`);
    } catch (error) {
      this.logger.warn(`Ad click purge failed: ${(error as Error).message}`);
    }
  }

  async purgeUnlinked(now: Date = new Date()): Promise<number> {
    const res = await this.prisma.adClick.deleteMany({
      where: {
        leadId: null,
        createdAt: { lt: new Date(now.getTime() - AD_CLICK_RETENTION_DAYS * DAY_MS) },
      },
    });
    return res.count;
  }

  async stats(now: Date = new Date()) {
    const since = new Date(now.getTime() - 7 * DAY_MS);
    const [clicks7d, linked7d, linkedTotal, groups] = await Promise.all([
      this.prisma.adClick.count({ where: { createdAt: { gte: since } } }),
      this.prisma.adClick.count({ where: { createdAt: { gte: since }, leadId: { not: null } } }),
      this.prisma.adClick.count({ where: { leadId: { not: null } } }),
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
      clicks7d,
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
