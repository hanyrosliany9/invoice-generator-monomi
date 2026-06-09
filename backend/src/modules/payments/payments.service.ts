// fixes: FIX1 FIX2 FIX3 FIX4-payment applied
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { JournalService } from "../accounting/services/journal.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } from "./dto";
import { PaymentStatus } from "@prisma/client";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => InvoicesService))
    private invoicesService: InvoicesService,
    private journalService: JournalService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    // Verify invoice exists
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: createPaymentDto.invoiceId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    // Check if payment amount doesn't exceed invoice total
    const existingPayments = invoice.payments.reduce((sum, payment) => {
      return (
        sum +
        (payment.status === PaymentStatus.CONFIRMED
          ? Number(payment.amount)
          : 0)
      );
    }, 0);

    const totalAmount = Number(invoice.totalAmount);
    const newPaymentAmount = createPaymentDto.amount;

    if (existingPayments + newPaymentAmount > totalAmount) {
      throw new BadRequestException("Payment amount exceeds invoice total");
    }

    const payment = await this.prisma.payment.create({
      data: {
        ...createPaymentDto,
        status: PaymentStatus.PENDING,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            client: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return this.transformToResponse(payment);
  }

  async findAll(
    invoiceId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: PaymentResponseDto[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    // FIX 5: paginate payments — cap limit at 200 to prevent full-table dumps
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const skip = (safePage - 1) * safeLimit;
    const where = invoiceId ? { invoiceId } : {};

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              client: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((payment) => this.transformToResponse(payment)),
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            client: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return this.transformToResponse(payment);
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
    userId?: string,
  ): Promise<PaymentResponseDto> {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!existingPayment) {
      throw new NotFoundException("Payment not found");
    }

    const isConfirming =
      updatePaymentDto.status === PaymentStatus.CONFIRMED &&
      existingPayment.status !== PaymentStatus.CONFIRMED;

    // FIX 1 (CRITICAL): Post the GL journal BEFORE writing CONFIRMED so that a
    // journal failure leaves the payment in its pre-confirmation state.
    // Idempotency guard: skip journal creation if this payment or its invoice
    // already has a journal entry (prevents double-posting on retry).
    if (isConfirming) {
      const freshPayment = await this.prisma.payment.findUnique({
        where: { id },
        select: { journalEntryId: true },
      });
      const invoiceForJournal = await this.prisma.invoice.findUnique({
        where: { id: existingPayment.invoiceId },
        select: {
          id: true,
          invoiceNumber: true,
          clientId: true,
          projectId: true,
          totalAmount: true,
          priceBreakdown: true,
          paymentJournalId: true,
          client: { select: { name: true } },
        },
      });

      let journalEntryId: string | undefined;

      if (
        invoiceForJournal &&
        !freshPayment?.journalEntryId &&
        !invoiceForJournal.paymentJournalId
      ) {
        // FIX 4: use the real userId when available; fall back to "system".
        const journalCreatedBy = userId ?? "system";
        const invoice = invoiceForJournal;

        // Split the payment: services settle Trade AR (1-2010); the reimbursable
        // portion clears Piutang Lain-lain (1-2040) — it was never revenue/AR.
        // Allocate services FIRST across prior payments so AR never goes negative.
        const amt = Number(existingPayment.amount);
        const products = (invoice.priceBreakdown as any)?.products;
        const reimbursePortion = Array.isArray(products)
          ? products
              .filter((p: any) => typeof p?.name === "string" && p.name.startsWith("[Reimburse]"))
              .reduce((s: number, p: any) => s + (Number(p?.subtotal) || Number(p?.price) * (Number(p?.quantity) || 1) || 0), 0)
          : 0;
        const servicesPortion = Number(invoice.totalAmount) - reimbursePortion;
        const priorPaid = (
          await this.prisma.payment.findMany({
            where: { invoiceId: invoice.id, status: PaymentStatus.CONFIRMED, NOT: { id } },
            select: { amount: true },
          })
        ).reduce((s, p) => s + Number(p.amount), 0);
        const reimbPaid = Math.max(
          0,
          Math.max(0, priorPaid + amt - servicesPortion) -
            Math.max(0, priorPaid - servicesPortion),
        );
        const servicesPaid = amt - reimbPaid;

        const lineItems: any[] = [
          {
            accountCode: "1-1020",
            description: `Payment from ${invoice.client.name}`,
            descriptionId: `Pembayaran dari ${invoice.client.name}`,
            debit: amt,
            credit: 0,
            clientId: invoice.clientId,
          },
        ];
        if (servicesPaid > 0) {
          lineItems.push({
            accountCode: "1-2010", // CR Accounts Receivable (services)
            description: `Settle AR - Invoice ${invoice.invoiceNumber}`,
            descriptionId: `Pelunasan Piutang Usaha - ${invoice.invoiceNumber}`,
            debit: 0,
            credit: servicesPaid,
            clientId: invoice.clientId,
          });
        }
        if (reimbPaid > 0) {
          lineItems.push({
            accountCode: "1-2040", // CR Piutang Lain-lain (reimburse)
            description: `Settle reimbursable - Invoice ${invoice.invoiceNumber}`,
            descriptionId: `Pelunasan Piutang Lain-lain - ${invoice.invoiceNumber}`,
            debit: 0,
            credit: reimbPaid,
            clientId: invoice.clientId,
          });
        }

        // Post journal FIRST — if this throws, the catch in the caller will see
        // the error and the payment status is never updated to CONFIRMED.
        const journalEntry = await this.journalService.createJournalEntry({
          description: `Payment for Invoice ${invoice.invoiceNumber}`,
          descriptionId: `Pembayaran Faktur ${invoice.invoiceNumber}`,
          entryDate: new Date(existingPayment.paymentDate),
          transactionId: id,
          transactionType: "PAYMENT_RECEIVED",
          createdBy: journalCreatedBy,
          autoPost: true,
          lineItems,
        });

        // Settle the project's reimbursables this payment cleared.
        if (reimbPaid > 0 && invoice.projectId) {
          const outstanding = await this.prisma.expense.findMany({
            where: { projectId: invoice.projectId, isBillable: true, reimbursedAt: null },
            orderBy: { expenseDate: "asc" },
            select: { id: true, totalAmount: true, billableAmount: true },
          });
          let remaining = reimbPaid + 0.01;
          const toMark: string[] = [];
          for (const e of outstanding) {
            const v = Number(e.billableAmount ?? e.totalAmount);
            if (v <= remaining) { toMark.push(e.id); remaining -= v; }
          }
          if (toMark.length > 0) {
            await this.prisma.expense.updateMany({
              where: { id: { in: toMark } },
              data: { reimbursedAt: new Date(), reimbursementJournalId: journalEntry.id },
            });
          }
        }

        journalEntryId = journalEntry.id;
        this.logger.log(`✅ Created and posted journal entry for payment ${id}`);
      } else {
        this.logger.log(
          `⏭ Skipped journal creation for payment ${id} — already covered by existing journal (idempotent guard)`,
        );
      }

      // Journal posted (or idempotently skipped) — now write CONFIRMED.
      const updateData: any = {
        ...updatePaymentDto,
        confirmedAt: updatePaymentDto.confirmedAt ?? new Date().toISOString(),
      };
      if (journalEntryId) updateData.journalEntryId = journalEntryId;

      const payment = await this.prisma.payment.update({
        where: { id },
        data: updateData,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              client: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      await this.updateInvoiceStatus(payment.invoiceId);

      // Detect and handle advance payment (PSAK 72) — non-fatal
      try {
        await this.invoicesService.processAdvancePaymentForInvoice(
          payment.invoiceId,
          payment.paymentDate,
          Number(payment.amount),
          userId ?? "system",
        );
      } catch (error) {
        this.logger.error("Failed to process advance payment detection:", error);
      }

      // Send payment-received notification — non-fatal
      try {
        await this.notificationsService.sendPaymentReceived(
          payment.invoiceId,
          payment.id,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send payment-received notification for payment ${payment.id}:`,
          error,
        );
      }

      return this.transformToResponse(payment);
    }

    // Non-confirmation update (status change other than → CONFIRMED, or field edits)
    const updateData = { ...updatePaymentDto };
    if (
      updatePaymentDto.status === PaymentStatus.CONFIRMED &&
      !updatePaymentDto.confirmedAt
    ) {
      (updateData as any).confirmedAt = new Date().toISOString();
    }

    const payment = await this.prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            client: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return this.transformToResponse(payment);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // FIX 1: Reverse posted journal entry before deleting to keep GL balanced.
    // Only reverse when journalEntryId is set (many payments track the journal on
    // invoice.paymentJournalId instead — those are handled by invoicesService).
    if (payment.journalEntryId) {
      try {
        const journalEntry = await this.prisma.journalEntry.findUnique({
          where: { id: payment.journalEntryId },
          select: { id: true, isPosted: true, entryNumber: true },
        });

        if (journalEntry && journalEntry.isPosted) {
          // Check not already reversed
          const existingReversal = await this.prisma.journalEntry.findFirst({
            where: { reversedEntryId: payment.journalEntryId },
            select: { id: true },
          });

          if (!existingReversal) {
            const reversalUserId = userId || 'system';
            await this.journalService.reverseJournalEntry(
              payment.journalEntryId,
              reversalUserId,
            );
            this.logger.log(
              `✅ Reversed journal entry ${journalEntry.entryNumber} for deleted payment ${id}`,
            );
          } else {
            this.logger.warn(
              `Journal entry ${journalEntry.entryNumber} already reversed — skipping`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to reverse journal entry for payment ${id}:`,
          error,
        );
        // Do not block deletion — reversal failure is visible in logs
      }
    }

    await this.prisma.payment.delete({
      where: { id },
    });

    // Update invoice status after payment removal
    await this.updateInvoiceStatus(payment.invoiceId);
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentResponseDto[]> {
    return (await this.findAll(invoiceId)).data;
  }

  async getPaymentStats(invoiceId?: string) {
    const where = invoiceId ? { invoiceId } : {};

    const stats = await this.prisma.payment.groupBy({
      by: ["status"],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status] = {
          count: stat._count.id,
          total: stat._sum.amount?.toString() || "0",
        };
        return acc;
      },
      {} as Record<PaymentStatus, { count: number; total: string }>,
    );
  }

  private async updateInvoiceStatus(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) return;

    // FIX 2b: Never mutate a CANCELLED invoice — leave it untouched.
    if (invoice.status === 'CANCELLED') return;

    const confirmedPayments = invoice.payments.filter(
      (p) => p.status === PaymentStatus.CONFIRMED,
    );
    const totalPaid = confirmedPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const totalAmount = Number(invoice.totalAmount);

    let newStatus: string = invoice.status;
    if (totalPaid >= totalAmount) {
      // FIX 2c: Normal confirm-payment → PAID path (unchanged)
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      // FIX 2c: Partial payment — keep at SENT (InvoiceStatus has no PARTIAL)
      newStatus = "SENT";
    } else {
      // FIX 2a: All payments removed — revert to sensible unpaid status.
      // Use OVERDUE if past due date, otherwise SENT (same status invoice
      // would have been in before the first payment was confirmed).
      const now = new Date();
      if (invoice.dueDate && invoice.dueDate < now) {
        newStatus = "OVERDUE";
      } else {
        newStatus = "SENT";
      }
    }

    if (newStatus !== invoice.status) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus as any },
      });
    }
  }

  private transformToResponse(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate.toISOString(),
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef,
      bankDetails: payment.bankDetails,
      status: payment.status,
      confirmedAt: payment.confirmedAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      invoice: payment.invoice
        ? {
            id: payment.invoice.id,
            invoiceNumber: payment.invoice.invoiceNumber,
            totalAmount: payment.invoice.totalAmount.toString(),
            client: payment.invoice.client,
          }
        : undefined,
    };
  }
}
