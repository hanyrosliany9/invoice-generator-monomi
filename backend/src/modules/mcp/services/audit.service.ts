import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { McpContext, McpKind } from "../mcp.types";
import { sha256 } from "./token-hash.util";

interface AuditEntry {
  ctx: McpContext;
  kind: McpKind;
  name: string;
  args?: unknown;
  resultSize?: number;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class McpAuditService {
  private readonly logger = new Logger(McpAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.mcpAuditLog.create({
        data: {
          userId: entry.ctx.user.id,
          role: entry.ctx.user.role,
          clientId: entry.ctx.clientId,
          tokenId: entry.ctx.tokenId,
          kind: entry.kind,
          name: entry.name,
          argsHash:
            entry.args === undefined
              ? null
              : sha256(JSON.stringify(entry.args)).slice(0, 32),
          resultSize: entry.resultSize ?? null,
          durationMs: entry.durationMs ?? null,
          errorCode: entry.errorCode ?? null,
          errorMessage: entry.errorMessage ?? null,
          ipAddress: entry.ctx.ipAddress ?? null,
          userAgent: entry.ctx.userAgent ?? null,
        },
      });
    } catch (err) {
      // Audit must never break a request.
      this.logger.warn(
        `Failed to write audit log for ${entry.kind}:${entry.name}: ${(err as Error).message}`,
      );
    }
  }
}
