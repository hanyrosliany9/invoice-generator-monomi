import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } from "./dto";
import { PaymentStatus } from "@prisma/client";

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

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
