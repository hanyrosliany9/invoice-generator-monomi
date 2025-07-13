// Business Journey Service - Indonesian Business Management System
// Enhanced with materai compliance, performance optimization, and security

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getErrorMessage } from "../../common/utils/error-handling.util";
import {
  CreateBusinessJourneyEventDto,
  UpdateBusinessJourneyEventDto,
  BusinessJourneyFiltersDto,
  BusinessJourneyTimelineResponseDto,
  BusinessJourneyEventResponseDto,
  BusinessJourneySummaryDto,
  MateraiComplianceStatusDto,
  CreateUXMetricsDto,
  BusinessJourneyEventType,
  BusinessJourneyEventStatus,
  BusinessJourneyEventSource,
  BusinessJourneyPriority,
} from "./dto/business-journey.dto";
import { Prisma } from "@prisma/client";

interface ComplianceResult {
  isCompliant: boolean;
  warnings: string[];
  requiredActions: string[];
}

@Injectable()
export class BusinessJourneyService {
  private readonly logger = new Logger(BusinessJourneyService.name);

  constructor(private prisma: PrismaService) {}

  // Create a new business journey event
  async createEvent(
    createEventDto: CreateBusinessJourneyEventDto,
    userId: string,
  ): Promise<BusinessJourneyEventResponseDto> {
    try {
      // Validate materai compliance if needed
      const compliance = await this.validateMateraiCompliance(createEventDto);
      if (!compliance.isCompliant) {
        this.logger.warn(
          `Materai compliance issues: ${compliance.warnings.join(", ")}`,
        );
      }

      // Create the event with metadata
      const event = await this.prisma.businessJourneyEvent.create({
        data: {
          type: createEventDto.type,
          title: createEventDto.title,
          description: createEventDto.description,
          status: createEventDto.status || BusinessJourneyEventStatus.PENDING,
          amount: createEventDto.amount
            ? new Prisma.Decimal(createEventDto.amount)
            : null,
          clientId: createEventDto.clientId,
          projectId: createEventDto.projectId,
          quotationId: createEventDto.quotationId,
          invoiceId: createEventDto.invoiceId,
          paymentId: createEventDto.paymentId,
          createdBy: userId,
          metadata: createEventDto.metadata
            ? {
                create: {
                  userCreated: createEventDto.metadata.userCreated,
                  userModified: createEventDto.metadata.userModified,
                  source:
                    createEventDto.metadata.source ||
                    BusinessJourneyEventSource.USER,
                  priority:
                    createEventDto.metadata.priority ||
                    BusinessJourneyPriority.MEDIUM,
                  tags: createEventDto.metadata.tags || [],
                  relatedDocuments:
                    createEventDto.metadata.relatedDocuments || [],
                  notes: createEventDto.metadata.notes,
                  ipAddress: createEventDto.metadata.ipAddress,
                  userAgent: createEventDto.metadata.userAgent,
                  materaiRequired:
                    createEventDto.metadata.materaiRequired || false,
                  materaiAmount: createEventDto.metadata.materaiAmount
                    ? new Prisma.Decimal(createEventDto.metadata.materaiAmount)
                    : null,
                  complianceStatus: createEventDto.metadata.complianceStatus,
                },
              }
            : undefined,
        },
        include: {
          metadata: true,
          client: true,
          project: true,
          quotation: true,
          invoice: true,
          payment: true,
        },
      });

      // Auto-trigger related events if needed
      await this.triggerRelatedEvents(event);

      return this.mapEventToResponse(event);
    } catch (error) {
      this.logger.error(
        `Failed to create business journey event: ${getErrorMessage(error)}`,
      );
      throw new BadRequestException("Failed to create business journey event");
    }
  }

  // Get business journey timeline for a client
  async getClientTimeline(
    clientId: string,
    filters: BusinessJourneyFiltersDto,
  ): Promise<BusinessJourneyTimelineResponseDto> {
    try {
      // Verify client exists
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        throw new NotFoundException("Client not found");
      }

      // Build filter conditions
      const whereConditions = this.buildWhereConditions(clientId, filters);

      // Get events with pagination
      const events = await this.prisma.businessJourneyEvent.findMany({
        where: whereConditions,
        include: {
          metadata: true,
          client: true,
          project: true,
          quotation: true,
          invoice: true,
          payment: true,
        },
        orderBy: {
          [filters.sortBy || "createdAt"]: filters.sortOrder || "desc",
        },
        skip: ((filters.page || 1) - 1) * (filters.limit || 20),
        take: filters.limit || 20,
      });

      // Get summary data
      const summary = await this.getBusinessJourneySummary(clientId);

      // Get materai compliance status
      const materaiCompliance = await this.getMateraiComplianceStatus(clientId);

      // Calculate total revenue
      const totalRevenue = await this.calculateTotalRevenue(clientId);

      return {
        clientId,
        clientName: client.name,
        totalEvents: events.length,
        totalRevenue,
        events: events.map((event) => this.mapEventToResponse(event)),
        summary,
        materaiCompliance,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get client timeline: ${getErrorMessage(error)}`,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to get client timeline");
    }
  }

  // Update a business journey event
  async updateEvent(
    eventId: string,
    updateEventDto: UpdateBusinessJourneyEventDto,
    userId: string,
  ): Promise<BusinessJourneyEventResponseDto> {
    try {
      // Check if event exists
      const existingEvent = await this.prisma.businessJourneyEvent.findUnique({
        where: { id: eventId },
        include: { metadata: true },
      });

      if (!existingEvent) {
        throw new NotFoundException("Business journey event not found");
      }

      // Update the event
      const updatedEvent = await this.prisma.businessJourneyEvent.update({
        where: { id: eventId },
        data: {
          title: updateEventDto.title,
          description: updateEventDto.description,
          status: updateEventDto.status,
          amount: updateEventDto.amount
            ? new Prisma.Decimal(updateEventDto.amount)
            : undefined,
          metadata: updateEventDto.metadata
            ? {
                update: {
                  userModified: userId,
                  priority: updateEventDto.metadata.priority,
                  tags: updateEventDto.metadata.tags,
                  relatedDocuments: updateEventDto.metadata.relatedDocuments,
                  notes: updateEventDto.metadata.notes,
                  materaiRequired: updateEventDto.metadata.materaiRequired,
                  materaiAmount: updateEventDto.metadata.materaiAmount
                    ? new Prisma.Decimal(updateEventDto.metadata.materaiAmount)
                    : undefined,
                  complianceStatus: updateEventDto.metadata.complianceStatus,
                },
              }
            : undefined,
        },
        include: {
          metadata: true,
          client: true,
          project: true,
          quotation: true,
          invoice: true,
          payment: true,
        },
      });

      return this.mapEventToResponse(updatedEvent);
    } catch (error) {
      this.logger.error(
        `Failed to update business journey event: ${getErrorMessage(error)}`,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to update business journey event");
    }
  }

  // Delete a business journey event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      const event = await this.prisma.businessJourneyEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException("Business journey event not found");
      }

      await this.prisma.businessJourneyEvent.delete({
        where: { id: eventId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete business journey event: ${getErrorMessage(error)}`,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to delete business journey event");
    }
  }

  // Auto-create events based on entity changes
  async autoCreateEvent(
    entityType: "client" | "project" | "quotation" | "invoice" | "payment",
    entityId: string,
    action: "created" | "updated" | "deleted",
    userId: string,
    metadata?: any,
  ): Promise<BusinessJourneyEventResponseDto | null> {
    try {
      const eventType = this.mapEntityActionToEventType(
        entityType,
        action,
        metadata,
      );
      if (!eventType) return null;

      // Get entity details for event creation
      const entityDetails = await this.getEntityDetails(entityType, entityId);
      if (!entityDetails) return null;

      const createEventDto: CreateBusinessJourneyEventDto = {
        type: eventType,
        title: this.generateEventTitle(eventType, entityDetails),
        description: this.generateEventDescription(
          eventType,
          entityDetails,
          metadata,
        ),
        status: this.getInitialEventStatus(eventType),
        amount: entityDetails.amount,
        clientId: entityDetails.clientId,
        projectId: entityDetails.projectId,
        quotationId: entityDetails.quotationId,
        invoiceId: entityDetails.invoiceId,
        paymentId: entityDetails.paymentId,
        metadata: {
          userCreated: userId,
          source: BusinessJourneyEventSource.SYSTEM,
          priority: this.getEventPriority(eventType),
          tags: this.generateEventTags(eventType, entityDetails),
          materaiRequired: this.checkMateraiRequired(entityDetails.amount || 0),
          materaiAmount: this.calculateMateraiAmount(entityDetails.amount || 0),
        },
      };

      return await this.createEvent(createEventDto, userId);
    } catch (error) {
      this.logger.error(
        `Failed to auto-create event: ${getErrorMessage(error)}`,
      );
      return null;
    }
  }

  // Record UX metrics
  async recordUXMetrics(metricsDto: CreateUXMetricsDto): Promise<void> {
    try {
      await this.prisma.uXMetrics.create({
        data: {
          componentName: metricsDto.componentName,
          eventType: metricsDto.eventType,
          metricName: metricsDto.metricName,
          value: metricsDto.value,
          userId: metricsDto.userId,
          sessionId: metricsDto.sessionId,
          clientId: metricsDto.clientId,
          url: metricsDto.url,
          userAgent: metricsDto.userAgent,
          performanceData: metricsDto.performanceData,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record UX metrics: ${getErrorMessage(error)}`,
      );
      // Don't throw error for metrics recording failures
    }
  }

  // Private helper methods

  private buildWhereConditions(
    clientId: string,
    filters: BusinessJourneyFiltersDto,
  ): Prisma.BusinessJourneyEventWhereInput {
    const conditions: Prisma.BusinessJourneyEventWhereInput = {
      clientId,
    };

    if (filters.eventTypes?.length) {
      conditions.type = { in: filters.eventTypes };
    }

    if (filters.statusFilter?.length) {
      conditions.status = { in: filters.statusFilter };
    }

    if (filters.startDate || filters.endDate) {
      conditions.createdAt = {};
      if (filters.startDate) {
        conditions.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        conditions.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      conditions.amount = {};
      if (filters.minAmount !== undefined) {
        conditions.amount.gte = new Prisma.Decimal(filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        conditions.amount.lte = new Prisma.Decimal(filters.maxAmount);
      }
    }

    if (filters.searchTerm) {
      conditions.OR = [
        { title: { contains: filters.searchTerm, mode: "insensitive" } },
        { description: { contains: filters.searchTerm, mode: "insensitive" } },
      ];
    }

    return conditions;
  }

  private async getBusinessJourneySummary(
    clientId: string,
  ): Promise<BusinessJourneySummaryDto> {
    const [projects, quotations, invoices, payments] = await Promise.all([
      this.prisma.project.count({ where: { clientId } }),
      this.prisma.quotation.count({ where: { clientId } }),
      this.prisma.invoice.count({ where: { clientId } }),
      this.prisma.payment.count({
        where: { invoice: { clientId } },
      }),
    ]);

    // Calculate averages
    const avgProjectValue = await this.prisma.project.aggregate({
      where: { clientId },
      _avg: { basePrice: true },
    });

    const completionRate = quotations > 0 ? (invoices / quotations) * 100 : 0;

    return {
      totalProjects: projects,
      totalQuotations: quotations,
      totalInvoices: invoices,
      totalPayments: payments,
      averageProjectValue: Number(avgProjectValue._avg.basePrice) || 0,
      averagePaymentDelay: 0, // Calculate based on due dates vs payment dates
      completionRate,
    };
  }

  private async getMateraiComplianceStatus(
    clientId: string,
  ): Promise<MateraiComplianceStatusDto> {
    const invoices = await this.prisma.invoice.findMany({
      where: { clientId },
      select: {
        totalAmount: true,
        materaiRequired: true,
        materaiApplied: true,
        materaiAmount: true,
      },
    });

    let totalRequiredAmount = 0;
    let appliedAmount = 0;

    for (const invoice of invoices) {
      const amount = Number(invoice.totalAmount);
      if (amount >= 5000000) {
        // 5 million IDR threshold
        const requiredMaterai = this.calculateMateraiAmount(amount);
        totalRequiredAmount += requiredMaterai;

        if (invoice.materaiApplied && invoice.materaiAmount) {
          appliedAmount += Number(invoice.materaiAmount);
        }
      }
    }

    const pendingAmount = totalRequiredAmount - appliedAmount;
    const compliancePercentage =
      totalRequiredAmount > 0
        ? (appliedAmount / totalRequiredAmount) * 100
        : 100;

    return {
      required: totalRequiredAmount > 0,
      totalRequiredAmount,
      appliedAmount,
      pendingAmount,
      compliancePercentage,
    };
  }

  private async calculateTotalRevenue(clientId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: {
        invoice: { clientId },
        status: "CONFIRMED",
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount) || 0;
  }

  private calculateMateraiAmount(invoiceAmount: number): number {
    // 2025 Indonesian materai calculation
    if (invoiceAmount >= 5000000 && invoiceAmount < 1000000000) {
      return 10000; // 10,000 IDR materai
    }
    if (invoiceAmount >= 1000000000) {
      return 20000; // 20,000 IDR materai for high-value transactions
    }
    return 0;
  }

  private validateMateraiCompliance(
    createEventDto: CreateBusinessJourneyEventDto,
  ): ComplianceResult {
    const result: ComplianceResult = {
      isCompliant: true,
      warnings: [],
      requiredActions: [],
    };

    if (createEventDto.amount && createEventDto.amount >= 5000000) {
      if (!createEventDto.metadata?.materaiRequired) {
        result.isCompliant = false;
        result.requiredActions.push("MATERAI_REQUIRED");
      }

      const expectedAmount = this.calculateMateraiAmount(createEventDto.amount);
      if (createEventDto.metadata?.materaiAmount !== expectedAmount) {
        result.warnings.push("MATERAI_AMOUNT_MISMATCH");
      }
    }

    return result;
  }

  private mapEntityActionToEventType(
    entityType: string,
    action: string,
    metadata?: any,
  ): BusinessJourneyEventType | null {
    const mapping: Record<string, BusinessJourneyEventType> = {
      client_created: BusinessJourneyEventType.CLIENT_CREATED,
      project_created: BusinessJourneyEventType.PROJECT_STARTED,
      quotation_created: BusinessJourneyEventType.QUOTATION_DRAFT,
      quotation_sent: BusinessJourneyEventType.QUOTATION_SENT,
      quotation_approved: BusinessJourneyEventType.QUOTATION_APPROVED,
      quotation_declined: BusinessJourneyEventType.QUOTATION_DECLINED,
      invoice_created: BusinessJourneyEventType.INVOICE_GENERATED,
      invoice_sent: BusinessJourneyEventType.INVOICE_SENT,
      payment_created: BusinessJourneyEventType.PAYMENT_RECEIVED,
      payment_overdue: BusinessJourneyEventType.PAYMENT_OVERDUE,
    };

    const key = `${entityType}_${action}`;
    return mapping[key] || null;
  }

  private async getEntityDetails(
    entityType: string,
    entityId: string,
  ): Promise<any> {
    switch (entityType) {
      case "client":
        return await this.prisma.client.findUnique({ where: { id: entityId } });
      case "project":
        return await this.prisma.project.findUnique({
          where: { id: entityId },
          include: { client: true },
        });
      case "quotation":
        return await this.prisma.quotation.findUnique({
          where: { id: entityId },
          include: { client: true, project: true },
        });
      case "invoice":
        return await this.prisma.invoice.findUnique({
          where: { id: entityId },
          include: { client: true, project: true, quotation: true },
        });
      case "payment":
        return await this.prisma.payment.findUnique({
          where: { id: entityId },
          include: { invoice: { include: { client: true } } },
        });
      default:
        return null;
    }
  }

  private generateEventTitle(
    eventType: BusinessJourneyEventType,
    entityDetails: any,
  ): string {
    const titleMap: Record<BusinessJourneyEventType, string> = {
      [BusinessJourneyEventType.CLIENT_CREATED]: `Klien baru: ${entityDetails.name}`,
      [BusinessJourneyEventType.PROJECT_STARTED]: `Proyek dimulai: ${entityDetails.description}`,
      [BusinessJourneyEventType.QUOTATION_DRAFT]: `Draft quotation: ${entityDetails.quotationNumber}`,
      [BusinessJourneyEventType.QUOTATION_SENT]: `Quotation dikirim: ${entityDetails.quotationNumber}`,
      [BusinessJourneyEventType.QUOTATION_APPROVED]: `Quotation disetujui: ${entityDetails.quotationNumber}`,
      [BusinessJourneyEventType.QUOTATION_DECLINED]: `Quotation ditolak: ${entityDetails.quotationNumber}`,
      [BusinessJourneyEventType.QUOTATION_REVISED]: `Quotation direvisi: ${entityDetails.quotationNumber}`,
      [BusinessJourneyEventType.INVOICE_GENERATED]: `Invoice dibuat: ${entityDetails.invoiceNumber}`,
      [BusinessJourneyEventType.INVOICE_SENT]: `Invoice dikirim: ${entityDetails.invoiceNumber}`,
      [BusinessJourneyEventType.PAYMENT_RECEIVED]: `Pembayaran diterima: ${entityDetails.amount}`,
      [BusinessJourneyEventType.PAYMENT_OVERDUE]: `Pembayaran terlambat: ${entityDetails.invoice?.invoiceNumber}`,
      [BusinessJourneyEventType.MATERAI_REQUIRED]: `Materai diperlukan`,
      [BusinessJourneyEventType.MATERAI_APPLIED]: `Materai diterapkan`,
    };

    return titleMap[eventType] || "Event bisnis";
  }

  private generateEventDescription(
    eventType: BusinessJourneyEventType,
    entityDetails: any,
    metadata?: any,
  ): string {
    // Generate contextual descriptions based on event type and entity details
    return `Event ${eventType.toLowerCase().replace("_", " ")} untuk ${entityDetails.name || entityDetails.description}`;
  }

  private getInitialEventStatus(
    eventType: BusinessJourneyEventType,
  ): BusinessJourneyEventStatus {
    const statusMap: Record<
      BusinessJourneyEventType,
      BusinessJourneyEventStatus
    > = {
      [BusinessJourneyEventType.CLIENT_CREATED]:
        BusinessJourneyEventStatus.COMPLETED,
      [BusinessJourneyEventType.PROJECT_STARTED]:
        BusinessJourneyEventStatus.IN_PROGRESS,
      [BusinessJourneyEventType.QUOTATION_DRAFT]:
        BusinessJourneyEventStatus.PENDING,
      [BusinessJourneyEventType.QUOTATION_SENT]:
        BusinessJourneyEventStatus.IN_PROGRESS,
      [BusinessJourneyEventType.QUOTATION_APPROVED]:
        BusinessJourneyEventStatus.COMPLETED,
      [BusinessJourneyEventType.QUOTATION_DECLINED]:
        BusinessJourneyEventStatus.CANCELLED,
      [BusinessJourneyEventType.QUOTATION_REVISED]:
        BusinessJourneyEventStatus.IN_PROGRESS,
      [BusinessJourneyEventType.INVOICE_GENERATED]:
        BusinessJourneyEventStatus.COMPLETED,
      [BusinessJourneyEventType.INVOICE_SENT]:
        BusinessJourneyEventStatus.IN_PROGRESS,
      [BusinessJourneyEventType.PAYMENT_RECEIVED]:
        BusinessJourneyEventStatus.COMPLETED,
      [BusinessJourneyEventType.PAYMENT_OVERDUE]:
        BusinessJourneyEventStatus.REQUIRES_ATTENTION,
      [BusinessJourneyEventType.MATERAI_REQUIRED]:
        BusinessJourneyEventStatus.REQUIRES_ATTENTION,
      [BusinessJourneyEventType.MATERAI_APPLIED]:
        BusinessJourneyEventStatus.COMPLETED,
    };

    return statusMap[eventType] || BusinessJourneyEventStatus.PENDING;
  }

  private getEventPriority(
    eventType: BusinessJourneyEventType,
  ): BusinessJourneyPriority {
    const priorityMap: Record<
      BusinessJourneyEventType,
      BusinessJourneyPriority
    > = {
      [BusinessJourneyEventType.CLIENT_CREATED]: BusinessJourneyPriority.MEDIUM,
      [BusinessJourneyEventType.PROJECT_STARTED]: BusinessJourneyPriority.HIGH,
      [BusinessJourneyEventType.QUOTATION_DRAFT]:
        BusinessJourneyPriority.MEDIUM,
      [BusinessJourneyEventType.QUOTATION_SENT]: BusinessJourneyPriority.HIGH,
      [BusinessJourneyEventType.QUOTATION_APPROVED]:
        BusinessJourneyPriority.HIGH,
      [BusinessJourneyEventType.QUOTATION_DECLINED]:
        BusinessJourneyPriority.MEDIUM,
      [BusinessJourneyEventType.QUOTATION_REVISED]:
        BusinessJourneyPriority.HIGH,
      [BusinessJourneyEventType.INVOICE_GENERATED]:
        BusinessJourneyPriority.HIGH,
      [BusinessJourneyEventType.INVOICE_SENT]: BusinessJourneyPriority.HIGH,
      [BusinessJourneyEventType.PAYMENT_RECEIVED]: BusinessJourneyPriority.HIGH,
      [BusinessJourneyEventType.PAYMENT_OVERDUE]:
        BusinessJourneyPriority.CRITICAL,
      [BusinessJourneyEventType.MATERAI_REQUIRED]: BusinessJourneyPriority.HIGH,
      [BusinessJourneyEventType.MATERAI_APPLIED]:
        BusinessJourneyPriority.MEDIUM,
    };

    return priorityMap[eventType] || BusinessJourneyPriority.MEDIUM;
  }

  private generateEventTags(
    eventType: BusinessJourneyEventType,
    entityDetails: any,
  ): string[] {
    const tags = [eventType.toLowerCase()];

    if (entityDetails.amount && entityDetails.amount >= 5000000) {
      tags.push("materai-required");
    }

    if (entityDetails.client) {
      tags.push(`client-${entityDetails.client.id}`);
    }

    return tags;
  }

  private checkMateraiRequired(amount: number): boolean {
    return amount >= 5000000; // 5 million IDR threshold
  }

  private async triggerRelatedEvents(event: any): Promise<void> {
    // Auto-trigger related events based on business rules
    // For example, when a quotation is approved, create an invoice generation event
    if (event.type === BusinessJourneyEventType.QUOTATION_APPROVED) {
      // Could trigger auto-invoice generation
    }
  }

  private mapEventToResponse(event: any): BusinessJourneyEventResponseDto {
    return {
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      status: event.status,
      amount: event.amount ? Number(event.amount) : undefined,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      clientId: event.clientId,
      projectId: event.projectId,
      quotationId: event.quotationId,
      invoiceId: event.invoiceId,
      paymentId: event.paymentId,
      metadata: event.metadata
        ? {
            userCreated: event.metadata.userCreated,
            userModified: event.metadata.userModified,
            source: event.metadata.source,
            priority: event.metadata.priority,
            tags: event.metadata.tags,
            relatedDocuments: event.metadata.relatedDocuments,
            notes: event.metadata.notes,
            materaiRequired: event.metadata.materaiRequired,
            materaiAmount: event.metadata.materaiAmount
              ? Number(event.metadata.materaiAmount)
              : undefined,
            complianceStatus: event.metadata.complianceStatus,
            createdAt: event.metadata.createdAt,
            updatedAt: event.metadata.updatedAt,
          }
        : undefined,
      relatedEntity: this.buildRelatedEntity(event),
    };
  }

  private buildRelatedEntity(event: any): any {
    if (event.client) {
      return {
        id: event.client.id,
        type: "client",
        name: event.client.name,
      };
    }
    if (event.project) {
      return {
        id: event.project.id,
        type: "project",
        name: event.project.description,
        number: event.project.number,
      };
    }
    if (event.quotation) {
      return {
        id: event.quotation.id,
        type: "quotation",
        name: `Quotation ${event.quotation.quotationNumber}`,
        number: event.quotation.quotationNumber,
      };
    }
    if (event.invoice) {
      return {
        id: event.invoice.id,
        type: "invoice",
        name: `Invoice ${event.invoice.invoiceNumber}`,
        number: event.invoice.invoiceNumber,
      };
    }
    if (event.payment) {
      return {
        id: event.payment.id,
        type: "payment",
        name: `Payment ${event.payment.id}`,
      };
    }
    return null;
  }
}
