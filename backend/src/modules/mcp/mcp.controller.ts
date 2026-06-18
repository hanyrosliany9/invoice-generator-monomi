import {
  All,
  Controller,
  HttpStatus,
  Logger,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { MonomiOAuthProvider } from "./oauth/monomi-oauth.provider";
import { McpToolRegistry } from "./tools/tool-registry";
import { McpResourceRegistry } from "./resources/resource-registry";
import { McpPromptRegistry } from "./prompts/prompt-registry";
import { McpAuditService } from "./services/audit.service";
import { McpRateLimitService } from "./services/rate-limit.service";
import type { McpContext, McpUser } from "./mcp.types";
import { scopeAllows } from "./mcp.types";
import type { UserRole } from "@prisma/client";

@Controller("mcp")
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(
    private readonly oauth: MonomiOAuthProvider,
    private readonly tools: McpToolRegistry,
    private readonly resources: McpResourceRegistry,
    private readonly prompts: McpPromptRegistry,
    private readonly audit: McpAuditService,
    private readonly rateLimit: McpRateLimitService,
  ) {}

  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      this.unauthorized(res, "Missing bearer token");
      return;
    }
    const token = authHeader.slice("Bearer ".length).trim();

    let ctx: McpContext;
    try {
      const info = await this.oauth.verifyAccessToken(token);
      const extra = info.extra as
        | { userId: string; email: string; name: string; role: UserRole; tokenId: string }
        | undefined;
      if (!extra) {
        this.unauthorized(res, "Token has no associated user");
        return;
      }
      const user: McpUser = {
        id: extra.userId,
        email: extra.email,
        name: extra.name,
        role: extra.role,
      };
      ctx = {
        user,
        clientId: info.clientId,
        tokenId: extra.tokenId,
        scopes: info.scopes ?? [],
        ipAddress: this.ipFrom(req),
        userAgent: req.headers["user-agent"]?.toString(),
      };
    } catch (err) {
      this.unauthorized(res, (err as Error).message);
      return;
    }

    if (!this.rateLimit.allow(ctx.user.id)) {
      res
        .status(429)
        .setHeader("Retry-After", String(this.rateLimit.retryAfterSeconds(ctx.user.id)))
        .json({ error: "rate_limited", message: "Too many MCP calls in the last 5 minutes" });
      return;
    }

    // Build a per-request MCP server scoped to this user's role.
    const server = this.buildServer(ctx);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on("close", () => {
      transport.close().catch((err) =>
        this.logger.warn(`transport close failed: ${(err as Error).message}`),
      );
      server.close().catch((err) =>
        this.logger.warn(`server close failed: ${(err as Error).message}`),
      );
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      this.logger.error(`MCP request failed: ${(err as Error).message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: "internal_error", message: (err as Error).message });
      }
    }
  }

  private buildServer(ctx: McpContext): McpServer {
    const server = new McpServer(
      { name: "monomi-mcp", version: "0.1.0" },
      { capabilities: { tools: {}, resources: {}, prompts: {}, logging: {} } },
    );

    // ----- Tools -----
    for (const tool of this.tools.forRole(ctx.user.role)) {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: z.object(tool.inputSchema),
        },
        async (args: Record<string, unknown>) => {
          // Scope enforcement: check AFTER role (role gates visibility;
          // scope gates runtime invocation).
          if (!scopeAllows(ctx, tool.requiredScope)) {
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text: `Error: insufficient_scope — token does not grant '${tool.requiredScope}' required by tool '${tool.name}'`,
                },
              ],
            };
          }
          const start = Date.now();
          try {
            const out = await tool.handler(args, ctx);
            const text = out.text ?? "";
            const structured = out.structured
              ? { ...out.structured }
              : undefined;
            const resultSize = Buffer.byteLength(
              text + (structured ? JSON.stringify(structured) : ""),
              "utf8",
            );
            await this.audit.record({
              ctx,
              kind: "tool",
              name: tool.name,
              args,
              resultSize,
              durationMs: Date.now() - start,
            });
            return {
              content: [{ type: "text" as const, text }],
              ...(structured ? { structuredContent: structured } : {}),
            };
          } catch (err) {
            const message = (err as Error).message;
            await this.audit.record({
              ctx,
              kind: "tool",
              name: tool.name,
              args,
              durationMs: Date.now() - start,
              errorMessage: message,
            });
            return {
              isError: true,
              content: [{ type: "text" as const, text: `Error: ${message}` }],
            };
          }
        },
      );
    }

    // ----- Resources -----
    for (const res of this.resources.list(ctx)) {
      server.registerResource(
        res.name,
        res.uri,
        {
          description: res.description,
          mimeType: res.mimeType,
        },
        async () => {
          const start = Date.now();
          try {
            const content = await res.read(ctx);
            await this.audit.record({
              ctx,
              kind: "resource",
              name: res.uri,
              resultSize: Buffer.byteLength(content.text, "utf8"),
              durationMs: Date.now() - start,
            });
            return {
              contents: [
                { uri: content.uri, mimeType: content.mimeType, text: content.text },
              ],
            };
          } catch (err) {
            const message = (err as Error).message;
            await this.audit.record({
              ctx,
              kind: "resource",
              name: res.uri,
              durationMs: Date.now() - start,
              errorMessage: message,
            });
            throw err;
          }
        },
      );
    }

    // ----- Prompts -----
    for (const p of this.prompts.list()) {
      const argsSchema: Record<string, z.ZodTypeAny> = {};
      for (const a of p.arguments) {
        const base = z.string().describe(a.description);
        argsSchema[a.name] = a.required ? base : base.optional();
      }
      server.registerPrompt(
        p.name,
        {
          description: p.description,
          argsSchema,
        },
        async (args: Record<string, unknown>) => {
          const start = Date.now();
          const safeArgs: Record<string, string> = {};
          for (const [k, v] of Object.entries(args)) {
            if (typeof v === "string") safeArgs[k] = v;
          }
          const messages = p.build(safeArgs, ctx);
          await this.audit.record({
            ctx,
            kind: "prompt",
            name: p.name,
            args: safeArgs,
            durationMs: Date.now() - start,
          });
          return {
            description: p.description,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          };
        },
      );
    }

    return server;
  }

  private unauthorized(res: Response, message: string): void {
    // Per MCP / RFC 9728: 401 from a protected resource MUST point the client
    // at the protected-resource metadata URL via resource_metadata=. Without
    // this, MCP clients (claude.ai) don't know where to find the OAuth server.
    const baseUrl =
      process.env.MCP_PUBLIC_URL ?? process.env.PUBLIC_URL ?? "http://localhost:5000";
    const resourceMetadata = `${baseUrl.replace(/\/$/, "")}/.well-known/oauth-protected-resource/mcp`;
    res
      .status(HttpStatus.UNAUTHORIZED)
      .setHeader(
        "WWW-Authenticate",
        `Bearer realm="monomi-mcp", error="invalid_token", error_description="${message.replace(/"/g, "")}", resource_metadata="${resourceMetadata}"`,
      )
      .json({ error: "invalid_token", error_description: message });
  }

  private ipFrom(req: Request): string | undefined {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string") return xff.split(",")[0]!.trim();
    if (Array.isArray(xff)) return xff[0];
    return req.ip;
  }
}
