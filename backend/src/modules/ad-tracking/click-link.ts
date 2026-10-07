import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Outbox events that exist for the website route when a lead is linked later. */
export const RELINKABLE_EVENTS = ["QualifiedLead", "Purchase"];

/**
 * Stage events a lead earned while it had no landing-page click (queued on
 * the business-messaging route, where they are skipped for lack of a
 * ctwa_clid) move to the website route once a click is linked. A lead with a
 * Click-to-WhatsApp id keeps the WhatsApp route (never both routes).
 */
export async function rerouteToWebsiteInTx(tx: Tx, leadId: string, clickId: string): Promise<void> {
  const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { ctwaClid: true } });
  if (!lead || lead.ctwaClid) return;
  await tx.metaEventOutbox.updateMany({
    where: {
      leadId,
      route: "BUSINESS_MESSAGING",
      eventName: { in: RELINKABLE_EVENTS },
      status: { in: ["PENDING_CONFIG", "SKIPPED"] },
    },
    data: {
      route: "WEBSITE",
      adClickId: clickId,
      status: "PENDING_CONFIG",
      lastError: null,
      nextTryAt: null,
    },
  });
}

/**
 * Attaches an unlinked click to a lead (atomic: only a click without a lead
 * is taken). The click's own click-time website Lead row gets the leadId too
 * (lead page; the retention purge keeps rows of linked clicks), the lead gets
 * the click's Instagram handle when it has none, and earlier stage events are
 * re-routed to the website route. A lead may hold several clicks.
 * Returns false when the click is already linked (to any lead).
 */
export async function attachClickInTx(
  tx: Tx,
  click: { id: string; instagramHandle?: string | null },
  leadId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const claimed = await tx.adClick.updateMany({
    where: { id: click.id, leadId: null },
    data: { leadId, linkedAt: now },
  });
  if (claimed.count === 0) return false;
  await tx.metaEventOutbox.updateMany({
    where: { adClickId: click.id, route: "WEBSITE", eventName: "Lead", leadId: null },
    data: { leadId },
  });
  if (click.instagramHandle) {
    await tx.lead.updateMany({
      where: { id: leadId, instagramHandle: null },
      data: { instagramHandle: click.instagramHandle },
    });
  }
  await rerouteToWebsiteInTx(tx, leadId, click.id);
  return true;
}
