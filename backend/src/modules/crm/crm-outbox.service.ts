import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { eventClickId } from "../ad-tracking/click-link";
import { latestEventClick, queueTikTokEvent } from "../ad-tracking/tiktok-outbox";
import { TIKTOK_EVENT_FOR_META } from "../ad-tracking/tiktok-events.payload";

export const META_EVENTS = ["LeadSubmitted", "QualifiedLead", "Purchase"] as const;
export type MetaEventName = (typeof META_EVENTS)[number];

export interface OutboxLead {
  id: string;
  waId?: string | null;
  phone?: string | null;
  ctwaClid?: string | null;
  adId?: string | null;
  campaignCode?: string | null;
}

type Db = Pick<Prisma.TransactionClient, "metaEventOutbox"> &
  Partial<Pick<Prisma.TransactionClient, "adClick" | "tikTokEventOutbox">>;

export type OutboxRoute = "BUSINESS_MESSAGING" | "WEBSITE";

/** Where a queued stage event went: `eventName` is the event on THAT platform's outbox. */
export interface QueueResult {
  created: boolean;
  platform: "META" | "TIKTOK";
  eventName: string;
}

/** Timeline label of the event a stage change queued: Meta's name, or "tiktok:<TikTok event>". */
export const activityEventLabel = (r: QueueResult): string =>
  r.platform === "TIKTOK" ? `tiktok:${r.eventName}` : r.eventName;

/**
 * Which Conversions API route carries a lead's stage events:
 *  - a Click-to-WhatsApp id wins (business_messaging) — never both routes;
 *  - else a linked landing-page click -> website;
 *  - else business_messaging, where the sender marks the row SKIPPED
 *    ("no ctwa_clid"); linking a click later re-routes it (AdClickService).
 */
export function chooseRoute(
  lead: Pick<OutboxLead, "ctwaClid">,
  hasAdClick: boolean,
): OutboxRoute {
  if (lead.ctwaClid) return "BUSINESS_MESSAGING";
  return hasAdClick ? "WEBSITE" : "BUSINESS_MESSAGING";
}

/**
 * Records Meta Conversions API events in an outbox (two routes: business
 * messaging for CTWA leads, website for leads linked to a landing-page ad
 * click). A lead whose LATEST converting click (KODE / AUTO_CREATE, never
 * HANDLE) is attributed to TikTok gets its stage events on the TikTok outbox
 * instead (LeadSubmitted -> Lead, QualifiedLead -> CompleteRegistration,
 * Purchase -> Purchase) and none on Meta; a Click-to-WhatsApp lead always
 * stays on Meta. This service never calls Meta or TikTok: rows stay PENDING_CONFIG until the
 * matching sender (MetaCapiService / WebCapiService) is configured. Each lead gets at most ONE row per event name (dedupeKey
 * "<leadId>:<eventName>"), which makes every hook idempotent.
 */
@Injectable()
export class CrmOutboxService {
  buildPayload(lead: OutboxLead, eventName: string, eventTime: Date, value?: number | null) {
    return {
      event_name: eventName,
      event_time: Math.floor(eventTime.getTime() / 1000),
      action_source: "business_messaging",
      messaging_channel: "whatsapp",
      user_data: {
        ...(lead.ctwaClid ? { ctwa_clid: lead.ctwaClid } : {}),
        ...(lead.waId ? { wa_id: lead.waId } : {}),
      },
      custom_data: {
        ...(value !== undefined && value !== null ? { value, currency: "IDR" } : {}),
        ...(lead.campaignCode ? { campaign_code: lead.campaignCode } : {}),
        ...(lead.adId ? { ad_id: lead.adId } : {}),
      },
      lead_id: lead.id,
    };
  }

  /**
   * Queue an event for a lead. Returns true when a new row was created.
   * For Purchase, a still-unsent row gets its value refreshed (the real
   * quotation/invoice amount replaces an earlier manual estimate).
   */
  async queueEvent(
    db: Db,
    lead: OutboxLead,
    eventName: MetaEventName,
    opts: { value?: number | null; eventTime?: Date } = {},
  ): Promise<boolean> {
    return (await this.queueEventResult(db, lead, eventName, opts)).created;
  }

  /** Like queueEvent, but also says which platform's outbox took the event. */
  async queueEventResult(
    db: Db,
    lead: OutboxLead,
    eventName: MetaEventName,
    opts: { value?: number | null; eventTime?: Date } = {},
  ): Promise<QueueResult> {
    const eventTime = opts.eventTime ?? new Date();
    // Last-touch platform: the latest converting click decides, so a repeat
    // conversion from another platform switches FUTURE events; events already
    // sent stay where they went.
    if (!lead.ctwaClid && db.adClick && db.tikTokEventOutbox) {
      const latest = await latestEventClick({ adClick: db.adClick }, lead.id);
      if (latest?.attributedPlatform === "TIKTOK") {
        const tt = TIKTOK_EVENT_FOR_META[eventName];
        if (!tt) return { created: false, platform: "TIKTOK", eventName };
        // "Lead" needs the phone (it is also queued when the chat fills it in)
        if (tt === "Lead" && !lead.phone) return { created: false, platform: "TIKTOK", eventName: tt };
        const created = await queueTikTokEvent({ tikTokEventOutbox: db.tikTokEventOutbox }, lead.id, latest.id, tt, {
          value: opts.value ?? null,
          eventTime,
        });
        return { created, platform: "TIKTOK", eventName: tt };
      }
    }
    // a lead may hold several landing-page clicks: only a confirmed (KODE) or
    // the lead-creating (AUTO_CREATE) click carries events, never a HANDLE one
    const clickId = lead.ctwaClid || !db.adClick ? null : await eventClickId({ adClick: db.adClick }, lead.id);
    const click = clickId ? { id: clickId } : null;
    const route = chooseRoute(lead, !!click);
    // The website Lead was already sent when the WhatsApp button was tapped.
    if (route === "WEBSITE" && eventName === "LeadSubmitted") return { created: false, platform: "META", eventName };
    const dedupeKey = `${lead.id}:${eventName}`;
    const value = opts.value ?? null;
    const payload = this.buildPayload(lead, eventName, eventTime, value) as Prisma.InputJsonValue;
    const created = await db.metaEventOutbox.createMany({
      data: [
        {
          leadId: lead.id,
          route,
          adClickId: route === "WEBSITE" ? (click?.id ?? null) : null,
          eventName,
          eventTime,
          value: value === null ? null : new Prisma.Decimal(value),
          currency: "IDR",
          status: "PENDING_CONFIG",
          payload,
          dedupeKey,
        },
      ],
      skipDuplicates: true,
    });
    if (created.count === 0 && eventName === "Purchase" && value !== null) {
      await db.metaEventOutbox.updateMany({
        where: { dedupeKey, status: "PENDING_CONFIG" },
        data: { value: new Prisma.Decimal(value), payload },
      });
    }
    return { created: created.count > 0, platform: "META", eventName };
  }
}
