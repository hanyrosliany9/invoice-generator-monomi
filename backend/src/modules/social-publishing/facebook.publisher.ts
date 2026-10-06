import { Injectable, Logger } from "@nestjs/common";
import { MetaAccountsService } from "./meta-accounts.service";
import { MetaGraphError } from "./meta-graph.client";
import { FbPlan, PlanMedia } from "./publish-plan";
import {
  graphTimeMs,
  guarded,
  PublishContext,
  PublishOutcome,
  safePermalink,
  sameText,
} from "./publish-context";
import { MSG, PublishError } from "./publish-errors";

/**
 * Facebook Page publishing (Pages API + Video API, Page access token derived
 * from the system user token):
 *
 *   text:        POST /{page-id}/feed message=
 *   photo:       POST /{page-id}/photos url= message=             -> {id, post_id}
 *   multi-photo: POST /{page-id}/photos url= published=false (each, ids stored)
 *                POST /{page-id}/feed message= attached_media[i]={"media_fbid":..}
 *   video:       POST graph-video.facebook.com/{page-id}/videos file_url= description=
 *   reel:        POST /{page-id}/video_reels upload_phase=start   -> video_id
 *                POST rupload.facebook.com/video-upload/{v}/{video_id}  (header file_url)
 *                POST /{page-id}/video_reels upload_phase=finish video_state=PUBLISHED description=
 *   photo story: unpublished photo, then POST /{page-id}/photo_stories photo_id=
 *   video story: like reels with /{page-id}/video_stories
 *   permalink:   GET /{post-or-video-id}?fields=permalink_url
 *
 * Page posts have no container to dedupe on, so every publishing call is
 * `guarded`: after an ambiguous failure the next attempt looks for the post
 * (published_posts matched on message, or the reel's publishing phase) and
 * gives up as "outcome uncertain" (manual check + Retry) rather than risk a
 * duplicate post.
 */
@Injectable()
export class FacebookPublisher {
  private readonly logger = new Logger(FacebookPublisher.name);

  constructor(private readonly accounts: MetaAccountsService) {}

  async publish(ctx: PublishContext, plan: FbPlan): Promise<PublishOutcome> {
    if (ctx.requestedAt) {
      const reconciled = await this.reconcile(ctx, plan);
      if (reconciled) return reconciled;
    }
    const page = ctx.account.pageId;
    const message = ctx.item.caption ?? "";

    switch (plan.kind) {
      case "TEXT": {
        const res = await guarded(ctx, () =>
          this.pagePost<{ id?: string }>(ctx, `${page}/feed`, { message }),
        );
        return this.done(ctx, this.id(res?.id));
      }
      case "PHOTO": {
        const url = await ctx.signUrl(plan.media.key);
        const res = await guarded(ctx, () =>
          this.pagePost<{ id?: string; post_id?: string }>(
            ctx,
            `${page}/photos`,
            { url, message },
          ),
        );
        return this.done(ctx, this.id(res?.post_id ?? res?.id));
      }
      case "MULTI_PHOTO": {
        const ids = await this.unpublishedPhotos(ctx, plan.media);
        const form: Record<string, string> = { message };
        ids.forEach(
          (id, i) =>
            (form[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })),
        );
        const res = await guarded(ctx, () =>
          this.pagePost<{ id?: string }>(ctx, `${page}/feed`, form),
        );
        return this.done(ctx, this.id(res?.id));
      }
      case "VIDEO": {
        const fileUrl = await ctx.signUrl(plan.media.key);
        const res = await guarded(ctx, () =>
          this.accounts.asPage<{ id?: string }>(
            ctx.account,
            this.accounts.videoUrl(`${page}/videos`),
            {
              form: {
                file_url: fileUrl,
                description: message,
                published: true,
              },
              timeoutMs: 120_000,
            },
          ),
        );
        return this.done(ctx, this.id(res?.id));
      }
      case "REEL":
        return this.uploadSessionFlow(ctx, plan.media, "video_reels", {
          video_state: "PUBLISHED",
          description: message,
        });
      case "VIDEO_STORY":
        return this.uploadSessionFlow(ctx, plan.media, "video_stories", {});
      case "PHOTO_STORY": {
        if (!ctx.state.photoId) {
          const url = await ctx.signUrl(plan.media.key);
          const up = await this.pagePost<{ id?: string }>(
            ctx,
            `${page}/photos`,
            { url, published: false },
          );
          ctx.state = { ...ctx.state, photoId: this.id(up?.id) };
          await ctx.save({ state: ctx.state });
        }
        const res = await guarded(ctx, () =>
          this.pagePost<{ success?: boolean; post_id?: string }>(
            ctx,
            `${page}/photo_stories`,
            {
              photo_id: ctx.state.photoId!,
            },
          ),
        );
        if (res?.success === false)
          throw new PublishError(
            "UNKNOWN",
            MSG.unknown("photo story was not accepted"),
            false,
          );
        return this.done(ctx, this.id(res?.post_id ?? ctx.state.photoId));
      }
    }
  }

  // ---------------------------------------------------------------------------

  /** start (video id stored) -> hosted-file upload (flag stored) -> guarded finish. */
  private async uploadSessionFlow(
    ctx: PublishContext,
    media: PlanMedia,
    edge: "video_reels" | "video_stories",
    finishExtra: Record<string, string>,
  ): Promise<PublishOutcome> {
    const page = ctx.account.pageId;
    if (!ctx.state.videoId) {
      const start = await this.pagePost<{ video_id?: string }>(
        ctx,
        `${page}/${edge}`,
        { upload_phase: "start" },
      );
      ctx.state = {
        ...ctx.state,
        videoId: this.id(start?.video_id),
        uploaded: false,
      };
      await ctx.save({ state: ctx.state });
    }
    const videoId = ctx.state.videoId!;
    if (!ctx.state.uploaded) {
      const fileUrl = await ctx.signUrl(media.key);
      try {
        const up = await this.accounts.asPage<{ success?: boolean }>(
          ctx.account,
          this.accounts.ruploadUrl(videoId),
          {
            method: "POST",
            headers: { file_url: fileUrl },
            timeoutMs: 120_000,
          },
        );
        if (up?.success === false)
          throw new PublishError("MEDIA_FETCH_FAILED", MSG.mediaFetch, true);
      } catch (e) {
        if (
          e instanceof MetaGraphError &&
          (e.kind === "token" || e.kind === "permission")
        )
          throw e;
        if (e instanceof PublishError) throw e;
        throw new PublishError("MEDIA_FETCH_FAILED", MSG.mediaFetch, true);
      }
      ctx.state = { ...ctx.state, uploaded: true };
      await ctx.save({ state: ctx.state });
    }
    const res = await guarded(ctx, () =>
      this.pagePost<{ success?: boolean; post_id?: string }>(
        ctx,
        `${page}/${edge}`,
        {
          upload_phase: "finish",
          video_id: videoId,
          ...finishExtra,
        },
      ),
    );
    if (res?.success === false) {
      throw new PublishError(
        "MEDIA_PROCESSING_FAILED",
        MSG.processingFailed("Facebook did not accept the video"),
        true,
      );
    }
    return this.done(ctx, this.id(res?.post_id ?? videoId), videoId);
  }

  private async unpublishedPhotos(
    ctx: PublishContext,
    media: PlanMedia[],
  ): Promise<string[]> {
    const photos = { ...(ctx.state.photos ?? {}) };
    for (const m of media) {
      if (photos[m.id]) continue;
      const url = await ctx.signUrl(m.key);
      const res = await this.pagePost<{ id?: string }>(
        ctx,
        `${ctx.account.pageId}/photos`,
        { url, published: false },
      );
      photos[m.id] = this.id(res?.id);
      ctx.state = { ...ctx.state, photos };
      await ctx.save({ state: ctx.state });
    }
    return media.map((m) => photos[m.id]);
  }

  /**
   * After an ambiguous publish: was it applied? Returns the outcome when the
   * post exists, null when it is safe to publish again, and throws
   * OUTCOME_UNCERTAIN (terminal, manual Retry) when we cannot tell.
   */
  private async reconcile(
    ctx: PublishContext,
    plan: FbPlan,
  ): Promise<PublishOutcome | null> {
    const since = ctx.requestedAt!.getTime() - 2 * 60_000;
    if (
      (plan.kind === "REEL" || plan.kind === "VIDEO_STORY") &&
      ctx.state.videoId
    ) {
      try {
        const res = await this.accounts.asPage<{ status?: any }>(
          ctx.account,
          this.accounts.graphUrl(ctx.state.videoId),
          {
            query: { fields: "status" },
          },
        );
        const publishing = String(res?.status?.publishing_phase?.status ?? "");
        if (publishing === "complete" || publishing === "in_progress") {
          return this.done(ctx, ctx.state.videoId, ctx.state.videoId);
        }
        if (publishing === "not_started") {
          await ctx.save({ requestedAt: null });
          ctx.requestedAt = null;
          return null;
        }
      } catch (e) {
        this.logger.warn(`Reel status lookup failed: ${(e as Error).message}`);
      }
      throw new PublishError("OUTCOME_UNCERTAIN", MSG.uncertain, false);
    }
    if (
      plan.kind === "TEXT" ||
      plan.kind === "PHOTO" ||
      plan.kind === "MULTI_PHOTO" ||
      plan.kind === "VIDEO"
    ) {
      try {
        const res = await this.accounts.asPage<{ data?: any[] }>(
          ctx.account,
          this.accounts.graphUrl(`${ctx.account.pageId}/published_posts`),
          {
            query: {
              fields: "id,message,created_time,permalink_url",
              limit: 15,
              since: Math.floor(since / 1000),
            },
          },
        );
        const rows = Array.isArray(res?.data) ? res.data : [];
        const match = rows.find(
          (r) =>
            (graphTimeMs(r?.created_time) ?? 0) >= since &&
            sameText(r?.message ?? "", ctx.item.caption ?? ""),
        );
        if (match && typeof match.id === "string") {
          return {
            externalId: match.id,
            permalink: safePermalink(match.permalink_url),
          };
        }
      } catch (e) {
        this.logger.warn(`Page post lookup failed: ${(e as Error).message}`);
      }
    }
    throw new PublishError("OUTCOME_UNCERTAIN", MSG.uncertain, false);
  }

  private pagePost<T>(
    ctx: PublishContext,
    path: string,
    form: Record<string, string | boolean>,
  ): Promise<T> {
    return this.accounts.asPage<T>(ctx.account, this.accounts.graphUrl(path), {
      form,
      timeoutMs: 60_000,
    });
  }

  private id(v: unknown): string {
    if (typeof v === "string" && /^[\d_]{3,60}$/.test(v)) return v;
    if (typeof v === "number") return String(v);
    throw new PublishError(
      "UNKNOWN",
      MSG.unknown("Facebook returned an unexpected id"),
      false,
    );
  }

  private async done(
    ctx: PublishContext,
    externalId: string,
    permalinkOf?: string,
  ): Promise<PublishOutcome> {
    return {
      externalId,
      permalink: await this.permalink(ctx, permalinkOf ?? externalId),
    };
  }

  private async permalink(
    ctx: PublishContext,
    id: string,
  ): Promise<string | null> {
    try {
      const res = await this.accounts.asPage<{ permalink_url?: string }>(
        ctx.account,
        this.accounts.graphUrl(id),
        {
          query: { fields: "permalink_url" },
        },
      );
      return safePermalink(res?.permalink_url);
    } catch {
      return null;
    }
  }
}
