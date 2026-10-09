import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma, TikTokEventStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { scrubSecrets } from "../instagram/instagram-graph.client";
import {
  CAPI_BACKOFF_MS,
  CAPI_IN_FLIGHT_LEASE_MS,
  CAPI_MAX_ATTEMPTS,
} from "../whatsapp/meta-capi.service";
import { allowedPageUrl, resolveAdTrackingConfig } from "./ad-tracking.config";
import {
  resolveTikTokEventsConfig,
  TIKTOK_EVENT_PATH,
  TikTokEventsConfig,
} from "./tiktok-events.config";
import {
  buildTikTokEvent,
  buildTikTokRequest,
  classifyTikTokError,
  redactTikTokEventForStorage,
  SKIP_TT_STALE_BEFORE_ENABLE,
  TikTokClick,
  TikTokErrorKind,
  tiktokSkipReason,
} from "./tiktok-events.payload";
import type { VisitEventToSend } from "./ad-click.service";
import { urlForTikTok } from "./url-params";

export interface TikTokRunResult {
  enabled: boolean;
  queued: number;
  skipped: number;
  sent: number;
  failed: number;
  retrying: number;
}

export interface TikTokVisitFlushResult {
  sent: number;
  stale: number;
  dropped: number;
  retrying: number;
  requests: number;
}

const BATCH = 50;
const PROMOTE_MAX = 5000;
/** Click-time Contacts still PENDING_CONFIG and older than this when the sender becomes READY are skipped. */
export const TIKTOK_STALE_BEFORE_ENABLE_MS = 86_400_000;
/** TikTok accepts up to 1000 events per request. */
export const TIKTOK_MAX_BATCH = 1000;
export const TIKTOK_VISIT_QUEUE_MAX = 5000;
export const TIKTOK_VISIT_MAX_ATTEMPTS = 3;
/** At most this many extra requests per flush are spent on isolating a batch TikTok refused (40002). */
export const TIKTOK_PERMANENT_RETRY_CAP = 20;

/** Click-time Contact (the WhatsApp tap) is its own lane; CRM stage events never wait behind it. */
export const CONTACT_LANE: Prisma.TikTokEventOutboxWhereInput = { eventName: "Contact" };
export const STAGE_LANE: Prisma.TikTokEventOutboxWhereInput = { eventName: { not: "Contact" } };

const SEND_INCLUDE = {
  adClick: true,
  lead: { select: { id: true, phone: true, email: true, quotationId: true } },
} satisfies Prisma.TikTokEventOutboxInclude;

export class TikTokApiError extends Error {
  constructor(
    message: string,
    readonly kind: TikTokErrorKind,
    readonly status: number | null,
    readonly code: number | null,
  ) {
    super(message);
  }
}

export interface TikTokHttp {
  post(url: string, token: string, body: unknown): Promise<{ status: number; json: any }>;
}

const fetchHttp: TikTokHttp = {
  async post(url, token, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": token },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, json };
  },
};

interface QueuedVisit {
  event: Record<string, unknown>;
  eventTime: Date;
  attempts: number;
}

/** Event id of a stage / contact row: stable, so a retry or a duplicate send is dropped by TikTok (48 h). */
export function tiktokEventId(
  row: { id: string; eventName: string; leadId: string | null },
  click: { eventId?: string | null },
): string {
  switch (row.eventName) {
    case "Contact":
      return `tt_contact_${click.eventId ?? row.id}`;
    case "Lead":
      return `tt_lead_${row.leadId ?? row.id}`;
    case "CompleteRegistration":
      return `tt_qualified_${row.leadId ?? row.id}`;
    case "Purchase":
      return `tt_purchase_${row.leadId ?? row.id}`;
    default:
      return `tt_${row.id}`;
  }
}

/**
 * Drains TikTokEventOutbox to POST /open_api/v1.3/event/track/ (Events API 2.0).
 * Same shape as the Meta website sender:
 *   PENDING_CONFIG --(config READY)--> QUEUED | SKIPPED (+reason)
 *   QUEUED --claim (inFlightAt)--> one event per request -->
 *       SENT                accepted (code 0)
 *       QUEUED (+backoff)   transient / rate limit / auth problem, retried with the same
 *                           event_id (TikTok deduplicates on pixel + event + event_id for 48 h)
 *       FAILED              invalid payload (40002), other 4xx, or CAPI_MAX_ATTEMPTS reached
 * Contact (tap) and the CRM stage events are separate lanes, stage lane first.
 * Unless the config is READY nothing is read, changed or sent. On the first
 * READY run, Contacts that waited more than 24 h are SKIPPED.
 */
@Injectable()
export class TikTokEventsService {
  private readonly logger = new Logger(TikTokEventsService.name);
  private running = false;
  private flushing = false;
  private visitQueue: QueuedVisit[] = [];
  private lastState: string | null = null;
  /** Overridable in tests. */
  http: TikTokHttp = fetchHttp;
  env: () => NodeJS.ProcessEnv = () => process.env;
  /** Last auth-class answer seen (40001 / 40102 / 40104 / 40105) (admin card: "check the token"). */
  lastAuthError: { at: Date; code: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  config(): TikTokEventsConfig {
    return resolveTikTokEventsConfig(this.env());
  }

  @Cron("*/1 * * * *", { name: "tiktok-events-sender" })
  async tick(): Promise<void> {
    try {
      await this.run();
    } catch (error) {
      this.logger.warn(`TikTok Events run failed: ${this.scrub((error as Error).message)}`);
    }
  }

  private scrub(text: string): string {
    let out = scrubSecrets(text ?? "");
    const token = this.config().token;
    if (token) out = out.split(token).join("[redacted]");
    return out.slice(0, 300);
  }

  /** The click as sent: page URL only on an allowed landing origin, else LANDING_PAGE_URL. */
  clickForTikTok(click: any): TikTokClick {
    const adCfg = resolveAdTrackingConfig(this.env());
    return {
      visitId: click.visitId ?? null,
      // never another platform's click id: Meta's fbclid stays out of TikTok events
      pageUrl: urlForTikTok(allowedPageUrl(click.pageUrl, adCfg) ?? adCfg.landingPageUrl),
      referrer: click.referrer ?? null,
      ttclid: click.ttclid ?? null,
      clientIp: click.clientIp ?? null,
      userAgent: click.userAgent ?? null,
    };
  }

  private landingPageUrl(): string {
    return resolveAdTrackingConfig(this.env()).landingPageUrl;
  }

  private async request(cfg: TikTokEventsConfig, events: Record<string, unknown>[]): Promise<any> {
    const body = buildTikTokRequest(cfg.pixelId as string, events, cfg.testEventCode);
    let res: { status: number; json: any };
    try {
      res = await this.http.post(`${cfg.baseUrl}${TIKTOK_EVENT_PATH}`, cfg.token as string, body);
    } catch (error) {
      throw new TikTokApiError(this.scrub((error as Error)?.message ?? "network error"), "transient", null, null);
    }
    const code = typeof res.json?.code === "number" ? res.json.code : null;
    if (res.status === 200 && code === 0) return res.json;
    const kind = classifyTikTokError(res.status, code);
    if (kind === "auth") this.lastAuthError = { at: new Date(), code: code ?? res.status };
    const msg = this.scrub(String(res.json?.message ?? `HTTP ${res.status}`));
    throw new TikTokApiError(`code ${code ?? "-"}: ${msg}`, kind, res.status, code);
  }

  async run(now: Date = new Date()): Promise<TikTokRunResult> {
    const result: TikTokRunResult = { enabled: false, queued: 0, skipped: 0, sent: 0, failed: 0, retrying: 0 };
    const cfg = this.config();
    if (cfg.state !== "READY" || !cfg.pixelId || !cfg.token) {
      this.lastState = cfg.state;
      return result;
    }
    if (this.running) return result;
    this.running = true;
    try {
      result.enabled = true;
      if (this.lastState !== "READY") {
        const stale = await this.skipStaleContacts(now);
        result.skipped += stale;
        this.lastState = "READY";
      }
      for (const lane of [STAGE_LANE, CONTACT_LANE]) {
        const pending = await this.prisma.tikTokEventOutbox.findMany({
          where: { status: "PENDING_CONFIG", ...lane },
          include: SEND_INCLUDE,
          orderBy: { createdAt: "asc" },
          take: PROMOTE_MAX,
        });
        for (const row of pending) {
          const reason = tiktokSkipReason(row, now, cfg.maxAgeDays);
          if (reason) {
            await this.mark(row.id, "SKIPPED", { lastError: reason });
            result.skipped += 1;
          } else {
            await this.mark(row.id, "QUEUED", { nextTryAt: null });
            result.queued += 1;
          }
        }
      }
      // a claim older than the lease = an interrupted run: safe to retry (same event_id)
      await this.prisma.tikTokEventOutbox.updateMany({
        where: { status: "QUEUED", inFlightAt: { lt: new Date(now.getTime() - CAPI_IN_FLIGHT_LEASE_MS) } },
        data: { inFlightAt: null },
      });
      for (let guard = 0; guard < 20; guard += 1) {
        const stage = await this.sendDue(STAGE_LANE, cfg, now, result);
        const contacts = await this.sendDue(CONTACT_LANE, cfg, now, result);
        if (stage < BATCH && contacts < BATCH) break;
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  async skipStaleContacts(now: Date = new Date()): Promise<number> {
    const res = await this.prisma.tikTokEventOutbox.updateMany({
      where: {
        status: "PENDING_CONFIG",
        ...CONTACT_LANE,
        createdAt: { lt: new Date(now.getTime() - TIKTOK_STALE_BEFORE_ENABLE_MS) },
      },
      data: { status: "SKIPPED", lastError: SKIP_TT_STALE_BEFORE_ENABLE },
    });
    return res.count;
  }

  private mark(id: string, status: TikTokEventStatus, data: Prisma.TikTokEventOutboxUpdateInput = {}) {
    return this.prisma.tikTokEventOutbox.update({ where: { id }, data: { status, ...data } });
  }

  private async sendDue(
    lane: Prisma.TikTokEventOutboxWhereInput,
    cfg: TikTokEventsConfig,
    now: Date,
    result: TikTokRunResult,
  ): Promise<number> {
    const due = await this.prisma.tikTokEventOutbox.findMany({
      where: {
        status: "QUEUED",
        inFlightAt: null,
        AND: [{ OR: [{ nextTryAt: null }, { nextTryAt: { lte: now } }] }, lane],
      },
      include: SEND_INCLUDE,
      orderBy: { eventTime: "asc" },
      take: BATCH,
    });
    for (const row of due) {
      const reason = tiktokSkipReason(row, now, cfg.maxAgeDays);
      if (reason) {
        await this.mark(row.id, "SKIPPED", { lastError: reason });
        result.skipped += 1;
        continue;
      }
      const claimed = await this.prisma.tikTokEventOutbox.updateMany({
        where: { id: row.id, status: "QUEUED", inFlightAt: null },
        data: { inFlightAt: new Date() },
      });
      if (claimed.count !== 1) continue;
      await this.sendOne(row, cfg, now, result);
    }
    return due.length;
  }

  /** Invoice number for Purchase.order_id: the paid invoice of the lead's quotation, else the lead id. */
  private async orderIdFor(lead: { id: string; quotationId: string | null } | null): Promise<string | null> {
    if (!lead) return null;
    if (lead.quotationId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { quotationId: lead.quotationId, status: "PAID" },
        orderBy: { createdAt: "desc" },
        select: { invoiceNumber: true },
      });
      if (invoice?.invoiceNumber) return invoice.invoiceNumber;
    }
    return lead.id;
  }

  private async sendOne(row: any, cfg: TikTokEventsConfig, now: Date, result: TikTokRunResult): Promise<void> {
    const click = this.clickForTikTok(row.adClick);
    const isContact = row.eventName === "Contact";
    const event = buildTikTokEvent(
      {
        eventName: row.eventName,
        eventTime: row.eventTime,
        eventId: tiktokEventId(row, row.adClick),
        value: row.value,
        orderId: row.eventName === "Purchase" ? await this.orderIdFor(row.lead) : null,
        description: isContact || row.eventName === "Lead" ? "WhatsApp inquiry" : null,
      },
      click,
      isContact ? null : row.lead,
      this.landingPageUrl(),
    );
    try {
      const res = await this.request(cfg, [event]);
      await this.prisma.tikTokEventOutbox.update({
        where: { id: row.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          attempts: { increment: 1 },
          payload: redactTikTokEventForStorage(event) as Prisma.InputJsonValue,
          response: {
            code: 0,
            request_id: typeof res?.request_id === "string" ? res.request_id : null,
            test_event_code: cfg.testEventCode ?? null,
          } as Prisma.InputJsonValue,
          lastError: null,
          nextTryAt: null,
          inFlightAt: null,
        },
      });
      result.sent += 1;
    } catch (error) {
      const kind: TikTokErrorKind = error instanceof TikTokApiError ? error.kind : "transient";
      const attempts = (row.attempts ?? 0) + 1;
      const permanent = kind === "permanent" || attempts >= CAPI_MAX_ATTEMPTS;
      await this.mark(row.id, permanent ? "FAILED" : "QUEUED", {
        attempts,
        inFlightAt: null,
        lastError: this.scrub((error as Error)?.message ?? "error"),
        nextTryAt: permanent
          ? null
          : new Date(now.getTime() + CAPI_BACKOFF_MS[Math.min(attempts, CAPI_BACKOFF_MS.length) - 1]),
      });
      if (permanent) result.failed += 1;
      else result.retrying += 1;
    }
  }

  // ---------------------------------------------------------------------
  // High-volume visit events: ViewContent per landing view, a small in-memory
  // queue flushed in batches of up to 1000 (a restart may lose the last few
  // seconds; Contact and the CRM stage events keep their durable outbox).
  // ---------------------------------------------------------------------

  enqueueVisitEvent(v: VisitEventToSend): boolean {
    const cfg = this.config();
    if (cfg.state !== "READY" || !cfg.pixelId) return false;
    if (this.visitQueue.length >= TIKTOK_VISIT_QUEUE_MAX) return false;
    const event = buildTikTokEvent(
      { eventName: "ViewContent", eventTime: v.eventTime, eventId: `tt_view_${v.eventId}` },
      this.clickForTikTok(v.click),
      null,
      this.landingPageUrl(),
    );
    this.visitQueue.push({ event, eventTime: v.eventTime, attempts: 0 });
    return true;
  }

  get queuedVisitEvents(): number {
    return this.visitQueue.length;
  }

  @Cron("*/10 * * * * *", { name: "tiktok-visit-flush" })
  async flushTick(): Promise<void> {
    try {
      await this.flushVisitEvents();
    } catch (error) {
      this.logger.warn(`TikTok visit flush failed: ${this.scrub((error as Error).message)}`);
    }
  }

  async flushVisitEvents(now: Date = new Date()): Promise<TikTokVisitFlushResult> {
    const result: TikTokVisitFlushResult = { sent: 0, stale: 0, dropped: 0, retrying: 0, requests: 0 };
    const cfg = this.config();
    if (cfg.state !== "READY" || !cfg.pixelId || !cfg.token) return result;
    if (this.flushing) return result;
    this.flushing = true;
    try {
      const maxAgeMs = cfg.maxAgeDays * 86_400_000;
      const budget = { left: TIKTOK_PERMANENT_RETRY_CAP };
      while (this.visitQueue.length > 0) {
        const taken = this.visitQueue.splice(0, TIKTOK_MAX_BATCH);
        const fresh = taken.filter((q) => now.getTime() - q.eventTime.getTime() <= maxAgeMs);
        result.stale += taken.length - fresh.length;
        if (fresh.length === 0) continue;
        const left = await this.sendVisitBatch(cfg, fresh, result, budget);
        if (left.length === 0) continue;
        // transient / auth / rate limit: retry on a later tick, a few times, then drop
        const again = left.filter((q) => (q.attempts += 1) < TIKTOK_VISIT_MAX_ATTEMPTS);
        result.dropped += left.length - again.length;
        result.retrying += again.length;
        this.visitQueue.unshift(...again);
        break;
      }
      return result;
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Sends one batch. Returns the events that must be retried later (a transient /
   * auth / rate-limit failure); everything else is settled here. A permanent
   * refusal (40002) is isolated instead of dropping the whole batch: the index TikTok
   * names is dropped and the rest resent; when no index can be read the batch is split
   * in half and each half sent on its own. The extra requests are capped per flush
   * (`budget`), after which the remaining batch is dropped.
   */
  private async sendVisitBatch(
    cfg: TikTokEventsConfig,
    batch: QueuedVisit[],
    result: TikTokVisitFlushResult,
    budget: { left: number },
    isolation = false,
  ): Promise<QueuedVisit[]> {
    if (isolation) {
      // an extra request spent on isolating a refused batch: capped per flush
      if (budget.left <= 0) {
        result.dropped += batch.length;
        return [];
      }
      budget.left -= 1;
    }
    result.requests += 1;
    try {
      await this.request(cfg, batch.map((q) => q.event));
      result.sent += batch.length;
      return [];
    } catch (error) {
      const kind: TikTokErrorKind = error instanceof TikTokApiError ? error.kind : "transient";
      this.logger.warn(`TikTok visit batch of ${batch.length} failed (${kind}): ${this.scrub((error as Error)?.message ?? "")}`);
      if (kind !== "permanent") return batch;
      if (batch.length === 1) {
        result.dropped += 1;
        return [];
      }
      // 40002 names the zero-based index of the first bad event
      const m = /data\.?\s*(\d+)\s*\./.exec((error as Error).message ?? "");
      const bad = m ? Number(m[1]) : -1;
      if (bad >= 0 && bad < batch.length) {
        result.dropped += 1;
        return this.sendVisitBatch(cfg, batch.filter((_, i) => i !== bad), result, budget, true);
      }
      const mid = Math.ceil(batch.length / 2);
      const first = await this.sendVisitBatch(cfg, batch.slice(0, mid), result, budget, true);
      if (first.length > 0) return [...first, ...batch.slice(mid)];
      return this.sendVisitBatch(cfg, batch.slice(mid), result, budget, true);
    }
  }

  /** Counts for the CRM settings card. */
  async stats() {
    const [groups, lastSent, lastFailed, sentByEvent] = await Promise.all([
      this.prisma.tikTokEventOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.tikTokEventOutbox.findFirst({
        where: { status: "SENT" },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true, eventName: true },
      }),
      this.prisma.tikTokEventOutbox.findFirst({
        where: { status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true, eventName: true, lastError: true },
      }),
      this.prisma.tikTokEventOutbox.groupBy({ by: ["eventName"], where: { status: "SENT" }, _count: { _all: true } }),
    ]);
    const events: Record<string, number> = { PENDING_CONFIG: 0, QUEUED: 0, SENT: 0, FAILED: 0, SKIPPED: 0 };
    for (const g of groups) events[g.status] = g._count._all;
    const sent: Record<string, number> = {};
    for (const g of sentByEvent) sent[g.eventName] = g._count._all;
    return {
      events,
      sentByEvent: sent,
      lastSentAt: lastSent?.sentAt ?? null,
      lastFailed: lastFailed
        ? { at: lastFailed.updatedAt, eventName: lastFailed.eventName, error: lastFailed.lastError }
        : null,
      queuedVisitEvents: this.visitQueue.length,
      authProblem: this.lastAuthError ? { at: this.lastAuthError.at, code: this.lastAuthError.code } : null,
    };
  }
}
