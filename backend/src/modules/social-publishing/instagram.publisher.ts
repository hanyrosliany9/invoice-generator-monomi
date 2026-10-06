import { Injectable, Logger } from "@nestjs/common";
import { MetaAccountsService } from "./meta-accounts.service";
import { MetaGraphError } from "./meta-graph.client";
import { IgPlan, isVideo, PlanMedia } from "./publish-plan";
import {
  graphTimeMs,
  guarded,
  PublishContext,
  PublishOutcome,
  safePermalink,
  sameText,
} from "./publish-context";
import {
  MSG,
  PublishDeferred,
  PublishError,
  publishErrorFromGraph,
} from "./publish-errors";

/**
 * Instagram content publishing (Instagram API with Facebook Login, host
 * graph.facebook.com, system user token):
 *
 *   1. POST /{ig-user-id}/media            -> container id (stored at once)
 *        image:    image_url + caption
 *        reel:     media_type=REELS + video_url + caption + share_to_feed=true
 *                  (a single feed video is published as a reel)
 *        story:    media_type=STORIES + image_url | video_url
 *        carousel: one child per item (is_carousel_item=true, videos with
 *                  media_type=VIDEO), then media_type=CAROUSEL + children
 *   2. GET /{container-id}?fields=status_code,status   until FINISHED
 *        (IN_PROGRESS / FINISHED / ERROR / EXPIRED / PUBLISHED)
 *   3. GET /{ig-user-id}/content_publishing_limit?fields=quota_usage,config
 *   4. POST /{ig-user-id}/media_publish creation_id=  -> IG media id
 *   5. GET /{ig-media-id}?fields=permalink
 *
 * Idempotency: the container id is the dedupe key. A container that is
 * already PUBLISHED is never published again (we look the media up instead);
 * a FINISHED container after an ambiguous media_publish is safe to publish
 * (Meta consumes a container exactly once).
 */
@Injectable()
export class InstagramPublisher {
  private readonly logger = new Logger(InstagramPublisher.name);

  constructor(private readonly accounts: MetaAccountsService) {}

  async publish(ctx: PublishContext, plan: IgPlan): Promise<PublishOutcome> {
    const deadline = ctx.now().getTime() + ctx.pollBudgetMs;

    if (ctx.state.containerId) {
      const st = await this.status(ctx, ctx.state.containerId);
      if (st.code === "PUBLISHED") return this.reconcilePublished(ctx, plan);
      if (st.code === "EXPIRED" || st.code === "ERROR") {
        await this.resetContainers(ctx);
        if (st.code === "ERROR") throw this.containerError(st.status);
      }
    }

    await this.checkQuota(ctx);

    if (!ctx.state.containerId) await this.createContainer(ctx, plan, deadline);
    await this.waitFinished(ctx, ctx.state.containerId!, deadline);

    const res = await guarded(ctx, () =>
      this.accounts.asSystemUser<{ id?: string }>(
        ctx.account,
        `${ctx.account.igUserId}/media_publish`,
        {
          form: { creation_id: ctx.state.containerId! },
          timeoutMs: 60_000,
        },
      ),
    );
    const mediaId = typeof res?.id === "string" ? res.id : null;
    if (!mediaId)
      throw new PublishError(
        "UNKNOWN",
        MSG.unknown("Instagram did not return a media id"),
        false,
      );
    return {
      externalId: mediaId,
      permalink: await this.permalink(ctx, mediaId),
    };
  }

  // ---------------------------------------------------------------------------

  private async createContainer(
    ctx: PublishContext,
    plan: IgPlan,
    deadline: number,
  ): Promise<void> {
    const ig = ctx.account.igUserId;
    const caption = ctx.item.caption ?? "";
    let form: Record<string, string | boolean>;
    switch (plan.kind) {
      case "IMAGE":
        form = { image_url: await ctx.signUrl(plan.media.key), caption };
        break;
      case "REELS":
        form = {
          media_type: "REELS",
          video_url: await ctx.signUrl(plan.media.key),
          caption,
          share_to_feed: true,
        };
        break;
      case "STORY":
        form = plan.video
          ? {
              media_type: "STORIES",
              video_url: await ctx.signUrl(plan.media.key),
            }
          : {
              media_type: "STORIES",
              image_url: await ctx.signUrl(plan.media.key),
            };
        break;
      case "CAROUSEL": {
        const ids = await this.createChildren(ctx, plan.media, deadline);
        form = { media_type: "CAROUSEL", children: ids.join(","), caption };
        break;
      }
    }
    const res = await this.accounts.asSystemUser<{ id?: string }>(
      ctx.account,
      `${ig}/media`,
      {
        form,
        timeoutMs: 60_000,
      },
    );
    if (typeof res?.id !== "string") {
      throw new PublishError(
        "UNKNOWN",
        MSG.unknown("Instagram did not return a container id"),
        true,
      );
    }
    ctx.state = { ...ctx.state, containerId: res.id };
    await ctx.save({ state: ctx.state });
  }

  /** Children are created once each (ids stored after every one), then all must be FINISHED. */
  private async createChildren(
    ctx: PublishContext,
    media: PlanMedia[],
    deadline: number,
  ): Promise<string[]> {
    const children = { ...(ctx.state.children ?? {}) };
    for (const m of media) {
      if (children[m.id]) continue;
      const form: Record<string, string | boolean> = isVideo(m)
        ? {
            media_type: "VIDEO",
            video_url: await ctx.signUrl(m.key),
            is_carousel_item: true,
          }
        : { image_url: await ctx.signUrl(m.key), is_carousel_item: true };
      const res = await this.accounts.asSystemUser<{ id?: string }>(
        ctx.account,
        `${ctx.account.igUserId}/media`,
        {
          form,
          timeoutMs: 60_000,
        },
      );
      if (typeof res?.id !== "string") {
        throw new PublishError(
          "UNKNOWN",
          MSG.unknown("Instagram did not return a carousel item id"),
          true,
        );
      }
      children[m.id] = res.id;
      ctx.state = { ...ctx.state, children };
      await ctx.save({ state: ctx.state });
    }
    for (const m of media) {
      if (isVideo(m))
        await this.waitFinished(ctx, children[m.id], deadline, true);
    }
    return media.map((m) => children[m.id]);
  }

  private async waitFinished(
    ctx: PublishContext,
    id: string,
    deadline: number,
    child = false,
  ): Promise<void> {
    for (;;) {
      const st = await this.status(ctx, id);
      if (st.code === "FINISHED") return;
      if (st.code === "PUBLISHED" && !child) return; // handled by caller on next attempt
      if (st.code === "ERROR" || st.code === "EXPIRED") {
        await this.resetContainers(ctx);
        if (st.code === "EXPIRED")
          throw new PublishError("CONTAINER_EXPIRED", MSG.expired, true);
        throw this.containerError(st.status);
      }
      if (ctx.now().getTime() + ctx.pollIntervalMs > deadline) {
        throw new PublishDeferred("processing", 60_000, MSG.processing);
      }
      await ctx.sleep(ctx.pollIntervalMs);
    }
  }

  private async status(
    ctx: PublishContext,
    id: string,
  ): Promise<{ code: string; status: string }> {
    const res = await this.accounts.asSystemUser<{
      status_code?: string;
      status?: string;
    }>(ctx.account, id, {
      query: { fields: "status_code,status" },
    });
    return {
      code: String(res?.status_code ?? "IN_PROGRESS").toUpperCase(),
      status: String(res?.status ?? ""),
    };
  }

  /** "Error: Media upload has failed with error code 2207026" -> mapped error. */
  private containerError(status: string): PublishError {
    const m = /(\d{4,8})/.exec(status ?? "");
    if (m) {
      const mapped = publishErrorFromGraph(
        new MetaGraphError(
          status,
          "unknown",
          400,
          undefined,
          Number(m[1]),
          undefined,
        ),
      );
      if (mapped.code !== "UNKNOWN") return mapped;
    }
    return new PublishError(
      "MEDIA_PROCESSING_FAILED",
      MSG.processingFailed(status || "container ERROR"),
      true,
    );
  }

  private async resetContainers(ctx: PublishContext): Promise<void> {
    ctx.state = { ...ctx.state, containerId: undefined, children: undefined };
    await ctx.save({ state: ctx.state, requestedAt: null });
    ctx.requestedAt = null;
  }

  private async checkQuota(ctx: PublishContext): Promise<void> {
    let usage: number | undefined;
    let total: number | undefined;
    try {
      const res = await this.accounts.asSystemUser<{ data?: any[] }>(
        ctx.account,
        `${ctx.account.igUserId}/content_publishing_limit`,
        { query: { fields: "quota_usage,config" } },
      );
      const row = Array.isArray(res?.data) ? res.data[0] : undefined;
      usage =
        typeof row?.quota_usage === "number" ? row.quota_usage : undefined;
      total =
        typeof row?.config?.quota_total === "number"
          ? row.config.quota_total
          : undefined;
    } catch (e) {
      // Token / permission problems will fail the publish too: surface them now.
      if (
        e instanceof MetaGraphError &&
        (e.kind === "token" || e.kind === "permission")
      )
        throw e;
      this.logger.warn(
        `content_publishing_limit unavailable (${(e as Error).message}); continuing`,
      );
      return;
    }
    if (usage !== undefined && total !== undefined && usage >= total) {
      throw new PublishDeferred(
        "quota",
        30 * 60_000,
        MSG.publishLimit(usage, total),
      );
    }
  }

  /** Container already PUBLISHED (earlier attempt succeeded but the result was lost): find the media. */
  private async reconcilePublished(
    ctx: PublishContext,
    plan: IgPlan,
  ): Promise<PublishOutcome> {
    const since =
      (ctx.requestedAt?.getTime() ?? ctx.now().getTime() - 24 * 3600_000) -
      10 * 60_000;
    try {
      const edge = plan.kind === "STORY" ? "stories" : "media";
      const res = await this.accounts.asSystemUser<{ data?: any[] }>(
        ctx.account,
        `${ctx.account.igUserId}/${edge}`,
        {
          query: { fields: "id,caption,permalink,timestamp", limit: 15 },
        },
      );
      const rows = Array.isArray(res?.data) ? res.data : [];
      const recent = rows.filter(
        (r) => (graphTimeMs(r?.timestamp) ?? 0) >= since,
      );
      const match =
        plan.kind === "STORY"
          ? recent[0]
          : recent.find((r) =>
              sameText(r?.caption ?? "", ctx.item.caption ?? ""),
            );
      if (match && typeof match.id === "string") {
        return {
          externalId: match.id,
          permalink: safePermalink(match.permalink),
        };
      }
    } catch (e) {
      this.logger.warn(
        `Could not look up the published Instagram media: ${(e as Error).message}`,
      );
    }
    // Definitely published (container status), link unknown.
    return { externalId: null, permalink: null };
  }

  private async permalink(
    ctx: PublishContext,
    mediaId: string,
  ): Promise<string | null> {
    try {
      const res = await this.accounts.asSystemUser<{ permalink?: string }>(
        ctx.account,
        mediaId,
        {
          query: { fields: "permalink" },
        },
      );
      return safePermalink(res?.permalink);
    } catch {
      return null;
    }
  }
}
