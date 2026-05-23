import { z } from "zod";
import type { AnyToolDef } from "../tool.types";
import type { ToolDeps } from "../tool-registry";
import { ADMIN_ROLES } from "../../mcp.types";
import { formatIDR, daysBetween } from "../format.util";

interface BucketAgg {
  current: { count: number; amount: number };
  d1_30: { count: number; amount: number };
  d31_60: { count: number; amount: number };
  d61_90: { count: number; amount: number };
  d90plus: { count: number; amount: number };
}

function emptyBucket(): BucketAgg {
  const zero = { count: 0, amount: 0 };
  return {
    current: { ...zero },
    d1_30: { ...zero },
    d31_60: { ...zero },
    d61_90: { ...zero },
    d90plus: { ...zero },
  };
}

function bucketFor(daysOverdue: number): keyof BucketAgg {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "d1_30";
  if (daysOverdue <= 60) return "d31_60";
  if (daysOverdue <= 90) return "d61_90";
  return "d90plus";
}

export function createArAgingSummaryTool(deps: ToolDeps): AnyToolDef {
  return {
    name: "ar_aging_summary",
    description:
      "Accounts Receivable aging: invoices with outstanding balance bucketed by days past due (Current / 1-30 / 31-60 / 61-90 / 90+). Returns totals and per-client breakdown. Optionally filter to a single client.",
    allowedRoles: ADMIN_ROLES,
    inputSchema: {
      clientId: z.string().optional(),
      asOf: z
        .string()
        .optional()
        .describe("ISO date defaulting to today (Asia/Jakarta)"),
    },
    handler: async (args) => {
      const asOf = args.asOf ? new Date(args.asOf as string) : new Date();
      const clientId = args.clientId as string | undefined;

      const invoices = await deps.prisma.invoice.findMany({
        where: {
          status: { in: ["SENT", "OVERDUE"] },
          ...(clientId ? { clientId } : {}),
        },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          dueDate: true,
          clientId: true,
          client: { select: { id: true, name: true, company: true } },
          payments: {
            where: { status: "CONFIRMED" },
            select: { amount: true },
          },
        },
      });

      const totals = emptyBucket();
      const perClient = new Map<
        string,
        { name: string; company: string | null; buckets: BucketAgg; total: number }
      >();

      for (const inv of invoices) {
        const paid = inv.payments.reduce((s, p) => s + Number(p.amount.toString()), 0);
        const outstanding = Number(inv.totalAmount.toString()) - paid;
        if (outstanding <= 0.01) continue; // fully paid

        const overdueDays = daysBetween(inv.dueDate, asOf);
        const bucket = bucketFor(overdueDays);
        totals[bucket].count += 1;
        totals[bucket].amount += outstanding;

        let entry = perClient.get(inv.clientId);
        if (!entry) {
          entry = {
            name: inv.client.name,
            company: inv.client.company,
            buckets: emptyBucket(),
            total: 0,
          };
          perClient.set(inv.clientId, entry);
        }
        entry.buckets[bucket].count += 1;
        entry.buckets[bucket].amount += outstanding;
        entry.total += outstanding;
      }

      const grandTotal =
        totals.current.amount +
        totals.d1_30.amount +
        totals.d31_60.amount +
        totals.d61_90.amount +
        totals.d90plus.amount;

      const lines: string[] = [];
      lines.push(`AR aging as of ${asOf.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}`);
      lines.push("");
      lines.push(`  Current      ${String(totals.current.count).padStart(3)}  ${formatIDR(totals.current.amount)}`);
      lines.push(`  1-30 days    ${String(totals.d1_30.count).padStart(3)}  ${formatIDR(totals.d1_30.amount)}`);
      lines.push(`  31-60 days   ${String(totals.d31_60.count).padStart(3)}  ${formatIDR(totals.d31_60.amount)}`);
      lines.push(`  61-90 days   ${String(totals.d61_90.count).padStart(3)}  ${formatIDR(totals.d61_90.amount)}`);
      lines.push(`  90+ days     ${String(totals.d90plus.count).padStart(3)}  ${formatIDR(totals.d90plus.amount)}`);
      lines.push(`  TOTAL        ${String(invoices.length).padStart(3)}  ${formatIDR(grandTotal)}`);

      const topClients = [...perClient.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);

      if (topClients.length > 0) {
        lines.push("");
        lines.push(`Top ${topClients.length} client${topClients.length === 1 ? "" : "s"} by outstanding:`);
        for (const [, c] of topClients) {
          lines.push(
            `  - ${c.name}${c.company ? ` (${c.company})` : ""}: ${formatIDR(c.total)}`,
          );
        }
      }

      return {
        text: lines.join("\n"),
        structured: {
          asOf: asOf.toISOString(),
          totals: {
            current: totals.current,
            "1-30": totals.d1_30,
            "31-60": totals.d31_60,
            "61-90": totals.d61_90,
            "90+": totals.d90plus,
            grandTotalAmount: grandTotal,
            invoiceCount: invoices.length,
          },
          clients: [...perClient.entries()].map(([id, c]) => ({
            id,
            name: c.name,
            company: c.company,
            total: c.total,
            buckets: c.buckets,
          })),
        },
      };
    },
  };
}
