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

  /**
   * Phase 1 Enhancement: Recognize revenue when milestone invoice is paid
   * Called when a payment milestone invoice changes to PAID status
   */
  async recognizeRevenueFromMilestoneInvoice(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        paymentMilestone: true,
        projectMilestone: true,
        payments: { where: { status: "CONFIRMED" } },
      },
    });

    if (!invoice || invoice.status !== "PAID") {
      return; // Only recognize revenue for paid invoices
    }

    // If project milestone linked, recognize revenue
    if (invoice.projectMilestone) {
      await this.recognizeMilestoneRevenue({
        milestoneId: invoice.projectMilestone.id,
        completionPercentage: 100, // Assume milestone completed if invoiced
        recognitionDate: new Date(),
        userId: "system",
      });
    }
  }

  /**
   * Phase 1 Enhancement: Auto-create project milestones from payment milestones
   * When a milestone-based quotation is approved, create corresponding project milestones
   */
  async createProjectMilestonesFromPaymentMilestones(
    quotationId: string,
    userId: string,
  ): Promise<any[]> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { paymentMilestones: true, project: true },
    });

    if (!quotation) {
      throw new NotFoundException("Quotation tidak ditemukan");
    }

    const projectMilestones: any[] = [];

    for (const pm of quotation.paymentMilestones) {
      const projectMilestone = await this.createMilestone({
        projectId: quotation.projectId,
        milestoneNumber: pm.milestoneNumber,
        name: pm.name,
        nameId: pm.nameId || undefined,
        description: pm.description || undefined,
        descriptionId: pm.descriptionId || undefined,
        plannedRevenue: Number(pm.paymentAmount),
        plannedEndDate: pm.dueDate || undefined,
        deliverables: pm.deliverables,
        userId,
      });

      // Link payment milestone to project milestone
      await this.prisma.paymentMilestone.update({
        where: { id: pm.id },
        data: { projectMilestoneId: projectMilestone.id },
      });

      projectMilestones.push(projectMilestone);
    }

    return projectMilestones;
  }

  /**
   * Phase 1 Enhancement: Get payment milestone invoicing summary
   * Shows which milestones have been invoiced and payment status
   */
  async getPaymentMilestonesSummary(quotationId: string): Promise<any> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        client: true,
        project: true,
        paymentMilestones: { include: { invoices: true } },
      },
    });

    if (!quotation) {
      throw new NotFoundException("Quotation tidak ditemukan");
    }

    const milestones = quotation.paymentMilestones;
    const invoicedCount = milestones.filter((m) => m.isInvoiced).length;
    const paidCount = milestones.filter(
      (m) => m.invoices && m.invoices.some((inv: any) => inv.status === "PAID"),
    ).length;

    const totalInvoiced = milestones
      .filter((m) => m.isInvoiced)
      .reduce((sum: number, m: any) => sum + Number(m.paymentAmount), 0);

    const totalPaid = milestones
      .filter(
        (m) =>
          m.invoices && m.invoices.some((inv: any) => inv.status === "PAID"),
      )
      .reduce((sum: number, m: any) => sum + Number(m.paymentAmount), 0);

    return {
      quotationId,
      quotationNumber: quotation.quotationNumber,
      clientName: quotation.client.name,
      projectDescription: quotation.project.description,
      totalAmount: Number(quotation.totalAmount),
      totalInvoiced,
      totalPaid,
      totalOutstanding: Number(quotation.totalAmount) - totalPaid,
      summaryStats: {
        totalMilestones: milestones.length,
        milestonesInvoiced: invoicedCount,
        milestonesPaid: paidCount,
        invoicedPercentage: milestones.length
          ? Math.round((invoicedCount / milestones.length) * 100)
          : 0,
        paidPercentage: milestones.length
          ? Math.round((paidCount / milestones.length) * 100)
          : 0,
      },
      milestones: milestones.map((m: any) => ({
        milestoneNumber: m.milestoneNumber,
        name: m.name,
        nameId: m.nameId,
        percentage: Number(m.paymentPercentage),
        amount: Number(m.paymentAmount),
        dueDate: m.dueDate,
        isInvoiced: m.isInvoiced,
        invoiceNumber: m.invoices?.[0]?.invoiceNumber,
        invoiceStatus: m.invoices?.[0]?.status,
      })),
    };
  }

  /**
   * PHASE 2: Recognize revenue from invoice payment
   *
   * Automatically triggered when an invoice is paid.
   * Links invoice payment to project milestone and recognizes revenue.
   *
   * This is called by InvoicePaymentListener when an invoice reaches PAID_OFF status.
   *
   * @param invoiceId ID of the paid invoice
   * @returns Updated invoice with revenue recognition details
   */
  async recognizeRevenueFromInvoicePayment(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        paymentMilestone: true,
        projectMilestone: true,
        payments: {
          where: { status: "CONFIRMED" },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status !== InvoiceStatus.PAID) {
      throw new BadRequestException(
        `Invoice must be in PAID status, current status: ${invoice.status}`,
      );
    }

    // Only recognize revenue if invoice is linked to a project milestone
    if (!invoice.projectMilestoneId) {
      return {
        invoiceId,
        message:
          "Invoice not linked to project milestone, revenue recognition skipped",
      };
    }

    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: invoice.projectMilestoneId },
    });

    if (!milestone) {
      throw new NotFoundException(
        `Project milestone ${invoice.projectMilestoneId} not found`,
      );
    }

    // Recognize revenue for the milestone
    // Assume milestone is 100% complete when invoice is paid
    const updatedMilestone = await this.recognizeMilestoneRevenue({
      milestoneId: milestone.id,
      completionPercentage: 100,
      recognitionDate: new Date(),
      userId: "system",
    });

    return {
      invoiceId,
      milestoneId: milestone.id,
      revenueRecognized: Number(updatedMilestone.recognizedRevenue),
      message: `Revenue recognized for milestone ${milestone.name}`,
    };
  }

  /**
   * PHASE 2: Get revenue dashboard summary
   *
   * Returns comprehensive revenue recognition summary for dashboard display.
   * Includes recognized, deferred, and pending revenue.
   *
   * @param startDate Optional start date for period analysis
   * @param endDate Optional end date for period analysis
   * @returns Revenue summary for dashboard
   */
  async getRevenueDashboardSummary(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(new Date().getFullYear(), 0, 1);
    const end = endDate || new Date();

    // Get recognized revenue
    const recognizedRevenue = await this.prisma.projectMilestone.aggregate({
      where: {
        status: {
          in: [MilestoneStatus.COMPLETED, MilestoneStatus.ACCEPTED],
        },
      },
      _sum: {
        recognizedRevenue: true,
      },
    });

    // Get deferred revenue
    const deferredRevenue = await this.prisma.deferredRevenue.aggregate({
      where: {
        status: {
          in: ["DEFERRED", "PARTIALLY_RECOGNIZED"],
        },
      },
      _sum: {
        remainingAmount: true,
      },
    });

    // Get invoiced but not yet recognized revenue
    const invoicedNotRecognized = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.PAID,
        projectMilestone: {
          status: {
            notIn: [MilestoneStatus.COMPLETED, MilestoneStatus.ACCEPTED],
          },
        },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const pendingRevenueAmount = invoicedNotRecognized.reduce(
      (sum: number, inv: any) => sum + Number(inv.totalAmount),
      0,
    );

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      recognizedRevenue: {
        total: Number(recognizedRevenue._sum.recognizedRevenue || 0),
        count: 0, // Could add count if needed
      },
      deferredRevenue: {
        total: Number(deferredRevenue._sum.remainingAmount || 0),
        count: 0,
      },
      pendingRevenue: {
        total: pendingRevenueAmount,
        count: invoicedNotRecognized.length,
      },
      summary: {
        totalInvoiced:
          Number(recognizedRevenue._sum.recognizedRevenue || 0) +
          Number(deferredRevenue._sum.remainingAmount || 0) +
          pendingRevenueAmount,
        recognitionRate: this.calculateRecognitionRate(
          Number(recognizedRevenue._sum.recognizedRevenue || 0),
          Number(recognizedRevenue._sum.recognizedRevenue || 0) +
            Number(deferredRevenue._sum.remainingAmount || 0) +
            pendingRevenueAmount,
        ),
      },
    };
  }

  /**
   * Calculate recognition rate percentage
   * @private
   */
  private calculateRecognitionRate(recognized: number, total: number): number {
    if (total === 0) return 0;
    return parseFloat(((recognized / total) * 100).toFixed(2));
  }
}
