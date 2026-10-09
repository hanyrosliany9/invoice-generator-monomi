import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MetaEventStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  assertGraphCallNotDenied,
  ForbiddenGraphEndpointError,
} from "../../common/meta/graph-denylist";
import { scrubSecrets } from "../instagram/instagram-graph.client";
import { GraphApiError, WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import {
  CAPI_BACKOFF_MS,
  CAPI_IN_FLIGHT_LEASE_MS,
  CAPI_MAX_ATTEMPTS,
} from "../whatsapp/meta-capi.service";
import { AdTrackingConfig, allowedPageUrl, resolveAdTrackingConfig } from "./ad-tracking.config";
import {
  buildWebEvent,
  redactEventForStorage,
  SKIP_STALE_BEFORE_ENABLE,
  WEB_CAPI_MAX_AGE_MS,
  WebClick,
  webSkipReason,
} from "./web-capi.payload";
import type { VisitEventToSend } from "./ad-click.service";
import { urlForMeta } from "./url-params";

export interface WebCapiRunResult {
  enabled: boolean;
  queued: number;
  skipped: number;
  sent: number;
  failed: number;
  retrying: number;
}

const BATCH = 50;
const SEND_INCLUDE = {
  adClick: true,
  lead: { select: { id: true, name: true, phone: true, nameIsPlaceholder: true, ctwaClid: true } },
} satisfies Prisma.MetaEventOutboxInclude;
/** Click-time Leads still PENDING_CONFIG and older than this when the sender becomes READY are skipped. */
export const STALE_BEFORE_ENABLE_MS = 86_400_000;
/** Most PENDING_CONFIG rows promoted per lane per run. */
const PROMOTE_MAX = 5000;
/** Meta accepts up to 1000 events per Conversions API request. */
export const WEB_CAPI_MAX_BATCH = 1000;
/** Visit events are low value: bounded in memory, a few retries, then dropped. */
export const VISIT_QUEUE_MAX = 5000;
export const VISIT_MAX_ATTEMPTS = 3;

interface QueuedVisitEvent {
  event: Record<string, unknown>;
  eventTime: Date;
  attempts: number;
}

export interface VisitFlushResult {
  sent: number;
  stale: number;
  dropped: number;
  retrying: number;
  requests: number;
}

/**
 * Sender lanes. Click-time Leads can arrive in bulk from the public endpoint;
 * CRM stage events (QualifiedLead, Purchase) must never wait behind them, so
 * each run serves the stage lane first and never sends more than one Lead
 * batch before looking at the stage lane again. On the website route "Lead"
 * is only ever the click-time event (the CRM queues LeadSubmitted /
 * QualifiedLead / Purchase), whether or not its click was linked since.
 */
export const CLICK_LEAD_LANE: Prisma.MetaEventOutboxWhereInput = { eventName: "Lead" };
export const STAGE_LANE: Prisma.MetaEventOutboxWhereInput = { eventName: { not: "Lead" } };

/** Blocked by the shared Graph denylist: deterministic, so never retried. */
const isForbidden = (error: unknown) => error instanceof ForbiddenGraphEndpointError;

/**
 * The click as sent to Meta: the page URL only when it is on an allowed
 * landing-page origin, else LANDING_PAGE_URL (rows stored before the origin
 * filter existed are covered too).
 */
export function clickForMeta<T extends WebClick>(click: T, cfg: AdTrackingConfig): T {
  // urlForMeta: no TikTok click id in a Meta event, and the URL length Meta has always been sent
  return { ...click, pageUrl: urlForMeta(allowedPageUrl(click.pageUrl, cfg) ?? cfg.landingPageUrl) };
}

/**
 * Drains the WEBSITE route of MetaEventOutbox to POST /{pixel_id}/events.
 *   PENDING_CONFIG --(config READY)--> QUEUED | SKIPPED (+reason)
 *   QUEUED --claim (inFlightAt)--> one event per request -->
 *       SENT                 Meta accepted it
 *       QUEUED (+backoff)    transient / ambiguous failure, retried; every
 *                            retry reuses the same event_id so Meta
 *                            deduplicates (website events, unlike business
 *                            messaging ones, are deduplicated on event_id)
 *       FAILED               rejected as invalid, or CAPI_MAX_ATTEMPTS reached
 * One event per request: a stale or malformed event can never fail others.
 * A ForbiddenGraphEndpointError (shared denylist) is permanent: FAILED at once.
 * Stage events and click-time Leads are separate lanes (STAGE_LANE first).
 * Unless the config is READY nothing is read, changed or sent (rows wait as
 * PENDING_CONFIG while clicks keep being stored and linked). On the first
 * READY run (boot, or a change to READY) click-time Leads that waited more
 * than 24 h are SKIPPED (SKIP_STALE_BEFORE_ENABLE) instead of being sent.
 */
@Injectable()
export class WebCapiService {
  private readonly logger = new Logger(WebCapiService.name);
  private running = false;
  private flushing = false;
  private visitQueue: QueuedVisitEvent[] = [];
  /** State seen by the previous run (null before the first run = boot). */
  private lastState: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: WhatsAppGraphClient,
  ) {}

  config(): AdTrackingConfig {
    return resolveAdTrackingConfig();
  }

  @Cron("*/1 * * * *", { name: "web-capi-sender" })
  async tick(): Promise<void> {
    try {
      await this.run();
    } catch (error) {
      this.logger.warn(`Website CAPI run failed: ${scrubSecrets((error as Error).message)}`);
    }
  }

  async run(now: Date = new Date()): Promise<WebCapiRunResult> {
    const result: WebCapiRunResult = {
      enabled: false,
      queued: 0,
      skipped: 0,
      sent: 0,
      failed: 0,
      retrying: 0,
    };
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
        const stale = await this.skipStaleClickLeads(now);
        result.skipped += stale;
        if (stale) {
          this.logger.log(`Skipped ${stale} click-time Lead(s) that waited more than 24 h for the sender`);
        }
        this.lastState = "READY";
      }

      // 1) PENDING_CONFIG -> QUEUED / SKIPPED, stage lane first
      for (const lane of [STAGE_LANE, CLICK_LEAD_LANE]) {
        const pending = await this.prisma.metaEventOutbox.findMany({
          where: { route: "WEBSITE", status: "PENDING_CONFIG", ...lane },
          include: SEND_INCLUDE,
          orderBy: { createdAt: "asc" },
          take: PROMOTE_MAX,
        });
        for (const row of pending) {
          const reason = webSkipReason(row, now);
          if (reason) {
            await this.mark(row.id, "SKIPPED", { lastError: reason });
            result.skipped += 1;
          } else {
            await this.mark(row.id, "QUEUED", { nextTryAt: null });
            result.queued += 1;
          }
        }
      }

      // 2) a claim older than the lease = an interrupted run: safe to retry
      //    (same event_id -> Meta deduplicates).
      await this.prisma.metaEventOutbox.updateMany({
        where: {
          route: "WEBSITE",
          status: "QUEUED",
          inFlightAt: { lt: new Date(now.getTime() - CAPI_IN_FLIGHT_LEASE_MS) },
        },
        data: { inFlightAt: null },
      });

      // 3) send due rows, one request per event. Each round drains due stage
      //    events first, then at most one batch of click-time Leads.
      for (let guard = 0; guard < 20; guard += 1) {
        const stage = await this.sendDue(STAGE_LANE, cfg, now, result);
        const leads = await this.sendDue(CLICK_LEAD_LANE, cfg, now, result);
        if (stage < BATCH && leads < BATCH) break;
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  /** PENDING_CONFIG click-time Leads older than 24 h -> SKIPPED (stale before enable). */
  async skipStaleClickLeads(now: Date = new Date()): Promise<number> {
    const res = await this.prisma.metaEventOutbox.updateMany({
      where: {
        route: "WEBSITE",
        status: "PENDING_CONFIG",
        ...CLICK_LEAD_LANE,
        createdAt: { lt: new Date(now.getTime() - STALE_BEFORE_ENABLE_MS) },
      },
      data: { status: "SKIPPED", lastError: SKIP_STALE_BEFORE_ENABLE },
    });
    return res.count;
  }

  /** Sends one batch of due rows of a lane; returns how many rows were due. */
  private async sendDue(
    lane: Prisma.MetaEventOutboxWhereInput,
    cfg: AdTrackingConfig,
    now: Date,
    result: WebCapiRunResult,
  ): Promise<number> {
    const due = await this.prisma.metaEventOutbox.findMany({
      where: {
        route: "WEBSITE",
        status: "QUEUED",
        inFlightAt: null,
        AND: [{ OR: [{ nextTryAt: null }, { nextTryAt: { lte: now } }] }, lane],
      },
      include: SEND_INCLUDE,
      orderBy: { eventTime: "asc" },
      take: BATCH,
    });
    for (const row of due) {
      const reason = webSkipReason(row, now);
      if (reason) {
        await this.mark(row.id, "SKIPPED", { lastError: reason });
        result.skipped += 1;
        continue;
      }
      const claimed = await this.prisma.metaEventOutbox.updateMany({
        where: { id: row.id, status: "QUEUED", inFlightAt: null },
        data: { inFlightAt: new Date() },
      });
      if (claimed.count !== 1) continue;
      await this.sendOne(row, cfg, now, result);
    }
    return due.length;
  }

  private mark(id: string, status: MetaEventStatus, data: Prisma.MetaEventOutboxUpdateInput = {}) {
    return this.prisma.metaEventOutbox.update({ where: { id }, data: { status, ...data } });
  }

  private async sendOne(
    row: any,
    cfg: AdTrackingConfig,
    now: Date,
    result: WebCapiRunResult,
  ): Promise<void> {
    const click = clickForMeta(row.adClick, cfg);
    const event = buildWebEvent(
      {
        // The Lead event reuses the click's eventId so the browser Pixel
        // Lead and this one count once.
        eventId: row.eventName === "Lead" ? (click.eventId ?? row.id) : row.id,
        eventName: row.eventName,
        eventTime: row.eventTime,
        value: row.value,
      },
      click,
      row.eventName === "Lead" ? null : row.lead,
    );
    const body: Record<string, unknown> = { data: [event] };
    if (cfg.testEventCode) body.test_event_code = cfg.testEventCode;
    try {
      const res = await this.graph.request<{
        events_received?: number;
        fbtrace_id?: string;
        messages?: unknown[];
      }>(cfg.graphBaseUrl, cfg.graphVersion, `/${cfg.pixelId}/events`, {
        method: "POST",
        token: cfg.token,
        json: body,
        timeoutMs: 30000,
      });
      await this.prisma.metaEventOutbox.update({
        where: { id: row.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          attempts: { increment: 1 },
          payload: redactEventForStorage(event) as Prisma.InputJsonValue,
          response: {
            events_received: typeof res?.events_received === "number" ? res.events_received : null,
            fbtrace_id: typeof res?.fbtrace_id === "string" ? res.fbtrace_id : null,
            messages: Array.isArray(res?.messages)
              ? res.messages.slice(0, 5).map((m) => String(m).slice(0, 200))
              : [],
            test_event_code: cfg.testEventCode ?? null,
          } as Prisma.InputJsonValue,
          lastError: null,
          nextTryAt: null,
          inFlightAt: null,
        },
      });
      result.sent += 1;
    } catch (error) {
      const kind = isForbidden(error)
        ? "forbidden"
        : error instanceof GraphApiError
          ? error.kind
          : "transient";
      const attempts = (row.attempts ?? 0) + 1;
      const permanent =
        kind === "forbidden" || kind === "invalid_param" || attempts >= CAPI_MAX_ATTEMPTS;
      const message = scrubSecrets((error as Error)?.message ?? "error").slice(0, 300);
      await this.mark(row.id, permanent ? "FAILED" : "QUEUED", {
        attempts,
        inFlightAt: null,
        lastError: message,
        nextTryAt: permanent
          ? null
          : new Date(
              now.getTime() +
                CAPI_BACKOFF_MS[Math.min(attempts, CAPI_BACKOFF_MS.length) - 1],
            ),
      });
      if (permanent) result.failed += 1;
      else result.retrying += 1;
    }
  }

  // ---------------------------------------------------------------------
  // High-volume visit events (PageView / ViewContent / EngagedVisit):
  // a small in-memory queue flushed in batches of up to 1000 events. They are
  // low value, so a restart may lose the last few seconds; Lead and the CRM
  // stage events keep their durable at-most-once outbox.
  // ---------------------------------------------------------------------

  /**
   * Queues a visit event for the next flush. False when the sender is not
   * READY, the queue is full, or the event fails the shared Graph denylist
   * (checked per event, so one poisoned event can never block a batch).
   */
  enqueueVisitEvent(v: VisitEventToSend): boolean {
    const cfg = this.config();
    if (cfg.state !== "READY" || !cfg.pixelId) return false;
    if (this.visitQueue.length >= VISIT_QUEUE_MAX) return false;
    const event = buildWebEvent(
      { eventName: v.name, eventTime: v.eventTime, eventId: v.eventId },
      clickForMeta(v.click, cfg),
      null,
    );
    if (!this.passesDenylist(event, cfg)) {
      this.logger.warn(`Dropped a ${v.name} visit event refused by the Graph denylist`);
      return false;
    }
    this.visitQueue.push({ eventTime: v.eventTime, attempts: 0, event });
    return true;
  }

  /** The same denylist check the Graph client runs on the request, for one event. */
  private passesDenylist(event: Record<string, unknown>, cfg: AdTrackingConfig): boolean {
    try {
      assertGraphCallNotDenied("POST", `/${cfg.pixelId}/events`, { body: { data: [event] } });
      return true;
    } catch (error) {
      if (isForbidden(error)) return false;
      throw error;
    }
  }

  get queuedVisitEvents(): number {
    return this.visitQueue.length;
  }

  @Cron("*/10 * * * * *", { name: "web-capi-visit-flush" })
  async flushTick(): Promise<void> {
    try {
      await this.flushVisitEvents();
    } catch (error) {
      this.logger.warn(`Website CAPI visit flush failed: ${scrubSecrets((error as Error).message)}`);
    }
  }

  async flushVisitEvents(now: Date = new Date()): Promise<VisitFlushResult> {
    const result: VisitFlushResult = { sent: 0, stale: 0, dropped: 0, retrying: 0, requests: 0 };
    const cfg = this.config();
    if (cfg.state !== "READY" || !cfg.pixelId || !cfg.token) return result;
    if (this.flushing) return result;
    this.flushing = true;
    try {
      while (this.visitQueue.length > 0) {
        const taken = this.visitQueue.splice(0, WEB_CAPI_MAX_BATCH);
        // one stale event would fail the whole request: filter them out first
        const fresh = taken.filter((q) => now.getTime() - q.eventTime.getTime() <= WEB_CAPI_MAX_AGE_MS);
        result.stale += taken.length - fresh.length;
        if (fresh.length === 0) continue;
        const body: Record<string, unknown> = { data: fresh.map((q) => q.event) };
        if (cfg.testEventCode) body.test_event_code = cfg.testEventCode;
        result.requests += 1;
        try {
          await this.graph.request(cfg.graphBaseUrl, cfg.graphVersion, `/${cfg.pixelId}/events`, {
            method: "POST",
            token: cfg.token,
            json: body,
            timeoutMs: 30000,
          });
          result.sent += fresh.length;
        } catch (error) {
          if (isForbidden(error)) {
            // Permanent, never retried. Drop the events that fail the check
            // on their own and send the rest; if none does (the request
            // itself is refused), drop the whole batch.
            const clean = fresh.filter((q) => this.passesDenylist(q.event, cfg));
            const bad = fresh.length - clean.length;
            this.logger.warn(
              `Website CAPI visit batch refused by the Graph denylist: dropped ${bad || fresh.length} event(s)`,
            );
            if (bad === 0) {
              result.dropped += fresh.length;
              continue;
            }
            result.dropped += bad;
            this.visitQueue.unshift(...clean);
            continue;
          }
          const kind = error instanceof GraphApiError ? error.kind : "transient";
          this.logger.warn(
            `Website CAPI visit batch of ${fresh.length} failed (${kind}): ${scrubSecrets((error as Error)?.message ?? "error").slice(0, 200)}`,
          );
          if (kind === "invalid_param") {
            result.dropped += fresh.length;
            continue;
          }
          const again = fresh.filter((q) => (q.attempts += 1) < VISIT_MAX_ATTEMPTS);
          result.dropped += fresh.length - again.length;
          result.retrying += again.length;
          this.visitQueue.unshift(...again);
          break; // try again on the next tick
        }
      }
      return result;
    } finally {
      this.flushing = false;
    }
  }
}
