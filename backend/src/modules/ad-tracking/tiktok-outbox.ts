import { Prisma } from "@prisma/client";
import { REVIVABLE_BM_ROWS, selectEventClick } from "./event-click";
import { SKIP_META_ATTRIBUTED_TIKTOK, TIKTOK_EVENT_FOR_META } from "./tiktok-events.payload";

type Tx = Prisma.TransactionClient;

/** Meta stage events a lead earned before its converting click was known (see click-link.ts). */
const RELINKABLE_META_EVENTS = ["QualifiedLead", "Purchase"];

/** The lead's event click (see selectEventClick): its platform decides where FUTURE stage events go. */
export const latestEventClick = selectEventClick;

export interface TikTokQueueOpts {
  value?: number | null;
  eventTime?: Date;
}

/**
 * Queues one TikTok stage event for a lead (idempotent: one row per lead and
 * event, dedupeKey "<leadId>:<event>"). A still-unsent Purchase gets its value
 * refreshed. Returns true when a new row was created.
 */
export async function queueTikTokEvent(
  db: Pick<Tx, "tikTokEventOutbox">,
  leadId: string,
  adClickId: string,
  eventName: string,
  opts: TikTokQueueOpts = {},
): Promise<boolean> {
  const dedupeKey = `${leadId}:${eventName}`;
  const value = opts.value ?? null;
  const created = await db.tikTokEventOutbox.createMany({
    data: [
      {
        leadId,
        adClickId,
        eventName,
        eventTime: opts.eventTime ?? new Date(),
        value: value === null ? null : new Prisma.Decimal(value),
        currency: "IDR",
        status: "PENDING_CONFIG",
        payload: { event: eventName },
        dedupeKey,
      },
    ],
    skipDuplicates: true,
  });
  if (created.count === 0 && eventName === "Purchase" && value !== null) {
    await db.tikTokEventOutbox.updateMany({
      where: { dedupeKey, status: "PENDING_CONFIG" },
      data: { value: new Prisma.Decimal(value) },
    });
  }
  return created.count > 0;
}

/**
 * TikTok "Lead": the WhatsApp chat arrived and the phone is known. Queued only
 * for a lead whose latest converting click is attributed to TikTok. Safe to
 * call from every place that links a Kode or fills a phone (idempotent).
 */
export async function queueTikTokLeadInTx(
  tx: Pick<Tx, "lead" | "adClick" | "tikTokEventOutbox">,
  leadId: string,
  eventTime: Date = new Date(),
): Promise<boolean> {
  const lead = await tx.lead.findUnique({
    where: { id: leadId },
    select: { phone: true, ctwaClid: true, awaitingWhatsapp: true },
  });
  if (!lead || lead.ctwaClid || lead.awaitingWhatsapp || !lead.phone) return false;
  const click = await latestEventClick(tx, leadId);
  if (!click || click.attributedPlatform !== "TIKTOK") return false;
  return queueTikTokEvent(tx, leadId, click.id, "Lead", { eventTime });
}

/**
 * The lead's latest converting click is TikTok: stage events it earned earlier
 * (queued on the Meta outbox but never sent, for lack of a click) go to TikTok
 * instead, and the Meta rows are marked SKIPPED so Meta never receives them.
 * Then the Lead event, when the phone is known.
 */
export async function rerouteToTikTokInTx(
  tx: Pick<Tx, "lead" | "adClick" | "tikTokEventOutbox" | "metaEventOutbox">,
  leadId: string,
  clickId: string,
): Promise<void> {
  const rows = await tx.metaEventOutbox.findMany({
    where: {
      leadId,
      route: "BUSINESS_MESSAGING",
      eventName: { in: RELINKABLE_META_EVENTS },
      // only rows still waiting or skipped for lack of a click: never an earlier decision
      ...REVIVABLE_BM_ROWS,
    },
    select: { id: true, eventName: true, eventTime: true, value: true },
  });
  for (const r of rows) {
    const tt = TIKTOK_EVENT_FOR_META[r.eventName];
    if (!tt) continue;
    await queueTikTokEvent(tx, leadId, clickId, tt, {
      eventTime: r.eventTime,
      value: r.value === null ? null : Number(r.value),
    });
    await tx.metaEventOutbox.update({
      where: { id: r.id },
      data: { status: "SKIPPED", lastError: SKIP_META_ATTRIBUTED_TIKTOK },
    });
  }
  await queueTikTokLeadInTx(tx, leadId);
}
