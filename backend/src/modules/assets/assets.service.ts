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
import { DepreciationService } from "../accounting/services/depreciation.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import {
  AssetStatus,
  AssetCondition,
  TransactionType,
  Prisma,
} from "@prisma/client";
import * as QRCode from "qrcode";

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => JournalService))
    private journalService: JournalService,
    @Inject(forwardRef(() => DepreciationService))
    private depreciationService: DepreciationService,
  ) {}

  async create(createAssetDto: CreateAssetDto) {
    const assetCode = await this.generateAssetCode(createAssetDto.category);
    const qrCode = await this.generateQRCode(assetCode);

    let asset: any;
    try {
      asset = await this.prisma.asset.create({
        data: {
          ...createAssetDto,
          assetCode,
          qrCode,
        },
        include: {
          createdBy: true,
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Duplicate asset code — please retry",
        );
      }
      throw error;
    }

    // ✅ FIX: Create journal entry for asset purchase
    // Debit: Fixed Asset Account, Credit: Cash/Accounts Payable
    if (asset.purchasePrice && asset.purchaseDate) {
      try {
        const purchasePrice = parseFloat(asset.purchasePrice.toString());

        // Map asset category to fixed asset account code
        const assetAccountMap: Record<string, string> = {
          Camera: "1-4510", // Camera & Photography Equipment
          Lens: "1-4510", // Camera & Photography Equipment
          Lensa: "1-4510",
          Lighting: "1-4550", // Lighting Equipment
          "Video Equipment": "1-4530", // Video & Audio Production Equipment
          "Audio Equipment": "1-4530", // Video & Audio Production Equipment
          Audio: "1-4530",
          Video: "1-4530",
          Gimbal: "1-4530",
          Tripod: "1-4010",
          Computer: "1-4570", // Editing Workstations & Computers
          Laptop: "1-4570",
          Vehicle: "1-4310", // Vehicles
          Furniture: "1-4410", // Furniture & Fixtures
          Building: "1-4210", // Buildings
          Land: "1-4110", // Land
          Accessories: "1-4010",
        };

        const assetAccount = assetAccountMap[asset.category] || "1-4010"; // Default to Equipment

        // Create and auto-post journal entry for asset purchase
        const journalEntry = await this.journalService.createJournalEntry({
          entryDate: asset.purchaseDate,
          description: `Asset Purchase - ${asset.name}`,
          descriptionId: `Pembelian Aset - ${asset.name}`,
          transactionType: TransactionType.ASSET_PURCHASE,
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

    const updated = await this.prisma.asset.update({
      where: { id },
      data: updateAssetDto,
      include: {
        createdBy: true,
      },
    });

    // FIX 2a: Deactivate depreciation schedule when asset becomes RETIRED or BROKEN
    // so processMonthlyDepreciation (which filters isActive:true) stops generating expense.
    const inactiveStatuses: string[] = ['RETIRED', 'BROKEN'];
    if (
      updateAssetDto.status &&
      inactiveStatuses.includes(updateAssetDto.status as string)
    ) {
      try {
        const activeSchedules = await this.prisma.depreciationSchedule.findMany({
          where: { assetId: id, isActive: true },
        });
        for (const schedule of activeSchedules) {
          // deactivateDepreciationSchedule throws if there are posted entries —
          // in that case fall back to a direct isActive:false update so the
          // status change is never blocked.
          try {
            await this.depreciationService.deactivateDepreciationSchedule(schedule.id);
          } catch {
            await this.prisma.depreciationSchedule.update({
              where: { id: schedule.id },
              data: { isActive: false },
            });
          }
        }
        if (activeSchedules.length > 0) {
          this.logger.log(
            `Deactivated ${activeSchedules.length} depreciation schedule(s) for asset ${updated.assetCode} (status: ${updateAssetDto.status})`,
          );
        }
      } catch (error: any) {
        this.logger.warn(
          `Could not deactivate depreciation schedule for asset ${updated.assetCode}: ${error.message}`,
        );
      }
    }

    // FIX 1: If depreciation-relevant fields changed, recalculate and upsert schedule
    const deprecFields = ['purchasePrice', 'usefulLifeYears', 'residualValue', 'depreciationMethod'] as const;
    const needsRecalc = deprecFields.some((f) => (updateAssetDto as any)[f] !== undefined);

    if (needsRecalc && updated.purchasePrice) {
      try {
        const purchasePrice = parseFloat(updated.purchasePrice.toString());
        const residualValue = updated.residualValue
          ? parseFloat(updated.residualValue.toString())
          : purchasePrice * 0.1;
        const usefulLifeYears = (updateAssetDto as any).usefulLifeYears ?? 5;
        const usefulLifeMonths = Math.round(usefulLifeYears * 12);
        const depreciableAmount = purchasePrice - residualValue;
        const depreciationPerMonth = depreciableAmount / usefulLifeMonths;
        const depreciationPerYear = depreciableAmount / usefulLifeYears;
        const annualRate = 1 / usefulLifeYears;

        const startDate = updated.purchaseDate ?? new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + usefulLifeMonths);

        const existingSchedule = await this.prisma.depreciationSchedule.findFirst({
          where: { assetId: id },
        });

        if (existingSchedule) {
          await this.prisma.depreciationSchedule.update({
            where: { id: existingSchedule.id },
            data: {
              depreciableAmount,
              residualValue,
              usefulLifeMonths,
              usefulLifeYears,
              depreciationPerMonth,
              depreciationPerYear,
              annualRate,
              startDate,
              endDate,
            },
          });
        } else {
          await this.prisma.depreciationSchedule.create({
            data: {
              assetId: id,
              method: 'STRAIGHT_LINE',
              depreciableAmount,
              residualValue,
              usefulLifeMonths,
              usefulLifeYears,
              depreciationPerMonth,
              depreciationPerYear,
              annualRate,
              startDate,
              endDate,
              isActive: true,
              isFulfilled: false,
            },
          });
        }

        this.logger.log(`Recalculated depreciation schedule for asset ${updated.assetCode}`);
      } catch (error: any) {
        this.logger.warn(
          `Failed to recalculate depreciation schedule for asset ${updated.assetCode}: ${error.message}`,
        );
      }
    }

    return updated;
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

    // FIX 2c: Wrap overlap-check + insert in a single transaction so two
    // concurrent requests can't both pass the conflict check and create
    // duplicate reservations for the same period.
    return this.prisma.$transaction(async (tx) => {
      const conflicts = await tx.assetReservation.findMany({
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

      return tx.assetReservation.create({
        data: {
          ...reserveDto,
          assetId,
        },
        include: {
          asset: true,
          user: true,
        },
      });
    });
  }

  async checkOut(assetId: string, userId: string, projectId?: string) {
    const asset = await this.findOne(assetId);

    // FIX 2b: Prevent checking out assets that are not in a usable state
    const checkOutAllowed: string[] = ['AVAILABLE', 'RESERVED'];
    if (!checkOutAllowed.includes(asset.status as string)) {
      throw new BadRequestException(
        `Asset tidak dapat di-checkout: status saat ini adalah ${asset.status}. Hanya AVAILABLE atau RESERVED yang diizinkan.`,
      );
    }

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

  // -----------------------------------------------------------------------
  // Dispose / Retire an asset with a balanced double-entry GL journal
  // -----------------------------------------------------------------------

  /**
   * Maps an asset category to its cost account code (same mapping used on purchase).
   */
  private getAssetCostAccount(category: string): string {
    const map: Record<string, string> = {
      Camera: "1-4510",
      Lens: "1-4510",
      Lensa: "1-4510",
      Lighting: "1-4550",
      "Video Equipment": "1-4530",
      "Audio Equipment": "1-4530",
      Audio: "1-4530",
      Video: "1-4530",
      Gimbal: "1-4530",
      Tripod: "1-4010",
      Computer: "1-4570",
      Laptop: "1-4570",
      Vehicle: "1-4310",
      Furniture: "1-4410",
      Building: "1-4210",
      Land: "1-4110",
      Accessories: "1-4010",
    };
    return map[category] ?? "1-4010";
  }

  /**
   * Maps an asset cost account code to its matching accumulated-depreciation account.
   */
  private getAccumDeprecAccount(costAccountCode: string): string {
    const map: Record<string, string> = {
      "1-4510": "1-4520", // Camera → Accum. Depr - Camera
      "1-4530": "1-4540", // Video/Audio → Accum. Depr - Video/Audio
      "1-4550": "1-4560", // Lighting → Accum. Depr - Lighting
      "1-4570": "1-4580", // Computers → Accum. Depr - Computers
      "1-4310": "1-4320", // Vehicles → Accum. Depr - Vehicles
    };
    return map[costAccountCode] ?? "1-4020"; // Generic Accumulated Depreciation
  }

  /**
   * Dispose (retire) an asset.
   *
   * Posts a balanced journal entry:
   *   Dr  Accumulated Depreciation  (accumDeprec)
   *   Dr  Cash (1-1010)             (proceeds, if > 0)
   *   Dr  Loss on disposal (8-2010) (if book value > proceeds)
   *   Cr  Fixed Asset cost account  (purchasePrice)
   *   Cr  Gain on disposal (4-8030) (if proceeds > book value)
   *
   * Sets asset status to DISPOSED and deactivates its depreciation schedule.
   */
  async dispose(
    id: string,
    dto: { proceeds?: number; disposalDate?: string },
    userId: string,
  ) {
    // --- 1. Load asset -------------------------------------------------
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { depreciationEntries: true },
    });
    if (!asset) {
      throw new NotFoundException("Asset tidak ditemukan");
    }
    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestException("Asset sudah di-dispose sebelumnya");
    }

    // --- 2. Compute accumulated depreciation from posted entries -------
    const accumDeprec = asset.depreciationEntries.reduce((sum, entry) => {
      return sum + Number(entry.depreciationAmount);
    }, 0);

    const purchasePrice = Number(asset.purchasePrice);
    const proceeds = dto.proceeds ?? 0;
    const disposalDate = dto.disposalDate
      ? new Date(dto.disposalDate)
      : new Date();

    // book value = cost − accumulated depreciation
    const bookValue = purchasePrice - accumDeprec;
    // gain (positive) or loss (negative)
    const gainLoss = proceeds - bookValue;

    // --- 3. Map to GL accounts -----------------------------------------
    const costAccount = this.getAssetCostAccount(asset.category);
    const accumDeprecAccount = this.getAccumDeprecAccount(costAccount);

    // --- 4. Build journal line items -----------------------------------
    type LineItem = {
      accountCode: string;
      description: string;
      descriptionId: string;
      debit: number;
      credit: number;
    };

    const lineItems: LineItem[] = [];

    // Dr Accumulated Depreciation (removes the contra-asset balance)
    if (accumDeprec > 0) {
      lineItems.push({
        accountCode: accumDeprecAccount,
        description: `Remove accumulated depreciation - ${asset.name}`,
        descriptionId: `Hapus akumulasi penyusutan - ${asset.name}`,
        debit: accumDeprec,
        credit: 0,
      });
    }

    // Dr Cash (proceeds received)
    if (proceeds > 0) {
      lineItems.push({
        accountCode: "1-1010",
        description: `Disposal proceeds - ${asset.name}`,
        descriptionId: `Penerimaan disposal - ${asset.name}`,
        debit: proceeds,
        credit: 0,
      });
    }

    // Dr Loss on disposal (if book value > proceeds)
    if (gainLoss < 0) {
      lineItems.push({
        accountCode: "8-2010",
        description: `Loss on disposal of ${asset.name}`,
        descriptionId: `Kerugian pelepasan ${asset.name}`,
        debit: Math.abs(gainLoss),
        credit: 0,
      });
    }

    // Cr Asset cost account (removes the asset from books)
    lineItems.push({
      accountCode: costAccount,
      description: `Remove asset cost - ${asset.name}`,
      descriptionId: `Hapus nilai aset - ${asset.name}`,
      debit: 0,
      credit: purchasePrice,
    });

    // Cr Gain on disposal (if proceeds > book value)
    if (gainLoss > 0) {
      lineItems.push({
        accountCode: "4-8030",
        description: `Gain on disposal of ${asset.name}`,
        descriptionId: `Keuntungan pelepasan ${asset.name}`,
        debit: 0,
        credit: gainLoss,
      });
    }

    // --- 5. Verify journal balances (safety check) ---------------------
    const totalDebits = lineItems.reduce((s, l) => s + l.debit, 0);
    const totalCredits = lineItems.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      // This should never happen; guard against rounding edge cases
      throw new BadRequestException(
        `Jurnal tidak seimbang: debit ${totalDebits} ≠ kredit ${totalCredits}`,
      );
    }

    // --- 6. Create & auto-post the journal entry -----------------------
    const journalEntry = await this.journalService.createJournalEntry({
      entryDate: disposalDate,
      description: `Asset Disposal - ${asset.name}`,
      descriptionId: `Pelepasan Aset - ${asset.name}`,
      transactionType: TransactionType.ASSET_DISPOSAL,
      transactionId: asset.id,
      documentNumber: asset.assetCode,
      documentDate: disposalDate,
      createdBy: userId,
      autoPost: true,
      lineItems,
    });

    this.logger.log(
      `✅ Posted disposal journal ${journalEntry.entryNumber} for ${asset.assetCode} ` +
        `| cost=${purchasePrice} accumDeprec=${accumDeprec} proceeds=${proceeds} gainLoss=${gainLoss}`,
    );

    // --- 7. Deactivate depreciation schedule ---------------------------
    try {
      const activeSchedules = await this.prisma.depreciationSchedule.findMany({
        where: { assetId: id, isActive: true },
      });
      for (const schedule of activeSchedules) {
        try {
          await this.depreciationService.deactivateDepreciationSchedule(
            schedule.id,
          );
        } catch {
          await this.prisma.depreciationSchedule.update({
            where: { id: schedule.id },
            data: { isActive: false },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not deactivate schedule for ${asset.assetCode}: ${err.message}`,
      );
    }

    // --- 8. Mark asset DISPOSED ----------------------------------------
    const updatedAsset = await this.prisma.asset.update({
      where: { id },
      data: {
        status: AssetStatus.DISPOSED,
        disposalDate,
        disposalProceeds: proceeds > 0 ? new Prisma.Decimal(proceeds) : null,
        disposalJournalId: journalEntry.id,
      },
    });

    return {
      asset: {
        ...updatedAsset,
        purchasePrice: Number(updatedAsset.purchasePrice),
        disposalProceeds: updatedAsset.disposalProceeds
          ? Number(updatedAsset.disposalProceeds)
          : null,
      },
      journal: {
        id: journalEntry.id,
        entryNumber: journalEntry.entryNumber,
        status: journalEntry.status,
      },
      summary: {
        purchasePrice,
        accumDeprec,
        bookValue,
        proceeds,
        gainLoss,
        totalDebits,
        totalCredits,
        balanced: Math.abs(totalDebits - totalCredits) < 0.001,
      },
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

    // Map asset category to fixed asset account code.
    // Covers all seed-data categories (including Accessories, Audio, Lens).
    const assetAccountMap: Record<string, string> = {
      Camera: "1-4510",
      Lens: "1-4510",
      Lensa: "1-4510",
      Lighting: "1-4550",
      "Video Equipment": "1-4530",
      "Audio Equipment": "1-4530",
      Audio: "1-4530",
      Video: "1-4530",
      Computer: "1-4570",
      Laptop: "1-4570",
      Vehicle: "1-4310",
      Furniture: "1-4410",
      Building: "1-4210",
      Land: "1-4110",
      Accessories: "1-4010", // General equipment
      Gimbal: "1-4530",
      Tripod: "1-4010",
    };

    for (const asset of assets) {
      try {
        const purchasePrice = parseFloat(asset.purchasePrice.toString());
        const assetAccount = assetAccountMap[asset.category] || "1-4010";

        // Check if journal entry already exists for this asset
        const existingJournal = await this.prisma.journalEntry.findFirst({
          where: {
            transactionId: asset.id,
            transactionType: TransactionType.ASSET_PURCHASE,
          },
        });

        if (existingJournal) {
          this.logger.log(
            `Asset ${asset.assetCode} already has journal entry, skipping`,
          );
          continue;
        }

        // Backfill uses Owner Capital (3-1010) as the credit account.
        // Rationale: existing assets were acquired before this accounting system
        // was set up; recording them as capital contributions avoids artificially
        // reducing the cash balance and correctly reflects their origin as equity-
        // funded acquisitions.  New purchases created via the UI should credit
        // 1-1010 (Cash) or 2-1010 (AP) depending on how payment was made.
        const journalEntry = await this.journalService.createJournalEntry({
          entryDate: asset.purchaseDate,
          description: `Asset Purchase - ${asset.name} (Backfill)`,
          descriptionId: `Pembelian Aset - ${asset.name} (Backfill)`,
          transactionType: TransactionType.ASSET_PURCHASE,
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
              accountCode: "3-1010", // Owner Capital — equity-funded acquisition
              description: `Capital contribution for ${asset.name}`,
              descriptionId: `Kontribusi modal untuk ${asset.name}`,
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
