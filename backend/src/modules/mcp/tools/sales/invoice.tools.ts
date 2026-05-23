import { z } from "zod";
import type { AnyToolDef } from "../tool.types";
import type { ToolDeps } from "../tool-registry";
import { ADMIN_ROLES } from "../../mcp.types";
import { formatIDR, formatJakartaDate, daysBetween, trunc } from "../format.util";

const InvoiceStatusEnum = z.enum([
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

export function createInvoiceListTool(deps: ToolDeps): AnyToolDef {
  return {
    name: "invoice_list",
    description:
      "List invoices with optional filters. Filters: status, clientId, overdue (status=SENT and dueDate past), materaiPending (totalAmount>=5jt and materaiApplied=false). Returns up to 50; cursor-paginated.",
    allowedRoles: ADMIN_ROLES,
    inputSchema: {
      status: InvoiceStatusEnum.optional(),
      clientId: z.string().optional(),
      overdue: z
        .boolean()
        .optional()
        .describe("status=SENT and dueDate < today (regardless of OVERDUE flag)"),
      materaiPending: z
        .boolean()
        .optional()
        .describe("Indonesian stamp duty required but not yet applied"),
      limit: z.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    },
    handler: async (args) => {
      const limit = Math.min(Math.max((args.limit as number | undefined) ?? 20, 1), 50);
      const where: Record<string, unknown> = {};
      if (args.status) where.status = args.status;
      if (args.clientId) where.clientId = args.clientId;
      if (args.overdue) {
        where.status = { in: ["SENT", "OVERDUE"] };
        where.dueDate = { lt: new Date() };
      }
      if (args.materaiPending) {
        where.materaiRequired = true;
        where.materaiApplied = false;
      }

      const cursor = args.cursor as string | undefined;
      const rows = await deps.prisma.invoice.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ dueDate: "asc" }, { id: "desc" }],
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          dueDate: true,
          materaiRequired: true,
          materaiApplied: true,
          client: { select: { id: true, name: true, company: true } },
          project: { select: { id: true, number: true } },
        },
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? page[page.length - 1]!.id : null;

      const now = new Date();
      const lines = page.map((i) => {
        const overdueLabel =
          ["SENT", "OVERDUE"].includes(i.status) && i.dueDate.getTime() < now.getTime()
            ? ` ⚠ ${daysBetween(i.dueDate, now)}d overdue`
            : "";
        const materaiLabel =
          i.materaiRequired && !i.materaiApplied ? " · materai pending" : "";
        return `- ${i.invoiceNumber} · ${i.status} · ${formatIDR(i.totalAmount)} · ${i.client.name}${
          i.client.company ? ` (${i.client.company})` : ""
        } · due ${formatJakartaDate(i.dueDate)}${overdueLabel}${materaiLabel}`;
      });

      return {
        text:
          page.length === 0
            ? "No invoices match those filters."
            : `Found ${page.length} invoice${page.length === 1 ? "" : "s"}:\n${lines.join("\n")}${
                hasMore ? `\n\n(more available — pass cursor="${nextCursor}")` : ""
              }`,
        structured: {
          items: page.map((i) => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            status: i.status,
            totalAmount: i.totalAmount.toString(),
            dueDate: i.dueDate.toISOString(),
            materaiRequired: i.materaiRequired,
            materaiApplied: i.materaiApplied,
            client: i.client,
            project: i.project,
          })),
          nextCursor,
        },
      };
    },
  };
}

export function createInvoiceGetTool(deps: ToolDeps): AnyToolDef {
  return {
    name: "invoice_get",
    description:
      "Fetch one invoice by id or invoiceNumber with full detail (amounts, materai status, payments, linked quotation).",
    allowedRoles: ADMIN_ROLES,
    inputSchema: {
      id: z.string().optional(),
      invoiceNumber: z.string().optional(),
    },
    handler: async (args) => {
      const id = args.id as string | undefined;
      const num = args.invoiceNumber as string | undefined;
      if (!id && !num) throw new Error("Provide either id or invoiceNumber");

      const inv = await deps.prisma.invoice.findFirst({
        where: id ? { id } : { invoiceNumber: num },
        include: {
          client: { select: { id: true, name: true, company: true, email: true, paymentTerms: true } },
          project: { select: { id: true, number: true, description: true } },
          quotation: { select: { id: true, quotationNumber: true, status: true } },
          payments: {
            select: { id: true, amount: true, paymentDate: true, paymentMethod: true, status: true },
            orderBy: { paymentDate: "desc" },
          },
        },
      });

      if (!inv) return { text: "Invoice not found.", structured: { found: false } };

      const totalPaid = inv.payments
        .filter((p) => p.status === "CONFIRMED")
        .reduce((s, p) => s + Number(p.amount.toString()), 0);
      const total = Number(inv.totalAmount.toString());
      const outstanding = total - totalPaid;

      const lines: string[] = [];
      lines.push(`Invoice ${inv.invoiceNumber} — ${inv.status}`);
      lines.push(`Client: ${inv.client.name}${inv.client.company ? ` (${inv.client.company})` : ""}`);
      lines.push(`Project: ${inv.project.number} — ${trunc(inv.project.description, 80)}`);
      lines.push(
        `Total: ${formatIDR(inv.totalAmount)} · Paid: ${formatIDR(totalPaid)} · Outstanding: ${formatIDR(outstanding)}`,
      );
      lines.push(`Due: ${formatJakartaDate(inv.dueDate)} · created ${formatJakartaDate(inv.creationDate)}`);
      if (inv.quotation) {
        lines.push(`From quotation: ${inv.quotation.quotationNumber} (${inv.quotation.status})`);
      }
      if (inv.materaiRequired) {
        lines.push(
          `Materai: required${inv.materaiApplied ? ` ✓ applied ${formatJakartaDate(inv.materaiAppliedAt)}` : " ⚠ NOT YET APPLIED"}`,
        );
      }
      if (inv.payments.length > 0) {
        lines.push("Payments:");
        for (const p of inv.payments) {
          lines.push(
            `  - ${formatIDR(p.amount)} · ${formatJakartaDate(p.paymentDate)} · ${p.paymentMethod} · ${p.status}`,
          );
        }
      }

      return {
        text: lines.join("\n"),
        structured: {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          totalAmount: inv.totalAmount.toString(),
          paidAmount: totalPaid.toString(),
          outstandingAmount: outstanding.toString(),
          creationDate: inv.creationDate.toISOString(),
          dueDate: inv.dueDate.toISOString(),
          materaiRequired: inv.materaiRequired,
          materaiApplied: inv.materaiApplied,
          materaiAppliedAt: inv.materaiAppliedAt?.toISOString() ?? null,
          client: inv.client,
          project: inv.project,
          quotation: inv.quotation,
          payments: inv.payments.map((p) => ({
            id: p.id,
            amount: p.amount.toString(),
            paymentDate: p.paymentDate.toISOString(),
            paymentMethod: p.paymentMethod,
            status: p.status,
          })),
        },
      };
    },
  };
}
