import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalService } from "../accounting/services/journal.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { AssetStatus, AssetCondition } from "@prisma/client";
import * as QRCode from "qrcode";

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => JournalService))
    private journalService: JournalService,
  ) {}

  async create(createAssetDto: CreateAssetDto) {
    const assetCode = await this.generateAssetCode(createAssetDto.category);
    const qrCode = await this.generateQRCode(assetCode);

    const asset = await this.prisma.asset.create({
      data: {
        ...createAssetDto,
        assetCode,
        qrCode,
      },
      include: {
        createdBy: true,
      },
    });

    // ✅ FIX: Create journal entry for asset purchase
    // Debit: Fixed Asset Account, Credit: Cash/Accounts Payable
    if (asset.purchasePrice && asset.purchaseDate) {
      try {
        const purchasePrice = parseFloat(asset.purchasePrice.toString());

        // Map asset category to fixed asset account code
        const assetAccountMap: Record<string, string> = {
          Camera: "1-4510", // Camera & Photography Equipment
          Lens: "1-4510", // Camera & Photography Equipment
          Lighting: "1-4550", // Lighting Equipment
          "Video Equipment": "1-4530", // Video & Audio Production Equipment
          "Audio Equipment": "1-4530", // Video & Audio Production Equipment
          Computer: "1-4570", // Editing Workstations & Computers
          Vehicle: "1-4310", // Vehicles
          Furniture: "1-4410", // Furniture & Fixtures
          Building: "1-4210", // Buildings
          Land: "1-4110", // Land
        };

        const assetAccount = assetAccountMap[asset.category] || "1-4010"; // Default to Equipment

        // Create and auto-post journal entry for asset purchase
        const journalEntry = await this.journalService.createJournalEntry({
          entryDate: asset.purchaseDate,
          description: `Asset Purchase - ${asset.name}`,
          descriptionId: `Pembelian Aset - ${asset.name}`,
          transactionType: "ASSET_PURCHASE" as any,
          transactionId: asset.id,
          documentNumber: asset.assetCode,
          documentDate: asset.purchaseDate,
          createdBy: createAssetDto.createdById || "system",
          autoPost: true, // ✅ Auto-post to General Ledger
          lineItems: [
            {
              accountCode: assetAccount, // Debit: Fixed Asset account
              description: `Purchase of ${asset.name}`,
              descriptionId: `Pembelian ${asset.name}`,
              debit: purchasePrice,
              credit: 0,
            },
            {
              accountCode: "1-1010", // Credit: Cash (assume cash purchase)
              description: `Payment for ${asset.name}`,
              descriptionId: `Pembayaran ${asset.name}`,
              debit: 0,
              credit: purchasePrice,
            },
          ],
        });

        this.logger.log(
          `✅ Created and posted asset purchase journal entry ${journalEntry.entryNumber} for ${asset.assetCode}`,
        );

        // Auto-create default depreciation schedule for the asset
        const residualValue = purchasePrice * 0.1; // 10% residual value
        const usefulLifeYears = 5; // Default 5 years
        const usefulLifeMonths = usefulLifeYears * 12;

        await this.prisma.depreciationSchedule.create({
          data: {
            assetId: asset.id,
            method: "STRAIGHT_LINE",
            depreciableAmount: purchasePrice - residualValue,
            residualValue: residualValue,
            usefulLifeMonths: usefulLifeMonths,
            usefulLifeYears: usefulLifeYears,
            depreciationPerMonth:
              (purchasePrice - residualValue) / usefulLifeMonths,
            depreciationPerYear:
              (purchasePrice - residualValue) / usefulLifeYears,
            annualRate: 1 / usefulLifeYears,
            startDate: asset.purchaseDate,
            endDate: new Date(
              new Date(asset.purchaseDate).setMonth(
                new Date(asset.purchaseDate).getMonth() + usefulLifeMonths,
              ),
            ),
            isActive: true,
            isFulfilled: false,
          },
        });

        this.logger.log(
          `Auto-created depreciation schedule for asset ${asset.assetCode}`,
        );
      } catch (error: any) {
        this.logger.warn(
          `Failed to auto-create journal/schedule for asset ${asset.assetCode}: ${error.message}`,
        );
        // Don't fail asset creation if journal/schedule creation fails
      }
    }

    return asset;
  }

  async findAll(page = 1, limit = 10, status?: AssetStatus, category?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: true,
          _count: {
            select: {
              reservations: true,
              maintenanceRecords: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    // Transform Decimal fields to numbers for JSON serialization
    const transformedAssets = assets.map((asset) => ({
      ...asset,
      purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : 0,
      currentValue: asset.currentValue ? Number(asset.currentValue) : null,
      residualValue: asset.residualValue ? Number(asset.residualValue) : 0,
    }));

    return {
      data: transformedAssets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        createdBy: true,
        reservations: {
          include: {
            user: true,
            project: true,
          },
          orderBy: { createdAt: "desc" },
        },
        maintenanceRecords: {
          orderBy: { performedDate: "desc" },
        },
        maintenanceSchedules: {
          where: { isActive: true },
        },
        _count: {
          select: {
            reservations: true,
            maintenanceRecords: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException("Asset tidak ditemukan");
    }

    // Transform Decimal fields to numbers for JSON serialization
    return {
      ...asset,
      purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : 0,
      currentValue: asset.currentValue ? Number(asset.currentValue) : null,
      residualValue: asset.residualValue ? Number(asset.residualValue) : 0,
    };
  }

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: updateAssetDto,
      include: {
        createdBy: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeReservations = await this.prisma.assetReservation.count({
      where: {
        assetId: id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (activeReservations > 0) {
      throw new ConflictException(
        "Tidak dapat menghapus asset dengan reservasi aktif",
      );
    }

    return this.prisma.asset.delete({
      where: { id },
    });
  }

  async generateAssetCode(category: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const categoryPrefix = category.substring(0, 3).toUpperCase();

    const existingAssets = await this.prisma.asset.count({
      where: {
        assetCode: {
          startsWith: `${categoryPrefix}-${year}${month}-`,
        },
      },
    });

    const sequence = (existingAssets + 1).toString().padStart(3, "0");
    return `${categoryPrefix}-${year}${month}-${sequence}`;
  }

  async generateQRCode(code: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(code, {
        width: 300,
        margin: 2,
      });
      return qrCodeDataURL;
    } catch (error) {
      this.logger.error("QR Code generation failed:", error);
      return "";
    }
  }

  async reserve(assetId: string, reserveDto: any) {
    const asset = await this.findOne(assetId);
    if (asset.status !== "AVAILABLE") {
      throw new BadRequestException("Asset tidak tersedia");
    }

    const conflicts = await this.prisma.assetReservation.findMany({
      where: {
        assetId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          {
            startDate: { lte: new Date(reserveDto.endDate) },
            endDate: { gte: new Date(reserveDto.startDate) },
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new ConflictException("Asset sudah direservasi untuk periode ini");
    }

    return this.prisma.assetReservation.create({
      data: {
        ...reserveDto,
        assetId,
      },
      include: {
        asset: true,
        user: true,
      },
    });
  }

  async checkOut(assetId: string, userId: string, projectId?: string) {
    await this.findOne(assetId);

    return this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id: assetId },
        data: { status: "CHECKED_OUT" },
      }),
      this.prisma.projectEquipmentUsage.create({
        data: {
          assetId,
          projectId: projectId ?? null,
          startDate: new Date(),
        },
      }),
    ]);
  }

  async checkIn(assetId: string, condition?: string, notes?: string) {
    const asset = await this.findOne(assetId);

    const activeUsage = await this.prisma.projectEquipmentUsage.findFirst({
      where: {
        assetId,
        returnDate: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeUsage) {
      throw new BadRequestException(
        "Tidak ada catatan check-out aktif untuk asset ini",
      );
    }

    return this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id: assetId },
        data: {
          status: "AVAILABLE",
          condition: (condition as AssetCondition) || asset.condition,
        },
      }),
      this.prisma.projectEquipmentUsage.update({
        where: { id: activeUsage.id },
        data: {
          returnDate: new Date(),
          condition,
          notes,
        },
      }),
    ]);
  }

  async getAssetStats() {
    const [total, byStatus, byCategory, totalValue] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      this.prisma.asset.groupBy({
        by: ["category"],
        _count: { category: true },
      }),
      this.prisma.asset.aggregate({
        _sum: { purchasePrice: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byCategory: byCategory.reduce(
        (acc, item) => {
          acc[item.category] = item._count.category;
          return acc;
        },
        {} as Record<string, number>,
      ),
      totalValue: totalValue._sum.purchasePrice || 0,
    };
  }

  /**
   * ✅ Backfill journal entries for existing assets
   * Creates asset purchase journal entries for assets that don't have them yet
   */
  async backfillAssetJournalEntries(userId: string) {
    this.logger.log("Starting backfill of asset purchase journal entries...");

    // Get all assets
    const assets = await this.prisma.asset.findMany({
      where: {
        purchasePrice: { not: 0 },
        purchaseDate: { not: undefined },
      },
    });

    const results = {
      total: assets.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Map asset category to fixed asset account code
    const assetAccountMap: Record<string, string> = {
      Camera: "1-4510",
      Lens: "1-4510",
      Lighting: "1-4550",
      "Video Equipment": "1-4530",
      "Audio Equipment": "1-4530",
      Computer: "1-4570",
      Vehicle: "1-4310",
      Furniture: "1-4410",
      Building: "1-4210",
      Land: "1-4110",
    };

    for (const asset of assets) {
      try {
        const purchasePrice = parseFloat(asset.purchasePrice.toString());
        const assetAccount = assetAccountMap[asset.category] || "1-4010";

        // Check if journal entry already exists for this asset
        const existingJournal = await this.prisma.journalEntry.findFirst({
          where: {
            transactionId: asset.id,
            transactionType: "ASSET_PURCHASE" as any,
          },
        });

        if (existingJournal) {
          this.logger.log(
            `Asset ${asset.assetCode} already has journal entry, skipping`,
          );
          continue;
        }

        // Create and auto-post journal entry
        const journalEntry = await this.journalService.createJournalEntry({
          entryDate: asset.purchaseDate,
          description: `Asset Purchase - ${asset.name} (Backfill)`,
          descriptionId: `Pembelian Aset - ${asset.name} (Backfill)`,
          transactionType: "ASSET_PURCHASE" as any,
          transactionId: asset.id,
          documentNumber: asset.assetCode,
          documentDate: asset.purchaseDate,
          createdBy: userId,
          autoPost: true,
          lineItems: [
            {
              accountCode: assetAccount,
              description: `Purchase of ${asset.name}`,
              descriptionId: `Pembelian ${asset.name}`,
              debit: purchasePrice,
              credit: 0,
            },
            {
              accountCode: "1-1010", // Cash
              description: `Payment for ${asset.name}`,
              descriptionId: `Pembayaran ${asset.name}`,
              debit: 0,
              credit: purchasePrice,
            },
          ],
        });

        this.logger.log(
          `✅ Created journal entry ${journalEntry.entryNumber} for asset ${asset.assetCode}`,
        );
        results.success++;
      } catch (error: any) {
        this.logger.error(
          `Failed to create journal entry for asset ${asset.assetCode}: ${error.message}`,
        );
        results.failed++;
        results.errors.push(`${asset.assetCode}: ${error.message}`);
      }
    }

    this.logger.log(
      `Backfill completed: ${results.success} success, ${results.failed} failed out of ${results.total} total`,
    );

    return results;
  }
}
