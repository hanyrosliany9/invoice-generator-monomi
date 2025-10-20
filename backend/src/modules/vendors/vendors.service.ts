import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVendorDto, UpdateVendorDto, VendorQueryDto } from "./dto";
import { PKPStatus } from "@prisma/client";

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new vendor
   */
  async create(userId: string, createVendorDto: CreateVendorDto) {
    // Validate NPWP if vendor is PKP
    if (createVendorDto.pkpStatus === PKPStatus.PKP) {
      if (!createVendorDto.npwp) {
        throw new BadRequestException("NPWP is required for PKP vendors");
      }
      this.validateNPWP(createVendorDto.npwp);
    }

    // Generate vendor code if not provided
    const vendorCode =
      createVendorDto.vendorCode || (await this.generateVendorCode());

    // Check if vendor code already exists
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { vendorCode: vendorCode },
    });

    if (existingVendor) {
      throw new BadRequestException(
        `Vendor with code ${vendorCode} already exists`,
      );
    }

    // Create vendor
    const vendor = await this.prisma.vendor.create({
      data: {
        ...createVendorDto,
        vendorCode: vendorCode,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return vendor;
  }

  /**
   * Find all vendors with filtering and pagination
   */
  async findAll(query: VendorQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = "name",
      sortOrder = "asc",
      ...filters
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { vendorCode: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
        { npwp: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Type filter
    if (filters.type) {
      where.vendorType = filters.type;
    }

    // PKP status filter
    if (filters.pkpStatus) {
      where.pkpStatus = filters.pkpStatus;
    }

    // Category filter
    if (filters.category) {
      where.industryType = filters.category;
    }

    // Active status filter
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // City filter
    if (filters.city) {
      where.city = filters.city;
    }

    // Province filter
    if (filters.province) {
      where.province = filters.province;
    }

    // Execute query
    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one vendor by ID
   */
  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          select: {
            id: true,
            poNumber: true,
            poDate: true,
            status: true,
            totalAmount: true,
          },
          orderBy: { poDate: "desc" },
          take: 10,
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
          take: 10,
        },
        expenses: {
          select: {
            id: true,
            expenseNumber: true,
            expenseDate: true,
            status: true,
            totalAmount: true,
          },
          orderBy: { expenseDate: "desc" },
          take: 10,
        },
        assets: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            category: true,
            purchaseDate: true,
          },
          orderBy: { purchaseDate: "desc" },
          take: 10,
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor not found: ${id}`);
    }

    return vendor;
  }

  /**
   * Update a vendor
   */
  async update(id: string, userId: string, updateVendorDto: UpdateVendorDto) {
    // Check if vendor exists
    await this.findOne(id);

    // Validate NPWP if changing to PKP status
    if (updateVendorDto.pkpStatus === PKPStatus.PKP) {
      if (!updateVendorDto.npwp) {
        throw new BadRequestException("NPWP is required for PKP vendors");
      }
      this.validateNPWP(updateVendorDto.npwp);
    }

    // Update vendor
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...updateVendorDto,
        updatedBy: userId,
      },
    });

    return vendor;
  }

  /**
   * Delete a vendor (soft delete by setting isActive to false)
   */
  async remove(id: string) {
    // Check if vendor exists
    const vendor = await this.findOne(id);

    // Check if vendor has any related records
    const [poCount, viCount, expenseCount] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: { vendorId: id } }),
      this.prisma.vendorInvoice.count({ where: { vendorId: id } }),
      this.prisma.expense.count({ where: { vendorId: id } }),
    ]);

    if (poCount > 0 || viCount > 0 || expenseCount > 0) {
      throw new BadRequestException(
        `Cannot delete vendor: Has ${poCount} PO(s), ${viCount} invoice(s), ${expenseCount} expense(s). Set as inactive instead.`,
      );
    }

    // If no relations, perform hard delete
    await this.prisma.vendor.delete({ where: { id } });

    return { message: "Vendor deleted successfully" };
  }

  /**
   * Get vendor statistics
   */
  async getStatistics(filters?: {
    type?: string;
    pkpStatus?: PKPStatus;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (filters?.type) where.vendorType = filters.type;
    if (filters?.pkpStatus) where.pkpStatus = filters.pkpStatus;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [
      totalVendors,
      byType,
      byPKPStatus,
      activeVendors,
      vendorsWithPOs,
      vendorsWithInvoices,
    ] = await Promise.all([
      this.prisma.vendor.count({ where }),
      this.prisma.vendor.groupBy({
        by: ["vendorType"],
        where,
        _count: true,
      }),
      this.prisma.vendor.groupBy({
        by: ["pkpStatus"],
        where,
        _count: true,
      }),
      this.prisma.vendor.count({
        where: { ...where, isActive: true },
      }),
      this.prisma.vendor.count({
        where: {
          ...where,
          purchaseOrders: { some: {} },
        },
      }),
      this.prisma.vendor.count({
        where: {
          ...where,
          vendorInvoices: { some: {} },
        },
      }),
    ]);

    return {
      totalVendors,
      activeVendors,
      inactiveVendors: totalVendors - activeVendors,
      vendorsWithPOs,
      vendorsWithInvoices,
      byType,
      byPKPStatus,
    };
  }

  /**
   * Generate unique vendor code
   * Format: VEN-YYYY-NNNNN
   */
  private async generateVendorCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VEN-${year}-`;

    const lastVendor = await this.prisma.vendor.findFirst({
      where: { vendorCode: { startsWith: prefix } },
      orderBy: { vendorCode: "desc" },
    });

    let nextNumber = 1;
    if (lastVendor) {
      const lastNumber = parseInt(lastVendor.vendorCode.split("-")[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

  /**
   * Validate NPWP format (15 digits)
   */
  private validateNPWP(npwp: string): void {
    if (!/^\d{15}$/.test(npwp)) {
      throw new BadRequestException(
        "Invalid NPWP format. NPWP must be exactly 15 digits.",
      );
    }
  }
}
