import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import {
  MetaGraphClient,
  MetaGraphError,
  MetaRequest,
} from "./meta-graph.client";
import {
  SOCIAL_PUBLISHING_CONFIG,
  SocialPublishingConfig,
  SocialPublishingConfigState,
} from "./social-publishing.config";
import { MSG, PublishError } from "./publish-errors";

/**
 * Who publishes for a client, and with which credentials.
 *
 * Phase 1: only the INTERNAL client (Client.isInternal, "Monomi") resolves,
 * to the env-configured system user token + Page + IG account. Any other
 * client resolves to "blocked" — this is the server-side guard that keeps
 * auto-publishing away from customer accounts. A future per-client token
 * store plugs in by implementing `resolve` for non-internal clients.
 */
export interface MetaPublishingAccount {
  source: "system_user";
  /** Secret. Never log, persist or return. */
  token: string;
  pageId: string;
  igUserId: string;
  appSecret: string | null;
}

export interface PublishingClient {
  id: string;
  isInternal: boolean;
}

const PAGE_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class MetaAccountsService {
  private readonly logger = new Logger(MetaAccountsService.name);
  /** pageId+tokenHash -> derived Page token (memory only). */
  private readonly pageTokens = new Map<
    string,
    { token: string; expiresAt: number }
  >();
  private readonly inflight = new Map<string, Promise<string>>();
  now: () => number = () => Date.now();

  constructor(
    private readonly graph: MetaGraphClient,
    @Inject(SOCIAL_PUBLISHING_CONFIG)
    private readonly configState: SocialPublishingConfigState,
  ) {}

  get state(): SocialPublishingConfigState {
    return this.configState;
  }

  get config(): SocialPublishingConfig | null {
    return this.configState.status === "configured"
      ? this.configState.config
      : null;
  }

  /** Throws a PublishError (with a clear reason) when publishing is not possible. */
  resolve(client: PublishingClient | null | undefined): MetaPublishingAccount {
    if (!client || client.isInternal !== true) {
      throw new PublishError("NOT_INTERNAL_CLIENT", MSG.notInternal, false);
    }
    const s = this.configState;
    if (s.status === "not_configured")
      throw new PublishError("NOT_CONFIGURED", MSG.notConfigured, false);
    if (s.status === "invalid")
      throw new PublishError(
        "CONFIG_INVALID",
        MSG.configInvalid(s.reason),
        false,
      );
    return {
      source: "system_user",
      token: s.config.systemUserToken,
      pageId: s.config.pageId,
      igUserId: s.config.igUserId,
      appSecret: s.config.appSecret,
    };
  }

  // ---- URL builders (hosts come from config only, never from responses) ----

  graphUrl(path: string): string {
    const c = this.requireConfig();
    return `${c.graphBaseUrl}/${c.graphVersion}/${path.replace(/^\/+/, "")}`;
  }

  videoUrl(path: string): string {
    const c = this.requireConfig();
    return `${c.graphVideoBaseUrl}/${c.graphVersion}/${path.replace(/^\/+/, "")}`;
  }

  /** rupload endpoint built from a validated numeric video id (not Meta's upload_url). */
  ruploadUrl(videoId: string): string {
    const c = this.requireConfig();
    if (!/^\d{5,30}$/.test(videoId))
      throw new PublishError(
        "UNKNOWN",
        MSG.unknown("unexpected video id from Meta"),
      );
    return `${c.ruploadBaseUrl}/video-upload/${c.graphVersion}/${videoId}`;
  }

  /** Graph call with the system user token. */
  asSystemUser<T = any>(
    account: MetaPublishingAccount,
    path: string,
    req?: MetaRequest,
  ): Promise<T> {
    return this.graph.call<T>(
      this.graphUrl(path),
      account.token,
      req,
      account.appSecret,
    );
  }

  /** Graph call with the derived Page token (retries once after a token error with a fresh one). */
  async asPage<T = any>(
    account: MetaPublishingAccount,
    url: string,
    req?: MetaRequest,
    opts: { retryOnTokenError?: boolean } = {},
  ): Promise<T> {
    const token = await this.getPageToken(account);
    try {
      return await this.graph.call<T>(url, token, req, account.appSecret);
    } catch (e) {
      // A token error is a definitive rejection (nothing was applied), so the
      // call can be repeated once with a re-derived page token.
      if (
        e instanceof MetaGraphError &&
        e.kind === "token" &&
        !e.ambiguous &&
        (opts.retryOnTokenError ?? true)
      ) {
        this.invalidatePageToken(account);
        const fresh = await this.getPageToken(account);
        return this.graph.call<T>(url, fresh, req, account.appSecret);
      }
      if (e instanceof MetaGraphError && e.kind === "token")
        this.invalidatePageToken(account);
      throw e;
    }
  }

  /**
   * Page access token derived from the system user token
   * (GET /{page-id}?fields=access_token), cached in memory for an hour.
   * Concurrent callers share one request. The value is never logged.
   */
  async getPageToken(account: MetaPublishingAccount): Promise<string> {
    const key = this.cacheKey(account);
    const hit = this.pageTokens.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.token;
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const p = (async () => {
      try {
        const res = await this.graph.call<{
          access_token?: string;
          id?: string;
        }>(
          this.graphUrl(account.pageId),
          account.token,
          { query: { fields: "access_token" } },
          account.appSecret,
        );
        const token =
          typeof res?.access_token === "string" ? res.access_token : "";
        if (!token) {
          throw new PublishError(
            "PERMISSION_DENIED",
            MSG.permission(
              "the token cannot read this Page's access token (assign the Page to the system user with content-creation access)",
            ),
            false,
          );
        }
        this.pageTokens.set(key, {
          token,
          expiresAt: this.now() + PAGE_TOKEN_TTL_MS,
        });
        this.logger.log(`Derived Page access token for page ${account.pageId}`);
        return token;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
    return p;
  }

  invalidatePageToken(account: MetaPublishingAccount): void {
    this.pageTokens.delete(this.cacheKey(account));
  }

  private cacheKey(account: MetaPublishingAccount): string {
    const h = createHash("sha256")
      .update(account.token)
      .digest("hex")
      .slice(0, 16);
    return `${account.pageId}:${h}`;
  }

  private requireConfig(): SocialPublishingConfig {
    const c = this.config;
    if (!c) throw new PublishError("NOT_CONFIGURED", MSG.notConfigured, false);
    return c;
  }
}
