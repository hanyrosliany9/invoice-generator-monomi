import { AdClickLinkVia, Prisma } from "@prisma/client";
import { REVIVABLE_BM_ROWS, selectEventClick } from "./event-click";
import { rerouteToTikTokInTx } from "./tiktok-outbox";

type Tx = Prisma.TransactionClient;
type Db = Pick<Prisma.TransactionClient, "adClick">;

/** Outbox events that exist for the website route when a lead is linked later. */
export const RELINKABLE_EVENTS = ["QualifiedLead", "Purchase"];

/** The id of the lead's event click (see selectEventClick: the one shared selection). */
export async function eventClickId(db: Db, leadId: string): Promise<string | null> {
  return (await selectEventClick(db, leadId))?.id ?? null;
}

/**
 * Stage events a lead earned while it had no event-carrying click (queued on
 * the business-messaging route, where they are skipped for lack of a
 * ctwa_clid) move to the website route on the lead's event click (see
 * eventClickId; never a HANDLE click). A lead with a Click-to-WhatsApp id
 * keeps the WhatsApp route (never both routes).
 */
export async function rerouteToWebsiteInTx(tx: Tx, leadId: string): Promise<void> {
  const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { ctwaClid: true } });
  if (!lead || lead.ctwaClid) return;
  const event = await selectEventClick(tx, leadId);
  if (!event) return;
  const clickId = event.id;
  // The event click came from TikTok: its events go to TikTok, none to Meta.
  if (event.attributedPlatform === "TIKTOK") {
    await rerouteToTikTokInTx(tx, leadId, clickId);
    return;
  }
  await tx.metaEventOutbox.updateMany({
    where: {
      leadId,
      route: "BUSINESS_MESSAGING",
      eventName: { in: RELINKABLE_EVENTS },
      // never revive an earlier decision (SKIP_ATTRIBUTED_TIKTOK, SKIP_SENT_BEFORE_MERGE, ...)
      ...REVIVABLE_BM_ROWS,
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
 * is taken) and records how (`via`). The click's own click-time website Lead
 * row gets the leadId too (lead page; the retention purge keeps rows of
 * linked clicks). A KODE / AUTO_CREATE click also gives the lead its
 * Instagram handle when it has none and re-routes earlier stage events; a
 * HANDLE click changes nothing on the lead. A lead may hold several clicks.
 * Returns false when the click is already linked (to any lead).
 */
export async function attachClickInTx(
  tx: Tx,
  click: { id: string; instagramHandle?: string | null },
  leadId: string,
  via: AdClickLinkVia,
  now: Date = new Date(),
): Promise<boolean> {
  const claimed = await tx.adClick.updateMany({
    where: { id: click.id, leadId: null },
    data: { leadId, linkedAt: now, linkedVia: via },
  });
  if (claimed.count === 0) return false;
  await tx.metaEventOutbox.updateMany({
    where: { adClickId: click.id, route: "WEBSITE", eventName: "Lead", leadId: null },
    data: { leadId },
  });
  await tx.tikTokEventOutbox.updateMany({
    where: { adClickId: click.id, eventName: "Contact", leadId: null },
    data: { leadId },
  });
  if (via === "HANDLE") return true;
  if (click.instagramHandle) {
    await tx.lead.updateMany({
      where: { id: leadId, instagramHandle: null },
      data: { instagramHandle: click.instagramHandle },
    });
  }
  await rerouteToWebsiteInTx(tx, leadId);
  return true;
}

/**
 * A WhatsApp chat or staff confirmed this Kode for the lead that already
 * holds its click: an unverified (HANDLE) or AUTO_CREATE click becomes KODE,
 * so it may now carry the lead's events. Returns true when the click is the
 * lead's.
 */
export async function confirmKodeInTx(tx: Tx, ref: string, leadId: string): Promise<boolean> {
  const click = await tx.adClick.findFirst({ where: { ref, leadId }, select: { id: true, linkedVia: true } });
  if (!click) return false;
  if (click.linkedVia !== "KODE") {
    await tx.adClick.update({ where: { id: click.id }, data: { linkedVia: "KODE" } });
    await rerouteToWebsiteInTx(tx, leadId);
  }
  return true;
}
