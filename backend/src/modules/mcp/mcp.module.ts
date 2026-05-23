import { Module } from "@nestjs/common";
import { McpController } from "./mcp.controller";
import { McpOAuthController } from "./oauth/oauth.controller";
import { MonomiClientsStore } from "./oauth/clients.store";
import { MonomiOAuthProvider } from "./oauth/monomi-oauth.provider";
import { McpToolRegistry } from "./tools/tool-registry";
import { McpResourceRegistry } from "./resources/resource-registry";
import { McpPromptRegistry } from "./prompts/prompt-registry";
import { McpAuditService } from "./services/audit.service";
import { McpRateLimitService } from "./services/rate-limit.service";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * MCP (Model Context Protocol) module.
 *
 * Exposes Monomi as a remote MCP server that Claude.ai Pro/Max users can
 * add as a "Custom Connector". Each user OAuth-authenticates with their
 * Monomi account; their Claude.ai queries are then billed against their
 * own Claude subscription — Monomi does not call the Anthropic API.
 *
 * Routes:
 *   POST/GET /mcp                                 ← Streamable HTTP transport
 *   GET      /.well-known/oauth-authorization-server
 *   GET      /.well-known/oauth-protected-resource[/mcp]
 *   POST     /oauth/register                       (Dynamic Client Registration)
 *   GET      /oauth/authorize
 *   POST     /oauth/token
 *   POST     /oauth/revoke
 *   GET/POST /oauth/consent                        (browser login + consent)
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [McpController, McpOAuthController],
  providers: [
    MonomiClientsStore,
    MonomiOAuthProvider,
    McpToolRegistry,
    McpResourceRegistry,
    McpPromptRegistry,
    McpAuditService,
    McpRateLimitService,
  ],
})
export class McpModule {}
