import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Lead, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { escapeActivityText, normalizePhone, waIdFromPhone } from "../crm/crm.utils";
import { AdTrackingConfig, resolveAdTrackingConfig } from "./ad-tracking.config";
import { attachClickInTx, confirmKodeInTx, rerouteToWebsiteInTx } from "./click-link";
import { InMemoryTrackCounters, TrackCounters } from "./track-limits";
import { isBotUserAgent } from "./track-utils";

type Tx = Prisma.TransactionClient;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const NAME_MAX = 120;
const STALE_BATCH = 500;

/** lostReason of a waiting lead merged into an existing lead (no Meta event). */
export const LOST_REASON_DUPLICATE = "Duplicate";
/** lostReason of a waiting lead that never sent the WhatsApp message (no Meta event). */
export const LOST_REASON_NEVER_SENT_WHATSAPP = "Never sent WhatsApp";
/** Marker row on a merge target: the merged placeholder already sent / queued this event. */
export const SKIP_SENT_BEFORE_MERGE =
  "SKIP_SENT_BEFORE_MERGE: already sent or queued for the merged landing-page lead of this person";
/** Stage events a merge carries over (sent or still going to be sent). */
const CARRY_EVENTS = ["QualifiedLead", "Purchase"];
const CARRY_STATUSES = ["PENDING_CONFIG", "QUEUED", "SENT"] as const;

/** Display name of an auto-created lead: brand, else "@handle", else "Website visitor · <Kode>". */
export function autoLeadName(
  brandName: string | null | undefined,
  instagramHandle: string | null | undefined,
  ref: string,
): string {
  const brand = brandName?.trim();
  if (brand) return brand.slice(0, NAME_MAX);
  if (instagramHandle) return `@${instagramHandle}`;
  return `Website visitor · ${ref}`;
}

/**
 * What happened to a gated landing-page tap:
 *  created   a new waiting lead
 *  attached  linked to an open lead with the same Instagram handle
 *  capped    global hourly cap reached (or its counter unavailable)
 *  disabled  PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR=0
 *  bot       bot / tool user agent
 *  skipped   click gone, already linked, or no open stage
 */
export type AutoLeadOutcome = "created" | "attached" | "capped" | "disabled" | "bot" | "skipped";

/** The most recent closed (Won / Lost) lead of a returning client. */
export interface ReturningFrom {
  id: string;
  name: string;
  stageType: "WON" | "LOST";
}

export type WaitingLeadOutcome =
  | { outcome: "filled"; leadId: string; returningFrom?: ReturningFrom | null }
  | { outcome: "merged"; leadId: string; fromLeadId: string; placeholderDeleted: boolean };

/** Where a waiting lead's number leads: an open lead to merge into, else a past (closed) lead. */
export interface WaitingPhoneMatch {
  mergeInto: { id: string; name: string } | null;
  returningFrom: ReturningFrom | null;
}

export interface ResolveWaitingInput {
  /** WhatsApp number from the chat (normalised here). */
  phone: string;
  /** A person's name found in the chat (replaces a placeholder name only). */
  name?: string | null;
  /** The pasted / received first message. */
  message?: string | null;
  /** Timeline body for that message (e.g. "@wa.in: ..."); default: the escaped message. */
  activityBody?: string | null;
  waId?: string | null;
  /** Owner for a filled-in lead that has none (quick-add's owner field). */
  assignedToId?: string | null;
  /** The Kode the chat carried (quick-add / ingest): its click is confirmed (KODE). */
  confirmedRef?: string | null;
  actorId: string | null;
}

const notWaiting = () =>
  new ConflictException({
    statusCode: 409,
    code: "NOT_WAITING",
    message: "Lead ini sudah tidak menunggu pesan WhatsApp.",
  });

/**
 * CRM leads created straight from a landing-page WhatsApp tap ("waiting
 * leads": no phone until the chat arrives), and what happens when the chat
 * does arrive:
 *  - createForTap: a tap that passed the anti-abuse gate (AdClickService)
 *    gets a waiting lead, or is linked to an open lead with the same
 *    Instagram handle. Global hourly cap; never anything external (no
 *    outbound WhatsApp, no LeadSubmitted: the click-time Lead already went).
 *  - resolveWaitingLead: the chat (quick-add / "Add phone" / WhatsApp ingest)
 *    fills the phone in, or, when that number already has a lead, merges the
 *    waiting lead into it.
 *  - closeStale: nightly, waiting leads that never sent the chat -> Lost.
 */
@Injectable()
export class AutoLeadService {
  private readonly logger = new Logger(AutoLeadService.name);
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

  /**
   * Global cap on auto-created leads per hour (all instances, Redis fixed
   * window). Fails closed: when the counter store cannot be reached no lead
   * is created (the tap stays stored and staff can still link it).
   */
  async allowAutoLead(cfg: AdTrackingConfig = this.config()): Promise<boolean> {
    if (cfg.maxAutoLeadsPerHour <= 0) return false;
    try {
      const n = await this.counters.increment("auto-leads", HOUR_MS);
      if (n <= cfg.maxAutoLeadsPerHour) return true;
      if (n === cfg.maxAutoLeadsPerHour + 1) {
        this.logger.warn(
          `Auto-lead cap reached (${cfg.maxAutoLeadsPerHour}/hour): landing-page taps are stored without a CRM lead until the window resets`,
        );
      }
      return false;
    } catch (error) {
      this.logger.warn(`Auto-lead cap counter unavailable, no lead created: ${(error as Error).message}`);
      return false;
    }
  }

  /** Serialises auto-creation per Instagram handle (transaction-scoped advisory lock). */
  private async lockHandle(tx: Tx, handle: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`auto-lead:${handle}`})::bigint)`;
  }

  /**
   * A gated tap (see AdClickService.leadSkipReason): create a waiting lead,
   * or link the tap to an open lead with the same Instagram handle. Called
   * after the click is stored, outside its transaction, so any failure here
   * leaves the click stored and linkable by staff.
   *
   * The handle link is UNVERIFIED (anyone can type a public handle): the
   * click is attached as HANDLE, which only adds a "tapped again" note. It
   * never carries the lead's events and never changes the lead's fields,
   * until the chat or staff confirm its Kode (confirmKodeInTx).
   */
  async createForTap(
    clickId: string,
    userAgent: string | null,
    now: Date = new Date(),
  ): Promise<AutoLeadOutcome> {
    const cfg = this.config();
    if (cfg.maxAutoLeadsPerHour <= 0) return "disabled";
    if (isBotUserAgent(userAgent)) return "bot";
    if (!(await this.allowAutoLead(cfg))) return "capped";

    return this.prisma.$transaction(async (tx) => {
      const click = await tx.adClick.findUnique({ where: { id: clickId } });
      if (!click || !click.ref || click.leadId) return "skipped" as const;
      const handle = click.instagramHandle;

      if (handle) {
        await this.lockHandle(tx, handle);
        const existing = await tx.lead.findFirst({
          where: { instagramHandle: handle, stage: { type: "OPEN" } },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (existing) {
          if (!(await attachClickInTx(tx, click, existing.id, "HANDLE", now))) return "skipped" as const;
          await tx.leadActivity.create({
            data: { leadId: existing.id, type: "NOTE", body: `@lead.landingFormRepeat: ${click.ref}` },
          });
          return "attached" as const;
        }
      }

      const stage = await tx.leadStage.findFirst({
        where: { type: "OPEN", isActive: true },
        orderBy: { order: "asc" },
      });
      if (!stage) return "skipped" as const;
      const campaign = click.campaignCode
        ? await tx.campaign.findFirst({
            where: { code: { equals: click.campaignCode, mode: "insensitive" } },
            select: { id: true, code: true },
          })
        : null;
      const lead = await tx.lead.create({
        data: {
          name: autoLeadName(click.brandName, handle, click.ref),
          phone: null,
          waId: null,
          company: click.brandName ?? null,
          category: click.category ?? null,
          source: "WEBSITE",
          campaignId: campaign?.id ?? null,
          campaignCode: campaign?.code ?? null,
          campaignSource: campaign ? "AUTO" : null,
          instagramHandle: handle,
          stageId: stage.id,
          firstContactAt: now,
          lastContactAt: now,
          awaitingWhatsapp: true,
          autoCreated: true,
          nameIsPlaceholder: true,
        },
      });
      // Raced with a manual link of the same code: roll the new lead back.
      if (!(await attachClickInTx(tx, click, lead.id, "AUTO_CREATE", now))) {
        throw new Error("ad click was linked concurrently");
      }
      // Same opening row as a manual lead, but no Meta event: the click-time
      // website Lead was already sent (or skipped) for this tap.
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "STAGE_CHANGE",
          body: null,
          fromStageId: null,
          toStageId: stage.id,
          metaEvent: null,
          actorId: null,
        },
      });
      await tx.leadActivity.create({
        data: { leadId: lead.id, type: "NOTE", body: `@lead.fromLandingForm: ${click.ref}` },
      });
      return "created" as const;
    });
  }

  // ---------------------------------------------------------------------
  // the chat arrives
  // ---------------------------------------------------------------------

  /**
   * Other leads with this number: the most recent OPEN one (merge target),
   * else the most recent Won / Lost one (a returning client: not merged into,
   * the waiting lead becomes the new deal).
   */
  private async phoneMatchIn(db: Tx | PrismaService, phone: string, excludeId: string): Promise<WaitingPhoneMatch> {
    const open = await db.lead.findFirst({
      where: { phone, id: { not: excludeId }, stage: { type: "OPEN" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
    if (open) return { mergeInto: open, returningFrom: null };
    const closed = await db.lead.findFirst({
      where: { phone, id: { not: excludeId }, stage: { type: { in: ["WON", "LOST"] } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, stage: { select: { type: true } } },
    });
    return {
      mergeInto: null,
      returningFrom: closed
        ? { id: closed.id, name: closed.name, stageType: closed.stage.type as "WON" | "LOST" }
        : null,
    };
  }

  /** Quick-add preview: what saving this number on the waiting lead will do. */
  async waitingPhoneMatch(waitingId: string, rawPhone: string): Promise<WaitingPhoneMatch | null> {
    const phone = normalizePhone(rawPhone);
    return phone ? this.phoneMatchIn(this.prisma, phone, waitingId) : null;
  }

  /**
   * The WhatsApp chat of a waiting lead arrived (quick-add with its Kode,
   * "Add phone", WhatsApp ingest):
   *  a) the number has no OPEN lead: it is filled into the waiting lead,
   *     which stops waiting (its response clock starts now). When the number
   *     only has Won / Lost leads (a returning client) the waiting lead stays
   *     the new deal and gets a note pointing at the most recent closed lead;
   *  b) the number belongs to an open lead (the most recent one when there
   *     are several): the waiting lead is merged into it (see mergeInTx).
   */
  async resolveWaitingLead(waitingId: string, input: ResolveWaitingInput): Promise<WaitingLeadOutcome> {
    const phone = normalizePhone(input.phone);
    if (!phone) throw new BadRequestException("Nomor WhatsApp tidak valid");
    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: waitingId } });
      if (!lead) throw new NotFoundException("Lead tidak ditemukan");
      if (!lead.awaitingWhatsapp) throw notWaiting();
      const match = await this.phoneMatchIn(tx, phone, waitingId);
      if (match.mergeInto) return this.mergeInTx(tx, lead, match.mergeInto.id, input.actorId, input);
      const returningFrom = match.returningFrom;

      const now = new Date();
      const name = input.name?.trim();
      const claimed = await tx.lead.updateMany({
        where: { id: waitingId, awaitingWhatsapp: true },
        data: {
          phone,
          waId: input.waId ?? waIdFromPhone(phone),
          awaitingWhatsapp: false,
          firstContactAt: now,
          firstResponseAt: null,
          lastContactAt: now,
          ...(name && lead.nameIsPlaceholder ? { name: name.slice(0, NAME_MAX), nameIsPlaceholder: false } : {}),
          ...(input.message && !lead.firstMessage ? { firstMessage: input.message.slice(0, 4000) } : {}),
          ...(input.assignedToId && !lead.assignedToId ? { assignedToId: input.assignedToId } : {}),
        },
      });
      if (claimed.count === 0) throw notWaiting();
      const body = input.activityBody ?? (input.message ? escapeActivityText(input.message) : null);
      if (body) {
        await tx.leadActivity.create({
          data: { leadId: waitingId, type: "WHATSAPP", body, actorId: input.actorId },
        });
      }
      await tx.leadActivity.create({
        data: { leadId: waitingId, type: "NOTE", body: "@lead.phoneFilled", actorId: input.actorId },
      });
      if (input.confirmedRef) await confirmKodeInTx(tx, input.confirmedRef, waitingId);
      if (returningFrom) {
        // "<leadId> <WON|LOST> <name>": the UI links the id (name last: free text)
        await tx.leadActivity.create({
          data: {
            leadId: waitingId,
            type: "NOTE",
            body: `@lead.returningClient: ${returningFrom.id} ${returningFrom.stageType} ${returningFrom.name}`,
            actorId: input.actorId,
          },
        });
      }
      return { outcome: "filled" as const, leadId: waitingId, returningFrom };
    });
  }

  /**
   * Merge the waiting lead holding a Kode into a chosen lead: the manual
   * "Link ad click code" field, or a WhatsApp chat from a number whose open
   * lead is `targetId`. The Kode's click is confirmed (KODE) on the target.
   */
  async mergeWaitingInto(
    waitingId: string,
    targetId: string,
    actorId: string | null,
    opts: { confirmedRef?: string | null; activityBody?: string | null } = {},
  ): Promise<WaitingLeadOutcome> {
    if (waitingId === targetId) throw notWaiting();
    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: waitingId } });
      if (!lead) throw new NotFoundException("Lead tidak ditemukan");
      if (!lead.awaitingWhatsapp) throw notWaiting();
      return this.mergeInTx(tx, lead, targetId, actorId, {
        confirmedRef: opts.confirmedRef ?? null,
        activityBody: opts.activityBody ?? null,
      });
    });
  }

  /**
   * Merge a waiting lead (placeholder) into an existing lead (target), which
   * is kept: the clicks, their click-time Lead rows and any linked WhatsApp
   * contact move over; the target gets the Instagram handle, brand, category
   * and campaign when it has none, and becomes a website lead (unless it is a
   * Click-to-WhatsApp lead). The placeholder is deleted when no staff member
   * touched it (and nothing else hangs on it); otherwise it moves to the
   * first Lost stage with reason "Duplicate". No Meta event either way.
   */
  private async mergeInTx(
    tx: Tx,
    placeholder: Lead,
    targetId: string,
    actorId: string | null,
    input: (Pick<ResolveWaitingInput, "message" | "activityBody" | "waId" | "confirmedRef"> & { phone?: string }) | null,
  ): Promise<WaitingLeadOutcome> {
    const target = await tx.lead.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException("Lead tidak ditemukan");
    const claimed = await tx.lead.updateMany({
      where: { id: placeholder.id, awaitingWhatsapp: true },
      data: { awaitingWhatsapp: false },
    });
    if (claimed.count === 0) throw notWaiting();
    const now = new Date();

    const clicks = await tx.adClick.findMany({
      where: { leadId: placeholder.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, ref: true },
    });
    await tx.adClick.updateMany({ where: { leadId: placeholder.id }, data: { leadId: targetId } });
    await tx.metaEventOutbox.updateMany({
      where: { leadId: placeholder.id, route: "WEBSITE", eventName: "Lead" },
      data: { leadId: targetId },
    });
    await tx.whatsAppContact.updateMany({ where: { leadId: placeholder.id }, data: { leadId: targetId } });

    const data: Prisma.LeadUncheckedUpdateInput = { lastContactAt: now };
    if (!target.instagramHandle && placeholder.instagramHandle) data.instagramHandle = placeholder.instagramHandle;
    if (!target.company && placeholder.company) data.company = placeholder.company;
    if (!target.category && placeholder.category) data.category = placeholder.category;
    if (!target.campaignId && placeholder.campaignId) {
      data.campaignId = placeholder.campaignId;
      data.campaignCode = placeholder.campaignCode;
      data.campaignSource = "AUTO";
    }
    if (clicks.length && !target.ctwaClid && target.source !== "WHATSAPP_CTWA") data.source = "WEBSITE";
    const phone = input?.phone ? normalizePhone(input.phone) : null;
    if (phone && !target.phone) {
      data.phone = phone;
      data.waId = input?.waId ?? waIdFromPhone(phone);
    }
    await tx.lead.update({ where: { id: targetId }, data });
    // the Kode the chat carried is confirmed on the target; clicks keep how
    // they were linked (a HANDLE click stays unable to carry events)
    if (input?.confirmedRef) await confirmKodeInTx(tx, input.confirmedRef, targetId);
    if (clicks.length) await rerouteToWebsiteInTx(tx, targetId);

    // Stage events the placeholder already sent / queued are not sent again
    // for the same person: a marker row takes the target's dedupe key.
    const carried = await tx.metaEventOutbox.findMany({
      where: { leadId: placeholder.id, eventName: { in: CARRY_EVENTS }, status: { in: [...CARRY_STATUSES] } },
      select: { eventName: true, route: true, adClickId: true },
    });
    if (carried.length) {
      await tx.metaEventOutbox.createMany({
        data: carried.map((e) => ({
          leadId: targetId,
          route: e.route,
          adClickId: e.route === "WEBSITE" ? e.adClickId : null,
          eventName: e.eventName,
          eventTime: now,
          currency: "IDR",
          status: "SKIPPED" as const,
          lastError: SKIP_SENT_BEFORE_MERGE,
          payload: { event_name: e.eventName, carried_from_lead: placeholder.id },
          dedupeKey: `${targetId}:${e.eventName}`,
        })),
        skipDuplicates: true,
      });
    }

    const refs = clicks.map((c) => c.ref).filter(Boolean).join(", ");
    await tx.leadActivity.create({
      data: { leadId: targetId, type: "NOTE", body: `@lead.mergedFrom: ${refs}`.trimEnd(), actorId },
    });
    const body = input?.activityBody ?? (input?.message ? escapeActivityText(input.message) : null);
    if (body) {
      await tx.leadActivity.create({ data: { leadId: targetId, type: "WHATSAPP", body, actorId } });
    }

    const [staffMade, ownEvents] = await Promise.all([
      tx.leadActivity.count({ where: { leadId: placeholder.id, actorId: { not: null } } }),
      tx.metaEventOutbox.count({ where: { leadId: placeholder.id } }),
    ]);
    const linked = placeholder.clientId || placeholder.projectId || placeholder.quotationId;
    let placeholderDeleted = false;
    if (staffMade === 0 && ownEvents === 0 && !linked) {
      await tx.lead.delete({ where: { id: placeholder.id } });
      placeholderDeleted = true;
    } else {
      const lost = await tx.leadStage.findFirst({
        where: { type: "LOST", isActive: true },
        orderBy: { order: "asc" },
      });
      await tx.lead.update({
        where: { id: placeholder.id },
        data: { ...(lost ? { stageId: lost.id } : {}), lostReason: LOST_REASON_DUPLICATE },
      });
      await tx.leadActivity.create({
        data: {
          leadId: placeholder.id,
          type: lost && lost.id !== placeholder.stageId ? "STAGE_CHANGE" : "NOTE",
          body: `@lead.mergedInto: ${target.name}`,
          fromStageId: lost && lost.id !== placeholder.stageId ? placeholder.stageId : null,
          toStageId: lost && lost.id !== placeholder.stageId ? lost.id : null,
          metaEvent: null,
          actorId,
        },
      });
    }
    return { outcome: "merged" as const, leadId: targetId, fromLeadId: placeholder.id, placeholderDeleted };
  }

  // ---------------------------------------------------------------------
  // nightly cleanup + stats
  // ---------------------------------------------------------------------

  /**
   * Waiting leads still without a phone after AUTO_LEAD_STALE_DAYS move to
   * the first Lost stage with reason "Never sent WhatsApp". Only leads nobody
   * is working on: still in the first open stage (New) and without any
   * staff-made activity (note, call, stage move, assignment, follow-up). The
   * record is kept; no Meta event is queued (the stage change bypasses the
   * outbox). Returns the number of leads closed.
   */
  async closeStale(now: Date = new Date(), days?: number): Promise<number> {
    const staleDays = days ?? this.config().autoLeadStaleDays;
    const cutoff = new Date(now.getTime() - staleDays * DAY_MS);
    const lost = await this.prisma.leadStage.findFirst({
      where: { type: "LOST", isActive: true },
      orderBy: { order: "asc" },
    });
    const first = await this.prisma.leadStage.findFirst({
      where: { type: "OPEN", isActive: true },
      orderBy: { order: "asc" },
    });
    if (!lost || !first) return 0;
    let closed = 0;
    let afterId: string | null = null;
    for (let guard = 0; guard < 20; guard += 1) {
      const rows: Array<{ id: string; stageId: string }> = await this.prisma.lead.findMany({
        where: {
          awaitingWhatsapp: true,
          phone: null,
          stageId: first.id,
          createdAt: { lt: cutoff },
          ...(afterId ? { id: { gt: afterId } } : {}),
        },
        select: { id: true, stageId: true },
        orderBy: { id: "asc" },
        take: STALE_BATCH,
      });
      for (const row of rows) {
        const done = await this.prisma.$transaction(async (tx) => {
          const staffMade = await tx.leadActivity.count({ where: { leadId: row.id, actorId: { not: null } } });
          if (staffMade > 0) return false;
          const res = await tx.lead.updateMany({
            where: { id: row.id, awaitingWhatsapp: true, phone: null, stageId: first.id },
            data: {
              stageId: lost.id,
              lostReason: LOST_REASON_NEVER_SENT_WHATSAPP,
              awaitingWhatsapp: false,
            },
          });
          if (res.count === 0) return false;
          await tx.leadActivity.create({
            data: {
              leadId: row.id,
              type: "STAGE_CHANGE",
              body: "@lead.neverSentWhatsapp",
              fromStageId: row.stageId,
              toStageId: lost.id,
              metaEvent: null,
              actorId: null,
            },
          });
          return true;
        });
        if (done) closed += 1;
      }
      if (rows.length < STALE_BATCH) break;
      afterId = rows[rows.length - 1].id;
    }
    return closed;
  }
}
