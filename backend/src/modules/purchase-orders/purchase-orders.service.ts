import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalService } from "../accounting/services/journal.service";
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  ApprovePurchaseOrderDto,
  RejectPurchaseOrderDto,
  CancelPurchaseOrderDto,
} from "./dto";
import { POStatus, POItemType, TransactionType } from "@prisma/client";

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * Create a new purchase order
   */
  async create(userId: string, createPODto: CreatePurchaseOrderDto) {
    // Validate vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: createPODto.vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor not found: ${createPODto.vendorId}`);
    }

    if (!vendor.isActive) {
      throw new BadRequestException("Cannot create PO for inactive vendor");
    }

    // Validate project if provided
    if (createPODto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: createPODto.projectId },
      });

      if (!project) {
        throw new NotFoundException(
          `Project not found: ${createPODto.projectId}`,
        );
      }
    }

    // Validate line items
    this.validateLineItems(createPODto.items);

    // Validate amounts
    this.validateAmounts(createPODto);

    // Generate PO number
    const poNumber = await this.generatePONumber();

    // Create PO with items
    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: createPODto.vendorId,
        projectId: createPODto.projectId,
        poDate: createPODto.poDate,
        deliveryAddress: createPODto.deliveryAddress,
        deliveryDate: createPODto.deliveryDate,
        paymentTerms: createPODto.paymentTerms,
        dueDate: createPODto.dueDate,
        subtotal: createPODto.subtotal,
        discountAmount: createPODto.discountAmount || 0,
        ppnAmount: createPODto.ppnAmount,
        pphAmount: createPODto.pphAmount || 0,
        totalAmount: createPODto.totalAmount,
        isPPNIncluded: createPODto.isPPNIncluded,
        ppnRate: createPODto.ppnRate,
        withholdingTaxType: createPODto.withholdingTaxType,
        withholdingTaxRate: createPODto.withholdingTaxRate,
        description: createPODto.description,
        descriptionId: createPODto.descriptionId,
        notes: createPODto.notes,
        termsConditions: createPODto.termsConditions,
        requestedBy: createPODto.requestedBy,
        approvalStatus: createPODto.approvalStatus,
        status: POStatus.DRAFT,
        createdBy: userId,
        updatedBy: userId,
        items: {
          create: createPODto.items.map((item) => ({
            lineNumber: item.lineNumber,
            itemType: item.itemType,
            itemCode: item.itemCode,
            description: item.description,
            descriptionId: item.descriptionId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            discountAmount: item.discountAmount || 0,
            lineTotal: item.lineTotal,
            ppnAmount: item.ppnAmount,
            quantityReceived: 0,
            quantityInvoiced: 0,
            quantityOutstanding: item.quantityOutstanding,
            expenseCategoryId: item.expenseCategoryId,
            assetId: item.assetId,
          })),
        },
      },
      include: {
        vendor: true,
        project: true,
        items: {
          include: {
            expenseCategory: true,
            asset: true,
          },
        },
      },
    });

    return po;
  }

  /**
   * Find all purchase orders with filtering and pagination
   */
  async findAll(query: PurchaseOrderQueryDto, userRole: string) {
    const {
      page = 1,
      limit = 20,
      sortBy = "poDate",
      sortOrder = "desc",
      ...filters
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (filters.search) {
      where.OR = [
        { poNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
        { vendor: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Vendor filter
    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    // Project filter
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.poDate = {};
      if (filters.startDate) where.poDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.poDate.lte = new Date(filters.endDate);
    }

    // Execute query
    const [pos, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          vendor: { select: { id: true, vendorCode: true, name: true } },
          project: { select: { id: true, number: true, description: true } },
          _count: {
            select: {
              items: true,
              goodsReceipts: true,
              vendorInvoices: true,
            },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: pos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one purchase order by ID
   */
  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        project: true,
        items: {
          include: {
            expenseCategory: true,
            asset: true,
          },
          orderBy: { lineNumber: "asc" },
        },
        goodsReceipts: {
          select: {
            id: true,
            grNumber: true,
            grDate: true,
            status: true,
          },
          orderBy: { grDate: "desc" },
        },
        vendorInvoices: {
          select: {
            id: true,
            vendorInvoiceNumber: true,
            internalNumber: true,
            invoiceDate: true,
            matchingStatus: true,
            totalAmount: true,
          },
          orderBy: { invoiceDate: "desc" },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase order not found: ${id}`);
    }

    return po;
  }

  /**
   * Update a purchase order (only in DRAFT status)
   */
  async update(
    id: string,
    userId: string,
    updatePODto: UpdatePurchaseOrderDto,
  ) {
    const po = await this.findOne(id);

    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT purchase orders can be updated",
      );
    }

    // Validate amounts if changed
    if (updatePODto.items || updatePODto.totalAmount) {
      this.validateAmounts(updatePODto as any);
    }

    // Destructure items from updatePODto to handle separately
    const { items, ...poDataWithoutItems } = updatePODto;

    // Update PO
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...poDataWithoutItems,
        updatedBy: userId,
        // Handle items update separately if provided
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              lineNumber: item.lineNumber,
              itemType: item.itemType,
              itemCode: item.itemCode,
              description: item.description,
              descriptionId: item.descriptionId,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent || 0,
              discountAmount: item.discountAmount || 0,
              lineTotal: item.lineTotal,
              ppnAmount: item.ppnAmount,
              quantityReceived: 0,
              quantityInvoiced: 0,
              quantityOutstanding: item.quantityOutstanding,
              expenseCategoryId: item.expenseCategoryId,
              assetId: item.assetId,
            })),
          },
        }),
      },
      include: {
        vendor: true,
        project: true,
        items: { include: { expenseCategory: true, asset: true } },
      },
    });

    return updated;
  }

  /**
   * Delete a purchase order (only in DRAFT status)
   */
  async remove(id: string) {
    const po = await this.findOne(id);

    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT purchase orders can be deleted",
      );
    }

    // Delete items first
    await this.prisma.purchaseOrderItem.deleteMany({
      where: { poId: id },
    });

    // Delete PO
    await this.prisma.purchaseOrder.delete({ where: { id } });

    return { message: "Purchase order deleted successfully" };
  }

  /**
   * Approve purchase order
   */
  async approve(
    id: string,
    userId: string,
    approveDto: ApprovePurchaseOrderDto,
  ) {
    const po = await this.findOne(id);

    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT purchase orders can be approved",
      );
    }

    // Update PO status
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: POStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
      },
      include: {
        vendor: true,
        project: true,
        items: true,
      },
    });

    // Journal entry creation can be added later if needed

    return updated;
  }

  /**
   * Reject purchase order
   */
  async reject(id: string, userId: string, rejectDto: RejectPurchaseOrderDto) {
    const po = await this.findOne(id);

    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT purchase orders can be rejected",
      );
    }

    // Update PO status (use CANCELLED since REJECTED doesn't exist)
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: POStatus.CANCELLED,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: rejectDto.rejectionReason,
        closureReason: `Rejected: ${rejectDto.rejectionReason || "No reason provided"}`,
      },
    });

    return updated;
  }

  /**
   * Cancel purchase order
   */
  async cancel(id: string, userId: string, cancelDto: CancelPurchaseOrderDto) {
    const po = await this.findOne(id);

    if (po.status !== POStatus.APPROVED && po.status !== POStatus.PARTIAL) {
      throw new BadRequestException(
        "Only APPROVED or PARTIAL purchase orders can be cancelled",
      );
    }

    // Check if any items have been received
    const hasReceipts = await this.prisma.goodsReceipt.count({
      where: { poId: id, status: "POSTED" },
    });

    if (hasReceipts > 0) {
      throw new BadRequestException(
        "Cannot cancel PO with posted goods receipts. Close the PO instead.",
      );
    }

    // Update PO status
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: POStatus.CANCELLED,
        isClosed: true,
        closedBy: userId,
        closedAt: new Date(),
        closureReason: cancelDto.cancellationReason || "Cancelled",
      },
    });

    return updated;
  }

  /**
   * Close purchase order (force close partially received POs)
   */
  async close(id: string, userId: string) {
    const po = await this.findOne(id);

    if (po.status !== POStatus.APPROVED && po.status !== POStatus.PARTIAL) {
      throw new BadRequestException(
        "Only APPROVED or PARTIAL purchase orders can be closed",
      );
    }

    // Update PO status
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: POStatus.CLOSED,
        isClosed: true,
        closedBy: userId,
        closedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Get purchase order statistics
   */
  async getStatistics(filters?: {
    vendorId?: string;
    projectId?: string;
    status?: POStatus;
  }) {
    const where: any = {};

    if (filters?.vendorId) where.vendorId = filters.vendorId;
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.status) where.status = filters.status;

    const [totalPOs, totalAmount, byStatus, byType, avgPOValue] =
      await Promise.all([
        this.prisma.purchaseOrder.count({ where }),
        this.prisma.purchaseOrder.aggregate({
          where,
          _sum: { totalAmount: true },
        }),
        this.prisma.purchaseOrder.groupBy({
          by: ["status"],
          where,
          _count: true,
          _sum: { totalAmount: true },
        }),
        // Skip groupBy type since poType doesn't exist
        Promise.resolve([]),
        this.prisma.purchaseOrder.aggregate({
          where,
          _avg: { totalAmount: true },
        }),
      ]);

    return {
      totalPOs,
      totalAmount: totalAmount._sum.totalAmount
        ? Number(totalAmount._sum.totalAmount)
        : 0,
      avgPOValue: avgPOValue._avg.totalAmount
        ? Number(avgPOValue._avg.totalAmount)
        : 0,
      byStatus,
      byType,
    };
  }

  /**
   * Generate unique PO number
   * Format: PO-YYYY-NNNNN
   */
  private async generatePONumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const lastPO = await this.prisma.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: prefix } },
      orderBy: { poNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastPO) {
      const lastNumber = parseInt(lastPO.poNumber.split("-")[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

  /**
   * Validate line items
   */
  private validateLineItems(items: any[]): void {
    if (!items || items.length === 0) {
      throw new BadRequestException(
        "Purchase order must have at least one item",
      );
    }

    // Check for duplicate line numbers
    const lineNumbers = items.map((item) => item.lineNumber);
    const uniqueLineNumbers = new Set(lineNumbers);
    if (lineNumbers.length !== uniqueLineNumbers.size) {
      throw new BadRequestException("Duplicate line numbers found");
    }
  }

  /**
   * Validate amounts calculation
   */
  private validateAmounts(data: any): void {
    if (!data.items || !data.subtotal) return;

    // Validate subtotal matches sum of line totals
    const calculatedSubtotal = data.items.reduce(
      (sum: number, item: any) => sum + Number(item.lineTotal),
      0,
    );
    if (Math.abs(calculatedSubtotal - Number(data.subtotal)) > 0.01) {
      throw new BadRequestException(
        "Subtotal does not match sum of line totals",
      );
    }

    // Validate total calculation
    const netAmount = Number(data.subtotal) - Number(data.discountAmount || 0);
    const expectedTotal =
      netAmount + Number(data.ppnAmount) - Number(data.pphAmount || 0);
    if (Math.abs(expectedTotal - Number(data.totalAmount)) > 0.01) {
      throw new BadRequestException("Total amount calculation is incorrect");
    }
  }
}
