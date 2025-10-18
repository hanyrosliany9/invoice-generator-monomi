import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JournalService } from '../accounting/services/journal.service';
import {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
  GoodsReceiptQueryDto,
  InspectGoodsReceiptDto,
  PostGoodsReceiptDto,
  CancelGoodsReceiptDto,
} from './dto';
import { GRStatus, POStatus } from '@prisma/client';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * Create a new goods receipt from a PO
   */
  async create(userId: string, createGRDto: CreateGoodsReceiptDto) {
    // Validate PO exists and is approved
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: createGRDto.poId },
      include: {
        vendor: true,
        items: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase order not found: ${createGRDto.poId}`);
    }

    if (po.status !== POStatus.APPROVED && po.status !== POStatus.PARTIAL && po.status !== POStatus.SENT) {
      throw new BadRequestException('Can only create GR for APPROVED, SENT, or PARTIAL purchase orders');
    }

    // Validate all PO items exist and have outstanding quantities
    for (const item of createGRDto.items) {
      const poItem = po.items.find(pi => pi.id === item.poItemId);
      if (!poItem) {
        throw new NotFoundException(`PO item not found: ${item.poItemId}`);
      }

      const outstanding = Number(poItem.quantityOutstanding);
      if (outstanding <= 0) {
        throw new BadRequestException(`PO item ${item.poItemId} has no outstanding quantity to receive`);
      }

      if (item.receivedQuantity > outstanding) {
        throw new BadRequestException(
          `Received quantity (${item.receivedQuantity}) exceeds outstanding quantity (${outstanding})`,
        );
      }

      // Validate accepted + rejected = received
      const totalAcceptedRejected = item.acceptedQuantity + (item.rejectedQuantity || 0);
      if (Math.abs(totalAcceptedRejected - item.receivedQuantity) > 0.001) {
        throw new BadRequestException(
          `Accepted (${item.acceptedQuantity}) + Rejected (${item.rejectedQuantity || 0}) must equal Received (${item.receivedQuantity})`,
        );
      }
    }

    // Generate GR number
    const grNumber = await this.generateGRNumber();

    // Create GR with items
    const gr = await this.prisma.goodsReceipt.create({
      data: {
        grNumber,
        grDate: createGRDto.grDate,
        poId: createGRDto.poId,
        vendorId: po.vendorId,
        deliveryNoteNumber: createGRDto.deliveryNoteNumber,
        receivedBy: createGRDto.receivedBy,
        receivedAt: new Date(),
        warehouseLocation: createGRDto.warehouseLocation,
        inspectionStatus: createGRDto.inspectionStatus,
        inspectedBy: createGRDto.inspectedBy,
        inspectionNotes: createGRDto.inspectionNotes,
        notes: createGRDto.notes,
        notesId: createGRDto.notesId,
        status: GRStatus.DRAFT,
        createdBy: userId,
        items: {
          create: createGRDto.items.map(item => ({
            poItemId: item.poItemId,
            lineNumber: item.lineNumber,
            orderedQuantity: item.orderedQuantity,
            receivedQuantity: item.receivedQuantity,
            acceptedQuantity: item.acceptedQuantity,
            rejectedQuantity: item.rejectedQuantity || 0,
            qualityStatus: item.qualityStatus,
            rejectionReason: item.rejectionReason,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: {
        vendor: true,
        po: true,
        items: {
          include: {
            poItem: true,
          },
        },
      },
    });

    return gr;
  }

  /**
   * Find all goods receipts with filtering and pagination
   */
  async findAll(query: GoodsReceiptQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'grDate',
      sortOrder = 'desc',
      ...filters
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (filters.search) {
      where.OR = [
        { grNumber: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
        { deliveryNoteNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Status filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.inspectionStatus) {
      where.inspectionStatus = filters.inspectionStatus;
    }

    // PO filter
    if (filters.poId) {
      where.poId = filters.poId;
    }

    // Vendor filter
    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.grDate = {};
      if (filters.startDate) where.grDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.grDate.lte = new Date(filters.endDate);
    }

    // Execute query
    const [grs, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          vendor: { select: { id: true, vendorCode: true, name: true } },
          po: { select: { id: true, poNumber: true } },
          _count: {
            select: {
              items: true,
              vendorInvoices: true,
            },
          },
        },
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    return {
      data: grs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one goods receipt by ID
   */
  async findOne(id: string) {
    const gr = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        vendor: true,
        po: true,
        items: {
          include: {
            poItem: {
              include: {
                expenseCategory: true,
                asset: true,
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
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
          orderBy: { invoiceDate: 'desc' },
        },
      },
    });

    if (!gr) {
      throw new NotFoundException(`Goods receipt not found: ${id}`);
    }

    return gr;
  }

  /**
   * Update a goods receipt (only in DRAFT status)
   */
  async update(id: string, userId: string, updateGRDto: UpdateGoodsReceiptDto) {
    const gr = await this.findOne(id);

    if (gr.status !== GRStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT goods receipts can be updated');
    }

    // Destructure items from updateGRDto to handle separately
    const { items, ...grDataWithoutItems } = updateGRDto;

    // Update GR
    const updated = await this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        ...grDataWithoutItems,
        updatedBy: userId,
        // Handle items update separately if provided
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map(item => ({
              poItemId: item.poItemId,
              lineNumber: item.lineNumber,
              orderedQuantity: item.orderedQuantity,
              receivedQuantity: item.receivedQuantity,
              acceptedQuantity: item.acceptedQuantity,
              rejectedQuantity: item.rejectedQuantity || 0,
              qualityStatus: item.qualityStatus,
              rejectionReason: item.rejectionReason,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        }),
      },
      include: {
        vendor: true,
        po: true,
        items: { include: { poItem: true } },
      },
    });

    return updated;
  }

  /**
   * Delete a goods receipt (only in DRAFT status)
   */
  async remove(id: string) {
    const gr = await this.findOne(id);

    if (gr.status !== GRStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT goods receipts can be deleted');
    }

    // Delete items first
    await this.prisma.goodsReceiptItem.deleteMany({
      where: { grId: id },
    });

    // Delete GR
    await this.prisma.goodsReceipt.delete({ where: { id } });

    return { message: 'Goods receipt deleted successfully' };
  }

  /**
   * Record inspection results
   */
  async inspect(id: string, userId: string, inspectDto: InspectGoodsReceiptDto) {
    const gr = await this.findOne(id);

    if (gr.status === GRStatus.POSTED || gr.status === GRStatus.CANCELLED) {
      throw new BadRequestException('Cannot inspect POSTED or CANCELLED goods receipts');
    }

    const updated = await this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        status: GRStatus.INSPECTED,
        inspectionStatus: inspectDto.inspectionStatus,
        inspectedBy: userId,
        inspectedAt: new Date(),
        inspectionNotes: inspectDto.inspectionNotes,
        updatedBy: userId,
      },
      include: {
        vendor: true,
        po: true,
        items: true,
      },
    });

    return updated;
  }

  /**
   * Post goods receipt (updates PO quantities, creates journal entry)
   */
  async post(id: string, userId: string, postDto: PostGoodsReceiptDto) {
    const gr = await this.findOne(id);

    if (gr.status === GRStatus.POSTED) {
      throw new BadRequestException('Goods receipt is already posted');
    }

    if (gr.status === GRStatus.CANCELLED) {
      throw new BadRequestException('Cannot post cancelled goods receipt');
    }

    // Start transaction
    return await this.prisma.$transaction(async (tx) => {
      // Update PO item quantities
      for (const grItem of gr.items) {
        const poItem = await tx.purchaseOrderItem.findUnique({
          where: { id: grItem.poItemId },
        });

        if (!poItem) {
          throw new NotFoundException(`PO item not found: ${grItem.poItemId}`);
        }

        const newQtyReceived = Number(poItem.quantityReceived) + Number(grItem.acceptedQuantity);
        const newQtyOutstanding = Number(poItem.quantity) - newQtyReceived;

        await tx.purchaseOrderItem.update({
          where: { id: grItem.poItemId },
          data: {
            quantityReceived: newQtyReceived,
            quantityOutstanding: newQtyOutstanding,
          },
        });
      }

      // Check if PO is fully or partially received
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { poId: gr.poId },
      });

      const allFullyReceived = poItems.every(item => Number(item.quantityOutstanding) <= 0);
      const anyPartiallyReceived = poItems.some(
        item => Number(item.quantityReceived) > 0 && Number(item.quantityOutstanding) > 0,
      );

      let newPOStatus = gr.po.status;
      if (allFullyReceived) {
        newPOStatus = POStatus.COMPLETED;
      } else if (anyPartiallyReceived) {
        newPOStatus = POStatus.PARTIAL;
      }

      // Update PO status
      await tx.purchaseOrder.update({
        where: { id: gr.poId },
        data: { status: newPOStatus },
      });

      // Calculate total value
      const totalValue = gr.items.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      );

      // Create journal entry for GR accrual (optional - can be added later)
      // await this.journalService.createGRJournalEntry(...)

      // Update GR status
      const posted = await tx.goodsReceipt.update({
        where: { id },
        data: {
          status: GRStatus.POSTED,
          isPosted: true,
          postedAt: new Date(),
          notes: postDto.notes || gr.notes,
          updatedBy: userId,
        },
        include: {
          vendor: true,
          po: true,
          items: { include: { poItem: true } },
        },
      });

      return posted;
    });
  }

  /**
   * Cancel goods receipt
   */
  async cancel(id: string, userId: string, cancelDto: CancelGoodsReceiptDto) {
    const gr = await this.findOne(id);

    if (gr.status === GRStatus.POSTED) {
      throw new BadRequestException('Cannot cancel posted goods receipt. Create a return instead.');
    }

    if (gr.status === GRStatus.CANCELLED) {
      throw new BadRequestException('Goods receipt is already cancelled');
    }

    const updated = await this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        status: GRStatus.CANCELLED,
        notes: `Cancelled: ${cancelDto.cancellationReason}`,
        updatedBy: userId,
      },
    });

    return updated;
  }

  /**
   * Get goods receipt statistics
   */
  async getStatistics(filters?: {
    poId?: string;
    vendorId?: string;
    status?: GRStatus;
  }) {
    const where: any = {};

    if (filters?.poId) where.poId = filters.poId;
    if (filters?.vendorId) where.vendorId = filters.vendorId;
    if (filters?.status) where.status = filters.status;

    const [totalGRs, byStatus, byInspectionStatus] = await Promise.all([
      this.prisma.goodsReceipt.count({ where }),
      this.prisma.goodsReceipt.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.goodsReceipt.groupBy({
        by: ['inspectionStatus'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalGRs,
      byStatus,
      byInspectionStatus,
    };
  }

  /**
   * Generate unique GR number
   * Format: GR-YYYY-MM-NNNNN
   */
  private async generateGRNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `GR-${year}-${month}-`;

    const lastGR = await this.prisma.goodsReceipt.findFirst({
      where: { grNumber: { startsWith: prefix } },
      orderBy: { grNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastGR) {
      const lastNumber = parseInt(lastGR.grNumber.split('-')[3]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }
}
