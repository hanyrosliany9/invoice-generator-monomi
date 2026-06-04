import { z } from "zod";
import type { AnyToolDef } from "../tool.types";
import type { ToolDeps } from "../tool-registry";
import { ADMIN_ROLES, MCP_SCOPE_READ } from "../../mcp.types";
import { formatIDR, formatJakartaDate, trunc } from "../format.util";

const QuotationStatusEnum = z.enum([
  "DRAFT",
  "SENT",
  "APPROVED",
  "DECLINED",
  "REVISED",
]);

export function createQuotationListTool(deps: ToolDeps): AnyToolDef {
  return {
    name: "quotation_list",
    description:
      "List quotations with optional filters. Returns up to 50 rows; use cursor to page. Filters: status, clientId, expiring (validUntil within 7 days and not yet APPROVED).",
    allowedRoles: ADMIN_ROLES,
    requiredScope: MCP_SCOPE_READ,
    inputSchema: {
      status: QuotationStatusEnum.optional().describe(
        "Filter by status (DRAFT|SENT|APPROVED|DECLINED|REVISED)",
      ),
      clientId: z.string().optional().describe("Filter by client id"),
      expiringSoon: z
        .boolean()
        .optional()
        .describe(
          "If true: validUntil within 7 days AND not APPROVED/DECLINED. Useful for follow-ups.",
        ),
      limit: z.number().int().min(1).max(50).optional(),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor returned by a previous call."),
    },
    handler: async (args) => {
      const limit = Math.min(Math.max((args.limit as number | undefined) ?? 20, 1), 50);
      const where: Record<string, unknown> = {};
      if (args.status) where.status = args.status;
      if (args.clientId) where.clientId = args.clientId;
      if (args.expiringSoon) {
        const now = new Date();
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        where.validUntil = { gte: now, lte: in7 };
        where.status = { in: ["DRAFT", "SENT", "REVISED"] };
      }

      const cursor = args.cursor as string | undefined;
      const rows = await deps.prisma.quotation.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          quotationNumber: true,
          status: true,
          totalAmount: true,
          date: true,
          validUntil: true,
          client: { select: { id: true, name: true, company: true } },
          project: { select: { id: true, number: true } },
        },
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? page[page.length - 1]!.id : null;

      const lines = page.map(
        (q) =>
          `- ${q.quotationNumber} · ${q.status} · ${formatIDR(q.totalAmount)} · ${q.client.name}${
            q.client.company ? ` (${q.client.company})` : ""
          } · proj ${q.project.number} · valid until ${formatJakartaDate(q.validUntil)}`,
      );

      return {
        text:
          page.length === 0
            ? "No quotations match those filters."
            : `Found ${page.length} quotation${page.length === 1 ? "" : "s"}:\n${lines.join("\n")}${
                hasMore ? `\n\n(more available — pass cursor="${nextCursor}")` : ""
              }`,
        structured: {
          items: page.map((q) => ({
            id: q.id,
            quotationNumber: q.quotationNumber,
            status: q.status,
            totalAmount: q.totalAmount.toString(),
            date: q.date.toISOString(),
            validUntil: q.validUntil.toISOString(),
            client: q.client,
            project: q.project,
          })),
          nextCursor,
        },
      };
    },
  };
}

export function createQuotationGetTool(deps: ToolDeps): AnyToolDef {
  return {
    name: "quotation_get",
    description:
      "Fetch one quotation by id or quotationNumber with full detail (amounts, scope, terms, payment milestones, approval audit).",
    allowedRoles: ADMIN_ROLES,
    requiredScope: MCP_SCOPE_READ,
    inputSchema: {
      id: z.string().optional(),
      quotationNumber: z.string().optional(),
    },
    handler: async (args) => {
      const id = args.id as string | undefined;
      const num = args.quotationNumber as string | undefined;
      if (!id && !num) {
        throw new Error("Provide either id or quotationNumber");
      }

      const q = await deps.prisma.quotation.findFirst({
        where: id ? { id } : { quotationNumber: num },
        include: {
          client: { select: { id: true, name: true, company: true, email: true } },
          project: { select: { id: true, number: true, description: true } },
          paymentMilestones: {
            select: {
              id: true,
              milestoneNumber: true,
              name: true,
              paymentPercentage: true,
              paymentAmount: true,
              dueDate: true,
              isInvoiced: true,
            },
            orderBy: { milestoneNumber: "asc" },
          },
          invoices: {
            select: { id: true, invoiceNumber: true, status: true, totalAmount: true },
          },
        },
      });

      if (!q) {
        return { text: "Quotation not found.", structured: { found: false } };
      }

      const lines: string[] = [];
      lines.push(`Quotation ${q.quotationNumber} — ${q.status}`);
      lines.push(`Client: ${q.client.name}${q.client.company ? ` (${q.client.company})` : ""}`);
      lines.push(`Project: ${q.project.number} — ${trunc(q.project.description, 80)}`);
      lines.push(`Total: ${formatIDR(q.totalAmount)} (${q.paymentType})`);
      lines.push(`Date: ${formatJakartaDate(q.date)} · valid until ${formatJakartaDate(q.validUntil)}`);
      if (q.scopeOfWork) lines.push(`Scope: ${trunc(q.scopeOfWork, 200)}`);
      if (q.paymentMilestones.length > 0) {
        lines.push("Payment milestones:");
        for (const m of q.paymentMilestones) {
          lines.push(
            `  - #${m.milestoneNumber} ${m.name} · ${formatIDR(m.paymentAmount)} (${m.paymentPercentage}%) · due ${formatJakartaDate(m.dueDate)}${m.isInvoiced ? " · invoiced" : ""}`,
          );
        }
      }
      if (q.invoices.length > 0) {
        lines.push(`Linked invoices: ${q.invoices.map((i) => `${i.invoiceNumber}(${i.status})`).join(", ")}`);
      }

      return {
        text: lines.join("\n"),
        structured: {
          id: q.id,
          quotationNumber: q.quotationNumber,
          status: q.status,
          totalAmount: q.totalAmount.toString(),
          amountPerProject: q.amountPerProject.toString(),
          date: q.date.toISOString(),
          validUntil: q.validUntil.toISOString(),
          scopeOfWork: q.scopeOfWork,
          terms: q.terms,
          paymentType: q.paymentType,
          approvedAt: q.approvedAt?.toISOString() ?? null,
          rejectedAt: q.rejectedAt?.toISOString() ?? null,
          client: q.client,
          project: q.project,
          paymentMilestones: q.paymentMilestones.map((m) => ({
            id: m.id,
            milestoneNumber: m.milestoneNumber,
            name: m.name,
            paymentPercentage: m.paymentPercentage.toString(),
            paymentAmount: m.paymentAmount.toString(),
            dueDate: m.dueDate?.toISOString() ?? null,
            isInvoiced: m.isInvoiced,
          })),
          invoices: q.invoices.map((i) => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            status: i.status,
            totalAmount: i.totalAmount.toString(),
          })),
        },
      };
    },
  };
}
