import { Inject, Injectable, Logger } from "@nestjs/common";
import { InstagramConnectionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { GraphApiError } from "./instagram-graph.client";
import { INSTAGRAM_CONFIG, InstagramApiService } from "./instagram-api.service";
import { InstagramConfig } from "./instagram.config";
import { decryptToken, encryptToken, tokenAad, tokenKeyFingerprint } from "./utils/token-crypto";

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Meta refuses to refresh a token younger than 24h. */
export const REFRESH_MIN_AGE_MS = DAY_MS;
/** Refresh when the token expires within this window. */
export const REFRESH_WINDOW_MS = 10 * DAY_MS;

/** Raised when a connection can no longer be used (token expired/revoked/undecryptable). */
export class InstagramTokenDeadError extends Error {
  constructor(
    message: string,
    readonly status: InstagramConnectionStatus,
  ) {
    super(message);
    this.name = "InstagramTokenDeadError";
  }
}

/**
 * The stored token cannot be decrypted with the configured key. The token is
 * KEPT (a wrong TOKEN_ENCRYPTION_KEY must not destroy every connection);
 * restoring the right key makes the connection usable again.
 *  - key_mismatch: the row's key fingerprint differs from the current key
 *    (or a legacy row without fingerprint fails to decrypt);
 *  - corrupt: same key fingerprint but the ciphertext does not authenticate.
 */
export class InstagramTokenUndecryptableError extends Error {
  constructor(readonly reason: "key_mismatch" | "corrupt") {
    super(reason === "key_mismatch" ? "token key mismatch" : "token ciphertext invalid");
    this.name = "InstagramTokenUndecryptableError";
  }
}

/** Staff-facing lastError for an undecryptable token (no key material). */
export const TOKEN_KEY_MISMATCH_NOTE =
  "Token key mismatch: TOKEN_ENCRYPTION_KEY di server berbeda dari kunci saat token disimpan. Token tetap disimpan dan koneksi pulih otomatis setelah kunci yang benar dipasang kembali; hubungkan ulang hanya jika kunci lama hilang.";
export const TOKEN_CORRUPT_NOTE =
  "Token tersimpan tidak valid (gagal diverifikasi). Hubungkan ulang Instagram.";

export interface TokenRow {
  id: string;
  clientId: string;
  username: string;
  accessTokenEnc: string | null;
  tokenKeyId?: string | null;
  status?: InstagramConnectionStatus;
  tokenExpiresAt: Date | null;
  tokenRefreshedAt: Date | null;
  createdAt: Date;
}

/**
 * Pure refresh rule: refresh when the token is at least 24h old AND expires
 * within ~10 days. Already-expired tokens cannot be refreshed ("expired").
 */
export function refreshDecision(
  row: Pick<TokenRow, "tokenExpiresAt" | "tokenRefreshedAt" | "createdAt">,
  now: Date,
): "expired" | "refresh" | "ok" {
  const expiresAt = row.tokenExpiresAt?.getTime();
  if (expiresAt !== undefined && expiresAt <= now.getTime()) return "expired";
  const issuedAt = (row.tokenRefreshedAt ?? row.createdAt).getTime();
  const oldEnough = now.getTime() - issuedAt >= REFRESH_MIN_AGE_MS;
  const expiringSoon = expiresAt === undefined || expiresAt - now.getTime() <= REFRESH_WINDOW_MS;
  return oldEnough && expiringSoon ? "refresh" : "ok";
}

/**
 * Owns every read/write of the encrypted access token. Plaintext tokens only
 * exist in memory for the duration of a call and are never returned by any
 * controller or written to a log.
 */
@Injectable()
export class InstagramTokenService {
  private readonly logger = new Logger(InstagramTokenService.name);
  /** Clock seam for tests. */
  now: () => Date = () => new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: InstagramApiService,
    @Inject(INSTAGRAM_CONFIG) private readonly config: InstagramConfig | null,
  ) {}

  private key(): Buffer {
    if (!this.config) throw new Error("Instagram integration is not configured");
    return this.config.tokenKey;
  }

  /** Fingerprint of the configured key (stored as tokenKeyId). */
  keyId(): string {
    return tokenKeyFingerprint(this.key());
  }

  encrypt(clientId: string, token: string): string {
    return encryptToken(token, this.key(), tokenAad(clientId));
  }

  /** Columns to write for a freshly obtained token. */
  encryptedFields(clientId: string, token: string): { accessTokenEnc: string; tokenKeyId: string } {
    return { accessTokenEnc: this.encrypt(clientId, token), tokenKeyId: this.keyId() };
  }

  /**
   * Throws InstagramTokenDeadError when there is no token, and
   * InstagramTokenUndecryptableError (token kept) when the configured key
   * cannot open it.
   */
  decrypt(row: Pick<TokenRow, "clientId" | "accessTokenEnc" | "tokenKeyId">): string {
    if (!row.accessTokenEnc) throw new InstagramTokenDeadError("Token tidak tersedia", "REVOKED");
    if (row.tokenKeyId && row.tokenKeyId !== this.keyId()) {
      throw new InstagramTokenUndecryptableError("key_mismatch");
    }
    try {
      return decryptToken(row.accessTokenEnc, this.key(), tokenAad(row.clientId));
    } catch {
      // Legacy rows have no fingerprint: a failure there is most likely a key change.
      throw new InstagramTokenUndecryptableError(row.tokenKeyId ? "corrupt" : "key_mismatch");
    }
  }

  /** Local (no network) check used by the batch jobs before calling Meta. */
  checkDecryptable(row: Pick<TokenRow, "clientId" | "accessTokenEnc" | "tokenKeyId">): "ok" | "missing" | "key_mismatch" | "corrupt" {
    if (!row.accessTokenEnc) return "missing";
    try {
      this.decrypt(row);
      return "ok";
    } catch (error) {
      return error instanceof InstagramTokenUndecryptableError ? error.reason : "missing";
    }
  }

  /**
   * Flag a connection whose token the current key cannot open. Keeps the
   * token, the key fingerprint and the account claim, so the connection
   * recovers by itself once the right key is configured again.
   */
  async markUndecryptable(row: Pick<TokenRow, "id" | "username">, reason: "key_mismatch" | "corrupt") {
    await this.prisma.instagramConnection.update({
      where: { id: row.id },
      data: { status: "ERROR", lastError: reason === "key_mismatch" ? TOKEN_KEY_MISMATCH_NOTE : TOKEN_CORRUPT_NOTE },
    });
    this.logger.error(
      `Instagram connection ${row.id} (@${row.username}): ${reason === "key_mismatch" ? "token key mismatch (TOKEN_ENCRYPTION_KEY differs from the key that encrypted this token)" : "stored token failed authentication"} — token kept, connection set to ERROR`,
    );
  }

  /**
   * Plaintext token for an API call, refreshing it first when due. A refresh
   * that fails with a token error kills the connection (EXPIRED); a transient
   * failure keeps using the current (still valid) token.
   */
  async freshToken(row: TokenRow): Promise<string> {
    const now = this.now();
    const decision = refreshDecision(row, now);
    if (decision === "expired") {
      await this.markDead(row, "EXPIRED", "Token Instagram kedaluwarsa. Hubungkan ulang akun.");
      throw new InstagramTokenDeadError("Token Instagram kedaluwarsa", "EXPIRED");
    }
    const token = this.decrypt(row);
    if (row.status === "ERROR" || !row.tokenKeyId) {
      // Decrypts again (e.g. the right key was restored): recover, and record
      // the fingerprint on legacy rows.
      await this.prisma.instagramConnection.update({
        where: { id: row.id },
        data: { tokenKeyId: this.keyId(), ...(row.status === "ERROR" && { status: "ACTIVE", lastError: null }) },
      });
      if (row.status === "ERROR") this.logger.log(`Instagram connection ${row.id} recovered: token decrypts with the configured key again`);
    }
    if (decision === "ok") return token;
    try {
      const refreshed = await this.api.refreshToken(token);
      await this.prisma.instagramConnection.update({
        where: { id: row.id },
        data: {
          ...this.encryptedFields(row.clientId, refreshed.accessToken),
          tokenExpiresAt: new Date(now.getTime() + refreshed.expiresIn * 1000),
          tokenRefreshedAt: now,
        },
      });
      this.logger.log(`Instagram token refreshed for connection ${row.id}`);
      return refreshed.accessToken;
    } catch (error) {
      if (error instanceof GraphApiError && (error.kind === "token" || error.kind === "permission")) {
        await this.markDead(row, "EXPIRED", "Token Instagram tidak dapat diperbarui. Hubungkan ulang akun.");
        throw new InstagramTokenDeadError("Token Instagram tidak dapat diperbarui", "EXPIRED");
      }
      this.logger.warn(`Instagram token refresh for connection ${row.id} deferred: ${(error as Error).message}`);
      return token;
    }
  }

  /**
   * Drop the token and flag the connection. There is no in-app notification
   * centre, so staff see this as the status on the client's Instagram card;
   * the warning below is the operator-facing signal.
   */
  async markDead(row: Pick<TokenRow, "id" | "username">, status: InstagramConnectionStatus, reason: string) {
    await this.prisma.instagramConnection.update({
      where: { id: row.id },
      // Token gone -> the Instagram account is free to be attached elsewhere.
      data: { accessTokenEnc: null, tokenKeyId: null, activeIgUserId: null, status, lastError: reason },
    });
    this.logger.warn(
      `Instagram connection ${row.id} (@${row.username}) is now ${status}: ${reason} — staff must reconnect it`,
    );
  }
}
