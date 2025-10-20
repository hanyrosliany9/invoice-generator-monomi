import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalService } from "../accounting/services/journal.service";
import {
  CreateVendorInvoiceDto,
  UpdateVendorInvoiceDto,
  VendorInvoiceQueryDto,
  MatchVendorInvoiceDto,
  ApproveVendorInvoiceDto,
  RejectVendorInvoiceDto,
  PostVendorInvoiceDto,
  CancelVendorInvoiceDto,
} from "./dto";
import { VIStatus, MatchingStatus } from "@prisma/client";

@Injectable()
export class VendorInvoicesService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * Create a new vendor invoice
   */
  async create(userId: string, createVIDto: CreateVendorInvoiceDto) {
    // Validate vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: createVIDto.vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor not found: ${createVIDto.vendorId}`);
    }

    if (!vendor.isActive) {
      throw new BadRequestException(
        "Cannot create invoice for inactive vendor",
      );
    }

    // Validate PO if provided
    if (createVIDto.poId) {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: createVIDto.poId },
      });

      if (!po) {
        throw new NotFoundException(
          `Purchase order not found: ${createVIDto.poId}`,
        );
      }

      if (po.vendorId !== createVIDto.vendorId) {
        throw new BadRequestException(
          "PO vendor does not match invoice vendor",
        );
      }
    }

    // Validate GR if provided
    if (createVIDto.grId) {
      const gr = await this.prisma.goodsReceipt.findUnique({
        where: { id: createVIDto.grId },
      });

      if (!gr) {
        throw new NotFoundException(
          `Goods receipt not found: ${createVIDto.grId}`,
        );
      }

      if (gr.vendorId !== createVIDto.vendorId) {
        throw new BadRequestException(
          "GR vendor does not match invoice vendor",
        );
      }
    }

    // Validate amounts
    this.validateAmounts(createVIDto);

    // Generate internal number
    const internalNumber = await this.generateInternalNumber();

    // Create VI with items
    const vi = await this.prisma.vendorInvoice.create({
      data: {
        vendorInvoiceNumber: createVIDto.vendorInvoiceNumber,
        internalNumber,
        invoiceDate: createVIDto.invoiceDate,
        vendorId: createVIDto.vendorId,
        poId: createVIDto.poId,
        grId: createVIDto.grId,
        subtotal: createVIDto.subtotal,
        discountAmount: createVIDto.discountAmount || 0,
        ppnAmount: createVIDto.ppnAmount,
        pphAmount: createVIDto.pphAmount || 0,
        totalAmount: createVIDto.totalAmount,
        eFakturNSFP: createVIDto.eFakturNSFP,
        eFakturQRCode: createVIDto.eFakturQRCode,
        eFakturStatus: createVIDto.eFakturStatus,
        paymentTerms: createVIDto.paymentTerms,
        dueDate: createVIDto.dueDate,
        approvalStatus: createVIDto.approvalStatus,
        description: createVIDto.description,
        descriptionId: createVIDto.descriptionId,
        notes: createVIDto.notes,
        status: VIStatus.DRAFT,
        matchingStatus: MatchingStatus.UNMATCHED,
        createdBy: userId,
        items: {
          create: createVIDto.items.map((item) => ({
            poItemId: item.poItemId,
            lineNumber: item.lineNumber,
            description: item.description,
            descriptionId: item.descriptionId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount || 0,
            lineTotal: item.lineTotal,
            ppnAmount: item.ppnAmount,
            varianceReason: item.varianceReason,
          })),
        },
      },
      include: {
        vendor: true,
        po: true,
        gr: true,
        items: {
          include: {
            poItem: true,
          },
        },
      },
    });

    return vi;
  }

  /**
   * Find all vendor invoices with filtering and pagination
   */
  async findAll(query: VendorInvoiceQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = "invoiceDate",
      sortOrder = "desc",
      ...filters
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (filters.search) {
      where.OR = [
        {
          vendorInvoiceNumber: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        { internalNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Status filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.matchingStatus) {
      where.matchingStatus = filters.matchingStatus;
    }

    if (filters.eFakturStatus) {
      where.eFakturStatus = filters.eFakturStatus;
    }

    // Reference filters
    if (filters.poId) {
      where.poId = filters.poId;
    }

    if (filters.grId) {
      where.grId = filters.grId;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.invoiceDate = {};
      if (filters.startDate)
        where.invoiceDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.invoiceDate.lte = new Date(filters.endDate);
    }

    // Execute query
    const [vis, total] = await Promise.all([
      this.prisma.vendorInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          vendor: { select: { id: true, vendorCode: true, name: true } },
          po: { select: { id: true, poNumber: true } },
          gr: { select: { id: true, grNumber: true } },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.vendorInvoice.count({ where }),
    ]);

    return {
      data: vis,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one vendor invoice by ID
   */
  async findOne(id: string) {
    const vi = await this.prisma.vendorInvoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        po: {
          include: {
            items: true,
          },
        },
        gr: {
          include: {
            items: {
              include: {
                poItem: true,
              },
            },
          },
        },
        items: {
          include: {
            poItem: true,
          },
          orderBy: { lineNumber: "asc" },
        },
        accountsPayable: true,
      },
    });

    if (!vi) {
      throw new NotFoundException(`Vendor invoice not found: ${id}`);
    }

    return vi;
  }

  /**
   * Update a vendor invoice (only in DRAFT status)
   */
  async update(
    id: string,
    userId: string,
    updateVIDto: UpdateVendorInvoiceDto,
  ) {
    const vi = await this.findOne(id);

    if (vi.status !== VIStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT vendor invoices can be updated",
      );
    }

    // Validate amounts if changed
    if (updateVIDto.items || updateVIDto.totalAmount) {
      this.validateAmounts(updateVIDto as any);
    }

    // Destructure items from updateVIDto to handle separately
    const { items, ...viDataWithoutItems } = updateVIDto;

    // Update VI
    const updated = await this.prisma.vendorInvoice.update({
      where: { id },
      data: {
        ...viDataWithoutItems,
        updatedBy: userId,
        // Handle items update separately if provided
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              poItemId: item.poItemId,
              lineNumber: item.lineNumber,
              description: item.description,
              descriptionId: item.descriptionId,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount || 0,
              lineTotal: item.lineTotal,
              ppnAmount: item.ppnAmount,
              varianceReason: item.varianceReason,
            })),
          },
        }),
      },
      include: {
        vendor: true,
        po: true,
        gr: true,
        items: { include: { poItem: true } },
      },
    });

    return updated;
  }

  /**
   * Delete a vendor invoice (only in DRAFT status)
   */
  async remove(id: string) {
    const vi = await this.findOne(id);

    if (vi.status !== VIStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT vendor invoices can be deleted",
      );
    }

    // Delete items first
    await this.prisma.vendorInvoiceItem.deleteMany({
      where: { viId: id },
    });

    // Delete VI
    await this.prisma.vendorInvoice.delete({ where: { id } });

    return { message: "Vendor invoice deleted successfully" };
  }

  /**
   * Perform three-way matching (PO-GR-VI)
   * This is the critical matching logic
   */
  async match(id: string, userId: string, matchDto: MatchVendorInvoiceDto) {
    const vi = await this.findOne(id);

    if (!vi.poId && !vi.grId) {
      throw new BadRequestException(
        "Cannot match invoice without PO or GR reference",
      );
    }

    const priceTolerance = matchDto.priceTolerance || 5; // 5%
    const quantityTolerance = matchDto.quantityTolerance || 2; // 2%

    let matchingStatus: MatchingStatus = MatchingStatus.MATCHED;
    let priceVariance = 0;
    let quantityVariance = 0;
    let withinTolerance = true;

    // Match each invoice item
    for (const viItem of vi.items) {
      if (!viItem.poItemId) {
        // No PO reference - cannot match
        matchingStatus = MatchingStatus.PARTIAL_MATCH;
        continue;
      }

      const poItem = vi.po?.items.find((pi) => pi.id === viItem.poItemId);
      if (!poItem) {
        matchingStatus = MatchingStatus.FAILED;
        continue;
      }

      // Price variance check
      const poPrice = Number(poItem.unitPrice);
      const viPrice = Number(viItem.unitPrice);
      const priceDiff = Math.abs(viPrice - poPrice);
      const priceVariancePercent = (priceDiff / poPrice) * 100;

      if (priceVariancePercent > priceTolerance) {
        matchingStatus = MatchingStatus.VARIANCE;
        withinTolerance = false;
        priceVariance += priceDiff * Number(viItem.quantity);
      }

      // Quantity variance check (if GR exists)
      if (vi.grId) {
        const grItem = vi.gr?.items.find(
          (gi) => gi.poItemId === viItem.poItemId,
        );
        if (grItem) {
          const grQty = Number(grItem.acceptedQuantity);
          const viQty = Number(viItem.quantity);
          const qtyDiff = Math.abs(viQty - grQty);
          const qtyVariancePercent = (qtyDiff / grQty) * 100;

          if (qtyVariancePercent > quantityTolerance) {
            matchingStatus = MatchingStatus.VARIANCE;
            withinTolerance = false;
            quantityVariance += qtyDiff;
          }
        }
      }

      // Mark item as matched
      await this.prisma.vendorInvoiceItem.update({
        where: { id: viItem.id },
        data: { isMatched: true },
      });
    }

    // Update VI with matching results
    const matched = await this.prisma.vendorInvoice.update({
      where: { id },
      data: {
        status: VIStatus.PENDING_MATCH,
        matchingStatus,
        matchedBy: userId,
        matchedAt: new Date(),
        matchingNotes: matchDto.matchingNotes,
        priceVariance,
        quantityVariance,
        withinTolerance,
        updatedBy: userId,
      },
      include: {
        vendor: true,
        po: true,
        gr: true,
        items: { include: { poItem: true } },
      },
    });

    return matched;
  }

  /**
   * Approve vendor invoice
   */
  async approve(
    id: string,
    userId: string,
    approveDto: ApproveVendorInvoiceDto,
  ) {
    const vi = await this.findOne(id);

    if (vi.status === VIStatus.APPROVED || vi.status === VIStatus.POSTED) {
      throw new BadRequestException(
        "Vendor invoice is already approved/posted",
      );
    }

    if (vi.status === VIStatus.CANCELLED) {
      throw new BadRequestException("Cannot approve cancelled vendor invoice");
    }

    const updated = await this.prisma.vendorInvoice.update({
      where: { id },
      data: {
        status: VIStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
        notes: approveDto.notes || vi.notes,
        updatedBy: userId,
      },
      include: {
        vendor: true,
        po: true,
        gr: true,
        items: true,
      },
    });

    return updated;
  }

  /**
   * Reject vendor invoice
   */
  async reject(id: string, userId: string, rejectDto: RejectVendorInvoiceDto) {
    const vi = await this.findOne(id);

    if (vi.status === VIStatus.POSTED || vi.status === VIStatus.PAID) {
      throw new BadRequestException("Cannot reject posted/paid vendor invoice");
    }

    const updated = await this.prisma.vendorInvoice.update({
      where: { id },
      data: {
        status: VIStatus.CANCELLED,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: rejectDto.rejectionReason,
        notes: `Rejected: ${rejectDto.rejectionReason}`,
        updatedBy: userId,
      },
    });

    return updated;
  }

  /**
   * Post vendor invoice (creates AP and journal entry)
   */
  async post(id: string, userId: string, postDto: PostVendorInvoiceDto) {
    const vi = await this.findOne(id);

    if (vi.status === VIStatus.POSTED) {
      throw new BadRequestException("Vendor invoice is already posted");
    }

    if (vi.status !== VIStatus.APPROVED) {
      throw new BadRequestException(
        "Only APPROVED vendor invoices can be posted",
      );
    }

    // Start transaction
    return await this.prisma.$transaction(async (tx) => {
      // Create Accounts Payable entry
      const ap = await tx.accountsPayable.create({
        data: {
          apNumber: await this.generateAPNumber(),
          sourceType: "VENDOR_INVOICE",
          vendorId: vi.vendorId,
          originalAmount: vi.totalAmount,
          outstandingAmount: vi.totalAmount,
          invoiceDate: vi.invoiceDate,
          dueDate: vi.dueDate,
          paymentStatus: "UNPAID",
          createdBy: userId,
        },
      });

      // Create journal entry (optional - can be added later)
      // await this.journalService.createVIJournalEntry(...)

      // Update VI status
      const posted = await tx.vendorInvoice.update({
        where: { id },
        data: {
          status: VIStatus.POSTED,
          accountsPayableId: ap.id,
          notes: postDto.notes || vi.notes,
          updatedBy: userId,
        },
        include: {
          vendor: true,
          po: true,
          gr: true,
          items: { include: { poItem: true } },
          accountsPayable: true,
        },
      });

      return posted;
    });
  }

  /**
   * Cancel vendor invoice
   */
  async cancel(id: string, userId: string, cancelDto: CancelVendorInvoiceDto) {
    const vi = await this.findOne(id);

    if (vi.status === VIStatus.POSTED || vi.status === VIStatus.PAID) {
      throw new BadRequestException("Cannot cancel posted/paid vendor invoice");
    }

    const updated = await this.prisma.vendorInvoice.update({
      where: { id },
      data: {
        status: VIStatus.CANCELLED,
        notes: `Cancelled: ${cancelDto.cancellationReason}`,
        updatedBy: userId,
      },
    });

    return updated;
  }

  /**
   * Get vendor invoice statistics
   */
  async getStatistics(filters?: {
    vendorId?: string;
    poId?: string;
    grId?: string;
    status?: VIStatus;
  }) {
    const where: any = {};

    if (filters?.vendorId) where.vendorId = filters.vendorId;
    if (filters?.poId) where.poId = filters.poId;
    if (filters?.grId) where.grId = filters.grId;
    if (filters?.status) where.status = filters.status;

    const [totalVIs, totalAmount, byStatus, byMatchingStatus] =
      await Promise.all([
        this.prisma.vendorInvoice.count({ where }),
        this.prisma.vendorInvoice.aggregate({
          where,
          _sum: { totalAmount: true },
        }),
        this.prisma.vendorInvoice.groupBy({
          by: ["status"],
          where,
          _count: true,
          _sum: { totalAmount: true },
        }),
        this.prisma.vendorInvoice.groupBy({
          by: ["matchingStatus"],
          where,
          _count: true,
        }),
      ]);

    return {
      totalVIs,
      totalAmount: totalAmount._sum.totalAmount
        ? Number(totalAmount._sum.totalAmount)
        : 0,
      byStatus,
      byMatchingStatus,
    };
  }

  /**
   * Generate unique internal number
   * Format: VI-YYYY-MM-NNNNN
   */
  private async generateInternalNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `VI-${year}-${month}-`;

    const lastVI = await this.prisma.vendorInvoice.findFirst({
      where: { internalNumber: { startsWith: prefix } },
      orderBy: { internalNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastVI) {
      const lastNumber = parseInt(lastVI.internalNumber.split("-")[3]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

  /**
   * Generate unique AP number
   * Format: AP-YYYY-MM-NNNNN
   */
  private async generateAPNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `AP-${year}-${month}-`;

    const lastAP = await this.prisma.accountsPayable.findFirst({
      where: { apNumber: { startsWith: prefix } },
      orderBy: { apNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastAP) {
      const lastNumber = parseInt(lastAP.apNumber.split("-")[3]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
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
