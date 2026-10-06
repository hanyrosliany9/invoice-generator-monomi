import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../queue/queue.module";
import { MetaAccountsService } from "./meta-accounts.service";
import { SocialPublishingService } from "./social-publishing.service";

/**
 * Every minute: arm due auto-publish items of the internal client and work
 * through due publications. Overlap-safe on three levels:
 *  - in-process flag (a slow tick is never re-entered by the next one);
 *  - a short Redis lock (one instance scans at a time; Redis down = continue);
 *  - the per-publication DB lease in SocialPublishingService.claim, which is
 *    what actually guarantees a publication runs on one worker only.
 */
@Injectable()
export class SocialPublishingScheduler {
  private readonly logger = new Logger(SocialPublishingScheduler.name);
  private ticking = false;

  constructor(
    private readonly service: SocialPublishingService,
    private readonly accounts: MetaAccountsService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis | null,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: "social-autopublish",
    timeZone: "Asia/Jakarta",
  })
  async tick(): Promise<{ armed: number; processed: number } | null> {
    const config = this.accounts.config;
    if (!config || !config.schedulerEnabled) return null;
    if (this.ticking) return null;
    this.ticking = true;
    try {
      if (!(await this.acquireLock("social-publish:tick", 50))) return null;
      const armed = await this.service.armDueItems();
      const ids = await this.service.findDuePublicationIds();
      if (ids.length) await this.service.processMany(ids, "scheduler");
      if (armed || ids.length)
        this.logger.log(
          `Auto-publish tick: armed ${armed}, processed ${ids.length}`,
        );
      return { armed, processed: ids.length };
    } catch (e) {
      this.logger.error(`Auto-publish tick failed: ${(e as Error).message}`);
      return null;
    } finally {
      this.ticking = false;
    }
  }

  private async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redis) return true;
    try {
      return (
        (await this.redis.set(
          key,
          String(process.pid),
          "EX",
          ttlSeconds,
          "NX",
        )) === "OK"
      );
    } catch {
      return true; // Redis down: the DB lease still prevents double processing.
    }
  }
}
