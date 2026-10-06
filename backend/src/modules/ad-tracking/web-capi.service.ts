import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MetaEventStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { scrubSecrets } from "../instagram/instagram-graph.client";
import { GraphApiError, WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import {
  CAPI_BACKOFF_MS,
  CAPI_IN_FLIGHT_LEASE_MS,
  CAPI_MAX_ATTEMPTS,
} from "../whatsapp/meta-capi.service";
import { AdTrackingConfig, resolveAdTrackingConfig } from "./ad-tracking.config";
import {
  buildWebEvent,
  redactEventForStorage,
  webSkipReason,
} from "./web-capi.payload";

export interface WebCapiRunResult {
  enabled: boolean;
  queued: number;
  skipped: number;
  sent: number;
  failed: number;
  retrying: number;
}

const BATCH = 50;

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
 * Unless the config is READY nothing is read, changed or sent (rows wait as
 * PENDING_CONFIG while clicks keep being stored and linked).
 */
@Injectable()
export class WebCapiService {
  private readonly logger = new Logger(WebCapiService.name);
  private running = false;

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
    if (cfg.state !== "READY" || !cfg.pixelId || !cfg.token) return result;
    if (this.running) return result;
    this.running = true;
    try {
      result.enabled = true;
      const include = {
        adClick: true,
        lead: { select: { id: true, name: true, phone: true, ctwaClid: true } },
      } satisfies Prisma.MetaEventOutboxInclude;

      // 1) PENDING_CONFIG -> QUEUED / SKIPPED
      const pending = await this.prisma.metaEventOutbox.findMany({
        where: { route: "WEBSITE", status: "PENDING_CONFIG" },
        include,
        orderBy: { createdAt: "asc" },
        take: 5000,
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

      // 3) send due rows, one request per event
      for (let guard = 0; guard < 20; guard += 1) {
        const due = await this.prisma.metaEventOutbox.findMany({
          where: {
            route: "WEBSITE",
            status: "QUEUED",
            inFlightAt: null,
            OR: [{ nextTryAt: null }, { nextTryAt: { lte: now } }],
          },
          include,
          orderBy: { eventTime: "asc" },
          take: BATCH,
        });
        if (due.length === 0) break;
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
        if (due.length < BATCH) break;
      }
      return result;
    } finally {
      this.running = false;
    }
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
    const click = row.adClick;
    const event = buildWebEvent(
      {
        // The Lead event reuses the click's eventId so the browser Pixel
        // Lead and this one count once.
        eventId: row.eventName === "Lead" ? click.eventId : row.id,
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
      const kind = error instanceof GraphApiError ? error.kind : "transient";
      const attempts = (row.attempts ?? 0) + 1;
      const permanent = kind === "invalid_param" || attempts >= CAPI_MAX_ATTEMPTS;
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
}
