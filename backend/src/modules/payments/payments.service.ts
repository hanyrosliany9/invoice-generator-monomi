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

  async findAll(invoiceId?: string): Promise<PaymentResponseDto[]> {
    const payments = await this.prisma.payment.findMany({
      where: invoiceId ? { invoiceId } : {},
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
    });

    return payments.map((payment) => this.transformToResponse(payment));
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
  ): Promise<PaymentResponseDto> {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!existingPayment) {
      throw new NotFoundException("Payment not found");
    }

    // If confirming payment, set confirmedAt timestamp
    const updateData = { ...updatePaymentDto };
    if (
      updatePaymentDto.status === PaymentStatus.CONFIRMED &&
      !updatePaymentDto.confirmedAt
    ) {
      updateData.confirmedAt = new Date().toISOString();
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
            client: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Update invoice status if payment is confirmed
    if (payment.status === PaymentStatus.CONFIRMED) {
      await this.updateInvoiceStatus(payment.invoiceId);

      // ✅ FIX: Create journal entry for payment (Cash debit, AR credit)
      try {
        const invoice = await this.prisma.invoice.findUnique({
          where: { id: payment.invoiceId },
          select: {
            invoiceNumber: true,
            clientId: true,
            client: { select: { name: true } },
          },
        });

        if (invoice) {
          const journalEntry = await this.journalService.createJournalEntry({
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            descriptionId: `Pembayaran Faktur ${invoice.invoiceNumber}`,
            entryDate: new Date(payment.paymentDate),
            transactionId: payment.id,
            transactionType: "PAYMENT_RECEIVED",
            createdBy: "system", // TODO: Get actual user ID from context
            autoPost: true, // Auto-post to General Ledger
            lineItems: [
              {
                accountCode: "1-1020", // Bank Account (adjust based on payment method)
                description: `Payment from ${invoice.client.name}`,
                descriptionId: `Pembayaran dari ${invoice.client.name}`,
                debit: Number(payment.amount),
                credit: 0,
                clientId: invoice.clientId,
              },
              {
                accountCode: "1-2010", // Accounts Receivable
                description: `Payment for Invoice ${invoice.invoiceNumber}`,
                descriptionId: `Pembayaran Faktur ${invoice.invoiceNumber}`,
                debit: 0,
                credit: Number(payment.amount),
                clientId: invoice.clientId,
              },
            ],
          });

          // Link journal entry to payment
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { journalEntryId: journalEntry.id },
          });

          this.logger.log(
            `✅ Created and posted journal entry for payment ${payment.id}`,
          );
        }
      } catch (error) {
        this.logger.error("Failed to create payment journal entry:", error);
        // Don't fail payment confirmation if journal entry fails
      }

      // Detect and handle advance payment (PSAK 72)
      try {
        await this.invoicesService.processAdvancePaymentForInvoice(
          payment.invoiceId,
          payment.paymentDate,
          Number(payment.amount),
          "system", // TODO: Get actual user ID from context
        );
      } catch (error) {
        this.logger.error(
          "Failed to process advance payment detection:",
          error,
        );
        // Don't fail payment confirmation if advance payment detection fails
      }
    }

    return this.transformToResponse(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    await this.prisma.payment.delete({
      where: { id },
    });

    // Update invoice status after payment removal
    await this.updateInvoiceStatus(payment.invoiceId);
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentResponseDto[]> {
    return this.findAll(invoiceId);
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

    const confirmedPayments = invoice.payments.filter(
      (p) => p.status === PaymentStatus.CONFIRMED,
    );
    const totalPaid = confirmedPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const totalAmount = Number(invoice.totalAmount);

    let newStatus = invoice.status;
    if (totalPaid >= totalAmount) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "SENT"; // Partial payment
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
