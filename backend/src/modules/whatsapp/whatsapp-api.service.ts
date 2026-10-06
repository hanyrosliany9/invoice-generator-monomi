import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { resolveTokenKey } from "../instagram/instagram.config";
import {
  decryptToken,
  encryptToken,
  tokenKeyFingerprint,
} from "../instagram/utils/token-crypto";
import { GraphApiError, WhatsAppGraphClient } from "./whatsapp-graph.client";
import {
  loadWhatsAppConfig,
  META_ID_RE,
  WhatsAppConfig,
} from "./whatsapp.config";
import { isMediaId } from "./whatsapp.utils";

export interface WaCredentials {
  token: string;
  wabaId: string;
  phoneNumberId: string;
  source: "env" | "embedded";
}

export const CONNECTION_ID = "default";

/** AAD binding the stored business token to its WABA (copying the row elsewhere fails). */
const tokenAad = (wabaId: string) =>
  Buffer.from(`whatsapp-token:${wabaId}`, "utf8");

export interface TemplateInfo {
  name: string;
  language: string;
  category: string | null;
  bodyText: string | null;
  paramCount: number;
}

/**
 * Credentials + typed wrappers around the Graph endpoints this module uses.
 * Plaintext tokens only live in memory for a call and are never returned to
 * a controller, stored unencrypted or logged.
 */
@Injectable()
export class WhatsAppApiService {
  private readonly logger = new Logger(WhatsAppApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: WhatsAppGraphClient,
  ) {}

  config(): WhatsAppConfig {
    return loadWhatsAppConfig();
  }

  async connection() {
    return this.prisma.whatsAppConnection.findUnique({
      where: { id: CONNECTION_ID },
    });
  }

  /**
   * Effective credentials: the env system-user token wins; otherwise the
   * business token stored by Embedded Signup (while CONNECTED).
   */
  async resolve(): Promise<WaCredentials | null> {
    const cfg = this.config();
    if (cfg.accessToken) {
      const conn =
        cfg.wabaId && cfg.phoneNumberId ? null : await this.connection();
      const wabaId = cfg.wabaId ?? conn?.wabaId ?? null;
      const phoneNumberId = cfg.phoneNumberId ?? conn?.phoneNumberId ?? null;
      if (!wabaId || !phoneNumberId) return null;
      return { token: cfg.accessToken, wabaId, phoneNumberId, source: "env" };
    }
    const conn = await this.connection();
    if (
      !conn ||
      conn.status !== "CONNECTED" ||
      !conn.accessTokenEnc ||
      !conn.wabaId ||
      !conn.phoneNumberId
    ) {
      return null;
    }
    try {
      const key = resolveTokenKey();
      if (conn.tokenKeyId && conn.tokenKeyId !== tokenKeyFingerprint(key)) {
        this.logger.error(
          "Stored WhatsApp token was encrypted with a different TOKEN_ENCRYPTION_KEY",
        );
        return null;
      }
      const token = decryptToken(
        conn.accessTokenEnc,
        key,
        tokenAad(conn.wabaId),
      );
      return {
        token,
        wabaId: conn.wabaId,
        phoneNumberId: conn.phoneNumberId,
        source: "embedded",
      };
    } catch (error) {
      this.logger.error(
        `Stored WhatsApp token unusable: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async require(): Promise<WaCredentials> {
    const c = await this.resolve();
    if (!c) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: "WHATSAPP_NOT_CONFIGURED",
        details: { code: "WHATSAPP_NOT_CONFIGURED" },
        message: "WhatsApp belum dikonfigurasi di server.",
      });
    }
    return c;
  }

  async storeEmbeddedToken(input: {
    token: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber?: string | null;
    userId: string;
  }) {
    if (
      !META_ID_RE.test(input.wabaId) ||
      !META_ID_RE.test(input.phoneNumberId)
    ) {
      throw new Error("Invalid WABA / phone number id");
    }
    const key = resolveTokenKey();
    const enc = encryptToken(input.token, key, tokenAad(input.wabaId));
    const now = new Date();
    const data = {
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: input.displayPhoneNumber ?? null,
      status: "CONNECTED" as const,
      accessTokenEnc: enc,
      tokenKeyId: tokenKeyFingerprint(key),
      connectedAt: now,
      connectedById: input.userId,
      disconnectedAt: null,
      disconnectReason: null,
    };
    await this.prisma.whatsAppConnection.upsert({
      where: { id: CONNECTION_ID },
      update: data,
      create: { id: CONNECTION_ID, ...data },
    });
  }

  /** PARTNER_REMOVED etc.: the stored business token is useless now — delete it. */
  async markDisconnected(reason: string) {
    const now = new Date();
    await this.prisma.whatsAppConnection.upsert({
      where: { id: CONNECTION_ID },
      update: {
        status: "DISCONNECTED",
        disconnectedAt: now,
        disconnectReason: reason.slice(0, 200),
        accessTokenEnc: null,
        tokenKeyId: null,
      },
      create: {
        id: CONNECTION_ID,
        status: "DISCONNECTED",
        disconnectedAt: now,
        disconnectReason: reason.slice(0, 200),
      },
    });
  }

  // ---------------------------------------------------------------------
  // Graph wrappers
  // ---------------------------------------------------------------------

  private call<T>(
    path: string,
    req: Parameters<WhatsAppGraphClient["request"]>[3],
  ): Promise<T> {
    const cfg = this.config();
    return this.graph.request<T>(
      cfg.graphBaseUrl,
      cfg.graphVersion,
      path,
      req,
      [cfg.smbSyncEdge],
    );
  }

  async sendMessage(
    creds: WaCredentials,
    body: Record<string, unknown>,
  ): Promise<string> {
    const res = await this.call<{ messages?: Array<{ id?: string }> }>(
      `/${creds.phoneNumberId}/messages`,
      {
        method: "POST",
        token: creds.token,
        json: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          ...body,
        },
      },
    );
    const id = res?.messages?.[0]?.id;
    if (typeof id !== "string" || !id)
      throw new GraphApiError(
        "Send succeeded without a message id",
        "unknown",
        200,
      );
    return id;
  }

  async markRead(creds: WaCredentials, waMessageId: string): Promise<void> {
    await this.call(`/${creds.phoneNumberId}/messages`, {
      method: "POST",
      token: creds.token,
      json: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: waMessageId,
      },
    });
  }

  async mediaInfo(creds: WaCredentials, mediaId: string) {
    if (!isMediaId(mediaId))
      throw new GraphApiError("Invalid media id", "invalid_param", 0);
    return this.call<{ url?: string; mime_type?: string; file_size?: number }>(
      `/${mediaId}`,
      {
        method: "GET",
        token: creds.token,
        query: { phone_number_id: creds.phoneNumberId },
      },
    );
  }

  async downloadMedia(creds: WaCredentials, url: string, maxBytes: number) {
    const cfg = this.config();
    return this.graph.downloadMedia(url, creds.token, {
      maxBytes,
      devOrigin: cfg.isProduction
        ? null
        : cfg.graphBaseUrl !== "https://graph.facebook.com"
          ? cfg.graphBaseUrl
          : null,
    });
  }

  async listTemplates(creds: WaCredentials): Promise<TemplateInfo[]> {
    const res = await this.call<{ data?: any[] }>(
      `/${creds.wabaId}/message_templates`,
      {
        method: "GET",
        token: creds.token,
        query: {
          fields: "name,language,status,category,components",
          limit: 200,
        },
      },
    );
    const out: TemplateInfo[] = [];
    for (const t of res?.data ?? []) {
      if (
        t?.status !== "APPROVED" ||
        typeof t.name !== "string" ||
        typeof t.language !== "string"
      )
        continue;
      const body = Array.isArray(t.components)
        ? t.components.find((c: any) => c?.type === "BODY")
        : null;
      const bodyText =
        typeof body?.text === "string" ? body.text.slice(0, 2000) : null;
      const params = bodyText
        ? Math.max(
            0,
            ...[...bodyText.matchAll(/\{\{\s*(\d{1,2})\s*\}\}/g)].map((m) =>
              Number(m[1]),
            ),
          )
        : 0;
      const hasHeaderVar = Array.isArray(t.components)
        ? t.components.some(
            (c: any) =>
              c?.type === "HEADER" &&
              ((c.format && c.format !== "TEXT") || /\{\{/.test(c.text ?? "")),
          )
        : false;
      // Templates needing header media/variables or button params are not supported by the picker.
      if (hasHeaderVar) continue;
      out.push({
        name: t.name.slice(0, 512),
        language: t.language.slice(0, 15),
        category: typeof t.category === "string" ? t.category : null,
        bodyText,
        paramCount: params,
      });
    }
    return out;
  }

  /** READ-ONLY: WABA name. */
  async wabaInfo(creds: Pick<WaCredentials, "token" | "wabaId">) {
    return this.call<{ id?: string; name?: string }>(`/${creds.wabaId}`, {
      method: "GET",
      token: creds.token,
      query: { fields: "name" },
    });
  }

  /** READ-ONLY: numbers + platform_type (shows whether the number is still on the app / coexistence). */
  async phoneNumbers(creds: Pick<WaCredentials, "token" | "wabaId">) {
    const res = await this.call<{ data?: any[] }>(
      `/${creds.wabaId}/phone_numbers`,
      {
        method: "GET",
        token: creds.token,
        query: {
          fields:
            "display_phone_number,verified_name,platform_type,status,quality_rating",
        },
      },
    );
    return (res?.data ?? []).map((n: any) => ({
      id: typeof n?.id === "string" ? n.id : String(n?.id ?? ""),
      displayPhoneNumber:
        typeof n?.display_phone_number === "string"
          ? n.display_phone_number
          : null,
      verifiedName:
        typeof n?.verified_name === "string" ? n.verified_name : null,
      platformType:
        typeof n?.platform_type === "string" ? n.platform_type : null,
      status: typeof n?.status === "string" ? n.status : null,
      qualityRating:
        typeof n?.quality_rating === "string" ? n.quality_rating : null,
    }));
  }

  async subscribeApp(token: string, wabaId: string) {
    return this.call(`/${wabaId}/subscribed_apps`, {
      method: "POST",
      token,
      json: {},
    });
  }

  /** SMB App Data API (coexistence): sync_type "smb_app_state_sync" (contacts) or "history". */
  async requestSmbSync(
    token: string,
    phoneNumberId: string,
    syncType: "smb_app_state_sync" | "history",
  ) {
    const cfg = this.config();
    return this.call(`/${phoneNumberId}/${cfg.smbSyncEdge}`, {
      method: "POST",
      token,
      json: { messaging_product: "whatsapp", sync_type: syncType },
    });
  }

  /** Embedded Signup: exchange the code for a business integration token (server-side, app secret). */
  async exchangeCode(code: string): Promise<string> {
    const cfg = this.config();
    if (!cfg.appId || !cfg.appSecret)
      throw new GraphApiError("Meta app not configured", "permission", 0);
    const res = await this.call<{ access_token?: string }>(
      `/oauth/access_token`,
      {
        method: "GET",
        query: { client_id: cfg.appId, client_secret: cfg.appSecret, code },
      },
    );
    if (typeof res?.access_token !== "string" || res.access_token.length < 20) {
      throw new GraphApiError("Code exchange returned no token", "token", 200);
    }
    return res.access_token;
  }

  async sendCapiEvents(
    creds: Pick<WaCredentials, "token">,
    datasetId: string,
    body: Record<string, unknown>,
  ) {
    return this.call<{
      events_received?: number;
      messages?: unknown[];
      fbtrace_id?: string;
    }>(`/${datasetId}/events`, {
      method: "POST",
      token: creds.token,
      json: body,
      timeoutMs: 30000,
    });
  }

  async createDataset(creds: Pick<WaCredentials, "token" | "wabaId">) {
    return this.call<{ id?: string }>(`/${creds.wabaId}/dataset`, {
      method: "POST",
      token: creds.token,
      json: {},
    });
  }
}
