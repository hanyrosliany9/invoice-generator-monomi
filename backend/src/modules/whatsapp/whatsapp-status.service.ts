import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GraphApiError } from "./whatsapp-graph.client";
import { WhatsAppApiService } from "./whatsapp-api.service";
import { MetaCapiService } from "./meta-capi.service";
import {
  embeddedSignupReady,
  META_ID_RE,
  PROD_WEBHOOK_URL,
  WEBHOOK_PATH,
  webhookReady,
} from "./whatsapp.config";

const CHECK_CACHE_MS = 60_000;

export interface LiveCheck {
  ok: boolean;
  checkedAt: string;
  error: string | null;
  waba: { id: string; name: string | null } | null;
  numbers: Array<{
    id: string;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    platformType: string | null;
    status: string | null;
    qualityRating: string | null;
    isConfigured: boolean;
  }>;
}

/**
 * Settings card data: what is configured (booleans only — never a token),
 * a READ-ONLY live check of the WABA + phone numbers (platform_type shows
 * whether the number is still on the WhatsApp Business app), webhook URL,
 * CAPI status, and the feature-flagged Embedded Signup (coexistence) flow.
 */
@Injectable()
export class WhatsAppStatusService {
  private readonly logger = new Logger(WhatsAppStatusService.name);
  private checkCache: { at: number; value: LiveCheck } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: WhatsAppApiService,
    private readonly capi: MetaCapiService,
  ) {}

  webhookUrl(): string {
    const cfg = this.api.config();
    if (cfg.isProduction) return PROD_WEBHOOK_URL;
    const port = process.env.PORT || "5000";
    return `http://localhost:${port}${WEBHOOK_PATH}`;
  }

  private async liveCheck(force: boolean): Promise<LiveCheck | null> {
    if (
      !force &&
      this.checkCache &&
      Date.now() - this.checkCache.at < CHECK_CACHE_MS
    )
      return this.checkCache.value;
    const creds = await this.api.resolve();
    if (!creds) return null;
    const value: LiveCheck = {
      ok: false,
      checkedAt: new Date().toISOString(),
      error: null,
      waba: null,
      numbers: [],
    };
    try {
      const waba = await this.api.wabaInfo(creds);
      value.waba = {
        id: creds.wabaId,
        name: typeof waba?.name === "string" ? waba.name : null,
      };
      const numbers = await this.api.phoneNumbers(creds);
      value.numbers = numbers.map((n) => ({
        ...n,
        isConfigured: n.id === creds.phoneNumberId,
      }));
      value.ok = true;
    } catch (error) {
      value.error =
        error instanceof GraphApiError
          ? `${error.kind}: ${error.message}`
          : "check failed";
    }
    this.checkCache = { at: Date.now(), value };
    return value;
  }

  async status(refresh = false) {
    const cfg = this.api.config();
    const [conn, creds, capi] = await Promise.all([
      this.api.connection(),
      this.api.resolve(),
      this.capi.summary(),
    ]);
    const check = await this.liveCheck(refresh);
    return {
      configured: !!creds,
      credentialSource: creds?.source ?? null,
      /** OFF | INCOMPLETE | INVALID | READY — anything but READY disables the feature. */
      state: cfg.state,
      env: {
        accessToken: !!cfg.accessToken,
        wabaId: cfg.wabaId,
        phoneNumberId: cfg.phoneNumberId,
        appSecret: !!cfg.appSecret,
        verifyToken: !!cfg.verifyToken,
        graphVersion: cfg.graphVersion,
        appSecretProof: cfg.appSecretProof,
        problems: cfg.problems,
      },
      webhook: {
        url: this.webhookUrl(),
        ready: webhookReady(cfg),
        fields: [
          "messages",
          "smb_message_echoes",
          "history",
          "smb_app_state_sync",
          "account_update",
        ],
        lastWebhookAt: conn?.lastWebhookAt ?? null,
      },
      connection: conn
        ? {
            status: conn.status,
            wabaId: conn.wabaId,
            phoneNumberId: conn.phoneNumberId,
            displayPhoneNumber: conn.displayPhoneNumber,
            connectedAt: conn.connectedAt,
            disconnectedAt: conn.disconnectedAt,
            disconnectReason: conn.disconnectReason,
            hasStoredToken: !!conn.accessTokenEnc,
            historySyncRequestedAt: conn.historySyncRequestedAt,
            contactsSyncRequestedAt: conn.contactsSyncRequestedAt,
            historyPhase: conn.historyPhase,
            historyProgress: conn.historyProgress,
            historyError: conn.historyError,
          }
        : null,
      check,
      capi: { ...capi, state: cfg.capiState, problems: cfg.capiProblems },
      embeddedSignup: {
        enabled: embeddedSignupReady(cfg),
        coexistenceFlag: cfg.coexistenceEnabled,
        appId: cfg.coexistenceEnabled ? cfg.appId : null,
        configId: cfg.coexistenceEnabled ? cfg.embeddedSignupConfigId : null,
        graphVersion: cfg.graphVersion,
      },
    };
  }

  /** The verify token is pasted into the Meta dashboard by an admin; revealed on explicit request only. */
  revealVerifyToken(): { verifyToken: string } {
    const cfg = this.api.config();
    if (!cfg.verifyToken)
      throw new NotFoundException("WHATSAPP_WEBHOOK_VERIFY_TOKEN belum diatur");
    return { verifyToken: cfg.verifyToken };
  }

  /**
   * POST /{waba}/dataset — creates (or returns) the CAPI dataset id for
   * META_DATASET_ID. When META_DATASET_ID is already configured it is
   * returned WITHOUT calling Meta, unless an admin explicitly passes force.
   */
  async createDataset(force = false) {
    const cfg = this.api.config();
    if (cfg.datasetId && !force) {
      return { datasetId: cfg.datasetId, source: "configured" as const };
    }
    const creds = await this.api.require();
    try {
      const res = await this.api.createDataset(creds);
      if (typeof res?.id !== "string" || !META_ID_RE.test(res.id))
        throw new GraphApiError("No dataset id returned", "unknown", 200);
      return { datasetId: res.id, source: "meta" as const };
    } catch (error) {
      if (error instanceof GraphApiError) {
        throw new HttpException(
          {
            statusCode: 502,
            code: "WHATSAPP_API_ERROR",
            details: { code: "WHATSAPP_API_ERROR" },
            message: `Meta: ${error.message}`,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
      throw error;
    }
  }

  /**
   * Embedded Signup (coexistence) completion. Feature-flagged; requires Tech
   * Provider approval on Meta's side before it can work. Exchanges the code
   * server-side, stores the business token encrypted, subscribes the app to
   * the WABA webhooks and asks for contacts + history sync. It NEVER calls
   * phone number registration (the Graph client refuses it anyway).
   */
  async completeEmbeddedSignup(
    input: { code: string; wabaId: string; phoneNumberId: string },
    userId: string,
  ) {
    const cfg = this.api.config();
    if (!embeddedSignupReady(cfg)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "COEXISTENCE_DISABLED",
        details: { code: "COEXISTENCE_DISABLED" },
        message: "Embedded Signup belum diaktifkan.",
      });
    }
    if (
      !META_ID_RE.test(input.wabaId) ||
      !META_ID_RE.test(input.phoneNumberId)
    ) {
      throw new BadRequestException("ID WABA / nomor tidak valid");
    }
    if (cfg.wabaId && cfg.wabaId !== input.wabaId) {
      throw new BadRequestException(
        "WABA ini berbeda dari WHATSAPP_WABA_ID di server",
      );
    }
    const steps: Record<string, string> = {};
    let token: string;
    try {
      token = await this.api.exchangeCode(input.code);
      steps.exchange = "ok";
    } catch (error) {
      this.logger.warn(
        `Embedded Signup code exchange failed: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        "Kode dari Meta tidak valid atau kedaluwarsa. Ulangi Connect WhatsApp.",
      );
    }
    // Confirm the token can see this WABA and the number belongs to it (read-only).
    let displayPhone: string | null = null;
    try {
      const numbers = await this.api.phoneNumbers({
        token,
        wabaId: input.wabaId,
      });
      const n = numbers.find((x) => x.id === input.phoneNumberId);
      if (!n)
        throw new BadRequestException("Nomor tidak ditemukan di WABA ini");
      displayPhone = n.displayPhoneNumber;
      steps.verify = "ok";
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(
        "Token dari Meta tidak dapat membaca WABA ini",
      );
    }
    await this.api.storeEmbeddedToken({
      token,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: displayPhone,
      userId,
    });
    try {
      await this.api.subscribeApp(token, input.wabaId);
      steps.subscribe = "ok";
    } catch (error) {
      steps.subscribe = `failed: ${(error as Error).message}`.slice(0, 200);
    }
    if (cfg.historySyncEnabled) {
      for (const [key, syncType] of [
        ["contacts", "smb_app_state_sync"],
        ["history", "history"],
      ] as const) {
        try {
          await this.api.requestSmbSync(token, input.phoneNumberId, syncType);
          steps[key] = "requested";
        } catch (error) {
          steps[key] = `failed: ${(error as Error).message}`.slice(0, 200);
        }
      }
      await this.markSyncRequested(steps);
    }
    this.checkCache = null;
    return { connected: true, steps };
  }

  private async markSyncRequested(steps: Record<string, string>) {
    const now = new Date();
    const data = {
      ...(steps.history === "requested" ? { historySyncRequestedAt: now } : {}),
      ...(steps.contacts === "requested"
        ? { contactsSyncRequestedAt: now }
        : {}),
    };
    if (Object.keys(data).length) {
      await this.prisma.whatsAppConnection.update({
        where: { id: "default" },
        data,
      });
    }
  }
}
