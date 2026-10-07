import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizePhone } from "../crm/crm.utils";
import { GraphApiError } from "./whatsapp-graph.client";
import {
  TemplateInfo,
  WaCredentials,
  WhatsAppApiService,
} from "./whatsapp-api.service";
import { WhatsAppIngestService } from "./whatsapp-ingest.service";
import {
  isMediaId,
  isWaMessageId,
  previewOf,
  renderTemplate,
  windowState,
  DAY_MS,
} from "./whatsapp.utils";

export const MEDIA_MAX_BYTES = 25 * 1024 * 1024;
const TEMPLATE_CACHE_MS = 10 * 60 * 1000;
/** Meta error codes meaning "outside the customer service window / re-engagement required". */
const WINDOW_ERROR_CODES = new Set([131047, 131026]);
const INLINE_MIME =
  /^(image\/(jpeg|png|webp|gif)|audio\/[a-z0-9.+-]+|video\/(mp4|3gpp))$/i;

export interface QuickReply {
  title: string;
  text: string;
}

const CONTACT_SELECT = {
  id: true,
  waId: true,
  phone: true,
  profileName: true,
  phoneBookName: true,
  leadId: true,
  lead: {
    select: {
      id: true,
      name: true,
      source: true,
      campaignCode: true,
      stage: {
        select: { id: true, key: true, name: true, color: true, type: true },
      },
    },
  },
} satisfies Prisma.WhatsAppContactSelect;

const CONV_INCLUDE = {
  contact: { select: CONTACT_SELECT },
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.WhatsAppConversationInclude;

type ConvRow = Prisma.WhatsAppConversationGetPayload<{
  include: typeof CONV_INCLUDE;
}>;

export interface ListConversationsQuery {
  filter?: "all" | "unread" | "mine" | "unassigned";
  window?: "open" | "closed";
  status?: "OPEN" | "ARCHIVED";
  q?: string;
  page?: number;
  limit?: number;
}

/** Staff WhatsApp inbox (ADMIN / SUPER_ADMIN). Never exposes tokens. */
@Injectable()
export class WhatsAppInboxService {
  private readonly logger = new Logger(WhatsAppInboxService.name);
  private templateCache: { at: number; list: TemplateInfo[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: WhatsAppApiService,
    private readonly ingest: WhatsAppIngestService,
  ) {}

  private decorate(c: ConvRow, now = new Date()) {
    const w = windowState(c.lastInboundAt, c.freeEntryUntil, now);
    const contact = c.contact;
    return {
      id: c.id,
      status: c.status,
      unreadCount: c.unreadCount,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: c.lastMessagePreview,
      lastInboundAt: c.lastInboundAt,
      assignedTo: c.assignedTo,
      window: {
        open: w.open,
        expiresAt: w.expiresAt,
        freeEntryUntil: w.freeEntryUntil,
        freeEntryActive: w.freeEntryActive,
      },
      contact: {
        id: contact.id,
        waId: contact.waId,
        phone: contact.phone,
        profileName: contact.profileName,
        phoneBookName: contact.phoneBookName,
        displayName:
          contact.phoneBookName ||
          contact.lead?.name ||
          contact.profileName ||
          `+${contact.waId}`,
      },
      lead: contact.lead,
    };
  }

  private async load(id: string): Promise<ConvRow> {
    const c = await this.prisma.whatsAppConversation.findUnique({
      where: { id },
      include: CONV_INCLUDE,
    });
    if (!c) throw new NotFoundException("Percakapan tidak ditemukan");
    return c;
  }

  // -------------------------------------------------------------------
  // reads
  // -------------------------------------------------------------------

  async list(q: ListConversationsQuery, userId: string | null) {
    const and: Prisma.WhatsAppConversationWhereInput[] = [
      { status: q.status ?? "OPEN" },
      { lastMessageAt: { not: null } },
    ];
    if (q.filter === "unread") and.push({ unreadCount: { gt: 0 } });
    if (q.filter === "mine") and.push({ assignedToId: userId ?? "__none__" });
    if (q.filter === "unassigned") and.push({ assignedToId: null });
    const cutoff = new Date(Date.now() - DAY_MS);
    if (q.window === "open") and.push({ lastInboundAt: { gt: cutoff } });
    if (q.window === "closed")
      and.push({
        OR: [{ lastInboundAt: null }, { lastInboundAt: { lte: cutoff } }],
      });
    if (q.q?.trim()) {
      const term = q.q.trim().slice(0, 100);
      const digits = term.replace(/\D/g, "");
      and.push({
        contact: {
          OR: [
            { profileName: { contains: term, mode: "insensitive" } },
            { phoneBookName: { contains: term, mode: "insensitive" } },
            { lead: { name: { contains: term, mode: "insensitive" } } },
            ...(digits.length >= 3
              ? [
                  {
                    waId: {
                      contains: digits.startsWith("0")
                        ? `62${digits.slice(1)}`
                        : digits,
                    },
                  },
                ]
              : []),
          ],
        },
      });
    }
    const limit = Math.min(100, Math.max(1, q.limit ?? 50));
    const page = Math.max(1, q.page ?? 1);
    const where: Prisma.WhatsAppConversationWhereInput = { AND: and };
    const [total, rows] = await Promise.all([
      this.prisma.whatsAppConversation.count({ where }),
      this.prisma.whatsAppConversation.findMany({
        where,
        include: CONV_INCLUDE,
        orderBy: { lastMessageAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const now = new Date();
    return {
      items: rows.map((r) => this.decorate(r, now)),
      total,
      page,
      limit,
    };
  }

  async get(id: string) {
    const c = await this.load(id);
    const ad = await this.prisma.whatsAppMessage.findFirst({
      where: {
        conversationId: id,
        direction: "IN",
        referral: { not: Prisma.DbNull },
      },
      orderBy: { timestamp: "asc" },
      select: { referral: true, timestamp: true },
    });
    return {
      ...this.decorate(c),
      ctwa: ad ? { referral: ad.referral, at: ad.timestamp } : null,
    };
  }

  async messages(id: string, before?: string, limit = 50) {
    await this.load(id);
    const take = Math.min(100, Math.max(1, limit));
    const beforeDate = before ? new Date(before) : null;
    const rows = await this.prisma.whatsAppMessage.findMany({
      where: {
        conversationId: id,
        ...(beforeDate && !Number.isNaN(beforeDate.getTime())
          ? { timestamp: { lt: beforeDate } }
          : {}),
      },
      orderBy: [{ timestamp: "desc" }, { createdAt: "desc" }],
      take: take + 1,
      select: {
        id: true,
        waMessageId: true,
        direction: true,
        origin: true,
        type: true,
        text: true,
        mediaId: true,
        mediaMime: true,
        mediaCaption: true,
        mediaFilename: true,
        templateName: true,
        contextWaMessageId: true,
        status: true,
        errorCode: true,
        errorTitle: true,
        timestamp: true,
        referral: true,
        sentBy: { select: { id: true, name: true } },
      },
    });
    const hasMore = rows.length > take;
    const items = rows
      .slice(0, take)
      .reverse()
      .map(({ mediaId, ...m }) => ({ ...m, hasMedia: !!mediaId }));
    return { items, hasMore };
  }

  async conversationForLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, waId: true },
    });
    if (!lead) throw new NotFoundException("Lead tidak ditemukan");
    const contact = await this.prisma.whatsAppContact.findFirst({
      where: { OR: [{ leadId }, ...(lead.waId ? [{ waId: lead.waId }] : [])] },
      select: { id: true, conversation: { select: { id: true } } },
      orderBy: { updatedAt: "desc" },
    });
    if (!contact?.conversation) return { conversation: null };
    return { conversation: await this.get(contact.conversation.id) };
  }

  async badge() {
    const agg = await this.prisma.whatsAppConversation.aggregate({
      where: { status: "OPEN", unreadCount: { gt: 0 } },
      _count: { _all: true },
      _sum: { unreadCount: true },
    });
    return {
      conversations: agg._count._all,
      messages: agg._sum.unreadCount ?? 0,
    };
  }

  // -------------------------------------------------------------------
  // sending
  // -------------------------------------------------------------------

  private graphError(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if (error instanceof GraphApiError) {
      if (error.code !== undefined && WINDOW_ERROR_CODES.has(error.code)) {
        throw new ConflictException({
          statusCode: 409,
          code: "WINDOW_CLOSED",
          details: { code: "WINDOW_CLOSED" },
          message: "Jendela 24 jam sudah tertutup. Kirim template.",
        });
      }
      const status =
        error.kind === "rate_limit"
          ? HttpStatus.TOO_MANY_REQUESTS
          : HttpStatus.BAD_GATEWAY;
      throw new HttpException(
        {
          statusCode: status,
          code: "WHATSAPP_API_ERROR",
          details: { code: "WHATSAPP_API_ERROR" },
          message: `WhatsApp: ${error.message}`,
        },
        status,
      );
    }
    throw new BadGatewayException("WhatsApp API error");
  }

  private async recordOutbound(
    conv: ConvRow,
    creds: WaCredentials,
    userId: string,
    body: Record<string, unknown>,
    stored: {
      type: string;
      text: string | null;
      templateName?: string | null;
      contextWaMessageId?: string | null;
    },
  ) {
    let waMessageId: string;
    try {
      waMessageId = await this.api.sendMessage(creds, body);
    } catch (error) {
      this.graphError(error);
    }
    const now = new Date();
    const msg = await this.prisma.whatsAppMessage.create({
      data: {
        waMessageId,
        conversationId: conv.id,
        direction: "OUT",
        origin: "MONOMI",
        type: stored.type,
        text: stored.text,
        templateName: stored.templateName ?? null,
        contextWaMessageId: stored.contextWaMessageId ?? null,
        status: "PENDING",
        sentById: userId,
        timestamp: now,
      },
      select: { id: true, waMessageId: true, status: true, timestamp: true },
    });
    await this.prisma.whatsAppConversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: now,
        lastMessagePreview: previewOf(stored),
        unreadCount: 0,
      },
    });
    try {
      await this.ingest.afterOutbound(
        conv.contact,
        now,
        "MONOMI",
        stored.text,
        stored.type,
        userId,
      );
    } catch (error) {
      this.logger.warn(
        `CRM update after send failed: ${(error as Error).message}`,
      );
    }
    return msg;
  }

  async sendText(
    id: string,
    text: string,
    replyToMessageId: string | undefined,
    userId: string,
  ) {
    const conv = await this.load(id);
    const body = text.trim();
    if (!body) throw new BadRequestException("Pesan kosong");
    if (body.length > 4096)
      throw new BadRequestException(
        "Pesan terlalu panjang (maks 4096 karakter)",
      );
    const w = windowState(conv.lastInboundAt, conv.freeEntryUntil);
    if (!w.open) {
      throw new ConflictException({
        statusCode: 409,
        code: "WINDOW_CLOSED",
        details: { code: "WINDOW_CLOSED" },
        message:
          "Jendela layanan 24 jam sudah tertutup. Hanya template yang disetujui yang boleh dikirim.",
      });
    }
    const creds = await this.api.require();
    let context: string | null = null;
    if (replyToMessageId) {
      const target = await this.prisma.whatsAppMessage.findFirst({
        where: { id: replyToMessageId, conversationId: id },
        select: { waMessageId: true },
      });
      if (target?.waMessageId && isWaMessageId(target.waMessageId))
        context = target.waMessageId;
    }
    return this.recordOutbound(
      conv,
      creds,
      userId,
      {
        to: conv.contact.waId,
        type: "text",
        text: { body, preview_url: false },
        ...(context ? { context: { message_id: context } } : {}),
      },
      { type: "text", text: body, contextWaMessageId: context },
    );
  }

  async templates(force = false): Promise<TemplateInfo[]> {
    if (
      !force &&
      this.templateCache &&
      Date.now() - this.templateCache.at < TEMPLATE_CACHE_MS
    ) {
      return this.templateCache.list;
    }
    const creds = await this.api.require();
    try {
      const list = await this.api.listTemplates(creds);
      this.templateCache = { at: Date.now(), list };
      return list;
    } catch (error) {
      this.graphError(error);
    }
  }

  async sendTemplate(
    id: string,
    name: string,
    language: string,
    params: string[],
    userId: string,
  ) {
    const conv = await this.load(id);
    const list = await this.templates();
    const tpl = list.find((t) => t.name === name && t.language === language);
    if (!tpl)
      throw new BadRequestException(
        "Template tidak ditemukan atau belum disetujui",
      );
    const clean = (params ?? []).map((p) =>
      String(p ?? "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/ {5,}/g, "    ")
        .trim(),
    );
    if (
      clean.length !== tpl.paramCount ||
      clean.some((p) => p.length === 0 || p.length > 1000)
    ) {
      throw new BadRequestException(
        `Template membutuhkan ${tpl.paramCount} isian`,
      );
    }
    const creds = await this.api.require();
    return this.recordOutbound(
      conv,
      creds,
      userId,
      {
        to: conv.contact.waId,
        type: "template",
        template: {
          name: tpl.name,
          language: { code: tpl.language },
          ...(clean.length
            ? {
                components: [
                  {
                    type: "body",
                    parameters: clean.map((text) => ({ type: "text", text })),
                  },
                ],
              }
            : {}),
        },
      },
      {
        type: "template",
        text: renderTemplate(tpl.bodyText, clean) ?? tpl.name,
        templateName: tpl.name,
      },
    );
  }

  // -------------------------------------------------------------------
  // conversation actions
  // -------------------------------------------------------------------

  async markRead(id: string) {
    const conv = await this.load(id);
    await this.prisma.whatsAppConversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
    // Blue ticks for the customer: only the newest live inbound message, once.
    const last = await this.prisma.whatsAppMessage.findFirst({
      where: { conversationId: id, direction: "IN", origin: "CUSTOMER" },
      orderBy: { timestamp: "desc" },
      select: { waMessageId: true, timestamp: true },
    });
    if (
      last?.waMessageId &&
      last.waMessageId !== conv.lastReadReceiptFor &&
      Date.now() - last.timestamp.getTime() < 30 * DAY_MS
    ) {
      const creds = await this.api.resolve();
      if (creds) {
        try {
          await this.api.markRead(creds, last.waMessageId);
          await this.prisma.whatsAppConversation.update({
            where: { id },
            data: { lastReadReceiptFor: last.waMessageId },
          });
        } catch (error) {
          this.logger.warn(
            `Mark-read at Meta failed: ${(error as Error).message}`,
          );
        }
      }
    }
    return { success: true };
  }

  async assign(id: string, assignedToId: string | null) {
    await this.load(id);
    if (assignedToId) {
      const user = await this.prisma.user.findUnique({
        where: { id: assignedToId },
        select: { isActive: true, role: true },
      });
      if (
        !user ||
        !user.isActive ||
        !["SUPER_ADMIN", "ADMIN"].includes(user.role)
      ) {
        throw new BadRequestException("Pengguna tidak ditemukan");
      }
    }
    await this.prisma.whatsAppConversation.update({
      where: { id },
      data: { assignedToId },
    });
    return this.get(id);
  }

  async setStatus(id: string, status: "OPEN" | "ARCHIVED") {
    await this.load(id);
    await this.prisma.whatsAppConversation.update({
      where: { id },
      data: { status },
    });
    return this.get(id);
  }

  async linkLead(id: string, leadId: string | null) {
    const conv = await this.load(id);
    if (leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, waId: true, phone: true, awaitingWhatsapp: true },
      });
      if (!lead) throw new NotFoundException("Lead tidak ditemukan");
      await this.prisma.whatsAppContact.update({
        where: { id: conv.contact.id },
        data: { leadId },
      });
      const data: Prisma.LeadUpdateInput = {};
      if (!lead.waId) data.waId = conv.contact.waId;
      if (lead.awaitingWhatsapp) {
        // a landing-page lead waiting for its chat: this conversation is it
        data.awaitingWhatsapp = false;
        data.firstContactAt = new Date();
        data.firstResponseAt = null;
        const phone = lead.phone ? null : normalizePhone(`+${conv.contact.waId}`);
        if (phone) {
          const taken = await this.prisma.lead.findFirst({
            where: { phone, id: { not: leadId } },
            select: { id: true },
          });
          if (!taken) data.phone = phone;
        }
      }
      if (Object.keys(data).length)
        await this.prisma.lead.update({ where: { id: leadId }, data });
    } else {
      await this.prisma.whatsAppContact.update({
        where: { id: conv.contact.id },
        data: { leadId: null },
      });
    }
    return this.get(id);
  }

  /** Staff-only media proxy: fetches from Meta with the server token, never exposes the URL/token. */
  async media(messageId: string): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string | null;
    inline: boolean;
  }> {
    const msg = await this.prisma.whatsAppMessage.findUnique({
      where: { id: messageId },
      select: { mediaId: true, mediaMime: true, mediaFilename: true },
    });
    if (!msg?.mediaId || !isMediaId(msg.mediaId))
      throw new NotFoundException("Media tidak tersedia");
    const creds = await this.api.require();
    try {
      const info = await this.api.mediaInfo(creds, msg.mediaId);
      if (typeof info?.url !== "string")
        throw new NotFoundException("Media tidak tersedia");
      if (
        typeof info.file_size === "number" &&
        info.file_size > MEDIA_MAX_BYTES
      ) {
        throw new HttpException(
          "Media terlalu besar untuk dipratinjau",
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }
      const dl = await this.api.downloadMedia(creds, info.url, MEDIA_MAX_BYTES);
      const mime = (msg.mediaMime ?? info.mime_type ?? dl.contentType ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      const inline = INLINE_MIME.test(mime);
      return {
        buffer: dl.buffer,
        contentType:
          inline || /^application\/pdf$/.test(mime)
            ? mime
            : "application/octet-stream",
        filename: msg.mediaFilename,
        inline,
      };
    } catch (error) {
      if (error instanceof GraphApiError && error.status === 413) {
        throw new HttpException(
          "Media terlalu besar untuk dipratinjau",
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }
      this.graphError(error);
    }
  }

  // -------------------------------------------------------------------
  // quick replies (stored in CRM settings)
  // -------------------------------------------------------------------

  async quickReplies(): Promise<QuickReply[]> {
    const s = await this.prisma.crmSettings.findUnique({
      where: { id: "default" },
      select: { whatsappQuickReplies: true },
    });
    const raw = s?.whatsappQuickReplies;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (r): r is { title: string; text: string } =>
          !!r &&
          typeof r === "object" &&
          typeof (r as any).title === "string" &&
          typeof (r as any).text === "string",
      )
      .map((r) => ({ title: r.title, text: r.text }));
  }

  async setQuickReplies(items: QuickReply[]): Promise<QuickReply[]> {
    const clean = items
      .map((i) => ({
        title: i.title.trim().slice(0, 60),
        text: i.text.trim().slice(0, 1000),
      }))
      .filter((i) => i.title && i.text);
    await this.prisma.crmSettings.upsert({
      where: { id: "default" },
      update: { whatsappQuickReplies: clean as Prisma.InputJsonValue },
      create: {
        id: "default",
        whatsappQuickReplies: clean as Prisma.InputJsonValue,
      },
    });
    return clean;
  }
}
