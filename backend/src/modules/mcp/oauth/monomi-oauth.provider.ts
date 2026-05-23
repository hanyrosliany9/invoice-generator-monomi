import { Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { InvalidGrantError, InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { PrismaService } from "../../prisma/prisma.service";
import { MonomiClientsStore } from "./clients.store";
import { generateOpaqueToken, sha256 } from "../services/token-hash.util";

const AUTH_CODE_TTL_SECONDS = 10 * 60; // 10 minutes
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const PENDING_AUTH_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * OAuth 2.1 Authorization Server backing the MCP custom connector.
 *
 * Bridges Anthropic's MCP OAuth flow to Monomi's existing JWT login.
 * The browser flow lands on /oauth/consent which reuses the existing app
 * login UI; after the user logs in they are redirected back to the MCP
 * client (Claude.ai) with an authorization code.
 */
@Injectable()
export class MonomiOAuthProvider implements OAuthServerProvider {
  private readonly logger = new Logger(MonomiOAuthProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: MonomiClientsStore,
  ) {
    setInterval(() => this.gcPending(), 5 * 60 * 1000).unref();
  }

  get clientsStore(): MonomiClientsStore {
    return this.clients;
  }

  /**
   * Step 1 of the authorization code flow. Claude.ai sends the user here;
   * we stash the request parameters keyed by a fresh requestId and redirect
   * the user's browser to our consent page.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const pending = await this.prisma.mcpPendingAuthorization.create({
      data: {
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: "S256",
        scope: params.scopes?.join(" "),
        state: params.state,
        resource: params.resource?.toString(),
        expiresAt: new Date(Date.now() + PENDING_AUTH_TTL_MS),
      },
    });
    const requestId = pending.id;

    const consentUrl = new URL("/consent", this.baseUrl());
    consentUrl.searchParams.set("request_id", requestId);
    consentUrl.searchParams.set(
      "client_name",
      client.client_name ?? "Claude",
    );

    res.redirect(302, consentUrl.toString());
  }

  /**
   * Called from the consent endpoint AFTER the user has logged into Monomi.
   * Mints an authorization code bound to this user + pending request.
   */
  async finalizeAuthorization(requestId: string, userId: string): Promise<{
    redirectUrl: string;
  }> {
    const pending = await this.prisma.mcpPendingAuthorization.findUnique({
      where: { id: requestId },
    });
    if (!pending) {
      throw new Error("Authorization request expired or invalid");
    }
    if (pending.expiresAt.getTime() < Date.now()) {
      await this.prisma.mcpPendingAuthorization.delete({ where: { id: requestId } }).catch(() => {});
      throw new Error("Authorization request expired");
    }

    const code = generateOpaqueToken(32);
    await this.prisma.$transaction([
      this.prisma.mcpAuthCode.create({
        data: {
          code: sha256(code),
          clientId: pending.clientId,
          userId,
          codeChallenge: pending.codeChallenge,
          codeChallengeMethod: pending.codeChallengeMethod,
          redirectUri: pending.redirectUri,
          scope: pending.scope ?? null,
          resource: pending.resource ?? null,
          expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
        },
      }),
      this.prisma.mcpPendingAuthorization.delete({ where: { id: requestId } }),
    ]);

    const redirect = new URL(pending.redirectUri);
    redirect.searchParams.set("code", code);
    if (pending.state) redirect.searchParams.set("state", pending.state);
    return { redirectUrl: redirect.toString() };
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const row = await this.prisma.mcpAuthCode.findUnique({
      where: { code: sha256(authorizationCode) },
    });
    if (!row || row.clientId !== client.client_id || row.consumed) {
      throw new InvalidGrantError("authorization code is invalid");
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new InvalidGrantError("authorization code has expired");
    }
    return row.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string, // PKCE is verified by mcpAuthRouter before this is called
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const codeHash = sha256(authorizationCode);
    const row = await this.prisma.mcpAuthCode.findUnique({ where: { code: codeHash } });
    if (!row || row.clientId !== client.client_id) {
      throw new InvalidGrantError("authorization code is invalid");
    }
    if (row.consumed) {
      throw new InvalidGrantError("authorization code has already been used");
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new InvalidGrantError("authorization code has expired");
    }
    if (redirectUri && row.redirectUri !== redirectUri) {
      throw new InvalidGrantError("redirect_uri mismatch");
    }
    if (resource && row.resource && row.resource !== resource.toString()) {
      throw new InvalidGrantError("resource mismatch");
    }

    await this.prisma.mcpAuthCode.update({
      where: { code: codeHash },
      data: { consumed: true, consumedAt: new Date() },
    });

    return this.mintTokens({
      clientId: client.client_id,
      userId: row.userId,
      scope: row.scope ?? undefined,
      resource: row.resource ?? resource?.toString(),
    });
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const hash = sha256(refreshToken);
    const row = await this.prisma.mcpAccessToken.findUnique({
      where: { refreshToken: hash },
    });
    if (!row || row.revokedAt || row.clientId !== client.client_id) {
      throw new InvalidGrantError("refresh token is invalid");
    }
    if (row.refreshExpiresAt && row.refreshExpiresAt.getTime() < Date.now()) {
      throw new InvalidGrantError("refresh token has expired");
    }

    await this.prisma.mcpAccessToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    return this.mintTokens({
      clientId: client.client_id,
      userId: row.userId,
      scope: scopes?.join(" ") ?? row.scope ?? undefined,
      resource: resource?.toString() ?? row.resource ?? undefined,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const row = await this.prisma.mcpAccessToken.findUnique({
      where: { accessToken: sha256(token) },
      include: { user: true },
    });
    if (!row || row.revokedAt) {
      throw new InvalidTokenError("access token is invalid");
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new InvalidTokenError("access token has expired");
    }
    if (!row.user.isActive) {
      throw new InvalidTokenError("user is deactivated");
    }

    // Best-effort lastUsedAt update; not blocking on the response.
    this.prisma.mcpAccessToken
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch((err) => this.logger.warn(`lastUsedAt update failed: ${err.message}`));

    return {
      token,
      clientId: row.clientId,
      scopes: row.scope?.split(" ").filter(Boolean) ?? [],
      expiresAt: Math.floor(row.expiresAt.getTime() / 1000),
      resource: row.resource ? new URL(row.resource) : undefined,
      extra: {
        userId: row.user.id,
        email: row.user.email,
        name: row.user.name,
        role: row.user.role,
        tokenId: row.id,
      },
    };
  }

  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const hash = sha256(request.token);
    await this.prisma.mcpAccessToken.updateMany({
      where: {
        clientId: client.client_id,
        OR: [{ accessToken: hash }, { refreshToken: hash }],
      },
      data: { revokedAt: new Date() },
    });
  }

  private async mintTokens(args: {
    clientId: string;
    userId: string;
    scope?: string;
    resource?: string;
  }): Promise<OAuthTokens> {
    const accessToken = generateOpaqueToken(32);
    const refreshToken = generateOpaqueToken(32);
    const now = Date.now();
    const expiresAt = new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.mcpAccessToken.create({
      data: {
        accessToken: sha256(accessToken),
        refreshToken: sha256(refreshToken),
        clientId: args.clientId,
        userId: args.userId,
        scope: args.scope ?? null,
        resource: args.resource ?? null,
        expiresAt,
        refreshExpiresAt,
      },
    });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope: args.scope,
    };
  }

  private gcPending(): void {
    this.prisma.mcpPendingAuthorization
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch((err) =>
        this.logger.warn(`pending-auth gc failed: ${(err as Error).message}`),
      );
  }

  private baseUrl(): string {
    return process.env.MCP_PUBLIC_URL ?? process.env.PUBLIC_URL ?? "http://localhost:5000";
  }
}
