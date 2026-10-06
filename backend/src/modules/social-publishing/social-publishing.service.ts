import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ContentPlatform,
  ContentStatus,
  Prisma,
  SocialPublishStatus,
  UserRole,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { GraphApiError } from "../instagram/instagram-graph.client";
import {
  MetaAccountsService,
  MetaPublishingAccount,
} from "./meta-accounts.service";
import { MediaUrlSigner } from "./media-url.signer";
import { InstagramPublisher } from "./instagram.publisher";
import { FacebookPublisher } from "./facebook.publisher";
import {
  PublishContext,
  PublishOutcome,
  PublishState,
} from "./publish-context";
import {
  MSG,
  PublishDeferred,
  PublishError,
  publishErrorFromGraph,
} from "./publish-errors";
import {
  normaliseTargets,
  PlanItem,
  planFacebook,
  planInstagram,
  validateForTargets,
} from "./publish-plan";
import { MetaGraphError } from "./meta-graph.client";

/** Worker lease on a publication row; every state write extends it. */
export const LEASE_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 4;
export const BASE_BACKOFF_MS = 60_000;
export const MAX_BACKOFF_MS = 30 * 60_000;
/** Give up deferring (quota full / processing) after this long. */
export const MAX_DEFER_AGE_MS = 24 * 3600_000;
export const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export const isAdminRole = (
  role: UserRole | string | undefined | null,
): boolean => !!role && (ADMIN_ROLES as string[]).includes(role);

/** Fields of a publication safe to send to the staff UI. */
export const PUBLICATION_PUBLIC_SELECT = {
  id: true,
  platform: true,
  status: true,
  attempts: true,
  nextAttemptAt: true,
  externalId: true,
  permalink: true,
  errorCode: true,
  errorMessage: true,
  requestedAt: true,
  lastAttemptAt: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.SocialPublicationSelect;

export class LeaseLostError extends Error {
  constructor() {
    super("publication lease lost");
    this.name = "LeaseLostError";
  }
}

export function backoffMs(attempts: number): number {
  return Math.min(
    MAX_BACKOFF_MS,
    BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1),
  );
}

type Trigger = "scheduler" | "manual";

const ITEM_FOR_PUBLISH = {
  id: true,
  caption: true,
  format: true,
  status: true,
  scheduledAt: true,
  createdBy: true,
  autoPublish: true,
  autoPublishTargets: true,
  autoPublishBy: true,
  client: { select: { id: true, isInternal: true } },
  media: {
    select: {
      id: true,
      key: true,
      type: true,
      mimeType: true,
      size: true,
      width: true,
      height: true,
      duration: true,
      order: true,
    },
    orderBy: { order: "asc" as const },
  },
} satisfies Prisma.ContentCalendarItemSelect;

/**
 * Orchestrates auto-publishing of content items to Instagram / Facebook.
 *
 * Concurrency & idempotency (never double-post):
 *  - one SocialPublication row per (item, platform), unique;
 *  - a worker must CLAIM a row with a single conditional UPDATE
 *    (PENDING & due, or PUBLISHING with an expired lease) that sets a random
 *    lockToken + lockedUntil. Overlapping scheduler runs, several app
 *    instances and "Publish now" clicks race on that UPDATE; exactly one wins;
 *  - every later write is conditioned on the same lockToken, so a worker that
 *    lost its lease cannot overwrite the new owner's progress;
 *  - Meta object ids are persisted after every step (PublishState) and
 *    reused on the next attempt; non-idempotent calls are `guarded`
 *    (requestedAt) and reconciled after ambiguous failures.
 */
@Injectable()
export class SocialPublishingService {
  private readonly logger = new Logger(SocialPublishingService.name);
  now: () => Date = () => new Date();
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((r) => setTimeout(r, ms));
  pollIntervalMs = 5_000;
  pollBudgetMs = 120_000;
  /** Parallel publications per scheduler tick. */
  concurrency = 2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MetaAccountsService,
    private readonly signer: MediaUrlSigner,
    private readonly instagram: InstagramPublisher,
    private readonly facebook: FacebookPublisher,
  ) {}

  // ===========================================================================
  // Scheduler entry points
  // ===========================================================================

  /**
   * Create PENDING publications for due auto-publish items of the internal
   * client (SCHEDULED, scheduledAt <= now, autoPublish). Idempotent
   * (skipDuplicates on the unique (contentId, platform)).
   */
  async armDueItems(limit = 25): Promise<number> {
    const due = await this.prisma.contentCalendarItem.findMany({
      where: {
        autoPublish: true,
        status: ContentStatus.SCHEDULED,
        scheduledAt: { lte: this.now() },
        client: { isInternal: true },
      },
      select: { id: true, autoPublishTargets: true },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    });
    let created = 0;
    for (const item of due) {
      const targets = normaliseTargets(item.autoPublishTargets).targets;
      if (targets.length === 0) continue;
      const res = await this.prisma.socialPublication.createMany({
        data: targets.map((platform) => ({ contentId: item.id, platform })),
        skipDuplicates: true,
      });
      created += res.count;
    }
    return created;
  }

  /** Ids of publications a worker may claim now. */
  async findDuePublicationIds(limit = 10): Promise<string[]> {
    const now = this.now();
    const rows = await this.prisma.socialPublication.findMany({
      where: {
        OR: [
          {
            status: SocialPublishStatus.PENDING,
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          { status: SocialPublishStatus.PUBLISHING, lockedUntil: { lt: now } },
        ],
        content: { client: { isInternal: true } },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map((r) => r.id);
  }

  async processMany(ids: string[], trigger: Trigger): Promise<void> {
    const queue = [...ids];
    const workers = Array.from(
      { length: Math.max(1, Math.min(this.concurrency, queue.length)) },
      async () => {
        for (let id = queue.shift(); id; id = queue.shift()) {
          try {
            await this.processPublication(id, trigger);
          } catch (e) {
            this.logger.error(
              `Publication ${id} crashed: ${(e as Error).message}`,
            );
          }
        }
      },
    );
    await Promise.all(workers);
  }

  /** Atomically claim a publication; returns the lease token or null. */
  async claim(id: string): Promise<string | null> {
    const now = this.now();
    const token = randomUUID();
    const res = await this.prisma.socialPublication.updateMany({
      where: {
        id,
        OR: [
          {
            status: SocialPublishStatus.PENDING,
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          { status: SocialPublishStatus.PUBLISHING, lockedUntil: { lt: now } },
        ],
      },
      data: {
        status: SocialPublishStatus.PUBLISHING,
        lockToken: token,
        lockedUntil: new Date(now.getTime() + LEASE_MS),
        lastAttemptAt: now,
      },
    });
    return res.count === 1 ? token : null;
  }

  /**
   * Run one publication attempt. Returns the final row status, or null when
   * another worker holds it.
   */
  async processPublication(
    id: string,
    trigger: Trigger,
    actorId?: string,
  ): Promise<SocialPublishStatus | null> {
    const lease = await this.claim(id);
    if (!lease) return null;

    const pub = await this.prisma.socialPublication.findUnique({
      where: { id },
    });
    if (!pub) return null;
    const item = await this.prisma.contentCalendarItem.findUnique({
      where: { id: pub.contentId },
      select: ITEM_FOR_PUBLISH,
    });
    if (!item) return null;
    const actor = actorId ?? item.autoPublishBy ?? item.createdBy;
    const attempt = pub.attempts + 1;

    const write = async (
      data: Prisma.SocialPublicationUpdateManyMutationInput,
    ) => {
      const r = await this.prisma.socialPublication.updateMany({
        where: { id, lockToken: lease },
        data,
      });
      if (r.count !== 1) throw new LeaseLostError();
    };

    let ctxRef: PublishContext | null = null;
    try {
      // Manually published / archived meanwhile: never post on top of that.
      if (
        item.status === ContentStatus.ARCHIVED ||
        item.status === ContentStatus.PUBLISHED
      ) {
        throw new PublishError("CANCELLED", MSG.cancelledManual, false);
      }
      // Server-side guard (phase 1: internal client only) + credentials.
      const account = this.accounts.resolve(item.client);

      const planItem: PlanItem = {
        caption: item.caption,
        format: item.format,
        media: item.media,
      };
      await this.audit("SOCIAL_PUBLISH_ATTEMPT", item.id, actor, {
        platform: pub.platform,
        attempt,
        trigger,
      });

      const ctx: PublishContext = {
        account,
        item: {
          id: item.id,
          caption: item.caption,
          format: item.format,
          media: item.media,
        },
        state: ((pub.state as PublishState | null) ?? {}) as PublishState,
        requestedAt: pub.requestedAt,
        save: async (patch) => {
          await write({
            ...(patch.state !== undefined && {
              state: patch.state as Prisma.InputJsonValue,
            }),
            ...(patch.requestedAt !== undefined && {
              requestedAt: patch.requestedAt,
            }),
            lockedUntil: new Date(this.now().getTime() + LEASE_MS),
          });
        },
        signUrl: (key) => this.signer.sign(key),
        now: this.now,
        sleep: this.sleep,
        pollIntervalMs: this.pollIntervalMs,
        pollBudgetMs: this.pollBudgetMs,
      };
      ctxRef = ctx;

      const outcome = await this.runPlatform(
        pub.platform,
        ctx,
        planItem,
        account,
      );

      const publishedAt = this.now();
      await write({
        status: SocialPublishStatus.PUBLISHED,
        externalId: outcome.externalId,
        permalink: outcome.permalink,
        publishedAt,
        attempts: attempt,
        requestedAt: null,
        errorCode: null,
        errorMessage: null,
        nextAttemptAt: null,
        lockToken: null,
        lockedUntil: null,
      });
      this.logger.log(
        `Published content ${item.id} to ${pub.platform} (${outcome.externalId ?? "id unknown"})`,
      );
      await this.audit("SOCIAL_PUBLISH_SUCCESS", item.id, actor, {
        platform: pub.platform,
        attempt,
        trigger,
        externalId: outcome.externalId,
        permalink: outcome.permalink,
      });
      await this.rollup(item.id);
      return SocialPublishStatus.PUBLISHED;
    } catch (raw) {
      if (raw instanceof LeaseLostError) {
        this.logger.warn(
          `Lost the lease on publication ${id}; another worker owns it now`,
        );
        return null;
      }
      // Ambiguous only matters while a non-idempotent publish call is unresolved.
      const publishInFlight = (ctxRef?.requestedAt ?? null) !== null;
      return this.handleFailure(
        id,
        lease,
        pub,
        item.id,
        actor,
        attempt,
        trigger,
        raw,
        publishInFlight,
      );
    }
  }

  private async runPlatform(
    platform: ContentPlatform,
    ctx: PublishContext,
    planItem: PlanItem,
    _account: MetaPublishingAccount,
  ): Promise<PublishOutcome> {
    if (platform === ContentPlatform.INSTAGRAM) {
      const { plan, errors } = planInstagram(planItem);
      if (!plan)
        throw new PublishError("VALIDATION", errors.join(" | "), false);
      return this.instagram.publish(ctx, plan);
    }
    if (platform === ContentPlatform.FACEBOOK) {
      const { plan, errors } = planFacebook(planItem);
      if (!plan)
        throw new PublishError("VALIDATION", errors.join(" | "), false);
      return this.facebook.publish(ctx, plan);
    }
    throw new PublishError(
      "VALIDATION",
      `${platform} is not supported for auto-publishing`,
      false,
    );
  }

  private async handleFailure(
    id: string,
    lease: string,
    pub: {
      attempts: number;
      createdAt: Date;
      platform: ContentPlatform;
      requestedAt: Date | null;
    },
    contentId: string,
    actor: string,
    attempt: number,
    trigger: Trigger,
    raw: unknown,
    publishInFlight = false,
  ): Promise<SocialPublishStatus | null> {
    const now = this.now();
    const age = now.getTime() - pub.createdAt.getTime();
    let status: SocialPublishStatus;
    let data: Prisma.SocialPublicationUpdateManyMutationInput;
    let code: string;
    let message: string;

    if (raw instanceof PublishDeferred) {
      // Not a failure (quota full / still processing): no attempt consumed.
      if (age > MAX_DEFER_AGE_MS) {
        code =
          raw.reason === "quota"
            ? "PUBLISH_LIMIT_REACHED"
            : "MEDIA_PROCESSING_FAILED";
        message =
          raw.reason === "quota"
            ? MSG.publishLimitGaveUp
            : MSG.processingTimeout;
        status = SocialPublishStatus.FAILED;
        data = {
          status,
          attempts: attempt,
          errorCode: code,
          errorMessage: message,
          nextAttemptAt: null,
        };
      } else {
        code = raw.reason === "quota" ? "PUBLISH_LIMIT_REACHED" : "PROCESSING";
        message = raw.message;
        status = SocialPublishStatus.PENDING;
        data = {
          status,
          errorCode: code,
          errorMessage: message,
          nextAttemptAt: new Date(now.getTime() + raw.delayMs),
        };
      }
    } else {
      const ambiguous =
        raw instanceof MetaGraphError && raw.ambiguous && publishInFlight;
      const err: PublishError =
        raw instanceof PublishError
          ? raw
          : raw instanceof GraphApiError
            ? publishErrorFromGraph(raw)
            : new PublishError(
                "UNKNOWN",
                MSG.unknown("unexpected error"),
                true,
              );
      if (!(raw instanceof PublishError) && !(raw instanceof GraphApiError)) {
        this.logger.error(
          `Unexpected publishing error on ${id}: ${(raw as Error)?.message ?? raw}`,
        );
      }
      code = err.code;
      message = err.message;
      if (ambiguous) {
        // Publish call may have been applied: next attempt reconciles first.
        code = "VERIFYING";
        message = MSG.verifying;
      }
      const retry = (err.retryable || ambiguous) && attempt < MAX_ATTEMPTS;
      status = retry ? SocialPublishStatus.PENDING : SocialPublishStatus.FAILED;
      const delay = ambiguous
        ? BASE_BACKOFF_MS
        : Math.max(backoffMs(attempt), err.deferMs ?? 0);
      data = {
        status,
        attempts: attempt,
        errorCode: code,
        errorMessage: retry || code !== "VERIFYING" ? message : MSG.uncertain,
        nextAttemptAt: retry ? new Date(now.getTime() + delay) : null,
      };
      if (!retry && code === "VERIFYING") data.errorCode = "OUTCOME_UNCERTAIN";
    }

    const r = await this.prisma.socialPublication.updateMany({
      where: { id, lockToken: lease },
      data: { ...data, lockToken: null, lockedUntil: null },
    });
    if (r.count !== 1) return null;

    const logLine = `Publication ${id} (${pub.platform}) ${status}: ${data.errorCode ?? code}`;
    if (status === SocialPublishStatus.FAILED) this.logger.warn(logLine);
    else this.logger.log(logLine);
    await this.audit(
      status === SocialPublishStatus.FAILED
        ? "SOCIAL_PUBLISH_FAILED"
        : "SOCIAL_PUBLISH_RETRY",
      contentId,
      actor,
      {
        platform: pub.platform,
        attempt,
        trigger,
        errorCode: data.errorCode ?? code,
        nextAttemptAt: (data.nextAttemptAt as Date | null | undefined) ?? null,
      },
    );
    await this.rollup(contentId);
    return status;
  }

  /**
   * Derive the item status from its publications: all PUBLISHED -> item
   * PUBLISHED (publishedAt = first platform's time); nothing in flight and at
   * least one FAILED -> item FAILED. Safe to run concurrently (idempotent).
   */
  async rollup(contentId: string): Promise<void> {
    const rows = await this.prisma.socialPublication.findMany({
      where: { contentId },
      select: { status: true, publishedAt: true },
    });
    if (rows.length === 0) return;
    const inFlight = rows.some(
      (r) =>
        r.status === SocialPublishStatus.PENDING ||
        r.status === SocialPublishStatus.PUBLISHING,
    );
    if (rows.every((r) => r.status === SocialPublishStatus.PUBLISHED)) {
      const first = rows
        .map((r) => r.publishedAt?.getTime() ?? Infinity)
        .reduce((a, b) => Math.min(a, b), Infinity);
      await this.prisma.contentCalendarItem.updateMany({
        where: {
          id: contentId,
          status: { notIn: [ContentStatus.ARCHIVED, ContentStatus.PUBLISHED] },
        },
        data: {
          status: ContentStatus.PUBLISHED,
          publishedAt: Number.isFinite(first) ? new Date(first) : this.now(),
        },
      });
    } else if (
      !inFlight &&
      rows.some((r) => r.status === SocialPublishStatus.FAILED)
    ) {
      await this.prisma.contentCalendarItem.updateMany({
        where: {
          id: contentId,
          status: {
            notIn: [
              ContentStatus.ARCHIVED,
              ContentStatus.PUBLISHED,
              ContentStatus.FAILED,
            ],
          },
        },
        data: { status: ContentStatus.FAILED },
      });
    }
  }

  // ===========================================================================
  // Manual actions (Publish now / Retry)
  // ===========================================================================

  /**
   * Publish now, or retry failed platforms. Admin only (checked here too).
   * `retry` re-arms FAILED platforms, including an "outcome uncertain" one
   * (the user confirmed the post is not there).
   */
  async requestPublish(
    contentId: string,
    user: { id: string; role: UserRole },
    opts: { targets?: ContentPlatform[]; retry?: boolean } = {},
  ) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException(
        "Hanya admin yang dapat menerbitkan ke media sosial. / Only admins can publish to social media.",
      );
    }
    const item = await this.prisma.contentCalendarItem.findUnique({
      where: { id: contentId },
      select: { ...ITEM_FOR_PUBLISH, publications: true },
    });
    if (!item)
      throw new NotFoundException("Konten tidak ditemukan / Content not found");
    try {
      this.accounts.resolve(item.client);
    } catch (e) {
      if (e instanceof PublishError && e.code === "NOT_INTERNAL_CLIENT")
        throw new ForbiddenException(e.message);
      throw new BadRequestException((e as Error).message);
    }
    if (item.status === ContentStatus.ARCHIVED) {
      throw new BadRequestException(
        "Konten diarsipkan tidak bisa diterbitkan. / Archived content cannot be published.",
      );
    }

    const requested =
      opts.targets ??
      (item.autoPublishTargets.length ? item.autoPublishTargets : undefined);
    if (!requested || requested.length === 0) {
      throw new BadRequestException(
        "Pilih platform (Instagram / Facebook) untuk diterbitkan. / Choose the platforms (Instagram / Facebook) to publish to.",
      );
    }
    const norm = normaliseTargets(requested);
    if (norm.error) throw new BadRequestException(norm.error);

    const existing = new Map(item.publications.map((p) => [p.platform, p]));
    const now = this.now();
    if (
      item.publications.some(
        (p) =>
          p.status === SocialPublishStatus.PUBLISHING &&
          p.lockedUntil &&
          p.lockedUntil > now,
      )
    ) {
      throw new ConflictException(
        "Sedang dipublikasikan. / Publishing is already in progress.",
      );
    }
    const targets = norm.targets.filter((t) => {
      const p = existing.get(t);
      if (!p) return true;
      if (p.status === SocialPublishStatus.PUBLISHED) return false;
      if (p.status === SocialPublishStatus.FAILED) return true;
      return true; // PENDING (waiting for retry) -> run now
    });
    if (targets.length === 0) {
      throw new BadRequestException(
        "Sudah terbit di platform yang dipilih. / Already published on the selected platforms.",
      );
    }
    const uncertain = targets.filter((t) => existing.get(t)?.requestedAt);
    if (uncertain.length && !opts.retry) {
      throw new ConflictException(MSG.uncertain);
    }
    const errors = validateForTargets(
      { caption: item.caption, format: item.format, media: item.media },
      targets,
    );
    if (errors.length) throw new BadRequestException(errors);

    const ids: string[] = [];
    for (const platform of targets) {
      const prev = existing.get(platform);
      const row = prev
        ? await this.prisma.socialPublication.update({
            where: { id: prev.id },
            data: {
              status: SocialPublishStatus.PENDING,
              attempts: 0,
              nextAttemptAt: null,
              errorCode: null,
              errorMessage: null,
              lockToken: null,
              lockedUntil: null,
              // An explicit retry after "uncertain" = the user checked the post is not there.
              ...(opts.retry ? { requestedAt: null } : {}),
              createdAt: now,
            },
          })
        : await this.prisma.socialPublication.create({
            data: { contentId, platform },
          });
      ids.push(row.id);
    }
    if (item.status === ContentStatus.FAILED) {
      await this.prisma.contentCalendarItem.updateMany({
        where: { id: contentId, status: ContentStatus.FAILED },
        data: {
          status: item.scheduledAt
            ? ContentStatus.SCHEDULED
            : ContentStatus.DRAFT,
        },
      });
    }
    await this.audit(
      opts.retry
        ? "SOCIAL_PUBLISH_RETRY_REQUESTED"
        : "SOCIAL_PUBLISH_REQUESTED",
      contentId,
      user.id,
      {
        platforms: targets,
      },
    );
    // Run in the background; the UI polls the publication status.
    void this.processMany(ids, "manual").catch((e) =>
      this.logger.error(`Manual publish crashed: ${(e as Error).message}`),
    );
    return this.listPublications(contentId);
  }

  listPublications(contentId: string) {
    return this.prisma.socialPublication.findMany({
      where: { contentId },
      select: PUBLICATION_PUBLIC_SELECT,
      orderBy: { platform: "asc" },
    });
  }

  // ===========================================================================
  // Status / connection check (read-only)
  // ===========================================================================

  /** Cheap, no Meta call, no secrets. */
  status() {
    const s = this.accounts.state;
    if (s.status === "configured") {
      return {
        configured: true,
        state: s.status,
        pageId: s.config.pageId,
        igUserId: s.config.igUserId,
        graphVersion: s.config.graphVersion,
        schedulerEnabled: s.config.schedulerEnabled,
        appSecretProof: !!s.config.appSecret,
      };
    }
    return {
      configured: false,
      state: s.status,
      ...(s.status === "not_configured"
        ? { missing: s.missing }
        : { reason: s.reason }),
    };
  }

  private lastCheck: { at: number; value: unknown } | null = null;

  /**
   * Read-only connection check against Meta: token validity
   * (GET /me?fields=id,name), the Page and its linked IG account
   * (GET /{page-id}?fields=name,picture,instagram_business_account{...}),
   * Page-token derivation, granted permissions and the IG publishing quota.
   * Tokens are never part of the response. Cached for 30 s.
   */
  async checkConnection(force = false) {
    if (!force && this.lastCheck && Date.now() - this.lastCheck.at < 30_000)
      return this.lastCheck.value;
    const base = this.status();
    if (!base.configured) return { ...base, ok: false };
    const account = this.accounts.resolve({ id: "internal", isInternal: true });
    const out: any = {
      ...base,
      ok: false,
      tokenValid: false,
      errors: [] as string[],
    };
    const fail = (where: string, e: unknown) => {
      const msg =
        e instanceof GraphApiError
          ? publishErrorFromGraph(e).message
          : ((e as Error)?.message ?? String(e));
      out.errors.push(`${where}: ${msg}`);
    };
    try {
      const me = await this.accounts.asSystemUser<{
        id?: string;
        name?: string;
      }>(account, "me", {
        query: { fields: "id,name" },
        timeoutMs: 10_000,
      });
      out.tokenValid = true;
      out.systemUser = { id: me?.id ?? null, name: me?.name ?? null };
    } catch (e) {
      fail("Token", e);
      this.lastCheck = { at: Date.now(), value: out };
      return out;
    }
    try {
      const perms = await this.accounts.asSystemUser<{
        data?: { permission: string; status: string }[];
      }>(account, "me/permissions", { timeoutMs: 10_000 });
      const granted = (perms?.data ?? [])
        .filter((p) => p.status === "granted")
        .map((p) => p.permission);
      const required = [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
      ];
      out.permissions = {
        granted,
        missing: required.filter((r) => !granted.includes(r)),
      };
    } catch {
      out.permissions = null; // not available for every token type
    }
    try {
      const page = await this.accounts.asSystemUser<any>(
        account,
        account.pageId,
        {
          query: {
            fields:
              "id,name,picture{url},instagram_business_account{id,username,profile_picture_url}",
          },
          timeoutMs: 10_000,
        },
      );
      out.page = {
        id: page?.id ?? account.pageId,
        name: page?.name ?? null,
        pictureUrl: safeCdnUrl(page?.picture?.data?.url),
      };
      const ig = page?.instagram_business_account;
      out.instagram = ig
        ? {
            id: ig.id ?? null,
            username: ig.username ?? null,
            pictureUrl: safeCdnUrl(ig.profile_picture_url),
            matchesConfig: ig.id === account.igUserId,
          }
        : null;
      if (!ig)
        out.errors.push(
          "Instagram: Halaman ini belum terhubung ke akun Instagram profesional. / This Page has no linked Instagram professional account.",
        );
      else if (ig.id !== account.igUserId) {
        out.errors.push(
          `Instagram: META_IG_USER_ID (${account.igUserId}) berbeda dengan akun yang terhubung ke Halaman (${ig.id}). / META_IG_USER_ID does not match the Page's linked account.`,
        );
      }
    } catch (e) {
      fail("Page", e);
    }
    try {
      await this.accounts.getPageToken(account);
      out.pageTokenOk = true;
    } catch (e) {
      out.pageTokenOk = false;
      fail("Page token", e);
    }
    try {
      const q = await this.accounts.asSystemUser<{ data?: any[] }>(
        account,
        `${account.igUserId}/content_publishing_limit`,
        {
          query: { fields: "quota_usage,config" },
          timeoutMs: 10_000,
        },
      );
      const row = q?.data?.[0];
      out.quota = row
        ? {
            usage: row.quota_usage ?? null,
            total: row.config?.quota_total ?? null,
          }
        : null;
    } catch (e) {
      fail("Instagram quota", e);
    }
    out.ok =
      out.tokenValid &&
      out.pageTokenOk &&
      !!out.instagram?.matchesConfig &&
      out.errors.length === 0;
    this.lastCheck = { at: Date.now(), value: out };
    return out;
  }

  // ===========================================================================

  private async audit(
    action: string,
    entityId: string,
    userId: string,
    values: Record<string, unknown>,
  ) {
    await this.prisma.auditLog
      .create({
        data: {
          action,
          entityType: "content_calendar_item",
          entityId,
          userId,
          newValues: values as Prisma.InputJsonValue,
        },
      })
      .catch((e) =>
        this.logger.error(`Audit log write failed: ${(e as Error).message}`),
      );
  }
}

/** Only https URLs on Meta CDNs are passed to the UI as avatar sources. */
export function safeCdnUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:") return null;
    if (
      !["fbcdn.net", "cdninstagram.com", "facebook.com", "fbsbx.com"].some(
        (h) => host === h || host.endsWith(`.${h}`),
      )
    ) {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}
