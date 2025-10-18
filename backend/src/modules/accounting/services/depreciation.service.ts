import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JournalService } from './journal.service';
import {
  DepreciationMethod,
  DepreciationStatus,
  TransactionType
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PSAK 16: Fixed Assets Depreciation Service
 *
 * Implements Indonesian accounting standard PSAK 16 for:
 * - Depreciation schedule calculation
 * - Automated monthly/periodic depreciation entries
 * - Journal entry integration (Debit: Depreciation Expense, Credit: Accumulated Depreciation)
 */
@Injectable()
export class DepreciationService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * Create depreciation schedule for an asset
   */
  async createDepreciationSchedule(data: {
    assetId: string;
    method: DepreciationMethod;
    purchasePrice: number;
    residualValue: number;
    usefulLifeMonths: number;
    startDate: Date;
  }) {
    // Validate asset exists
    const asset = await this.prisma.asset.findUnique({
      where: { id: data.assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${data.assetId} not found`);
    }

    // Check if active schedule already exists
    const existingSchedule = await this.prisma.depreciationSchedule.findFirst({
      where: {
        assetId: data.assetId,
        isActive: true,
        isFulfilled: false,
      },
    });

    if (existingSchedule) {
      throw new ConflictException(
        `Asset already has an active depreciation schedule. Deactivate existing schedule first.`,
      );
    }

    // Validate inputs
    if (data.purchasePrice <= 0) {
      throw new BadRequestException('Purchase price must be greater than 0');
    }

    if (data.residualValue < 0 || data.residualValue >= data.purchasePrice) {
      throw new BadRequestException(
        'Residual value must be between 0 and purchase price',
      );
    }

    if (data.usefulLifeMonths <= 0) {
      throw new BadRequestException('Useful life must be greater than 0 months');
    }

    // Calculate depreciation amounts
    const depreciableAmount = data.purchasePrice - data.residualValue;
    const usefulLifeYears = data.usefulLifeMonths / 12;

    let depreciationPerMonth: number;
    let depreciationPerYear: number;
    let annualRate: number;

    switch (data.method) {
      case DepreciationMethod.STRAIGHT_LINE:
        // Garis Lurus: (Purchase Price - Residual) / Useful Life
        depreciationPerMonth = depreciableAmount / data.usefulLifeMonths;
        depreciationPerYear = depreciableAmount / usefulLifeYears;
        annualRate = 1 / usefulLifeYears;
        break;

      case DepreciationMethod.DECLINING_BALANCE:
        // Saldo Menurun: Rate = 1 / Useful Life (typically 1.5x or 2x for accelerated)
        annualRate = 1.5 / usefulLifeYears; // 150% declining balance
        depreciationPerYear = data.purchasePrice * annualRate;
        depreciationPerMonth = depreciationPerYear / 12;
        break;

      case DepreciationMethod.DOUBLE_DECLINING:
        // Saldo Menurun Ganda: 2 / Useful Life
        annualRate = 2 / usefulLifeYears;
        depreciationPerYear = data.purchasePrice * annualRate;
        depreciationPerMonth = depreciationPerYear / 12;
        break;

      case DepreciationMethod.SUM_OF_YEARS_DIGITS:
        // Jumlah Angka Tahun
        const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
        annualRate = usefulLifeYears / sumOfYears;
        depreciationPerYear = depreciableAmount * annualRate;
        depreciationPerMonth = depreciationPerYear / 12;
        break;

      case DepreciationMethod.UNITS_OF_PRODUCTION:
        // Unit Produksi: Requires usage tracking (not auto-calculated)
        throw new BadRequestException(
          'Units of production method requires manual calculation based on asset usage',
        );

      default:
        throw new BadRequestException(`Unsupported depreciation method: ${data.method}`);
    }

    // Calculate end date
    const endDate = new Date(data.startDate);
    endDate.setMonth(endDate.getMonth() + data.usefulLifeMonths);

    // Create depreciation schedule
    const schedule = await this.prisma.depreciationSchedule.create({
      data: {
        assetId: data.assetId,
        method: data.method,
        depreciableAmount: new Decimal(depreciableAmount),
        residualValue: new Decimal(data.residualValue),
        usefulLifeMonths: data.usefulLifeMonths,
        usefulLifeYears: new Decimal(usefulLifeYears),
        depreciationPerMonth: new Decimal(depreciationPerMonth),
        depreciationPerYear: new Decimal(depreciationPerYear),
        annualRate: new Decimal(annualRate),
        startDate: data.startDate,
        endDate: endDate,
        isActive: true,
        isFulfilled: false,
        notes: `PSAK 16 - ${data.method} depreciation schedule`,
        notesId: `PSAK 16 - Jadwal penyusutan ${data.method}`,
      },
      include: {
        asset: true,
      },
    });

    return schedule;
  }

  /**
   * Calculate depreciation for a specific period
   */
  async calculatePeriodDepreciation(data: {
    assetId: string;
    periodDate: Date;
    fiscalPeriodId?: string;
  }) {
    // Get active depreciation schedule
    const schedule = await this.prisma.depreciationSchedule.findFirst({
      where: {
        assetId: data.assetId,
        isActive: true,
        isFulfilled: false,
        startDate: { lte: data.periodDate },
        endDate: { gte: data.periodDate },
      },
      include: {
        asset: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(
        `No active depreciation schedule found for asset ${data.assetId} for period ${data.periodDate}`,
      );
    }

    // Check if entry already exists for this period
    const existingEntry = await this.prisma.depreciationEntry.findFirst({
      where: {
        assetId: data.assetId,
        periodDate: data.periodDate,
      },
    });

    if (existingEntry) {
      throw new ConflictException(
        `Depreciation entry already exists for this asset and period`,
      );
    }

    // Calculate previous accumulated depreciation
    const previousEntries = await this.prisma.depreciationEntry.findMany({
      where: {
        assetId: data.assetId,
        periodDate: { lt: data.periodDate },
        status: {
          in: [DepreciationStatus.POSTED, DepreciationStatus.CALCULATED],
        },
      },
      orderBy: { periodDate: 'desc' },
    });

    const previousAccumulated = previousEntries.reduce(
      (sum, entry) => sum + Number(entry.depreciationAmount),
      0,
    );

    // Calculate current period depreciation
    let depreciationAmount: number;
    let newAccumulatedDepreciation: number;
    let bookValue: number;

    if (schedule.method === DepreciationMethod.STRAIGHT_LINE) {
      // Simple straight-line calculation
      depreciationAmount = Number(schedule.depreciationPerMonth);
      newAccumulatedDepreciation = previousAccumulated + depreciationAmount;
      bookValue = Number(schedule.depreciableAmount) + Number(schedule.residualValue) - newAccumulatedDepreciation;
    } else if (
      schedule.method === DepreciationMethod.DECLINING_BALANCE ||
      schedule.method === DepreciationMethod.DOUBLE_DECLINING
    ) {
      // Declining balance: Rate * Book Value (at start of period)
      const currentBookValue = Number(schedule.depreciableAmount) + Number(schedule.residualValue) - previousAccumulated;
      const monthlyRate = Number(schedule.annualRate) / 12;
      depreciationAmount = currentBookValue * monthlyRate;

      // Ensure we don't depreciate below residual value
      if (currentBookValue - depreciationAmount < Number(schedule.residualValue)) {
        depreciationAmount = currentBookValue - Number(schedule.residualValue);
      }

      newAccumulatedDepreciation = previousAccumulated + depreciationAmount;
      bookValue = currentBookValue - depreciationAmount;
    } else {
      // Sum of years digits and other methods
      depreciationAmount = Number(schedule.depreciationPerMonth);
      newAccumulatedDepreciation = previousAccumulated + depreciationAmount;
      bookValue = Number(schedule.depreciableAmount) + Number(schedule.residualValue) - newAccumulatedDepreciation;
    }

    // Ensure book value doesn't go below residual value
    if (bookValue < Number(schedule.residualValue)) {
      bookValue = Number(schedule.residualValue);
      depreciationAmount = Number(schedule.depreciableAmount) + Number(schedule.residualValue) - previousAccumulated - bookValue;
      newAccumulatedDepreciation = Number(schedule.depreciableAmount) + Number(schedule.residualValue) - bookValue;
    }

    // Create depreciation entry
    const entry = await this.prisma.depreciationEntry.create({
      data: {
        assetId: data.assetId,
        scheduleId: schedule.id,
        periodDate: data.periodDate,
        fiscalPeriodId: data.fiscalPeriodId,
        depreciationAmount: new Decimal(depreciationAmount),
        accumulatedDepreciation: new Decimal(newAccumulatedDepreciation),
        bookValue: new Decimal(bookValue),
        status: DepreciationStatus.CALCULATED,
        calculatedAt: new Date(),
      },
      include: {
        asset: true,
        schedule: true,
        fiscalPeriod: true,
      },
    });

    // Check if schedule is fulfilled
    if (bookValue <= Number(schedule.residualValue)) {
      await this.prisma.depreciationSchedule.update({
        where: { id: schedule.id },
        data: { isFulfilled: true },
      });
    }

    return entry;
  }

  /**
   * Post depreciation entry to journal
   */
  async postDepreciationEntry(entryId: string, userId: string) {
    const entry = await this.prisma.depreciationEntry.findUnique({
      where: { id: entryId },
      include: {
        asset: true,
        schedule: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Depreciation entry with ID ${entryId} not found`);
    }

    if (entry.status === DepreciationStatus.POSTED) {
      throw new BadRequestException('Depreciation entry is already posted');
    }

    if (entry.journalEntryId) {
      throw new ConflictException('Depreciation entry already has a journal entry');
    }

    // Create journal entry: Debit Depreciation Expense, Credit Accumulated Depreciation
    const journalEntry = await this.journalService.createJournalEntry({
      entryDate: entry.periodDate,
      description: `Depreciation - ${entry.asset.name}`,
      descriptionId: `Penyusutan - ${entry.asset.name}`,
      descriptionEn: `Depreciation - ${entry.asset.name}`,
      transactionType: TransactionType.DEPRECIATION,
      transactionId: entry.id,
      documentNumber: `DEP-${entry.asset.assetCode}`,
      documentDate: entry.periodDate,
      fiscalPeriodId: entry.fiscalPeriodId || undefined,
      createdBy: userId,
      lineItems: [
        {
          accountCode: '6-3010', // Depreciation Expense
          description: `Depreciation for ${entry.asset.name}`,
          descriptionId: `Beban penyusutan ${entry.asset.name}`,
          debit: Number(entry.depreciationAmount),
          credit: 0,
        },
        {
          accountCode: '1-4020', // Accumulated Depreciation
          description: `Accumulated depreciation for ${entry.asset.name}`,
          descriptionId: `Akumulasi penyusutan ${entry.asset.name}`,
          debit: 0,
          credit: Number(entry.depreciationAmount),
        },
      ],
    });

    // Auto-post the journal entry
    await this.journalService.postJournalEntry(journalEntry.id, userId);

    // Update depreciation entry
    const updatedEntry = await this.prisma.depreciationEntry.update({
      where: { id: entryId },
      data: {
        journalEntryId: journalEntry.id,
        status: DepreciationStatus.POSTED,
        postedAt: new Date(),
        postedBy: userId,
      },
      include: {
        asset: true,
        schedule: true,
        journalEntry: {
          include: {
            lineItems: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });

    return updatedEntry;
  }

  /**
   * Calculate and post depreciation for all active assets for a specific period
   */
  async processMonthlyDepreciation(data: {
    periodDate: Date;
    fiscalPeriodId?: string;
    userId: string;
    autoPost?: boolean;
  }) {
    // Get all assets with active depreciation schedules
    const activeSchedules = await this.prisma.depreciationSchedule.findMany({
      where: {
        isActive: true,
        isFulfilled: false,
        startDate: { lte: data.periodDate },
        endDate: { gte: data.periodDate },
      },
      include: {
        asset: true,
      },
    });

    const results = {
      total: activeSchedules.length,
      calculated: 0,
      posted: 0,
      errors: [] as string[],
      entries: [] as any[],
    };

    for (const schedule of activeSchedules) {
      try {
        // Calculate depreciation
        const entry = await this.calculatePeriodDepreciation({
          assetId: schedule.assetId,
          periodDate: data.periodDate,
          fiscalPeriodId: data.fiscalPeriodId,
        });

        results.calculated++;
        results.entries.push(entry);

        // Auto-post if requested
        if (data.autoPost) {
          await this.postDepreciationEntry(entry.id, data.userId);
          results.posted++;
        }
      } catch (error: any) {
        results.errors.push(
          `Asset ${schedule.asset.assetCode}: ${error.message}`,
        );
      }
    }

    return results;
  }

  /**
   * Get depreciation schedule for an asset
   */
  async getAssetDepreciationSchedule(assetId: string) {
    return this.prisma.depreciationSchedule.findMany({
      where: { assetId },
      include: {
        asset: true,
        depreciationEntries: {
          orderBy: { periodDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get depreciation entries for an asset
   */
  async getAssetDepreciationEntries(assetId: string) {
    return this.prisma.depreciationEntry.findMany({
      where: { assetId },
      include: {
        asset: true,
        schedule: true,
        fiscalPeriod: true,
        journalEntry: {
          include: {
            lineItems: {
              include: {
                account: true,
              },
            },
          },
        },
      },
      orderBy: { periodDate: 'asc' },
    });
  }

  /**
   * Get depreciation summary by period
   */
  async getDepreciationSummary(data: {
    startDate: Date;
    endDate: Date;
    assetId?: string;
  }) {
    const where: any = {
      periodDate: {
        gte: data.startDate,
        lte: data.endDate,
      },
    };

    if (data.assetId) {
      where.assetId = data.assetId;
    }

    const entries = await this.prisma.depreciationEntry.findMany({
      where,
      include: {
        asset: true,
        schedule: true,
      },
    });

    const totalDepreciation = entries.reduce(
      (sum, entry) => sum + Number(entry.depreciationAmount),
      0,
    );

    const byAsset = entries.reduce((acc, entry) => {
      const assetCode = entry.asset.assetCode;
      if (!acc[assetCode]) {
        acc[assetCode] = {
          assetCode,
          assetName: entry.asset.name,
          totalDepreciation: 0,
          entries: 0,
        };
      }
      acc[assetCode].totalDepreciation += Number(entry.depreciationAmount);
      acc[assetCode].entries++;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalDepreciation,
      totalEntries: entries.length,
      posted: entries.filter(e => e.status === DepreciationStatus.POSTED).length,
      calculated: entries.filter(e => e.status === DepreciationStatus.CALCULATED).length,
      byAsset: Object.values(byAsset),
    };
  }

  /**
   * Deactivate depreciation schedule
   */
  async deactivateDepreciationSchedule(scheduleId: string) {
    const schedule = await this.prisma.depreciationSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Depreciation schedule with ID ${scheduleId} not found`);
    }

    // Check for posted entries
    const postedEntries = await this.prisma.depreciationEntry.count({
      where: {
        scheduleId,
        status: DepreciationStatus.POSTED,
      },
    });

    if (postedEntries > 0) {
      throw new BadRequestException(
        `Cannot deactivate schedule with ${postedEntries} posted entries. Reverse entries first.`,
      );
    }

    // Delete calculated (unposted) entries
    await this.prisma.depreciationEntry.deleteMany({
      where: {
        scheduleId,
        status: DepreciationStatus.CALCULATED,
      },
    });

    // Deactivate schedule
    return this.prisma.depreciationSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });
  }
}
