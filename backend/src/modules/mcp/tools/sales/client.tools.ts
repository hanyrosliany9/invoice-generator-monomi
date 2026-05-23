import { z } from "zod";
import type { AnyToolDef } from "../tool.types";
import type { ToolDeps } from "../tool-registry";
import { ADMIN_ROLES } from "../../mcp.types";
import { formatIDR, formatJakartaDate, daysBetween, trunc } from "../format.util";

export function createClientTimelineTool(deps: ToolDeps): AnyToolDef {
  return {
    name: "client_timeline",
    description:
      "Returns a chronological business-journey timeline for a client: inquiries, proposals, quotations, contracts, payments, deliveries — useful for understanding context before composing outreach.",
    allowedRoles: ADMIN_ROLES,
    inputSchema: {
      clientId: z.string(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    handler: async (args) => {
      const clientId = args.clientId as string;
      const limit = Math.min(Math.max((args.limit as number | undefined) ?? 30, 1), 50);

      const client = await deps.prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          company: true,
          email: true,
          phone: true,
          paymentTerms: true,
          notes: true,
        },
      });
      if (!client) return { text: "Client not found.", structured: { found: false } };

      const events = await deps.prisma.businessJourneyEvent.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          status: true,
          amount: true,
          createdAt: true,
        },
      });

      const lines: string[] = [];
      lines.push(`Client: ${client.name}${client.company ? ` (${client.company})` : ""}`);
      if (client.email) lines.push(`Email: ${client.email}`);
      if (client.phone) lines.push(`Phone: ${client.phone}`);
      if (client.paymentTerms) lines.push(`Default terms: ${client.paymentTerms}`);
      if (client.notes) lines.push(`Notes: ${trunc(client.notes, 200)}`);
      lines.push("");
      if (events.length === 0) {
        lines.push("(no journey events recorded yet)");
      } else {
        lines.push(`Last ${events.length} event${events.length === 1 ? "" : "s"}:`);
        for (const e of events) {
          const amt = e.amount ? ` · ${formatIDR(e.amount)}` : "";
          lines.push(
            `  - ${formatJakartaDate(e.createdAt)} · ${e.type} · ${e.status} · ${trunc(e.title, 60)}${amt}`,
          );
        }
      }

      return {
        text: lines.join("\n"),
        structured: {
          client,
          events: events.map((e) => ({
            id: e.id,
            type: e.type,
            title: e.title,
            description: e.description,
            status: e.status,
            amount: e.amount ? e.amount.toString() : null,
            createdAt: e.createdAt.toISOString(),
          })),
        },
      };
    },
  };
}

export function createClientPaymentPersonalityTool(deps: ToolDeps): AnyToolDef {
  return {
    name: "client_payment_personality",
    description:
      "Profile of a client's payment behavior: average days-to-pay, partial-payment frequency, and a tone suggestion for follow-ups (formal/casual/strategic-late-payer). Computed from confirmed payments against issued invoices.",
    allowedRoles: ADMIN_ROLES,
    inputSchema: {
      clientId: z.string(),
    },
    handler: async (args) => {
      const clientId = args.clientId as string;

      const client = await deps.prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, company: true, paymentTerms: true },
      });
      if (!client) return { text: "Client not found.", structured: { found: false } };

      const invoices = await deps.prisma.invoice.findMany({
        where: { clientId, status: { in: ["PAID", "SENT", "OVERDUE"] } },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          creationDate: true,
          dueDate: true,
          payments: {
            where: { status: "CONFIRMED" },
            select: { amount: true, paymentDate: true },
            orderBy: { paymentDate: "asc" },
          },
        },
      });

      let daysToPaySamples: number[] = [];
      let partialPayInvoices = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let totalBilled = 0;
      let totalPaid = 0;

      for (const inv of invoices) {
        const total = Number(inv.totalAmount.toString());
        totalBilled += total;
        const paid = inv.payments.reduce((s, p) => s + Number(p.amount.toString()), 0);
        totalPaid += paid;

        if (inv.payments.length > 1) partialPayInvoices += 1;

        if (paid >= total - 0.01 && inv.payments.length > 0) {
          const lastPay = inv.payments[inv.payments.length - 1]!.paymentDate;
          const dtp = daysBetween(inv.creationDate, lastPay);
          daysToPaySamples.push(dtp);
          if (lastPay.getTime() <= inv.dueDate.getTime()) onTimeCount += 1;
          else lateCount += 1;
        }
      }

      const avg =
        daysToPaySamples.length > 0
          ? daysToPaySamples.reduce((s, d) => s + d, 0) / daysToPaySamples.length
          : null;
      const median = (() => {
        if (daysToPaySamples.length === 0) return null;
        const sorted = [...daysToPaySamples].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      })();

      // Tone heuristic
      let persona = "unknown";
      if (daysToPaySamples.length >= 3 && avg !== null) {
        if (onTimeCount / (onTimeCount + lateCount) >= 0.8 && avg <= 14) persona = "prompt";
        else if (onTimeCount / (onTimeCount + lateCount) >= 0.5 && avg <= 45) persona = "reliable";
        else if (partialPayInvoices / invoices.length >= 0.4) persona = "splits-payments";
        else if (avg > 60) persona = "strategic-late";
        else persona = "mixed";
      }

      const lines: string[] = [];
      lines.push(`Payment personality — ${client.name}${client.company ? ` (${client.company})` : ""}`);
      lines.push(`Default terms: ${client.paymentTerms ?? "(none set)"}`);
      lines.push(`Invoices analyzed: ${invoices.length}`);
      lines.push(`Fully paid: ${daysToPaySamples.length}  ·  on-time: ${onTimeCount}  ·  late: ${lateCount}`);
      lines.push(
        `Days-to-pay: avg ${avg !== null ? avg.toFixed(1) : "n/a"}  ·  median ${median ?? "n/a"}`,
      );
      lines.push(`Partial-pay invoices: ${partialPayInvoices}`);
      lines.push(`Total billed: ${formatIDR(totalBilled)}  ·  total paid: ${formatIDR(totalPaid)}`);
      lines.push("");
      lines.push(`Tone suggestion: ${persona}`);

      return {
        text: lines.join("\n"),
        structured: {
          clientId: client.id,
          invoicesAnalyzed: invoices.length,
          fullyPaid: daysToPaySamples.length,
          onTime: onTimeCount,
          late: lateCount,
          avgDaysToPay: avg,
          medianDaysToPay: median,
          partialPayInvoices,
          totalBilled,
          totalPaid,
          persona,
        },
      };
    },
  };
}
