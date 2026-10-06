import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MetaEventStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { scrubSecrets } from "../instagram/instagram-graph.client";
import { GraphApiError, WaGraphError } from "./whatsapp-graph.client";
import { WaCredentials, WhatsAppApiService } from "./whatsapp-api.service";
import { DAY_MS } from "./whatsapp.utils";

export const CAPI_MAX_BATCH = 1000;
export const CAPI_MAX_AGE_MS = 7 * DAY_MS;
export const CAPI_MAX_ATTEMPTS = 6;
export const CAPI_BACKOFF_MS = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 3600_000,
  6 * 3600_000,
];
export const SKIP_NO_CLID = "no ctwa_clid — not from a CTWA ad";
export const SKIP_TOO_OLD = "event older than 7 days — not accepted by Meta";
/**
 * A row stays "in flight" (inFlightAt set) while its request is outstanding.
 * A marker older than this belongs to a run that never finished (crash,
 * restart, failed SENT write) — the request may or may not have reached Meta.
 */
export const CAPI_IN_FLIGHT_LEASE_MS = 15 * 60_000;
export const OUTCOME_UNKNOWN_PREFIX = "Outcome unknown";

interface OutboxRow {
  /** Also the CAPI event_id (stable across every attempt for this row). */
  id: string;
  eventName: string;
  eventTime: Date;
  value: Prisma.Decimal | number | null;
  attempts: number;
  lead: { ctwaClid: string | null };
}

/**
 * One Conversions API for Business Messaging event, exactly:
 *   { event_name, event_time (unix s), event_id, action_source:
 *     "business_messaging", messaging_channel: "whatsapp",
 *     user_data: { whatsapp_business_account_id, ctwa_clid },
 *     custom_data: { currency: "IDR", value } }   // only when a value exists
 *
 * event_id = the outbox row id: stable for every attempt of the same row, so
 * the generic Conversions API (event_name, event_id) deduplication can apply.
 * NOTE: the business-messaging docs say Meta does NOT deduplicate these
 * events, so the sender itself never automatically resends a request whose
 * outcome is unknown (see MetaCapiService) — event_id is defence in depth,
 * not the mechanism relied on.
 */
export function buildCapiEvent(
  row: Pick<OutboxRow, "eventName" | "eventTime" | "value"> &
    Partial<Pick<OutboxRow, "id">>,
  ctwaClid: string,
  wabaId: string,
) {
  const event: Record<string, unknown> = {
    event_name: row.eventName,
    event_time: Math.floor(row.eventTime.getTime() / 1000),
    ...(row.id ? { event_id: row.id } : {}),
    action_source: "business_messaging",
    messaging_channel: "whatsapp",
    user_data: { whatsapp_business_account_id: wabaId, ctwa_clid: ctwaClid },
  };
  if (row.value !== null && row.value !== undefined) {
    event.custom_data = { currency: "IDR", value: Number(row.value) };
  }
  return event;
}

/** Why a row cannot be sent (or null when it can). */
export function skipReason(
  row: Pick<OutboxRow, "eventTime" | "lead">,
  now: Date,
): string | null {
  if (!row.lead?.ctwaClid) return SKIP_NO_CLID;
  if (now.getTime() - row.eventTime.getTime() > CAPI_MAX_AGE_MS)
    return SKIP_TOO_OLD;
  return null;
}

export interface CapiRunResult {
  enabled: boolean;
  queued: number;
  skipped: number;
  sent: number;
  failed: number;
  retrying: number;
}

/**
 * Drains MetaEventOutbox to POST /{dataset_id}/events.
 *   PENDING_CONFIG --(META_CAPI_ENABLED + dataset + credentials)--> QUEUED
 *   QUEUED --claim (inFlightAt=now)--> request to Meta -->
 *       SENT                         definitive success
 *       QUEUED (+backoff) | FAILED   definitive failure (Meta answered with an
 *                                    error, or the request provably never left);
 *                                    FAILED after CAPI_MAX_ATTEMPTS
 *       FAILED "Outcome unknown"     timeout / dropped connection / bare 5xx:
 *                                    Meta may have counted it and does not
 *                                    deduplicate business-messaging events, so
 *                                    it is NOT resent automatically
 *   QUEUED with a stale inFlightAt (crash / failed SENT write) --> FAILED
 *       "Outcome unknown" (same reason)
 *   rows without ctwa_clid / older than 7 days --> SKIPPED (with the reason)
 * Every event carries event_id = row id (stable across attempts).
 * Unless the CAPI config is READY (META_CAPI_ENABLED, valid dataset, READY
 * WhatsApp config) nothing is read, changed or sent.
 */
@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: WhatsAppApiService,
  ) {}

  @Cron("*/1 * * * *", { name: "meta-capi-sender" })
  async tick(): Promise<void> {
    try {
      await this.run();
    } catch (error) {
      this.logger.warn(
        `CAPI sender run failed: ${scrubSecrets((error as Error).message)}`,
      );
    }
  }

  async run(now: Date = new Date()): Promise<CapiRunResult> {
    const result: CapiRunResult = {
      enabled: false,
      queued: 0,
      skipped: 0,
      sent: 0,
      failed: 0,
      retrying: 0,
    };
    const cfg = this.api.config();
    if (cfg.capiState !== "READY" || !cfg.datasetId) return result;
    if (this.running) return result;
    this.running = true;
    try {
      const creds = await this.api.resolve();
      if (!creds) return result;
      result.enabled = true;

      // 1) PENDING_CONFIG -> QUEUED / SKIPPED
      const pending = await this.prisma.metaEventOutbox.findMany({
        where: { status: "PENDING_CONFIG" },
        select: {
          id: true,
          eventTime: true,
          lead: { select: { ctwaClid: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 5000,
      });
      for (const row of pending) {
        const reason = skipReason(row, now);
        if (reason) {
          await this.mark(row.id, "SKIPPED", { lastError: reason });
          result.skipped += 1;
        } else {
          await this.mark(row.id, "QUEUED", { nextTryAt: null });
          result.queued += 1;
        }
      }

      // 2) a claim older than the lease = a run that never finished: the
      //    request may have reached Meta -> never resend automatically.
      const stale = await this.prisma.metaEventOutbox.findMany({
        where: {
          status: "QUEUED",
          inFlightAt: { lt: new Date(now.getTime() - CAPI_IN_FLIGHT_LEASE_MS) },
        },
        select: { id: true },
        take: 5000,
      });
      for (const row of stale) {
        await this.mark(row.id, "FAILED", {
          inFlightAt: null,
          nextTryAt: null,
          lastError: `${OUTCOME_UNKNOWN_PREFIX}: the send was interrupted (restart or database error). Not resent automatically to avoid double counting — check Events Manager.`,
        });
        result.failed += 1;
      }

      // 3) send due QUEUED rows in batches of up to 1000
      for (let guard = 0; guard < 20; guard += 1) {
        const due: OutboxRow[] = await this.prisma.metaEventOutbox.findMany({
          where: {
            status: "QUEUED",
            inFlightAt: null,
            OR: [{ nextTryAt: null }, { nextTryAt: { lte: now } }],
          },
          select: {
            id: true,
            eventName: true,
            eventTime: true,
            value: true,
            attempts: true,
            lead: { select: { ctwaClid: true } },
          },
          orderBy: { eventTime: "asc" },
          take: CAPI_MAX_BATCH,
        });
        if (due.length === 0) break;
        const sendable: OutboxRow[] = [];
        for (const row of due) {
          const reason = skipReason(row, now);
          if (reason) {
            await this.mark(row.id, "SKIPPED", { lastError: reason });
            result.skipped += 1;
          } else {
            sendable.push(row);
          }
        }
        if (sendable.length) {
          const claimed = await this.claim(sendable);
          if (claimed.length)
            await this.sendBatch(
              claimed,
              creds,
              cfg.datasetId,
              cfg.capiTestEventCode,
              now,
              result,
            );
        }
        if (due.length < CAPI_MAX_BATCH) break;
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  private mark(
    id: string,
    status: MetaEventStatus,
    data: Prisma.MetaEventOutboxUpdateInput = {},
  ) {
    return this.prisma.metaEventOutbox.update({
      where: { id },
      data: { status, ...data },
    });
  }

  /**
   * Marks rows in flight BEFORE the request. Only rows that were still
   * unclaimed are returned, so two overlapping runs (several instances)
   * cannot both send the same row.
   */
  private async claim(rows: OutboxRow[]): Promise<OutboxRow[]> {
    const stamp = new Date();
    const ids = rows.map((r) => r.id);
    await this.prisma.metaEventOutbox.updateMany({
      where: { id: { in: ids }, status: "QUEUED", inFlightAt: null },
      data: { inFlightAt: stamp },
    });
    const mine: Array<{ id: string }> =
      await this.prisma.metaEventOutbox.findMany({
        where: { id: { in: ids }, inFlightAt: stamp },
        select: { id: true },
      });
    const claimed = new Set(mine.map((m) => m.id));
    return rows.filter((r) => claimed.has(r.id));
  }

  private async sendBatch(
    rows: OutboxRow[],
    creds: WaCredentials,
    datasetId: string,
    testEventCode: string | null,
    now: Date,
    result: CapiRunResult,
  ): Promise<void> {
    const events = rows.map((r) =>
      buildCapiEvent(r, r.lead.ctwaClid as string, creds.wabaId),
    );
    const body: Record<string, unknown> = { data: events };
    if (testEventCode) body.test_event_code = testEventCode;
    let res: Awaited<ReturnType<WhatsAppApiService["sendCapiEvents"]>>;
    try {
      res = await this.api.sendCapiEvents(creds, datasetId, body);
    } catch (error) {
      await this.onSendError(
        error,
        rows,
        creds,
        datasetId,
        testEventCode,
        now,
        result,
      );
      return;
    }
    const response = {
      events_received:
        typeof res?.events_received === "number" ? res.events_received : null,
      fbtrace_id: typeof res?.fbtrace_id === "string" ? res.fbtrace_id : null,
      messages: Array.isArray(res?.messages)
        ? res.messages.slice(0, 5).map((m) => String(m).slice(0, 200))
        : [],
      test_event_code: testEventCode ?? null,
      batch_size: rows.length,
    };
    const sentData = (i: number) => ({
      status: "SENT" as const,
      sentAt: new Date(),
      attempts: { increment: 1 },
      payload: events[i] as Prisma.InputJsonValue,
      response: response as Prisma.InputJsonValue,
      lastError: null,
      nextTryAt: null,
      inFlightAt: null,
    });
    try {
      await this.prisma.$transaction(
        rows.map((r, i) =>
          this.prisma.metaEventOutbox.update({
            where: { id: r.id },
            data: sentData(i),
          }),
        ),
      );
      result.sent += rows.length;
    } catch (error) {
      // Meta accepted the batch but the SENT write failed: retry row by
      // row; rows that still fail keep inFlightAt and become "Outcome
      // unknown" after the lease — never resent automatically.
      this.logger.error(
        `CAPI: Meta accepted ${rows.length} event(s) but marking them SENT failed: ${scrubSecrets((error as Error).message)}`,
      );
      for (const [i, r] of rows.entries()) {
        try {
          await this.prisma.metaEventOutbox.update({
            where: { id: r.id },
            data: sentData(i),
          });
          result.sent += 1;
        } catch {
          /* stays in flight; resolved by the lease check */
        }
      }
    }
  }

  private async onSendError(
    error: unknown,
    rows: OutboxRow[],
    creds: WaCredentials,
    datasetId: string,
    testEventCode: string | null,
    now: Date,
    result: CapiRunResult,
  ): Promise<void> {
    const kind = error instanceof GraphApiError ? error.kind : "transient";
    // Outcome unknown: Meta may have counted the events already.
    if (error instanceof WaGraphError && error.ambiguous) {
      const message = scrubSecrets(error.message).slice(0, 200);
      for (const r of rows) {
        await this.mark(r.id, "FAILED", {
          attempts: r.attempts + 1,
          inFlightAt: null,
          nextTryAt: null,
          lastError: `${OUTCOME_UNKNOWN_PREFIX} (${message}): Meta may have received this event and does not deduplicate business-messaging events, so it is not resent automatically — check Events Manager.`,
        });
        result.failed += 1;
      }
      return;
    }
    // One malformed event rejects the whole batch: isolate it by sending one by one.
    if (kind === "invalid_param" && rows.length > 1) {
      for (const r of rows)
        await this.sendBatch(
          [r],
          creds,
          datasetId,
          testEventCode,
          now,
          result,
        );
      return;
    }
    const message = scrubSecrets((error as Error)?.message ?? "error").slice(
      0,
      300,
    );
    for (const r of rows) {
      const attempts = r.attempts + 1;
      const permanent =
        kind === "invalid_param" || attempts >= CAPI_MAX_ATTEMPTS;
      await this.mark(r.id, permanent ? "FAILED" : "QUEUED", {
        attempts,
        inFlightAt: null,
        lastError: message,
        nextTryAt: permanent
          ? null
          : new Date(
              now.getTime() +
                CAPI_BACKOFF_MS[
                  Math.min(attempts, CAPI_BACKOFF_MS.length) - 1
                ],
            ),
        ...(kind === "invalid_param"
          ? { response: { error: message } as Prisma.InputJsonValue }
          : {}),
      });
      if (permanent) result.failed += 1;
      else result.retrying += 1;
    }
  }

  async summary() {
    const cfg = this.api.config();
    const [groups, lastSent, lastFailed] = await Promise.all([
      this.prisma.metaEventOutbox.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.metaEventOutbox.findFirst({
        where: { status: "SENT" },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true, eventName: true },
      }),
      this.prisma.metaEventOutbox.findFirst({
        where: { status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true, eventName: true, lastError: true },
      }),
    ]);
    const counts: Record<string, number> = {
      PENDING_CONFIG: 0,
      QUEUED: 0,
      SENT: 0,
      FAILED: 0,
      SKIPPED: 0,
    };
    for (const g of groups) counts[g.status] = g._count._all;
    return {
      enabled: cfg.capiEnabled,
      datasetConfigured: !!cfg.datasetId,
      datasetId: cfg.datasetId,
      testEventCode: !!cfg.capiTestEventCode,
      counts,
      lastSentAt: lastSent?.sentAt ?? null,
      lastFailed: lastFailed
        ? {
            at: lastFailed.updatedAt,
            eventName: lastFailed.eventName,
            error: lastFailed.lastError,
          }
        : null,
    };
  }
}
