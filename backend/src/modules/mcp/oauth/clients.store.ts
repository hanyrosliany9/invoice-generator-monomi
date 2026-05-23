import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { generateOpaqueToken } from "../services/token-hash.util";

@Injectable()
export class MonomiClientsStore implements OAuthRegisteredClientsStore {
  private readonly logger = new Logger(MonomiClientsStore.name);

  constructor(private readonly prisma: PrismaService) {}

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const row = await this.prisma.mcpOAuthClient.findUnique({ where: { clientId } });
    if (!row || row.revokedAt) return undefined;
    return this.toFull(row);
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
  ): Promise<OAuthClientInformationFull> {
    const clientId = `mcp_${generateOpaqueToken(12)}`;
    const issuedAt = Math.floor(Date.now() / 1000);

    const created = await this.prisma.mcpOAuthClient.create({
      data: {
        clientId,
        clientIdIssuedAt: issuedAt,
        clientSecret: client.client_secret ?? null,
        clientSecretExpiresAt: client.client_secret_expires_at ?? null,
        clientName: client.client_name ?? null,
        redirectUris: client.redirect_uris ?? [],
        grantTypes: client.grant_types ?? ["authorization_code", "refresh_token"],
        responseTypes: client.response_types ?? ["code"],
        tokenEndpointAuthMethod: client.token_endpoint_auth_method ?? "none",
        scope: client.scope ?? null,
        clientUri: client.client_uri ?? null,
        logoUri: client.logo_uri ?? null,
      },
    });

    this.logger.log(
      `Registered new MCP OAuth client clientId=${created.clientId} name=${created.clientName ?? "(none)"}`,
    );

    return this.toFull(created);
  }

  private toFull(row: {
    clientId: string;
    clientSecret: string | null;
    clientName: string | null;
    redirectUris: string[];
    grantTypes: string[];
    responseTypes: string[];
    tokenEndpointAuthMethod: string | null;
    scope: string | null;
    clientUri: string | null;
    logoUri: string | null;
    clientIdIssuedAt: number;
    clientSecretExpiresAt: number | null;
  }): OAuthClientInformationFull {
    return {
      client_id: row.clientId,
      client_id_issued_at: row.clientIdIssuedAt,
      client_secret: row.clientSecret ?? undefined,
      client_secret_expires_at: row.clientSecretExpiresAt ?? undefined,
      client_name: row.clientName ?? undefined,
      redirect_uris: row.redirectUris as [string, ...string[]],
      grant_types: row.grantTypes,
      response_types: row.responseTypes,
      token_endpoint_auth_method: row.tokenEndpointAuthMethod ?? "none",
      scope: row.scope ?? undefined,
      client_uri: row.clientUri ?? undefined,
      logo_uri: row.logoUri ?? undefined,
    };
  }
}
