import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

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

type Db = Pick<Prisma.TransactionClient, "metaEventOutbox">;

/**
 * Records Meta Conversions API (Business Messaging) events in an outbox.
 * Phase A never calls Meta: rows stay PENDING_CONFIG until phase B ships the
 * sender. Each lead gets at most ONE row per event name (dedupeKey
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
    const eventTime = opts.eventTime ?? new Date();
    const dedupeKey = `${lead.id}:${eventName}`;
    const value = opts.value ?? null;
    const payload = this.buildPayload(lead, eventName, eventTime, value) as Prisma.InputJsonValue;
    const created = await db.metaEventOutbox.createMany({
      data: [
        {
          leadId: lead.id,
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
    return created.count > 0;
  }
}
