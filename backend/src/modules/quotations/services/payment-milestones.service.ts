import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMilestone, Quotation } from '@prisma/client';
import { CreatePaymentMilestoneDto } from '../dto/create-payment-milestone.dto';
import { UpdatePaymentMilestoneDto } from '../dto/update-payment-milestone.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoicesService } from '../../invoices/invoices.service';

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
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => InvoicesService))
    private invoicesService: InvoicesService,
  ) {}

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

    if (milestone.isInvoiced) {
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
   * @throws BadRequestException if validation fails
   */
  async validateQuotationMilestones(quotationId: string): Promise<void> {
    const milestones = await this.prisma.paymentMilestone.findMany({
      where: { quotationId },
    });

    if (milestones.length === 0) {
      throw new BadRequestException(
        'Quotation must have at least one payment milestone',
      );
    }

    const total = milestones.reduce(
      (sum, m) => sum + Number(m.paymentPercentage),
      0,
    );

    if (total !== 100) {
      throw new BadRequestException(
        `Payment milestones must total exactly 100%. Current total: ${total}%`,
      );
    }
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
    // Validate milestone exists
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

    if (milestone.isInvoiced) {
      throw new BadRequestException('Milestone sudah memiliki invoice');
    }

    const quotation = milestone.quotation;

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

    // UNIFIED PATH: Call InvoicesService.create() with paymentMilestoneId
    // This ensures consistent validation, audit logging, and milestone marking
    const invoice = await this.invoicesService.create(
      {
        paymentMilestoneId: paymentMilestoneId, // This triggers milestone logic
        quotationId: quotation.id,
        clientId: quotation.clientId,
        projectId: quotation.projectId,
        amountPerProject: Number(milestone.paymentAmount),
        totalAmount: Number(milestone.paymentAmount),
        dueDate: dueDate.toISOString(),
        paymentInfo: 'Bank Transfer', // Default, can be customized
        terms: quotation.terms || undefined,
        scopeOfWork: quotation.scopeOfWork || undefined,
        priceBreakdown: quotation.priceBreakdown as any,
      },
      userId,
    );

    return invoice;
  }

  /**
   * Get milestone progress for a quotation
   */
  async getProgress(quotationId: string): Promise<any> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { paymentMilestones: { include: { invoices: true } } },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation tidak ditemukan');
    }

    const milestones = quotation.paymentMilestones;
    const totalInvoiced = milestones
      .filter((m: any) => m.invoices && m.invoices.length > 0)
      .reduce((sum: number, m: any) => sum + Number(m.paymentAmount), 0);

    const invoicedPercentage = milestones.length
      ? (milestones.filter((m: any) => m.invoices && m.invoices.length > 0).length / milestones.length) * 100
      : 0;

    return {
      quotationId,
      totalMilestones: milestones.length,
      milestonesInvoiced: milestones.filter((m: any) => m.invoices && m.invoices.length > 0).length,
      invoicedPercentage: Math.round(invoicedPercentage),
      totalAmount: Number(quotation.totalAmount),
      totalInvoiced,
      outstandingAmount: Number(quotation.totalAmount) - totalInvoiced,
      milestones: milestones.map((m: any) => ({
        number: m.milestoneNumber,
        name: m.name,
        nameId: m.nameId,
        percentage: Number(m.paymentPercentage),
        amount: Number(m.paymentAmount),
        dueDate: m.dueDate,
        isInvoiced: m.invoices && m.invoices.length > 0,
        invoices: m.invoices?.map((inv: any) => inv.id) || [],
      })),
    };
  }

}
