import { ContentFormat } from "@prisma/client";
import { MetaPublishingAccount } from "./meta-accounts.service";
import { MetaGraphError } from "./meta-graph.client";
import { PlanMedia } from "./publish-plan";

/**
 * Idempotency state persisted on SocialPublication.state after every step,
 * so a retry / an overlapping run resumes instead of re-creating (and never
 * re-publishing). Contains Meta object ids only — never tokens or URLs.
 */
export interface PublishState {
  /** IG: parent (or single) media container id. */
  containerId?: string;
  /** IG carousel: media id -> child container id. */
  children?: Record<string, string>;
  /** FB multi-photo: media id -> unpublished photo id. */
  photos?: Record<string, string>;
  /** FB photo story: unpublished photo id. */
  photoId?: string;
  /** FB reels / video stories: upload session video id. */
  videoId?: string;
  /** FB reels / video stories: hosted file accepted by rupload. */
  uploaded?: boolean;
}

export interface PublishContext {
  account: MetaPublishingAccount;
  item: {
    id: string;
    caption: string;
    format: ContentFormat;
    media: PlanMedia[];
  };
  state: PublishState;
  /** Set while a non-idempotent publish call is in flight / unresolved. */
  requestedAt: Date | null;
  /** Persist state and/or requestedAt under the worker's lease. Throws if the lease was lost. */
  save(patch: {
    state?: PublishState;
    requestedAt?: Date | null;
  }): Promise<void>;
  /** Short-lived HTTPS link for an R2 key (never log it). */
  signUrl(key: string): Promise<string>;
  now(): Date;
  sleep(ms: number): Promise<void>;
  pollIntervalMs: number;
  pollBudgetMs: number;
}

export interface PublishOutcome {
  externalId: string | null;
  permalink: string | null;
}

/**
 * Run a NON-idempotent publish call (media_publish, /feed, /photos, finish
 * phase...). requestedAt is persisted first; it is cleared again only when
 * Meta gave a definitive rejection. After an ambiguous failure (timeout,
 * dropped connection, 5xx) it stays set, and the next attempt reconciles
 * against Meta instead of posting a second time.
 */
export async function guarded<T>(
  ctx: PublishContext,
  call: () => Promise<T>,
): Promise<T> {
  const at = ctx.now();
  await ctx.save({ requestedAt: at });
  ctx.requestedAt = at;
  try {
    return await call();
  } catch (e) {
    if (e instanceof MetaGraphError && !e.ambiguous) {
      await ctx.save({ requestedAt: null });
      ctx.requestedAt = null;
    }
    throw e;
  }
}

const PERMALINK_HOSTS = ["facebook.com", "instagram.com", "fb.com", "fb.watch"];

/**
 * Only ever store https links on Meta's own domains (the UI renders the
 * permalink as a link; a crafted value must never become javascript: etc.).
 * Facebook sometimes returns a path ("/reel/123") -> made absolute.
 */
export function safePermalink(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim().startsWith("/")
    ? `https://www.facebook.com${raw.trim()}`
    : raw.trim();
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (!PERMALINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)))
      return null;
    return u.toString().slice(0, 1000);
  } catch {
    return null;
  }
}

/** Whitespace-insensitive comparison for matching our caption to a post. */
export const sameText = (a: unknown, b: unknown): boolean =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

/** "2026-10-06T13:00:00+0000" -> ms epoch. */
export function graphTimeMs(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(t) ? null : t;
}
