import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMilestone, Quotation } from '@prisma/client';
import { CreatePaymentMilestoneDto } from '../dto/create-payment-milestone.dto';
import { UpdatePaymentMilestoneDto } from '../dto/update-payment-milestone.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PaymentMilestonesService
 *
 * Manages payment milestones for quotations, supporting Indonesian "termin pembayaran"
 * (structured payment terms). Handles:
 * - Creating and validating milestones
 * - Calculating milestone amounts based on percentages
 * - Validating that milestone percentages sum to 100%
 * - Generating invoices for milestones
 * - Tracking milestone status and invoice linkage
 */
@Injectable()
export class PaymentMilestonesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Add a payment milestone to a quotation
   * Validates that it won't exceed 100% total
   */
  async addPaymentMilestone(
    quotationId: string,
    dto: CreatePaymentMilestoneDto,
  ): Promise<PaymentMilestone> {
    // Verify quotation exists
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { paymentMilestones: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation tidak ditemukan');
    }

    // Validate milestone number uniqueness
    const existingMilestone = quotation.paymentMilestones.find(
      (m) => m.milestoneNumber === dto.milestoneNumber,
    );
    if (existingMilestone) {
      throw new BadRequestException(
        `Milestone dengan nomor ${dto.milestoneNumber} sudah ada untuk quotation ini`,
      );
    }

    // Calculate milestone amount
    const paymentAmount = quotation.totalAmount
      .mul(dto.paymentPercentage)
      .div(100);

    // Check total would not exceed 100%
    const currentTotal = quotation.paymentMilestones.reduce(
      (sum, m) => sum + Number(m.paymentPercentage),
      0,
    );
    if (currentTotal + dto.paymentPercentage > 100) {
      throw new BadRequestException(
        `Total payment percentage akan melebihi 100% (current: ${currentTotal}%, adding: ${dto.paymentPercentage}%)`,
      );
    }

    // Create milestone
    return this.prisma.paymentMilestone.create({
      data: {
        quotationId,
        milestoneNumber: dto.milestoneNumber,
        name: dto.name,
        nameId: dto.nameId,
        description: dto.description,
        descriptionId: dto.descriptionId,
        paymentPercentage: new Decimal(dto.paymentPercentage),
        paymentAmount: paymentAmount,
        dueDate: dto.dueDate,
        dueDaysFromPrev: dto.dueDaysFromPrev,
        deliverables: dto.deliverables,
        projectMilestoneId: dto.projectMilestoneId,
      },
    });
  }

  /**
   * Update a payment milestone
   */
  async updatePaymentMilestone(
    id: string,
    dto: UpdatePaymentMilestoneDto,
  ): Promise<PaymentMilestone> {
    const milestone = await this.prisma.paymentMilestone.findUnique({
      where: { id },
      include: { quotation: true },
    });

    if (!milestone) {
      throw new NotFoundException('Payment milestone tidak ditemukan');
    }

    // If percentage is being updated, validate new total
    if (dto.paymentPercentage !== undefined) {
      const otherMilestones = await this.prisma.paymentMilestone.findMany({
        where: {
          quotationId: milestone.quotationId,
          id: { not: id },
        },
      });

      const otherTotal = otherMilestones.reduce(
        (sum, m) => sum + Number(m.paymentPercentage),
        0,
      );
      if (otherTotal + dto.paymentPercentage > 100) {
        throw new BadRequestException(
          `Total payment percentage akan melebihi 100% (others: ${otherTotal}%, new: ${dto.paymentPercentage}%)`,
        );
      }
    }

    // Recalculate amount if percentage changed
    const paymentAmount =
      dto.paymentPercentage !== undefined
        ? milestone.quotation.totalAmount
            .mul(dto.paymentPercentage)
            .div(100)
        : milestone.paymentAmount;

    return this.prisma.paymentMilestone.update({
      where: { id },
      data: {
        ...dto,
        paymentPercentage: dto.paymentPercentage
          ? new Decimal(dto.paymentPercentage)
          : undefined,
        paymentAmount: paymentAmount,
      },
    });
  }

  /**
   * Remove a payment milestone
   * Cannot delete if invoice already generated
   */
  async removePaymentMilestone(id: string): Promise<void> {
    const milestone = await this.prisma.paymentMilestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      throw new NotFoundException('Payment milestone tidak ditemukan');
    }

    if (milestone.invoiceId) {
      throw new BadRequestException(
        'Tidak dapat menghapus milestone yang sudah memiliki invoice',
      );
    }

    await this.prisma.paymentMilestone.delete({
      where: { id },
    });
  }

  /**
   * Validate that all milestones for a quotation sum to 100%
   */
  async validateQuotationMilestones(quotationId: string): Promise<boolean> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { paymentMilestones: true },
    });

    if (!quotation || quotation.paymentMilestones.length === 0) {
      return false;
    }

    const total = quotation.paymentMilestones.reduce(
      (sum, m) => sum + Number(m.paymentPercentage),
      0,
    );

    return total === 100;
  }

  /**
   * Recalculate milestone amounts when quotation total changes
   */
  async recalculateMilestoneAmounts(quotationId: string): Promise<void> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { paymentMilestones: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation tidak ditemukan');
    }

    for (const milestone of quotation.paymentMilestones) {
      const newAmount = quotation.totalAmount
        .mul(milestone.paymentPercentage)
        .div(100);

      await this.prisma.paymentMilestone.update({
        where: { id: milestone.id },
        data: { paymentAmount: newAmount },
      });
    }
  }

  /**
   * Get all milestones for a quotation
   */
  async getQuotationMilestones(quotationId: string): Promise<PaymentMilestone[]> {
    return this.prisma.paymentMilestone.findMany({
      where: { quotationId },
      orderBy: { milestoneNumber: 'asc' },
    });
  }

  /**
   * Link payment milestone to project milestone
   */
  async linkToProjectMilestone(
    paymentMilestoneId: string,
    projectMilestoneId: string,
  ): Promise<void> {
    await this.prisma.paymentMilestone.update({
      where: { id: paymentMilestoneId },
      data: { projectMilestoneId },
    });
  }

  /**
   * Generate invoice for a specific milestone
   * Called when milestone is ready to be invoiced
   */
  async generateMilestoneInvoice(
    paymentMilestoneId: string,
    userId: string,
  ): Promise<any> {
    const milestone = await this.prisma.paymentMilestone.findUnique({
      where: { id: paymentMilestoneId },
      include: {
        quotation: {
          include: { client: true, project: true },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException('Payment milestone tidak ditemukan');
    }

    if (milestone.invoiceId) {
      throw new BadRequestException('Milestone sudah memiliki invoice');
    }

    const quotation = milestone.quotation;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate due date if not set
    let dueDate = milestone.dueDate;
    if (!dueDate && milestone.dueDaysFromPrev) {
      const prevMilestone = await this.prisma.paymentMilestone.findFirst({
        where: {
          quotationId: quotation.id,
          milestoneNumber: milestone.milestoneNumber - 1,
        },
      });

      if (prevMilestone && prevMilestone.dueDate) {
        dueDate = new Date(prevMilestone.dueDate);
        dueDate.setDate(dueDate.getDate() + milestone.dueDaysFromPrev);
      } else {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + milestone.dueDaysFromPrev);
      }
    }

    if (!dueDate) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Default: 30 days
    }

    // Check if invoice > 5 million IDR (requires materai)
    const materaiRequired = Number(milestone.paymentAmount) > 5000000;

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        creationDate: new Date(),
        dueDate,
        clientId: quotation.clientId,
        projectId: quotation.projectId,
        quotationId: quotation.id,
        paymentMilestoneId: paymentMilestoneId,
        amountPerProject: quotation.amountPerProject,
        totalAmount: milestone.paymentAmount,
        scopeOfWork: quotation.scopeOfWork,
        priceBreakdown: quotation.priceBreakdown,
        paymentInfo: 'Bank Transfer', // Default, can be customized
        materaiRequired,
        status: 'DRAFT',
        createdBy: userId,
      },
      include: {
        client: true,
        project: true,
      },
    });

    // Mark milestone as invoiced
    await this.prisma.paymentMilestone.update({
      where: { id: paymentMilestoneId },
      data: { invoiceId: invoice.id },
    });

    return invoice;
  }

  /**
   * Get milestone progress for a quotation
   */
  async getProgress(quotationId: string): Promise<any> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { paymentMilestones: { include: { invoice: true } } },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation tidak ditemukan');
    }

    const milestones = quotation.paymentMilestones;
    const totalInvoiced = milestones
      .filter((m) => m.invoiceId)
      .reduce((sum, m) => sum + Number(m.paymentAmount), 0);

    const invoicedPercentage = milestones.length
      ? (milestones.filter((m) => m.invoiceId).length / milestones.length) * 100
      : 0;

    return {
      quotationId,
      totalMilestones: milestones.length,
      milestonesInvoiced: milestones.filter((m) => m.invoiceId).length,
      invoicedPercentage: Math.round(invoicedPercentage),
      totalAmount: Number(quotation.totalAmount),
      totalInvoiced,
      outstandingAmount: Number(quotation.totalAmount) - totalInvoiced,
      milestones: milestones.map((m) => ({
        number: m.milestoneNumber,
        name: m.name,
        nameId: m.nameId,
        percentage: Number(m.paymentPercentage),
        amount: Number(m.paymentAmount),
        dueDate: m.dueDate,
        isInvoiced: !!m.invoiceId,
        invoiceId: m.invoiceId,
      })),
    };
  }

  /**
   * Generate unique invoice number
   * Format: INV-YYYY-MM-XXXXX
   */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const count = await this.prisma.invoice.count({
      where: {
        creationDate: {
          gte: new Date(year, now.getMonth(), 1),
          lt: new Date(year, now.getMonth() + 1, 1),
        },
      },
    });

    const sequence = String(count + 1).padStart(5, '0');
    return `INV-${year}-${month}-${sequence}`;
  }
}
