import { z } from "zod";
import type { AnyToolDef } from "../tool.types";
import type { ToolDeps } from "../tool-registry";
import { ADMIN_ROLES, MCP_SCOPE_READ } from "../../mcp.types";
import { formatIDR, formatJakartaDate } from "../format.util";

export function createPaymentListTool(deps: ToolDeps): AnyToolDef {
  return {
    name: "payment_list",
    description:
      "List payments, optionally filtered by invoiceId, clientId, status, or a date range. Use this to verify payment history before recording a new one.",
    allowedRoles: ADMIN_ROLES,
    requiredScope: MCP_SCOPE_READ,
    inputSchema: {
      invoiceId: z.string().optional(),
      clientId: z.string().optional(),
      status: z.enum(["PENDING", "CONFIRMED", "FAILED", "REFUNDED"]).optional(),
      since: z.string().optional().describe("ISO date — payments on or after this date"),
      until: z.string().optional().describe("ISO date — payments on or before this date"),
      limit: z.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    },
    handler: async (args) => {
      const limit = Math.min(Math.max((args.limit as number | undefined) ?? 20, 1), 50);
      const where: Record<string, unknown> = {};
      if (args.invoiceId) where.invoiceId = args.invoiceId;
      if (args.clientId) where.invoice = { clientId: args.clientId };
      if (args.status) where.status = args.status;
      if (args.since || args.until) {
        const range: Record<string, Date> = {};
        if (args.since) range.gte = new Date(args.since as string);
        if (args.until) range.lte = new Date(args.until as string);
        where.paymentDate = range;
      }

      const cursor = args.cursor as string | undefined;
      const rows = await deps.prisma.payment.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
          status: true,
          transactionRef: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? page[page.length - 1]!.id : null;

      const lines = page.map(
        (p) =>
          `- ${formatJakartaDate(p.paymentDate)} · ${formatIDR(p.amount)} · ${p.paymentMethod} · ${p.status} · inv ${p.invoice.invoiceNumber} (${p.invoice.client.name})${p.transactionRef ? ` · ref ${p.transactionRef}` : ""}`,
      );

      return {
        text:
          page.length === 0
            ? "No payments match those filters."
            : `Found ${page.length} payment${page.length === 1 ? "" : "s"}:\n${lines.join("\n")}${
                hasMore ? `\n\n(more available — pass cursor="${nextCursor}")` : ""
              }`,
        structured: {
          items: page.map((p) => ({
            id: p.id,
            amount: p.amount.toString(),
            paymentDate: p.paymentDate.toISOString(),
            paymentMethod: p.paymentMethod,
            status: p.status,
            transactionRef: p.transactionRef,
            invoice: {
              id: p.invoice.id,
              invoiceNumber: p.invoice.invoiceNumber,
              totalAmount: p.invoice.totalAmount.toString(),
              client: p.invoice.client,
            },
          })),
          nextCursor,
        },
      };
    },
  };
}
