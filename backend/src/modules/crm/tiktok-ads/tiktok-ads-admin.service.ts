import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { scrubSecrets } from "../../instagram/instagram-graph.client";
import { resolveTokenKey } from "../../instagram/instagram.config";
import { encryptToken, tokenKeyFingerprint } from "../../instagram/utils/token-crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { backfillTikTokAttribution, releaseTikTokAttribution } from "./tiktok-ads.attribution";
import { resolveTikTokAdsConfig, TikTokAdsState } from "./tiktok-ads.config";
import { TIKTOK_TOKEN_AAD, TikTokAdsSyncService, TikTokSyncResult } from "./tiktok-ads-sync.service";

export interface TikTokAdsStatus {
  state: TikTokAdsState;
  /** Why the sync is not READY (admin-only; may name env vars, never values). */
  problems: string[];
  advertiser: { id: string; name: string | null; currency: string | null; timezone: string | null } | null;
  /** Where the long-term token comes from: the environment, the encrypted DB copy, or nowhere. */
  tokenSource: "ENV" | "STORED" | "NONE";
  /** The Connect helper can store the token encrypted (TOKEN_ENCRYPTION_KEY exists). */
  canStoreToken: boolean;
  appConfigured: boolean;
  storedTokenAt: string | null;
  backfillDays: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: string | null;
  lastTrigger: string | null;
  lastError: string | null;
  rateLimitedUntil: string | null;
  running: boolean;
  range: { from: string; to: string } | null;
  tiktokCampaigns: number;
  linkedCampaigns: number;
  /** Env var names for the admin-only technical details. */
  env: string[];
}

const ENV_NAMES = [
  "TIKTOK_ADS_SYNC_ENABLED",
  "TIKTOK_ADVERTISER_ID",
  "TIKTOK_ADS_ACCESS_TOKEN",
  "TIKTOK_ADS_APP_ID",
  "TIKTOK_ADS_APP_SECRET",
  "TIKTOK_ADS_SYNC_BACKFILL_DAYS",
];

export interface ConnectResult {
  /** true: stored encrypted in the database (and never shown). */
  stored: boolean;
  advertiserIds: string[];
  /** Only when it could NOT be stored (no TOKEN_ENCRYPTION_KEY): shown once, copy it into TIKTOK_ADS_ACCESS_TOKEN. */
  token?: string;
  /** Present when the environment token takes precedence over the stored one. */
  note?: string;
}

@Injectable()
export class TikTokAdsAdminService {
  private readonly logger = new Logger(TikTokAdsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: TikTokAdsSyncService,
  ) {}

  /** TOKEN_ENCRYPTION_KEY: usable, not set, or set but not valid. */
  private keyState(): "ok" | "missing" | "invalid" {
    const env = this.sync.env();
    if (!env.TOKEN_ENCRYPTION_KEY?.trim()) return "missing";
    try {
      resolveTokenKey(env);
      return "ok";
    } catch {
      return "invalid";
    }
  }

  private canStore(): boolean {
    return this.keyState() === "ok";
  }

  async status(): Promise<TikTokAdsStatus> {
    const [s, tiktokCampaigns, linkedCampaigns] = await Promise.all([
      this.prisma.tikTokAdsSyncState.findUnique({ where: { id: "default" } }),
      this.prisma.tikTokAdsCampaign.count(),
      this.prisma.campaign.count({ where: { tiktokCampaignId: { not: null } } }),
    ]);
    const cfg = resolveTikTokAdsConfig(this.sync.env(), { hasStoredToken: !!s?.tokenEnc });
    const advertiserId = cfg.advertiserId ?? s?.advertiserId ?? null;
    return {
      state: cfg.state,
      problems: cfg.problems,
      advertiser: advertiserId
        ? {
            id: advertiserId,
            name: s?.advertiserId === advertiserId ? s.accountName : null,
            currency: s?.advertiserId === advertiserId ? s.currency : null,
            timezone: s?.advertiserId === advertiserId ? s.timezoneName : null,
          }
        : null,
      tokenSource: cfg.envToken ? "ENV" : s?.tokenEnc ? "STORED" : "NONE",
      canStoreToken: this.canStore(),
      appConfigured: !!cfg.appId && !!cfg.appSecret,
      storedTokenAt: s?.tokenStoredAt?.toISOString() ?? null,
      backfillDays: cfg.backfillDays,
      lastRunAt: s?.lastRunAt?.toISOString() ?? null,
      lastSuccessAt: s?.lastSuccessAt?.toISOString() ?? null,
      lastStatus: s?.lastStatus ?? null,
      lastTrigger: s?.lastTrigger ?? null,
      lastError: s?.lastStatus === "SUCCESS" ? null : (s?.lastError ?? null),
      rateLimitedUntil: s?.rateLimitedUntil && s.rateLimitedUntil > new Date() ? s.rateLimitedUntil.toISOString() : null,
      running: !!s?.leaseUntil && s.leaseUntil > new Date(),
      range:
        s?.lastRangeFrom && s?.lastRangeTo
          ? { from: s.lastRangeFrom.toISOString().slice(0, 10), to: s.lastRangeTo.toISOString().slice(0, 10) }
          : null,
      tiktokCampaigns,
      linkedCampaigns,
      env: ENV_NAMES,
    };
  }

  syncNow(): Promise<TikTokSyncResult> {
    return this.sync.run("MANUAL");
  }

  /** TikTok campaigns for the "link to TikTok campaign" dropdown. */
  async listTikTokCampaigns() {
    const [tts, linked] = await Promise.all([
      this.prisma.tikTokAdsCampaign.findMany({ orderBy: { name: "asc" } }),
      this.prisma.campaign.findMany({
        where: { tiktokCampaignId: { not: null } },
        select: { id: true, code: true, tiktokCampaignId: true },
      }),
    ]);
    const by = new Map(linked.map((c) => [c.tiktokCampaignId as string, c]));
    return tts.map((m) => ({
      tiktokCampaignId: m.tiktokCampaignId,
      name: m.name,
      operationStatus: m.operationStatus,
      objective: m.objective,
      linkedCampaignId: by.get(m.tiktokCampaignId)?.id ?? null,
      linkedCampaignCode: by.get(m.tiktokCampaignId)?.code ?? null,
    }));
  }

  /** Link a CRM campaign to a TikTok campaign, or unlink (null). Attribution follows (AUTO only, MANUAL is never touched). */
  async setLink(campaignId: string, tiktokCampaignId: string | null) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Kampanye tidak ditemukan");
    const previous = campaign.tiktokCampaignId;
    if (previous === tiktokCampaignId) return campaign;

    let tt: { name: string; operationStatus: string | null; objective: string | null } | null = null;
    if (tiktokCampaignId !== null) {
      tt = await this.prisma.tikTokAdsCampaign.findUnique({ where: { tiktokCampaignId } });
      if (!tt) throw new NotFoundException("Kampanye TikTok tidak ditemukan. Jalankan sinkronisasi dulu.");
      const other = await this.prisma.campaign.findFirst({ where: { tiktokCampaignId, NOT: { id: campaignId } } });
      if (other) throw new ConflictException(`Kampanye TikTok ini sudah terhubung ke ${other.code}.`);
    }

    // The previously linked TikTok campaign (unlink OR switch) must not be re-created by the next sync.
    if (previous) {
      await this.prisma.tikTokAdsCampaign.updateMany({
        where: { tiktokCampaignId: previous },
        data: { autoLinkDisabled: true },
      });
      await releaseTikTokAttribution(this.prisma, previous, { id: campaign.id, code: campaign.code });
    }
    if (tiktokCampaignId === null) {
      return this.prisma.campaign.update({
        where: { id: campaignId },
        data: { tiktokCampaignId: null, tiktokCampaignName: null, tiktokStatus: null, tiktokObjective: null },
      });
    }
    let updated;
    try {
      updated = await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          tiktokCampaignId,
          tiktokCampaignName: tt!.name,
          tiktokStatus: tt!.operationStatus,
          tiktokObjective: tt!.objective,
          platform: "TIKTOK",
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Kampanye TikTok ini sudah terhubung ke kampanye lain.");
      }
      throw error;
    }
    await this.prisma.tikTokAdsCampaign.update({ where: { tiktokCampaignId }, data: { autoLinkDisabled: false } });
    await backfillTikTokAttribution(this.prisma, [tiktokCampaignId]);
    return updated;
  }

  // ---- "Connect TikTok Ads": auth_code -> long-term token ------------------------------

  /**
   * Exchanges the auth_code from the TikTok OAuth redirect (single use, valid
   * about one hour) for the long-term advertiser token at
   * POST /open_api/v1.3/oauth2/access_token/ (JSON: app_id, secret, auth_code).
   *  - With TOKEN_ENCRYPTION_KEY the token is stored AES-256-GCM encrypted in
   *    tiktok_ads_sync_state and is never returned or shown again.
   *  - Without it nothing is stored: the token is returned ONCE in this response so
   *    the owner can put it into TIKTOK_ADS_ACCESS_TOKEN (not logged, not kept).
   */
  async connect(rawAuthCode: string): Promise<ConnectResult> {
    const authCode = (rawAuthCode ?? "").trim();
    if (!/^[A-Za-z0-9_-]{8,256}$/.test(authCode)) {
      throw new BadRequestException("Kode otorisasi (auth_code) tidak valid.");
    }
    const cfg = resolveTikTokAdsConfig(this.sync.env());
    if (!cfg.appId || !cfg.appSecret) {
      throw new BadRequestException("TIKTOK_ADS_APP_ID dan TIKTOK_ADS_APP_SECRET belum diatur di server.");
    }
    // Decided BEFORE the exchange: the auth_code is single use, and a plaintext token is never
    // shown in production or when the configured key is broken.
    const keyState = this.keyState();
    if (keyState === "invalid" || (keyState === "missing" && this.sync.env().NODE_ENV === "production")) {
      throw new BadRequestException(
        "TOKEN_ENCRYPTION_KEY belum diatur atau tidak valid, jadi token tidak bisa disimpan dengan aman. Isi TOKEN_ENCRYPTION_KEY yang valid (openssl rand -base64 32), restart backend, lalu hubungkan lagi. Kode otorisasi belum dipakai.",
      );
    }
    let res: { status: number; json: any };
    try {
      res = await this.sync.http.request("POST", `${cfg.baseUrl}/open_api/v1.3/oauth2/access_token/`, {
        json: { app_id: cfg.appId, secret: cfg.appSecret, auth_code: authCode },
      });
    } catch (error) {
      this.logger.warn(`TikTok OAuth exchange failed: ${scrubSecrets((error as Error).message)}`);
      throw new BadRequestException("Tidak bisa menghubungi TikTok. Coba lagi.");
    }
    const code = typeof res.json?.code === "number" ? res.json.code : null;
    const data = res.json?.data;
    if (res.status !== 200 || code !== 0 || typeof data?.access_token !== "string" || !data.access_token) {
      const msg = scrubSecrets(String(res.json?.message ?? `HTTP ${res.status}`)).split(cfg.appSecret).join("[redacted]");
      this.logger.warn(`TikTok OAuth exchange refused: code ${code ?? "-"}`);
      throw new BadRequestException(`TikTok menolak kode otorisasi: ${msg}`);
    }
    const token: string = data.access_token;
    const advertiserIds: string[] = Array.isArray(data.advertiser_ids) ? data.advertiser_ids.map(String).slice(0, 50) : [];

    if (!this.canStore()) {
      return {
        stored: false,
        advertiserIds,
        token,
        note: "TOKEN_ENCRYPTION_KEY belum diatur: token tidak disimpan. Salin token ini SEKARANG ke TIKTOK_ADS_ACCESS_TOKEN di server; token tidak akan ditampilkan lagi.",
      };
    }
    const key = resolveTokenKey(this.sync.env());
    await this.prisma.tikTokAdsSyncState.upsert({
      where: { id: "default" },
      update: {
        tokenEnc: encryptToken(token, key, TIKTOK_TOKEN_AAD),
        tokenKeyId: tokenKeyFingerprint(key),
        tokenAdvertiserIds: advertiserIds,
        tokenStoredAt: new Date(),
      },
      create: {
        id: "default",
        tokenEnc: encryptToken(token, key, TIKTOK_TOKEN_AAD),
        tokenKeyId: tokenKeyFingerprint(key),
        tokenAdvertiserIds: advertiserIds,
        tokenStoredAt: new Date(),
      },
    });
    return {
      stored: true,
      advertiserIds,
      ...(cfg.envToken
        ? { note: "TIKTOK_ADS_ACCESS_TOKEN di server masih dipakai lebih dulu daripada token yang tersimpan." }
        : {}),
    };
  }

  /** Forgets the stored token (the environment token, if any, is untouched). */
  async disconnect(): Promise<{ success: true }> {
    await this.prisma.tikTokAdsSyncState.updateMany({
      where: { id: "default" },
      data: { tokenEnc: null, tokenKeyId: null, tokenAdvertiserIds: [], tokenStoredAt: null },
    });
    return { success: true };
  }
}
