import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { scrubSecrets } from "../instagram/instagram-graph.client";
import { WhatsAppIngestService } from "./whatsapp-ingest.service";
import { sha256Hex } from "./whatsapp.utils";

export const MAX_EVENT_ATTEMPTS = 8;
/** Backoff after attempt n (1-based), in ms. */
export const EVENT_BACKOFF_MS = [
  30_000,
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  3 * 3600_000,
  6 * 3600_000,
  12 * 3600_000,
];
const LOCK_MS = 2 * 60_000;
/** Raw payloads hold message text (PII): processed rows are deleted after this. */
export const EVENT_RETENTION_DAYS = 14;
const MAX_DEFERRALS = 5;

export function changeFields(payload: any): string[] {
  const out = new Set<string>();
  for (const e of Array.isArray(payload?.entry) ? payload.entry : []) {
    for (const c of Array.isArray(e?.changes) ? e.changes : []) {
      if (typeof c?.field === "string" && /^[a-z_]{1,40}$/.test(c.field))
        out.add(c.field);
    }
  }
  return [...out];
}

/**
 * Durable webhook intake: the controller stores the delivery (one insert)
 * before answering 200, then processing happens asynchronously with
 * retries/backoff. A Meta redelivery of the identical body is a no-op
 * (payloadHash); re-processing is idempotent on message ids.
 */
@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingest: WhatsAppIngestService,
  ) {}

  async store(
    raw: Buffer,
    payload: unknown,
  ): Promise<{ id: string | null; duplicate: boolean }> {
    const payloadHash = sha256Hex(raw);
    try {
      const row = await this.prisma.whatsAppWebhookEvent.create({
        data: {
          payloadHash,
          fields: changeFields(payload).join(",").slice(0, 200) || null,
          payload: payload as Prisma.InputJsonValue,
          nextAttemptAt: new Date(),
        },
        select: { id: true },
      });
      void this.prisma.whatsAppConnection
        .upsert({
          where: { id: "default" },
          update: { lastWebhookAt: new Date() },
          create: { id: "default", lastWebhookAt: new Date() },
        })
        .catch(() => undefined);
      return { id: row.id, duplicate: false };
    } catch (error) {
      if ((error as Prisma.PrismaClientKnownRequestError)?.code === "P2002")
        return { id: null, duplicate: true };
      throw error;
    }
  }

  /** Fire-and-forget processing right after the 200. */
  kick(id: string): void {
    setTimeout(() => {
      this.process(id).catch((error) =>
        this.logger.error(
          `WhatsApp event ${id} crashed: ${(error as Error).message}`,
        ),
      );
    }, 0);
  }

  /** Claim + process one event. Returns the final state for tests/ops. */
  async process(
    id: string,
  ): Promise<"processed" | "retry" | "failed" | "skipped"> {
    const now = new Date();
    const claimed = await this.prisma.whatsAppWebhookEvent.updateMany({
      where: {
        id,
        processedAt: null,
        failedAt: null,
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      data: {
        lockedUntil: new Date(now.getTime() + LOCK_MS),
        attempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) return "skipped";
    const ev = await this.prisma.whatsAppWebhookEvent.findUnique({
      where: { id },
    });
    if (!ev) return "skipped";
    try {
      const result = await this.ingest.processPayload(ev.payload);
      if (result.deferredStatuses > 0 && ev.attempts < MAX_DEFERRALS) {
        await this.prisma.whatsAppWebhookEvent.update({
          where: { id },
          data: {
            lockedUntil: null,
            nextAttemptAt: new Date(Date.now() + 60_000 * ev.attempts),
            lastError: `waiting for ${result.deferredStatuses} message(s) referenced by statuses`,
          },
        });
        return "retry";
      }
      await this.prisma.whatsAppWebhookEvent.update({
        where: { id },
        data: { processedAt: new Date(), lockedUntil: null, lastError: null },
      });
      return "processed";
    } catch (error) {
      const message = scrubSecrets((error as Error)?.message ?? "error").slice(
        0,
        300,
      );
      const failed = ev.attempts >= MAX_EVENT_ATTEMPTS;
      this.logger.warn(
        `WhatsApp event ${id} attempt ${ev.attempts} failed${failed ? " (giving up)" : ""}: ${message}`,
      );
      await this.prisma.whatsAppWebhookEvent.update({
        where: { id },
        data: {
          lockedUntil: null,
          lastError: message,
          ...(failed
            ? { failedAt: new Date() }
            : {
                nextAttemptAt: new Date(
                  Date.now() +
                    EVENT_BACKOFF_MS[
                      Math.min(ev.attempts, EVENT_BACKOFF_MS.length) - 1
                    ],
                ),
              }),
        },
      });
      return failed ? "failed" : "retry";
    }
  }

  @Cron("*/1 * * * *", { name: "whatsapp-webhook-retry" })
  async sweep(): Promise<number> {
    if (this.sweeping) return 0;
    this.sweeping = true;
    try {
      const now = new Date();
      const due = await this.prisma.whatsAppWebhookEvent.findMany({
        where: {
          processedAt: null,
          failedAt: null,
          nextAttemptAt: { lte: now },
          OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
        },
        orderBy: { receivedAt: "asc" },
        take: 50,
        select: { id: true },
      });
      for (const e of due) await this.process(e.id);
      return due.length;
    } catch (error) {
      this.logger.warn(
        `WhatsApp webhook sweep failed: ${(error as Error).message}`,
      );
      return 0;
    } finally {
      this.sweeping = false;
    }
  }

  @Cron("40 3 * * *", {
    timeZone: "Asia/Jakarta",
    name: "whatsapp-webhook-retention",
  })
  async purge(): Promise<void> {
    try {
      const cutoff = new Date(
        Date.now() - EVENT_RETENTION_DAYS * 24 * 3600_000,
      );
      const failedCutoff = new Date(
        Date.now() - 2 * EVENT_RETENTION_DAYS * 24 * 3600_000,
      );
      await this.prisma.whatsAppWebhookEvent.deleteMany({
        where: {
          OR: [
            { processedAt: { lt: cutoff } },
            { failedAt: { lt: failedCutoff } },
          ],
        },
      });
    } catch (error) {
      this.logger.warn(
        `WhatsApp webhook retention failed: ${(error as Error).message}`,
      );
    }
  }
}
