import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JournalService } from "./journal.service";
import {
  DeferredRevenueStatus,
  MilestoneStatus,
  TransactionType,
  InvoiceStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * PSAK 72: Revenue from Contracts with Customers Service
 *
 * Implements Indonesian accounting standard PSAK 72 for:
 * - Deferred revenue recognition (advance payments)
 * - Performance obligation tracking
 * - Milestone-based revenue recognition (percentage-of-completion)
 * - Automated journal entries for revenue recognition
 */
@Injectable()
export class RevenueRecognitionService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * Detect if an invoice qualifies for deferred revenue treatment
   * Returns true if:
   * - Payment received before service delivery
   * - Project has not started or is in progress
   */
  async detectAdvancePayment(invoiceId: string): Promise<boolean> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        project: true,
        payments: {
          where: { status: "CONFIRMED" },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    // Check if payment received
    const hasPayment = invoice.payments.length > 0;
    if (!hasPayment) {
      return false;
    }

    // Check if project is not completed
    const isProjectIncomplete =
      invoice.project.status === "PLANNING" ||
      invoice.project.status === "IN_PROGRESS";

    return isProjectIncomplete;
  }

  /**
   * Create deferred revenue entry for advance payment
   */
  async createDeferredRevenue(data: {
    invoiceId: string;
    paymentDate: Date;
    totalAmount: number;
    recognitionDate: Date;
    performanceObligation?: string;
    fiscalPeriodId?: string;
    userId: string;
  }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        client: true,
        project: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${data.invoiceId} not found`);
    }

    // Check if deferred revenue already exists
    const existingDeferred = await this.prisma.deferredRevenue.findFirst({
      where: {
        invoiceId: data.invoiceId,
        status: { in: ["DEFERRED", "PARTIALLY_RECOGNIZED"] },
      },
    });

    if (existingDeferred) {
      throw new BadRequestException(
        "Deferred revenue entry already exists for this invoice",
      );
    }

    // Create initial journal entry: Debit Cash, Credit Deferred Revenue
    const initialJournal = await this.journalService.createJournalEntry({
      entryDate: data.paymentDate,
      description: `Advance payment received - Invoice ${invoice.invoiceNumber}`,
      descriptionId: `Pembayaran dimuka diterima - Faktur ${invoice.invoiceNumber}`,
      descriptionEn: `Advance payment received - Invoice ${invoice.invoiceNumber}`,
      transactionType: TransactionType.PAYMENT_RECEIVED,
      transactionId: data.invoiceId,
      documentNumber: invoice.invoiceNumber,
      documentDate: data.paymentDate,
      fiscalPeriodId: data.fiscalPeriodId,
      createdBy: data.userId,
      lineItems: [
        {
          accountCode: "1-1020", // Bank Account
          description: `Advance payment from ${invoice.client.name}`,
          descriptionId: `Pembayaran dimuka dari ${invoice.client.name}`,
          debit: data.totalAmount,
          credit: 0,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
        },
        {
          accountCode: "2-1020", // Deferred Revenue (Liability)
          description: `Deferred revenue for ${invoice.project.description}`,
          descriptionId: `Pendapatan diterima dimuka untuk ${invoice.project.description}`,
          debit: 0,
          credit: data.totalAmount,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
        },
      ],
    });

    // Auto-post the journal entry
    await this.journalService.postJournalEntry(initialJournal.id, data.userId);

    // Create deferred revenue record
    const deferredRevenue = await this.prisma.deferredRevenue.create({
      data: {
        invoiceId: data.invoiceId,
        paymentDate: data.paymentDate,
        totalAmount: new Decimal(data.totalAmount),
        recognitionDate: data.recognitionDate,
        recognizedAmount: new Decimal(0),
        remainingAmount: new Decimal(data.totalAmount),
        status: DeferredRevenueStatus.DEFERRED,
        performanceObligation:
          data.performanceObligation ||
          `Service delivery for ${invoice.project.description}`,
        completionPercentage: new Decimal(0),
        initialJournalId: initialJournal.id,
        fiscalPeriodId: data.fiscalPeriodId,
        notes: `PSAK 72 deferred revenue - advance payment received`,
        notesId: `Pendapatan diterima dimuka PSAK 72 - pembayaran dimuka`,
        createdBy: data.userId,
      },
      include: {
        invoice: {
          include: {
            client: true,
            project: true,
          },
        },
        fiscalPeriod: true,
      },
    });

    return deferredRevenue;
  }

  /**
   * Recognize revenue when performance obligation is satisfied
   */
  async recognizeRevenue(data: {
    deferredRevenueId: string;
    recognitionAmount: number;
    recognitionDate: Date;
    completionPercentage?: number;
    userId: string;
  }) {
    const deferred = await this.prisma.deferredRevenue.findUnique({
      where: { id: data.deferredRevenueId },
      include: {
        invoice: {
          include: {
            client: true,
            project: true,
          },
        },
      },
    });

    if (!deferred) {
      throw new NotFoundException(
        `Deferred revenue entry ${data.deferredRevenueId} not found`,
      );
    }

    if (deferred.status === DeferredRevenueStatus.FULLY_RECOGNIZED) {
      throw new BadRequestException(
        "Revenue has already been fully recognized",
      );
    }

    const remainingAmount = Number(deferred.remainingAmount);

    if (data.recognitionAmount > remainingAmount) {
      throw new BadRequestException(
        `Recognition amount (${data.recognitionAmount}) exceeds remaining amount (${remainingAmount})`,
      );
    }

    // Create recognition journal entry: Debit Deferred Revenue, Credit Revenue
    const recognitionJournal = await this.journalService.createJournalEntry({
      entryDate: data.recognitionDate,
      description: `Revenue recognition - Invoice ${deferred.invoice.invoiceNumber}`,
      descriptionId: `Pengakuan pendapatan - Faktur ${deferred.invoice.invoiceNumber}`,
      descriptionEn: `Revenue recognition - Invoice ${deferred.invoice.invoiceNumber}`,
      transactionType: TransactionType.ADJUSTMENT,
      transactionId: deferred.id,
      documentNumber: deferred.invoice.invoiceNumber,
      documentDate: data.recognitionDate,
      fiscalPeriodId: deferred.fiscalPeriodId || undefined,
      createdBy: data.userId,
      lineItems: [
        {
          accountCode: "2-1020", // Deferred Revenue (Liability)
          description: `Revenue recognition for ${deferred.invoice.project.description}`,
          descriptionId: `Pengakuan pendapatan untuk ${deferred.invoice.project.description}`,
          debit: data.recognitionAmount,
          credit: 0,
          clientId: deferred.invoice.clientId,
          projectId: deferred.invoice.projectId,
        },
        {
          accountCode: "4-1010", // Revenue
          description: `Earned revenue from ${deferred.invoice.client.name}`,
          descriptionId: `Pendapatan yang diperoleh dari ${deferred.invoice.client.name}`,
          debit: 0,
          credit: data.recognitionAmount,
          clientId: deferred.invoice.clientId,
          projectId: deferred.invoice.projectId,
        },
      ],
    });

    // Auto-post the journal entry
    await this.journalService.postJournalEntry(
      recognitionJournal.id,
      data.userId,
    );

    // Update deferred revenue record
    const newRecognizedAmount =
      Number(deferred.recognizedAmount) + data.recognitionAmount;
    const newRemainingAmount =
      Number(deferred.totalAmount) - newRecognizedAmount;
    const completionPct =
      data.completionPercentage ||
      (newRecognizedAmount / Number(deferred.totalAmount)) * 100;

    const newStatus =
      newRemainingAmount < 0.01
        ? DeferredRevenueStatus.FULLY_RECOGNIZED
        : DeferredRevenueStatus.PARTIALLY_RECOGNIZED;

    const updatedDeferred = await this.prisma.deferredRevenue.update({
      where: { id: data.deferredRevenueId },
      data: {
        recognizedAmount: new Decimal(newRecognizedAmount),
        remainingAmount: new Decimal(newRemainingAmount),
        completionPercentage: new Decimal(completionPct),
        status: newStatus,
        recognitionJournalId: recognitionJournal.id,
        recognizedAt: data.recognitionDate,
        recognizedBy: data.userId,
      },
      include: {
        invoice: {
          include: {
            client: true,
            project: true,
          },
        },
        fiscalPeriod: true,
      },
    });

    return updatedDeferred;
  }

  /**
   * Create project milestone for percentage-of-completion revenue recognition
   */
  async createMilestone(data: {
    projectId: string;
    milestoneNumber: number;
    name: string;
    nameId?: string;
    description?: string;
    descriptionId?: string;
    plannedStartDate?: Date;
    plannedEndDate?: Date;
    plannedRevenue: number;
    estimatedCost?: number;
    deliverables?: any;
    userId: string;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
      include: {
        client: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${data.projectId} not found`);
    }

    // Check for duplicate milestone number
    const existingMilestone = await this.prisma.projectMilestone.findUnique({
      where: {
        projectId_milestoneNumber: {
          projectId: data.projectId,
          milestoneNumber: data.milestoneNumber,
        },
      },
    });

    if (existingMilestone) {
      throw new BadRequestException(
        `Milestone ${data.milestoneNumber} already exists for this project`,
      );
    }

    const milestone = await this.prisma.projectMilestone.create({
      data: {
        projectId: data.projectId,
        milestoneNumber: data.milestoneNumber,
        name: data.name,
        nameId: data.nameId,
        description: data.description,
        descriptionId: data.descriptionId,
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        plannedRevenue: new Decimal(data.plannedRevenue),
        recognizedRevenue: new Decimal(0),
        remainingRevenue: new Decimal(data.plannedRevenue),
        estimatedCost: data.estimatedCost
          ? new Decimal(data.estimatedCost)
          : null,
        actualCost: new Decimal(0),
        completionPercentage: new Decimal(0),
        status: MilestoneStatus.PENDING,
        deliverables: data.deliverables,
        notes: `PSAK 72 milestone for percentage-of-completion revenue recognition`,
        notesId: `Tonggak PSAK 72 untuk pengakuan pendapatan berdasarkan persentase penyelesaian`,
        createdBy: data.userId,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    return milestone;
  }

  /**
   * Calculate milestone revenue based on completion percentage
   */
  calculateMilestoneRevenue(
    plannedRevenue: number,
    completionPercentage: number,
  ): number {
    if (completionPercentage < 0 || completionPercentage > 100) {
      throw new BadRequestException(
        "Completion percentage must be between 0 and 100",
      );
    }

    return (plannedRevenue * completionPercentage) / 100;
  }

  /**
   * Recognize revenue for milestone completion
   */
  async recognizeMilestoneRevenue(data: {
    milestoneId: string;
    completionPercentage: number;
    actualCost?: number;
    recognitionDate: Date;
    userId: string;
  }) {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: data.milestoneId },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone ${data.milestoneId} not found`);
    }

    if (milestone.status === MilestoneStatus.CANCELLED) {
      throw new BadRequestException(
        "Cannot recognize revenue for cancelled milestone",
      );
    }

    // Calculate revenue to recognize
    const totalEarnedRevenue = this.calculateMilestoneRevenue(
      Number(milestone.plannedRevenue),
      data.completionPercentage,
    );

    const previouslyRecognized = Number(milestone.recognizedRevenue);
    const revenueToRecognize = totalEarnedRevenue - previouslyRecognized;

    if (revenueToRecognize < 0.01) {
      throw new BadRequestException(
        "No revenue to recognize at this completion level",
      );
    }

    // Create revenue recognition journal entry
    const journalEntry = await this.journalService.createJournalEntry({
      entryDate: data.recognitionDate,
      description: `Milestone revenue recognition - ${milestone.project.description} - ${milestone.name}`,
      descriptionId: `Pengakuan pendapatan tonggak - ${milestone.project.description} - ${milestone.nameId || milestone.name}`,
      descriptionEn: `Milestone revenue recognition - ${milestone.project.description} - ${milestone.name}`,
      transactionType: TransactionType.ADJUSTMENT,
      transactionId: milestone.id,
      documentNumber: `M${milestone.milestoneNumber}-${milestone.project.number}`,
      documentDate: data.recognitionDate,
      createdBy: data.userId,
      lineItems: [
        {
          accountCode: "1-2020", // Work in Progress / Unbilled Revenue
          description: `Unbilled revenue - ${milestone.name}`,
          descriptionId: `Pendapatan belum ditagih - ${milestone.nameId || milestone.name}`,
          debit: revenueToRecognize,
          credit: 0,
          clientId: milestone.project.clientId,
          projectId: milestone.projectId,
        },
        {
          accountCode: "4-1010", // Revenue
          description: `Earned revenue - ${milestone.name} (${data.completionPercentage}% complete)`,
          descriptionId: `Pendapatan yang diperoleh - ${milestone.nameId || milestone.name} (${data.completionPercentage}% selesai)`,
          debit: 0,
          credit: revenueToRecognize,
          clientId: milestone.project.clientId,
          projectId: milestone.projectId,
        },
      ],
    });

    // Auto-post the journal entry
    await this.journalService.postJournalEntry(journalEntry.id, data.userId);

    // Update milestone
    const newRecognizedRevenue = previouslyRecognized + revenueToRecognize;
    const newRemainingRevenue =
      Number(milestone.plannedRevenue) - newRecognizedRevenue;

    let newStatus = milestone.status;
    if (data.completionPercentage >= 100) {
      newStatus = MilestoneStatus.COMPLETED;
    } else if (data.completionPercentage > 0) {
      newStatus = MilestoneStatus.IN_PROGRESS;
    }

    const updatedMilestone = await this.prisma.projectMilestone.update({
      where: { id: data.milestoneId },
      data: {
        completionPercentage: new Decimal(data.completionPercentage),
        recognizedRevenue: new Decimal(newRecognizedRevenue),
        remainingRevenue: new Decimal(newRemainingRevenue),
        actualCost: data.actualCost
          ? new Decimal(data.actualCost)
          : milestone.actualCost,
        status: newStatus,
        journalEntryId: journalEntry.id,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    return updatedMilestone;
  }

  /**
   * Mark milestone as accepted by client
   */
  async acceptMilestone(data: {
    milestoneId: string;
    acceptedBy: string;
    acceptedAt: Date;
    userId: string;
  }) {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: data.milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone ${data.milestoneId} not found`);
    }

    if (milestone.status !== MilestoneStatus.COMPLETED) {
      throw new BadRequestException("Can only accept completed milestones");
    }

    const updatedMilestone = await this.prisma.projectMilestone.update({
      where: { id: data.milestoneId },
      data: {
        status: MilestoneStatus.ACCEPTED,
        acceptedBy: data.acceptedBy,
        acceptedAt: data.acceptedAt,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    return updatedMilestone;
  }

  /**
   * Get deferred revenue summary
   */
  async getDeferredRevenueSummary(data: {
    startDate?: Date;
    endDate?: Date;
    status?: DeferredRevenueStatus;
  }) {
    const where: any = {};

    if (data.startDate || data.endDate) {
      where.paymentDate = {};
      if (data.startDate) where.paymentDate.gte = data.startDate;
      if (data.endDate) where.paymentDate.lte = data.endDate;
    }

    if (data.status) {
      where.status = data.status;
    }

    const deferredRevenues = await this.prisma.deferredRevenue.findMany({
      where,
      include: {
        invoice: {
          include: {
            client: true,
            project: true,
          },
        },
        fiscalPeriod: true,
      },
      orderBy: { recognitionDate: "asc" },
    });

    const summary = {
      totalDeferred: 0,
      totalRecognized: 0,
      totalRemaining: 0,
      count: deferredRevenues.length,
      byStatus: {} as Record<string, { count: number; amount: number }>,
    };

    deferredRevenues.forEach((dr) => {
      summary.totalDeferred += Number(dr.totalAmount);
      summary.totalRecognized += Number(dr.recognizedAmount);
      summary.totalRemaining += Number(dr.remainingAmount);

      if (!summary.byStatus[dr.status]) {
        summary.byStatus[dr.status] = { count: 0, amount: 0 };
      }
      summary.byStatus[dr.status].count++;
      summary.byStatus[dr.status].amount += Number(dr.remainingAmount);
    });

    return {
      summary,
      deferredRevenues: deferredRevenues.map((dr) => ({
        id: dr.id,
        invoiceNumber: dr.invoice.invoiceNumber,
        clientName: dr.invoice.client.name,
        projectDescription: dr.invoice.project.description,
        paymentDate: dr.paymentDate,
        recognitionDate: dr.recognitionDate,
        totalAmount: Number(dr.totalAmount),
        recognizedAmount: Number(dr.recognizedAmount),
        remainingAmount: Number(dr.remainingAmount),
        completionPercentage: Number(dr.completionPercentage || 0),
        status: dr.status,
        performanceObligation: dr.performanceObligation,
      })),
    };
  }

  /**
   * Get project milestones summary
   */
  async getProjectMilestonesSummary(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        milestones: {
          orderBy: { milestoneNumber: "asc" },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const summary = {
      totalPlannedRevenue: 0,
      totalRecognizedRevenue: 0,
      totalRemainingRevenue: 0,
      averageCompletion: 0,
      milestoneCount: project.milestones.length,
      byStatus: {} as Record<string, { count: number; revenue: number }>,
    };

    project.milestones.forEach((m) => {
      summary.totalPlannedRevenue += Number(m.plannedRevenue);
      summary.totalRecognizedRevenue += Number(m.recognizedRevenue);
      summary.totalRemainingRevenue += Number(m.remainingRevenue);

      if (!summary.byStatus[m.status]) {
        summary.byStatus[m.status] = { count: 0, revenue: 0 };
      }
      summary.byStatus[m.status].count++;
      summary.byStatus[m.status].revenue += Number(m.recognizedRevenue);
    });

    if (project.milestones.length > 0) {
      summary.averageCompletion =
        project.milestones.reduce(
          (sum, m) => sum + Number(m.completionPercentage),
          0,
        ) / project.milestones.length;
    }

    return {
      project: {
        id: project.id,
        number: project.number,
        description: project.description,
        clientName: project.client.name,
        status: project.status,
      },
      summary,
      milestones: project.milestones.map((m) => ({
        id: m.id,
        milestoneNumber: m.milestoneNumber,
        name: m.name,
        nameId: m.nameId,
        completionPercentage: Number(m.completionPercentage),
        plannedRevenue: Number(m.plannedRevenue),
        recognizedRevenue: Number(m.recognizedRevenue),
        remainingRevenue: Number(m.remainingRevenue),
        estimatedCost: m.estimatedCost ? Number(m.estimatedCost) : null,
        actualCost: Number(m.actualCost),
        status: m.status,
        plannedStartDate: m.plannedStartDate,
        plannedEndDate: m.plannedEndDate,
        actualStartDate: m.actualStartDate,
        actualEndDate: m.actualEndDate,
      })),
    };
  }

  /**
   * Get revenue recognition schedule (upcoming revenue to be recognized)
   */
  async getRevenueRecognitionSchedule(data: {
    startDate: Date;
    endDate: Date;
  }) {
    // Get all deferred revenues due for recognition in period
    const deferredRevenues = await this.prisma.deferredRevenue.findMany({
      where: {
        recognitionDate: {
          gte: data.startDate,
          lte: data.endDate,
        },
        status: { in: ["DEFERRED", "PARTIALLY_RECOGNIZED"] },
      },
      include: {
        invoice: {
          include: {
            client: true,
            project: true,
          },
        },
      },
      orderBy: { recognitionDate: "asc" },
    });

    const totalScheduledRevenue = deferredRevenues.reduce(
      (sum, dr) => sum + Number(dr.remainingAmount),
      0,
    );

    return {
      period: {
        startDate: data.startDate,
        endDate: data.endDate,
      },
      summary: {
        count: deferredRevenues.length,
        totalScheduledRevenue,
      },
      schedule: deferredRevenues.map((dr) => ({
        id: dr.id,
        recognitionDate: dr.recognitionDate,
        invoiceNumber: dr.invoice.invoiceNumber,
        clientName: dr.invoice.client.name,
        projectDescription: dr.invoice.project.description,
        remainingAmount: Number(dr.remainingAmount),
        performanceObligation: dr.performanceObligation,
        completionPercentage: Number(dr.completionPercentage || 0),
      })),
    };
  }
}
