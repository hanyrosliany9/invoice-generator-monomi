import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { McpContext } from "../mcp.types";
import { formatIDR, formatJakartaDate, daysBetween } from "../tools/format.util";

export interface McpResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export interface McpResourceDef {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: (ctx: McpContext) => Promise<McpResourceContent>;
}

@Injectable()
export class McpResourceRegistry {
  private readonly logger = new Logger(McpResourceRegistry.name);
  private readonly resources: McpResourceDef[];

  constructor(private readonly prisma: PrismaService) {
    this.resources = [
      {
        uri: "monomi://me",
        name: "Current user",
        description:
          "The authenticated Monomi user (id, name, role, allowed tools). Read this first to confirm context.",
        mimeType: "application/json",
        read: this.readMe.bind(this),
      },
      {
        uri: "monomi://today",
        name: "Today's brief",
        description:
          "Role-scoped daily summary: today's calendar events, today's overdue invoices, AR aging totals. Refresh every read.",
        mimeType: "text/markdown",
        read: this.readToday.bind(this),
      },
    ];
    this.logger.log(
      `Registered ${this.resources.length} MCP resources: ${this.resources.map((r) => r.uri).join(", ")}`,
    );
  }

  list(ctx: McpContext): McpResourceDef[] {
    // Role-independent for now; both resources self-filter by ctx.user.role.
    return this.resources;
  }

  byUri(uri: string): McpResourceDef | undefined {
    return this.resources.find((r) => r.uri === uri);
  }

  private async readMe(ctx: McpContext): Promise<McpResourceContent> {
    const payload = {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      capabilities: roleCapabilities(ctx.user.role),
    };
    return {
      uri: "monomi://me",
      mimeType: "application/json",
      text: JSON.stringify(payload, null, 2),
    };
  }

  private async readToday(ctx: McpContext): Promise<McpResourceContent> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const isAdmin = ctx.user.role === "ADMIN" || ctx.user.role === "SUPER_ADMIN";

    const [events, overdueInvoices] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: {
          OR: [
            { createdById: ctx.user.id },
            { assigneeId: ctx.user.id },
            { attendees: { some: { userId: ctx.user.id } } },
          ],
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { startTime: "asc" },
        take: 20,
        select: {
          id: true,
          title: true,
          category: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      }),
      isAdmin
        ? this.prisma.invoice.findMany({
            where: {
              status: { in: ["SENT", "OVERDUE"] },
              dueDate: { lt: now },
            },
            orderBy: { dueDate: "asc" },
            take: 15,
            select: {
              id: true,
              invoiceNumber: true,
              dueDate: true,
              totalAmount: true,
              client: { select: { name: true, company: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const lines: string[] = [];
    lines.push(`# Brief untuk ${ctx.user.name}`);
    lines.push(`Hari ini: ${formatJakartaDate(now)} (peran ${ctx.user.role})`);
    lines.push("");

    lines.push("## Jadwal hari ini");
    if (events.length === 0) {
      lines.push("- (tidak ada acara terjadwal)");
    } else {
      for (const e of events) {
        const time = e.startTime.toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        });
        lines.push(`- ${time} · ${e.category} · ${e.title} (${e.status})`);
      }
    }

    if (isAdmin) {
      lines.push("");
      lines.push("## Invoice jatuh tempo");
      if (overdueInvoices.length === 0) {
        lines.push("- (tidak ada invoice yang lewat jatuh tempo)");
      } else {
        for (const i of overdueInvoices) {
          const days = daysBetween(i.dueDate, now);
          lines.push(
            `- ${i.invoiceNumber} · ${formatIDR(i.totalAmount)} · ${i.client.name}${
              i.client.company ? ` (${i.client.company})` : ""
            } · ${days}d lewat`,
          );
        }
      }
    }

    return {
      uri: "monomi://today",
      mimeType: "text/markdown",
      text: lines.join("\n"),
    };
  }
}

function roleCapabilities(role: string): string[] {
  switch (role) {
    // ADMIN == SUPER_ADMIN — both get the full capability set.
    case "SUPER_ADMIN":
    case "ADMIN":
      return ["sales", "procurement", "accounting", "production", "media", "users", "settings"];
    case "VIDEOGRAPHER":
      return ["production", "media"];
    default:
      return [];
  }
}
