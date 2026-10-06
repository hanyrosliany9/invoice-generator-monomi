import { Injectable, Logger } from "@nestjs/common";
import { Prisma, WhatsAppMessageStatus, WhatsAppOrigin } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CrmLeadsService } from "../crm/crm-leads.service";
import { normalizePhone } from "../crm/crm.utils";
import { WhatsAppApiService } from "./whatsapp-api.service";
import {
  DAY_MS,
  FREE_ENTRY_MS,
  isWaId,
  isWaMessageId,
  matchCampaign,
  nextStatus,
  parseMessageContent,
  previewOf,
  Referral,
  sanitizeReferral,
  tsFromUnix,
  webhookStatusToEnum,
} from "./whatsapp.utils";

/** A repeated activity of the same kind within this window is folded into the previous one. */
export const ACTIVITY_FOLD_MS = 30 * 60 * 1000;
/** A status for a message we don't know yet is retried when it is this fresh (send/insert race). */
export const STATUS_RETRY_WINDOW_MS = 10 * 60 * 1000;
const MAX_ITEMS = 5000;

export type OutboundKind = "MONOMI" | "PHONE_APP" | "HISTORY";

export interface IngestResult {
  messages: number;
  duplicates: number;
  statuses: number;
  /** Statuses for messages not stored yet (retry the event later). */
  deferredStatuses: number;
  leadsCreated: number;
}

// Timeline rows store a stable key ("@key: text"); the frontend translates it
// (crm.history.*). Rows from before this format hold Indonesian text, shown as stored.
const ACTIVITY_PREFIX = {
  IN: "@wa.in",
  MONOMI: "@wa.monomi",
  PHONE_APP: "@wa.phoneApp",
} as const;

function snippet(text: string | null, type: string): string {
  const t = text ? text.replace(/\s+/g, " ").trim() : `[${type}]`;
  return t.length > 140 ? `${t.slice(0, 137)}...` : t;
}

function historyStatus(v: unknown): WhatsAppMessageStatus {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  if (s === "READ" || s === "PLAYED") return "READ";
  if (s === "DELIVERED") return "DELIVERED";
  if (s === "ERROR" || s === "FAILED") return "FAILED";
  return "SENT";
}

/**
 * Turns webhook payloads (messages, statuses, coexistence echoes, history,
 * contact sync, account updates) into inbox rows and CRM lead updates.
 * Everything is idempotent on the WhatsApp message id, so an event can be
 * re-processed safely after a partial failure.
 */
@Injectable()
export class WhatsAppIngestService {
  private readonly logger = new Logger(WhatsAppIngestService.name);
  /** Per-waId serialisation so two concurrent first messages never create two leads. */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: CrmLeadsService,
    private readonly api: WhatsAppApiService,
  ) {}

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    const run = prev.catch(() => undefined).then(fn);
    const tail = run.catch(() => undefined);
    this.locks.set(key, tail);
    try {
      return await run;
    } finally {
      if (this.locks.get(key) === tail) this.locks.delete(key);
    }
  }

  // -------------------------------------------------------------------
  // entry point
  // -------------------------------------------------------------------

  async processPayload(payload: any): Promise<IngestResult> {
    const result: IngestResult = {
      messages: 0,
      duplicates: 0,
      statuses: 0,
      deferredStatuses: 0,
      leadsCreated: 0,
    };
    if (
      !payload ||
      payload.object !== "whatsapp_business_account" ||
      !Array.isArray(payload.entry)
    )
      return result;
    const ourPhoneId = await this.ourPhoneNumberId();
    for (const entry of payload.entry.slice(0, 100)) {
      const changes = Array.isArray(entry?.changes)
        ? entry.changes.slice(0, 100)
        : [];
      for (const change of changes) {
        const field = typeof change?.field === "string" ? change.field : "";
        const value = change?.value ?? {};
        const pid = value?.metadata?.phone_number_id;
        if (
          ourPhoneId &&
          typeof pid === "string" &&
          pid !== ourPhoneId &&
          field !== "account_update"
        ) {
          // Another number on the same WABA: not ours to mirror.
          continue;
        }
        switch (field) {
          case "messages":
            await this.handleMessages(value, result);
            break;
          case "smb_message_echoes":
            await this.handleEchoes(value, result);
            break;
          case "history":
            await this.handleHistory(value, result);
            break;
          case "smb_app_state_sync":
            await this.handleStateSync(value);
            break;
          case "account_update":
            await this.handleAccountUpdate(value);
            break;
          default:
            // Unknown / unsubscribed fields are ignored on purpose.
            break;
        }
      }
    }
    return result;
  }

  private async ourPhoneNumberId(): Promise<string | null> {
    const cfg = this.api.config();
    if (cfg.phoneNumberId) return cfg.phoneNumberId;
    const conn = await this.api.connection();
    return conn?.phoneNumberId ?? null;
  }

  // -------------------------------------------------------------------
  // field handlers
  // -------------------------------------------------------------------

  private async handleMessages(value: any, result: IngestResult) {
    const names = new Map<string, string>();
    for (const c of Array.isArray(value?.contacts) ? value.contacts : []) {
      if (isWaId(c?.wa_id) && typeof c?.profile?.name === "string")
        names.set(c.wa_id, c.profile.name.slice(0, 120));
    }
    for (const msg of (Array.isArray(value?.messages)
      ? value.messages
      : []
    ).slice(0, MAX_ITEMS)) {
      const waId = msg?.from;
      const r = await this.ingestMessage({
        waId,
        msg,
        direction: "IN",
        origin: "CUSTOMER",
        profileName: names.get(waId) ?? null,
      });
      this.count(result, r);
    }
    for (const st of (Array.isArray(value?.statuses)
      ? value.statuses
      : []
    ).slice(0, MAX_ITEMS)) {
      const r = await this.applyStatus(st);
      if (r === "applied") result.statuses += 1;
      if (r === "deferred") result.deferredStatuses += 1;
    }
    if (Array.isArray(value?.errors) && value.errors.length) {
      this.logger.warn(
        `WhatsApp webhook reported ${value.errors.length} error(s): ${value.errors.map((e: any) => e?.code).join(",")}`,
      );
    }
  }

  /** Coexistence: messages the business sent from the WhatsApp Business app / companion devices. */
  private async handleEchoes(value: any, result: IngestResult) {
    for (const msg of (Array.isArray(value?.message_echoes)
      ? value.message_echoes
      : []
    ).slice(0, MAX_ITEMS)) {
      const r = await this.ingestMessage({
        waId: msg?.to,
        msg,
        direction: "OUT",
        origin: "PHONE_APP",
        profileName: null,
      });
      this.count(result, r);
    }
  }

  /** Coexistence history sync (phases 0-1, 1-90, 90-180 days). */
  private async handleHistory(value: any, result: IngestResult) {
    for (const h of (Array.isArray(value?.history) ? value.history : []).slice(
      0,
      50,
    )) {
      const meta = h?.metadata ?? {};
      if (Array.isArray(h?.errors) && h.errors.length) {
        const e = h.errors[0];
        await this.updateConnection({
          historyError:
            `${e?.code ?? ""} ${typeof e?.title === "string" ? e.title : ""}`
              .trim()
              .slice(0, 300) || "history sync error",
        });
      }
      if (Number.isInteger(meta.phase) || Number.isInteger(meta.progress)) {
        await this.updateConnection({
          historyPhase: Number.isInteger(meta.phase) ? meta.phase : undefined,
          historyProgress: Number.isInteger(meta.progress)
            ? Math.max(0, Math.min(100, meta.progress))
            : undefined,
        });
      }
      let budget = MAX_ITEMS;
      for (const thread of (Array.isArray(h?.threads) ? h.threads : []).slice(
        0,
        2000,
      )) {
        const customer = thread?.id;
        if (!isWaId(customer)) continue;
        for (const msg of (Array.isArray(thread?.messages)
          ? thread.messages
          : []
        ).slice(0, budget)) {
          budget -= 1;
          const inbound = msg?.from === customer;
          const r = await this.ingestMessage({
            waId: customer,
            msg,
            direction: inbound ? "IN" : "OUT",
            origin: "HISTORY",
            profileName: null,
            historyStatus: historyStatus(msg?.history_context?.status),
          });
          this.count(result, r);
        }
        if (budget <= 0) break;
      }
    }
  }

  /** Coexistence contact sync: names saved in the WhatsApp Business app. */
  private async handleStateSync(value: any) {
    for (const item of (Array.isArray(value?.state_sync)
      ? value.state_sync
      : []
    ).slice(0, MAX_ITEMS)) {
      if (item?.type !== "contact") continue;
      const digits =
        typeof item?.contact?.phone_number === "string"
          ? item.contact.phone_number.replace(/\D/g, "")
          : "";
      if (!isWaId(digits)) continue;
      const action =
        typeof item?.action === "string" ? item.action.toLowerCase() : "add";
      const fullName =
        typeof item.contact.full_name === "string"
          ? item.contact.full_name.slice(0, 120)
          : typeof item.contact.first_name === "string"
            ? item.contact.first_name.slice(0, 120)
            : null;
      if (action === "remove") {
        await this.prisma.whatsAppContact.updateMany({
          where: { waId: digits },
          data: { phoneBookName: null },
        });
      } else {
        await this.upsertContact(digits, { phoneBookName: fullName });
      }
    }
  }

  private async handleAccountUpdate(value: any) {
    const event = typeof value?.event === "string" ? value.event : "";
    if (event === "PARTNER_REMOVED") {
      this.logger.warn(
        "WhatsApp account_update PARTNER_REMOVED: the business disconnected Monomi in the app",
      );
      await this.api.markDisconnected("PARTNER_REMOVED");
    } else if (event) {
      this.logger.log(`WhatsApp account_update: ${event.slice(0, 60)}`);
    }
  }

  private count(
    result: IngestResult,
    r: { status: string; leadCreated?: boolean },
  ) {
    if (r.status === "stored") result.messages += 1;
    if (r.status === "duplicate") result.duplicates += 1;
    if (r.leadCreated) result.leadsCreated += 1;
  }

  private async updateConnection(data: Prisma.WhatsAppConnectionUpdateInput) {
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    await this.prisma.whatsAppConnection.upsert({
      where: { id: "default" },
      update: clean,
      create: {
        id: "default",
        ...(clean as Prisma.WhatsAppConnectionCreateInput),
      },
    });
  }

  // -------------------------------------------------------------------
  // contacts / conversations
  // -------------------------------------------------------------------

  async upsertContact(
    waId: string,
    data: { profileName?: string | null; phoneBookName?: string | null },
  ) {
    const set = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== null),
    );
    const phone = normalizePhone(`+${waId}`);
    try {
      return await this.prisma.whatsAppContact.upsert({
        where: { waId },
        update: set,
        create: { waId, phone, ...set },
      });
    } catch (error) {
      if ((error as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
        return this.prisma.whatsAppContact.update({
          where: { waId },
          data: set,
        });
      }
      throw error;
    }
  }

  async ensureConversation(contactId: string) {
    try {
      return await this.prisma.whatsAppConversation.upsert({
        where: { contactId },
        update: {},
        create: { contactId },
      });
    } catch (error) {
      if ((error as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
        return this.prisma.whatsAppConversation.findUniqueOrThrow({
          where: { contactId },
        });
      }
      throw error;
    }
  }

  // -------------------------------------------------------------------
  // messages
  // -------------------------------------------------------------------

  async ingestMessage(input: {
    waId: unknown;
    msg: any;
    direction: "IN" | "OUT";
    origin: WhatsAppOrigin;
    profileName: string | null;
    historyStatus?: WhatsAppMessageStatus;
  }): Promise<{
    status: "stored" | "duplicate" | "invalid";
    leadCreated?: boolean;
  }> {
    const { waId, msg, direction, origin } = input;
    if (!isWaId(waId) || !isWaMessageId(msg?.id)) return { status: "invalid" };
    return this.withLock(waId, async () => {
      const existing = await this.prisma.whatsAppMessage.findUnique({
        where: { waMessageId: msg.id },
        select: { id: true },
      });
      if (existing) return { status: "duplicate" as const };

      const now = new Date();
      const ts = tsFromUnix(msg.timestamp, now) as Date;
      const content = parseMessageContent(msg);
      const referral =
        direction === "IN" ? sanitizeReferral(msg.referral) : null;
      const contact = await this.upsertContact(waId, {
        profileName: input.profileName,
      });
      const conv = await this.ensureConversation(contact.id);

      const status: WhatsAppMessageStatus =
        direction === "IN"
          ? "RECEIVED"
          : origin === "HISTORY"
            ? (input.historyStatus ?? "SENT")
            : "SENT";
      try {
        await this.prisma.whatsAppMessage.create({
          data: {
            waMessageId: msg.id,
            conversationId: conv.id,
            direction,
            origin,
            type: content.type,
            text: content.text,
            mediaId: content.media?.id ?? null,
            mediaMime: content.media?.mime ?? null,
            mediaCaption: content.media?.caption ?? null,
            mediaFilename: content.media?.filename ?? null,
            contextWaMessageId: content.contextId,
            status,
            timestamp: ts,
            referral: referral
              ? (referral as Prisma.InputJsonValue)
              : undefined,
          },
        });
      } catch (error) {
        if ((error as Prisma.PrismaClientKnownRequestError)?.code === "P2002")
          return { status: "duplicate" as const };
        throw error;
      }

      // conversation bookkeeping
      const newest =
        !conv.lastMessageAt || ts.getTime() >= conv.lastMessageAt.getTime();
      const convData: Prisma.WhatsAppConversationUpdateInput = {};
      if (newest) {
        convData.lastMessageAt = ts;
        convData.lastMessagePreview = previewOf(content);
      }
      if (
        direction === "IN" &&
        (!conv.lastInboundAt || ts > conv.lastInboundAt)
      )
        convData.lastInboundAt = ts;
      if (origin === "CUSTOMER") {
        convData.unreadCount = { increment: 1 };
        convData.status = "OPEN";
        if (referral) {
          const until = new Date(ts.getTime() + FREE_ENTRY_MS);
          if (!conv.freeEntryUntil || until > conv.freeEntryUntil)
            convData.freeEntryUntil = until;
        }
      } else if (origin === "PHONE_APP" && newest) {
        // the business answered from the phone: it has seen the chat
        convData.unreadCount = 0;
      }
      if (Object.keys(convData).length) {
        await this.prisma.whatsAppConversation.update({
          where: { id: conv.id },
          data: convData,
        });
      }

      // CRM
      let leadCreated = false;
      if (direction === "IN") {
        leadCreated = await this.afterInbound(
          contact,
          ts,
          content.text,
          content.type,
          referral,
          origin,
        );
      } else {
        await this.afterOutbound(
          contact,
          ts,
          origin as OutboundKind,
          content.text,
          content.type,
          null,
        );
      }
      return { status: "stored" as const, leadCreated };
    });
  }

  private async findLeadIdForWaId(waId: string): Promise<string | null> {
    const phone = normalizePhone(`+${waId}`);
    const lead = await this.prisma.lead.findFirst({
      where: { OR: [{ waId }, ...(phone ? [{ phone }] : [])] },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return lead?.id ?? null;
  }

  /** contact.leadId, else a lead with the same waId/phone (linked on the way). */
  async linkedLeadId(contact: {
    id: string;
    waId: string;
    leadId: string | null;
  }): Promise<string | null> {
    if (contact.leadId) return contact.leadId;
    const leadId = await this.findLeadIdForWaId(contact.waId);
    if (leadId) {
      await this.prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { leadId },
      });
      contact.leadId = leadId;
    }
    return leadId;
  }

  private shouldCreateLead(
    origin: WhatsAppOrigin,
    ts: Date,
    referral: Referral | null,
  ): boolean {
    if (origin === "CUSTOMER") return true;
    if (origin !== "HISTORY") return false;
    if (referral) return true;
    const maxDays = this.api.config().historyLeadMaxAgeDays;
    return maxDays > 0 && Date.now() - ts.getTime() <= maxDays * DAY_MS;
  }

  private async afterInbound(
    contact: {
      id: string;
      waId: string;
      leadId: string | null;
      profileName: string | null;
      phoneBookName: string | null;
    },
    ts: Date,
    text: string | null,
    type: string,
    referral: Referral | null,
    origin: WhatsAppOrigin,
  ): Promise<boolean> {
    const leadId = await this.linkedLeadId(contact);
    if (!leadId) {
      if (!this.shouldCreateLead(origin, ts, referral)) return false;
      const campaigns = await this.prisma.campaign.findMany({
        select: { id: true, code: true, name: true, metaAdIds: true },
      });
      const match = matchCampaign(text, referral, campaigns);
      const id = await this.leads.createFromWhatsApp({
        waId: contact.waId,
        name: contact.phoneBookName ?? contact.profileName,
        firstMessage: text ?? `[${type}]`,
        firstContactAt: ts,
        source:
          referral || match.campaign ? "WHATSAPP_CTWA" : "WHATSAPP_ORGANIC",
        campaignId: match.campaign?.id ?? null,
        campaignCode: match.code,
        adId: referral?.source_id ?? null,
        ctwaClid: referral?.ctwa_clid ?? null,
        referral: referral ? (referral as Prisma.InputJsonValue) : null,
      });
      await this.prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { leadId: id },
      });
      contact.leadId = id;
      return true;
    }
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, lastContactAt: true, ctwaClid: true, adId: true },
    });
    if (!lead) return false;
    const data: Prisma.LeadUpdateInput = {};
    if (ts > lead.lastContactAt) data.lastContactAt = ts;
    // An existing lead that now arrives through an ad: keep the click id for Meta attribution.
    if (referral?.ctwa_clid && !lead.ctwaClid) {
      data.ctwaClid = referral.ctwa_clid;
      if (!lead.adId && referral.source_id) data.adId = referral.source_id;
      data.referral = referral as Prisma.InputJsonValue;
    }
    if (Object.keys(data).length)
      await this.prisma.lead.update({ where: { id: leadId }, data });
    if (origin === "CUSTOMER")
      await this.addActivity(leadId, "IN", text, type, null);
    return false;
  }

  /**
   * After an outbound message (Monomi inbox, phone app echo, history): the
   * first reply sets firstResponseAt (echoes count as replies), lastContactAt
   * moves forward, and a folded WHATSAPP activity is added.
   */
  async afterOutbound(
    contact: { id: string; waId: string; leadId: string | null },
    ts: Date,
    kind: OutboundKind,
    text: string | null,
    type: string,
    actorId: string | null,
  ): Promise<void> {
    const leadId = await this.linkedLeadId(contact);
    if (!leadId) return;
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        firstResponseAt: true,
        firstContactAt: true,
        lastContactAt: true,
      },
    });
    if (!lead) return;
    const data: Prisma.LeadUpdateInput = {};
    // A history message older than the lead's first contact is not a reply to it.
    if (
      !lead.firstResponseAt &&
      ts.getTime() >= lead.firstContactAt.getTime() - 60_000
    )
      data.firstResponseAt = ts;
    if (ts > lead.lastContactAt) data.lastContactAt = ts;
    if (Object.keys(data).length)
      await this.prisma.lead.update({ where: { id: leadId }, data });
    if (kind !== "HISTORY")
      await this.addActivity(leadId, kind, text, type, actorId);
  }

  /** Summarised timeline: one WHATSAPP activity per burst of the same kind (30 min). */
  private async addActivity(
    leadId: string,
    kind: "IN" | "MONOMI" | "PHONE_APP",
    text: string | null,
    type: string,
    actorId: string | null,
  ) {
    const prefix = ACTIVITY_PREFIX[kind];
    const recent = await this.prisma.leadActivity.findFirst({
      where: {
        leadId,
        type: "WHATSAPP",
        body: { startsWith: prefix },
        createdAt: { gt: new Date(Date.now() - ACTIVITY_FOLD_MS) },
      },
      select: { id: true },
    });
    if (recent) return;
    await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: "WHATSAPP",
        body: `${prefix}: ${snippet(text, type)}`,
        actorId,
      },
    });
  }

  // -------------------------------------------------------------------
  // statuses
  // -------------------------------------------------------------------

  async applyStatus(
    st: any,
  ): Promise<"applied" | "unchanged" | "deferred" | "unknown" | "invalid"> {
    const incoming = webhookStatusToEnum(st?.status);
    if (!incoming || !isWaMessageId(st?.id)) return "invalid";
    const msg = await this.prisma.whatsAppMessage.findUnique({
      where: { waMessageId: st.id },
      select: { id: true, status: true, direction: true },
    });
    if (!msg) {
      const ts = tsFromUnix(st.timestamp, null);
      return ts && Date.now() - ts.getTime() < STATUS_RETRY_WINDOW_MS
        ? "deferred"
        : "unknown";
    }
    if (msg.direction !== "OUT") return "unchanged";
    const next = nextStatus(msg.status, incoming);
    const err = Array.isArray(st.errors) ? st.errors[0] : null;
    const data: Prisma.WhatsAppMessageUpdateInput = {};
    if (next !== msg.status) data.status = next;
    if (incoming === "FAILED" && next === "FAILED" && err) {
      data.errorCode = String(err.code ?? "").slice(0, 20) || null;
      data.errorTitle =
        (typeof err.title === "string"
          ? err.title
          : typeof err.message === "string"
            ? err.message
            : ""
        ).slice(0, 300) || null;
    }
    if (!Object.keys(data).length) return "unchanged";
    await this.prisma.whatsAppMessage.update({ where: { id: msg.id }, data });
    return "applied";
  }
}
