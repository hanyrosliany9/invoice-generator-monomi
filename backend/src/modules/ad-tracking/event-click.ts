import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export interface EventClick {
  id: string;
  attributedPlatform: "META" | "TIKTOK" | "NONE" | null;
}

/**
 * THE one place that picks the click of a lead's stage events, for both ad
 * platforms: the latest click whose Kode was confirmed (KODE), else the latest
 * click that auto-created the lead (AUTO_CREATE). A HANDLE click (an anonymous
 * tap that only named the same Instagram handle) is never chosen: anyone who
 * knows a public handle could otherwise attach their own device to a real
 * customer's events.
 *
 * Its `attributedPlatform` decides which platform gets the lead's FUTURE stage
 * events, and the same click supplies the device data and click ids of those
 * events (Meta: fbc / fbp; TikTok: ttclid), so a Meta event never carries a
 * TikTok click and the other way round. Events already sent stay where they went.
 */
export async function selectEventClick(db: Pick<Tx, "adClick">, leadId: string): Promise<EventClick | null> {
  const order = [{ createdAt: "desc" as const }, { id: "desc" as const }];
  const kode = await db.adClick.findFirst({
    where: { leadId, linkedVia: "KODE" },
    orderBy: order,
    select: { id: true, attributedPlatform: true },
  });
  if (kode) return kode;
  return db.adClick.findFirst({
    where: { leadId, linkedVia: "AUTO_CREATE" },
    orderBy: order,
    select: { id: true, attributedPlatform: true },
  });
}

/**
 * Business-messaging stage rows that may move to a landing-page click: still
 * waiting (PENDING_CONFIG), or skipped ONLY because the lead had no
 * Click-to-WhatsApp id. Every other SKIPPED row (SKIP_ATTRIBUTED_TIKTOK,
 * SKIP_SENT_BEFORE_MERGE, too old, ...) is a decision that must stay: reviving
 * it would report the same conversion twice.
 */
/** Start of the business-messaging sender's SKIP_NO_CLID reason ("no ctwa_clid - not from a CTWA ad"). */
const NO_CLID_PREFIX = "no ctwa_clid";

export const REVIVABLE_BM_ROWS = {
  OR: [{ status: "PENDING_CONFIG" as const }, { status: "SKIPPED" as const, lastError: { startsWith: NO_CLID_PREFIX } }],
};
