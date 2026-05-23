import { Injectable, Logger } from "@nestjs/common";
import type { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AnyToolDef } from "./tool.types";
import { createMeWhoamiTool } from "./me.tools";
import {
  createQuotationListTool,
  createQuotationGetTool,
} from "./sales/quotation.tools";
import {
  createInvoiceListTool,
  createInvoiceGetTool,
} from "./sales/invoice.tools";
import { createPaymentListTool } from "./sales/payment.tools";
import { createArAgingSummaryTool } from "./sales/ar.tools";
import {
  createClientTimelineTool,
  createClientPaymentPersonalityTool,
} from "./sales/client.tools";

export interface ToolDeps {
  prisma: PrismaService;
}

@Injectable()
export class McpToolRegistry {
  private readonly logger = new Logger(McpToolRegistry.name);
  private readonly tools: AnyToolDef[];

  constructor(prisma: PrismaService) {
    const deps: ToolDeps = { prisma };

    this.tools = [
      createMeWhoamiTool(deps),
      createQuotationListTool(deps),
      createQuotationGetTool(deps),
      createInvoiceListTool(deps),
      createInvoiceGetTool(deps),
      createPaymentListTool(deps),
      createArAgingSummaryTool(deps),
      createClientTimelineTool(deps),
      createClientPaymentPersonalityTool(deps),
    ];

    const seen = new Set<string>();
    for (const t of this.tools) {
      if (seen.has(t.name)) {
        throw new Error(`Duplicate MCP tool name: ${t.name}`);
      }
      seen.add(t.name);
    }

    this.logger.log(
      `Registered ${this.tools.length} MCP tools: ${this.tools.map((t) => t.name).join(", ")}`,
    );
  }

  forRole(role: UserRole): AnyToolDef[] {
    return this.tools.filter((t) => t.allowedRoles.includes(role));
  }

  byName(name: string): AnyToolDef | undefined {
    return this.tools.find((t) => t.name === name);
  }

  allToolNamesForRole(role: UserRole): string[] {
    return this.forRole(role).map((t) => t.name);
  }
}
