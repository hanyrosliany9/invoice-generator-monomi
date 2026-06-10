import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JournalService } from "./journal.service";
import {
  assetCoaForCategory,
  assetCodeForCoa,
  usefulLifeYearsForCoa,
} from "../../assets/asset-coa.util";
import {
  DepreciationMethod,
  DepreciationStatus,
  TransactionType,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

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
      throw new BadRequestException("Purchase price must be greater than 0");
    }

    if (data.residualValue < 0 || data.residualValue >= data.purchasePrice) {
      throw new BadRequestException(
        "Residual value must be between 0 and purchase price",
      );
    }

    if (data.usefulLifeMonths <= 0) {
      throw new BadRequestException(
        "Useful life must be greater than 0 months",
      );
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
          "Units of production method requires manual calculation based on asset usage",
        );

      default:
        throw new BadRequestException(
          `Unsupported depreciation method: ${data.method}`,
        );
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
    // Normalize periodDate to the first day of the month (UTC) so that
    // "2025-01-01" and "2025-01-15" both resolve to the same period,
    // preventing double-posting for the same calendar month.
    const d = data.periodDate;
    data.periodDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

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
      orderBy: { periodDate: "desc" },
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
      bookValue =
        Number(schedule.depreciableAmount) +
        Number(schedule.residualValue) -
        newAccumulatedDepreciation;
    } else if (
      schedule.method === DepreciationMethod.DECLINING_BALANCE ||
      schedule.method === DepreciationMethod.DOUBLE_DECLINING
    ) {
      // Declining balance: Rate * Book Value (at start of period)
      const currentBookValue =
        Number(schedule.depreciableAmount) +
        Number(schedule.residualValue) -
        previousAccumulated;
      const monthlyRate = Number(schedule.annualRate) / 12;
      depreciationAmount = currentBookValue * monthlyRate;

      // Ensure we don't depreciate below residual value
      if (
        currentBookValue - depreciationAmount <
        Number(schedule.residualValue)
      ) {
        depreciationAmount = currentBookValue - Number(schedule.residualValue);
      }

      newAccumulatedDepreciation = previousAccumulated + depreciationAmount;
      bookValue = currentBookValue - depreciationAmount;
    } else if (schedule.method === DepreciationMethod.SUM_OF_YEARS_DIGITS) {
      // SYD: the rate changes each year.
      // Determine which month index this period corresponds to by counting
      // prior posted/calculated entries for this asset.
      const periodIndex = previousEntries.length; // 0-based month index
      const usefulLifeYears = Number(schedule.usefulLifeYears);
      const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
      const completedYears = Math.floor(periodIndex / 12);
      const remainingYears = usefulLifeYears - completedYears;

      // Guard: if remaining life exhausted, charge zero
      const yearFraction = remainingYears > 0 ? remainingYears / sumOfYears : 0;
      depreciationAmount = (Number(schedule.depreciableAmount) * yearFraction) / 12;

      newAccumulatedDepreciation = previousAccumulated + depreciationAmount;
      bookValue =
        Number(schedule.depreciableAmount) +
        Number(schedule.residualValue) -
        newAccumulatedDepreciation;
    } else {
      // Other methods: fall back to stored monthly amount
      depreciationAmount = Number(schedule.depreciationPerMonth);
      newAccumulatedDepreciation = previousAccumulated + depreciationAmount;
      bookValue =
        Number(schedule.depreciableAmount) +
        Number(schedule.residualValue) -
        newAccumulatedDepreciation;
    }

    // Ensure book value doesn't go below residual value
    if (bookValue < Number(schedule.residualValue)) {
      // Adjust depreciation to not go below residual value
      const purchasePrice =
        Number(schedule.depreciableAmount) + Number(schedule.residualValue);
      depreciationAmount =
        purchasePrice - Number(schedule.residualValue) - previousAccumulated;
      newAccumulatedDepreciation = previousAccumulated + depreciationAmount;
      bookValue = Number(schedule.residualValue);

      // Prevent negative depreciation
      if (depreciationAmount < 0) {
        depreciationAmount = 0;
        newAccumulatedDepreciation = previousAccumulated;
      }
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
      throw new NotFoundException(
        `Depreciation entry with ID ${entryId} not found`,
      );
    }

    if (entry.status === DepreciationStatus.POSTED) {
      throw new BadRequestException("Depreciation entry is already posted");
    }

    if (entry.journalEntryId) {
      throw new ConflictException(
        "Depreciation entry already has a journal entry",
      );
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
          accountCode: "6-3010", // Depreciation Expense
          description: `Depreciation for ${entry.asset.name}`,
          descriptionId: `Beban penyusutan ${entry.asset.name}`,
          debit: Number(entry.depreciationAmount),
          credit: 0,
        },
        {
          accountCode: "1-4020", // Accumulated Depreciation
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
    // Normalize to first of month so the batch call and per-asset call share
    // the same canonical date, preventing duplicate entries.
    const pd = data.periodDate;
    data.periodDate = new Date(Date.UTC(pd.getUTCFullYear(), pd.getUTCMonth(), 1));

    // First, auto-create schedules for assets that don't have them
    try {
      const backfillResult = await this.backfillDepreciationSchedules();
      if (backfillResult.created > 0) {
        console.log(
          `Auto-created ${backfillResult.created} depreciation schedules`,
        );
      }
    } catch (error: any) {
      console.warn("Failed to backfill depreciation schedules:", error.message);
    }

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
      processed: 0,
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

        results.processed++;
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
   * Backfill depreciation schedules for existing assets that don't have them
   */
  async backfillDepreciationSchedules() {
    // Get all assets
    const allAssets = await this.prisma.asset.findMany({
      include: {
        depreciationSchedules: {
          where: {
            isActive: true,
            isFulfilled: false,
          },
        },
      },
    });

    // Filter assets without schedules and with purchase data
    const assetsWithoutSchedules = allAssets.filter(
      (asset) =>
        asset.purchasePrice &&
        asset.purchaseDate &&
        asset.depreciationSchedules.length === 0,
    );

    const results = {
      total: assetsWithoutSchedules.length,
      created: 0,
      errors: [] as string[],
    };

    for (const asset of assetsWithoutSchedules) {
      try {
        const purchasePrice = parseFloat(asset.purchasePrice.toString());

        // Use asset's residualValue if set, otherwise default to 10%
        const residualValue = asset.residualValue
          ? parseFloat(asset.residualValue.toString())
          : purchasePrice * 0.1;

        // Use asset's usefulLifeYears if set, otherwise default to 5 years
        const usefulLifeYears = asset.usefulLifeYears || 5;
        const usefulLifeMonths = usefulLifeYears * 12;

        // Validate depreciable amount
        if (purchasePrice <= residualValue) {
          results.errors.push(
            `Asset ${asset.assetCode}: Purchase price must be greater than residual value`,
          );
          continue;
        }

        await this.prisma.depreciationSchedule.create({
          data: {
            assetId: asset.id,
            method: DepreciationMethod.STRAIGHT_LINE,
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

        results.created++;
      } catch (error: any) {
        results.errors.push(`Asset ${asset.assetCode}: ${error.message}`);
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
          orderBy: { periodDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
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
      orderBy: { periodDate: "asc" },
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
    // List EVERY depreciable asset — NOT just those with a depreciation entry in
    // the window — so a freshly-bought asset (purchase journalled, but depreciation
    // not run yet) still appears (with 0 accumulated, NBV = cost) and the asset
    // totals tie to the fixed-asset GL. Each asset is enriched with its
    // depreciation state AS OF endDate.
    const assets = await this.prisma.asset.findMany({
      where: {
        purchaseDate: { lte: data.endDate },
        status: { notIn: ["RETIRED", "DISPOSED"] },
        ...(data.assetId ? { id: data.assetId } : {}),
      },
    });

    // All depreciation entries up to endDate for these assets (one query),
    // chronological so the last one carries the cumulative accumulated total.
    const allEntries = assets.length
      ? await this.prisma.depreciationEntry.findMany({
          where: {
            assetId: { in: assets.map((a) => a.id) },
            periodDate: { lte: data.endDate },
          },
          orderBy: { periodDate: "asc" },
        })
      : [];
    const entriesByAsset = new Map<string, typeof allEntries>();
    for (const e of allEntries) {
      const list = entriesByAsset.get(e.assetId) ?? [];
      list.push(e);
      entriesByAsset.set(e.assetId, list);
    }

    let totalDepreciation = 0; // depreciation charged WITHIN [startDate, endDate]
    const byAsset: Record<string, any> = {};
    for (const a of assets) {
      const cost = Number(a.purchasePrice) || 0;
      const entries = entriesByAsset.get(a.id) ?? [];
      // Accumulated as of endDate = the latest entry's cumulative total (else 0).
      const latest = entries[entries.length - 1];
      const accumulated = latest ? Number(latest.accumulatedDepreciation) : 0;
      // Period depreciation = entries dated within the requested window.
      const periodDep = entries
        .filter(
          (e) =>
            e.periodDate >= data.startDate && e.periodDate <= data.endDate,
        )
        .reduce((s, e) => s + Number(e.depreciationAmount), 0);
      totalDepreciation += periodDep;
      byAsset[a.assetCode] = {
        assetId: a.id,
        assetCode: a.assetCode,
        assetName: a.name,
        purchasePrice: cost,
        purchaseDate: a.purchaseDate,
        usefulLifeYears: a.usefulLifeYears,
        depreciationGroup: (a as any).depreciationGroup ?? null,
        // Fixed-asset COA this asset is booked under (for grouping).
        coaCode: assetCoaForCategory(a.category),
        depreciationAmount: periodDep,
        accumulatedDepreciation: accumulated,
        netBookValue: cost - accumulated,
        entryCount: entries.length,
        unregistered: false,
      };
    }

    // Surface fixed-asset acquisitions that hit the GL but were never registered
    // as an Asset record — the disintegration where buying a fixed asset through
    // the Pembelian / manual-journal flow debits a 1-4xxx cost account yet creates
    // no asset (so it can't be depreciated and was invisible here). Listing them
    // makes the page's asset total tie to the fixed-asset GL and exposes the gap.
    // Fixed-asset COST accounts are ASSET + DEBIT-normal under 1-4xxx (this
    // excludes the CREDIT-normal Accumulated Depreciation contra accounts).
    const fixedAssetAccounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        accountType: "ASSET",
        normalBalance: "DEBIT",
        code: { startsWith: "1-4" },
      },
      select: { id: true, code: true, name: true, nameId: true },
    });
    if (fixedAssetAccounts.length && !data.assetId) {
      const faAcctIds = fixedAssetAccounts.map((a) => a.id);
      const faAcctById = new Map(fixedAssetAccounts.map((a) => [a.id, a]));
      const allAssets = await this.prisma.asset.findMany({
        select: { id: true, acquisitionJournalId: true },
      });
      const allAssetIds = allAssets.map((a) => a.id);
      // Journals that already produced a registered asset via the Pembelian flow
      // (asset.acquisitionJournalId) — exclude them too, else an auto-registered
      // purchase shows up BOTH as the asset AND as an "unregistered" GL posting.
      const acquisitionJournalIds = allAssets
        .map((a) => a.acquisitionJournalId)
        .filter((id): id is string => !!id);
      // GL postings to fixed-asset cost accounts whose journal isn't tied to a
      // registered asset (transactionId not an asset id, and not an acquisition
      // journal of a registered asset) → unregistered purchases.
      const unregGl = await this.prisma.generalLedger.findMany({
        where: {
          accountId: { in: faAcctIds },
          entryDate: { lte: data.endDate },
          journalEntry: {
            isPosted: true,
            transactionId: { notIn: allAssetIds.length ? allAssetIds : ["_none_"] },
            ...(acquisitionJournalIds.length
              ? { id: { notIn: acquisitionJournalIds } }
              : {}),
          },
        },
        select: {
          accountId: true,
          journalEntryId: true,
          journalEntryNumber: true,
          entryDate: true,
          debit: true,
          credit: true,
          description: true,
          journalEntry: { select: { description: true } },
        },
      });
      const unregByJe = new Map<string, any>();
      for (const r of unregGl) {
        const cur =
          unregByJe.get(r.journalEntryId) ?? {
            reference: r.journalEntryNumber,
            date: r.entryDate,
            name:
              r.description || r.journalEntry?.description || "—",
            account: faAcctById.get(r.accountId),
            net: 0,
          };
        cur.net += Number(r.debit) - Number(r.credit);
        unregByJe.set(r.journalEntryId, cur);
      }
      // Whole months between two dates (clamped at 0). The acquisition month
      // counts as elapsed once the next month begins.
      const monthsBetween = (from: Date, to: Date): number => {
        const f = new Date(from);
        const t = new Date(to);
        const m =
          (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth());
        return Math.max(0, m);
      };

      let unregIdx = 0;
      for (const u of unregByJe.values()) {
        if (u.net <= 0.005) continue; // net additions only
        unregIdx += 1;
        const coa: string | null = u.account?.code ?? null;

        // Useful life auto-assigned from the fixed-asset COA (1-4410 Office
        // Furniture → 8yr; General/Photography/Video-Audio/Lighting/Computers →
        // 4yr) and a PROJECTED straight-line depreciation, so the purchase no
        // longer shows a 0-year life / no depreciation. Residual assumed 0 for an
        // unregistered purchase. This is an estimate (not posted to the GL until
        // the asset is registered) — flagged `projected` so the GL-tied headline
        // totals exclude it (see itemsAccumulatedDepreciation below).
        const lifeYears = coa ? usefulLifeYearsForCoa(coa) : 4;
        const lifeMonths = lifeYears * 12;
        const depreciable = Math.max(0, u.net); // residual 0
        const monthly = lifeMonths > 0 ? depreciable / lifeMonths : 0;
        const elapsedAtEnd = Math.min(lifeMonths, monthsBetween(u.date, data.endDate));
        const elapsedAtStart = Math.min(
          lifeMonths,
          monthsBetween(u.date, data.startDate),
        );
        const accumulated = Math.min(depreciable, monthly * elapsedAtEnd);
        const periodDep = Math.max(0, elapsedAtEnd - elapsedAtStart) * monthly;

        byAsset[`__unreg_${u.reference}_${unregIdx}`] = {
          assetId: null,
          // assetCode stays the JE-… reference here; it is replaced with the
          // COA-style code (PHE-4510-00N) in the by-COA grouping pass below,
          // which also preserves the JE number in `journalRef`.
          assetCode: u.reference,
          assetName: u.name,
          category: u.account?.nameId || u.account?.name || null,
          coaCode: coa,
          purchasePrice: u.net,
          purchaseDate: u.date,
          usefulLifeYears: lifeYears,
          depreciationGroup: null,
          depreciationAmount: Math.round(periodDep),
          accumulatedDepreciation: Math.round(accumulated),
          netBookValue: Math.round(u.net - accumulated),
          entryCount: 0,
          // Flag: bought via purchase/journal, not registered as an asset, so the
          // depreciation above is a straight-line PROJECTION, not posted to the GL.
          // Register it from the Assets page to actually depreciate it.
          unregistered: true,
          projected: true,
        };
      }
    }

    // GL-authoritative accumulated depreciation as of endDate. The per-asset
    // figures above come from depreciation_entries (detail); a manual journal
    // posted straight to an accumulated-depreciation account, or entries outside
    // this [startDate, endDate] window, make them diverge — so the GL net is the
    // authoritative headline (ties to the balance sheet & journal entries).
    // Accumulated-depreciation accounts are contra-assets (ASSET / CREDIT-normal);
    // we match them by name so the ECL allowance (also a contra-asset) is excluded.
    const accumDepAccounts = await this.prisma.chartOfAccounts.findMany({
      where: {
        OR: [
          { name: { startsWith: "Accumulated Depreciation" } },
          { nameId: { startsWith: "Akumulasi Penyusutan" } },
        ],
      },
      select: { id: true },
    });
    let glAccumulatedDepreciation = 0;
    if (accumDepAccounts.length > 0) {
      const glRows = await this.prisma.generalLedger.findMany({
        where: {
          accountId: { in: accumDepAccounts.map((a) => a.id) },
          entryDate: { lte: data.endDate },
          journalEntry: { isPosted: true },
        },
        select: { debit: true, credit: true },
      });
      // Contra-asset, CREDIT-normal: net = credit − debit.
      glAccumulatedDepreciation = glRows.reduce(
        (sum, e) => sum + Number(e.credit) - Number(e.debit),
        0,
      );
    }
    // Sum of the per-asset accumulated depreciation (the itemised detail).
    // Exclude `projected` rows (unregistered purchases): their straight-line
    // depreciation is an estimate not posted to the GL, so counting it would
    // wrongly skew the GL-vs-items reconciling adjustment below.
    const itemsAccumulatedDepreciation = (
      Object.values(byAsset) as Array<{
        accumulatedDepreciation: number;
        projected?: boolean;
      }>
    ).reduce(
      (sum, a) => sum + (a.projected ? 0 : Number(a.accumulatedDepreciation || 0)),
      0,
    );
    // GL − items. Non-zero ⇒ a manual journal touched an accum-dep account, or
    // there are posted entries outside the reporting window.
    const accumulatedReconcilingAdjustment =
      glAccumulatedDepreciation - itemsAccumulatedDepreciation;

    // Names for the fixed-asset COA codes referenced by the rows (for group headers).
    const coaCodes = [
      ...new Set(
        (Object.values(byAsset) as any[]).map((r) => r.coaCode).filter(Boolean),
      ),
    ] as string[];
    const coaNameByCode = new Map<string, string>();
    if (coaCodes.length) {
      const coaRows = await this.prisma.chartOfAccounts.findMany({
        where: { code: { in: coaCodes } },
        select: { code: true, name: true, nameId: true },
      });
      for (const c of coaRows) {
        coaNameByCode.set(c.code, c.nameId || c.name);
      }
    }
    for (const r of Object.values(byAsset) as any[]) {
      r.coaName = r.coaCode ? coaNameByCode.get(r.coaCode) ?? r.coaCode : null;
    }

    // Asset rows sorted by COA so the page can render them grouped by account.
    const byAssetList = (Object.values(byAsset) as any[]).sort((a, b) =>
      String(a.coaCode ?? "").localeCompare(String(b.coaCode ?? "")) ||
      String(a.assetCode ?? "").localeCompare(String(b.assetCode ?? "")),
    );

    // Grouped-by-COA view with per-group subtotals.
    const byCoa: Record<string, any> = {};
    for (const r of byAssetList) {
      const code = r.coaCode ?? "—";
      if (!byCoa[code]) {
        byCoa[code] = {
          coaCode: code,
          coaName: r.coaName ?? code,
          assets: [],
          totalCost: 0,
          totalAccumulated: 0,
          totalNetBookValue: 0,
        };
      }
      const g = byCoa[code];
      g.assets.push(r);
      g.totalCost += Number(r.purchasePrice) || 0;
      g.totalAccumulated += Number(r.accumulatedDepreciation) || 0;
      g.totalNetBookValue += Number(r.netBookValue) || 0;
    }

    // In the Asset & Depreciation listing, give unregistered purchases a COA-style
    // code (e.g. PHE-4510-003) instead of the raw journal number (JE-xxxx) — only
    // here; the underlying journal keeps its number. Numbered within each COA group
    // after the registered assets. The journal reference is kept for drill-down.
    for (const g of Object.values(byCoa) as any[]) {
      let seq = g.assets.filter((a: any) => !a.unregistered).length;
      for (const a of g.assets) {
        if (a.unregistered) {
          seq += 1;
          a.journalRef = a.assetCode; // preserve the JE-xxxx reference
          a.assetCode = assetCodeForCoa(g.coaCode, seq);
        }
      }
    }

    // Grand totals for the page KPIs (image: Total Cost + Net Book Value).
    const totalCost = byAssetList.reduce(
      (s, a) => s + (Number(a.purchasePrice) || 0),
      0,
    );
    const totalNetBookValue = byAssetList.reduce(
      (s, a) => s + (Number(a.netBookValue) || 0),
      0,
    );

    return {
      period: {
        startDate: data.startDate,
        endDate: data.endDate,
      },
      totalDepreciation,
      // Grand totals across all listed assets (registered + unregistered).
      totalCost,
      totalNetBookValue,
      // GL-authoritative accumulated depreciation (contra-asset family) as of endDate.
      totalAccumulatedDepreciation: glAccumulatedDepreciation,
      // Per-asset accumulated depreciation summed (supporting detail).
      itemsAccumulatedDepreciation,
      // GL − items: surfaces manual journals / out-of-window entries.
      accumulatedReconcilingAdjustment,
      assetCount: byAssetList.length,
      byAsset: byAssetList,
      // Grouped by fixed-asset COA (account) for the Asset & Depreciation page.
      byCoa: Object.values(byCoa),
      byMethod: {}, // Can be enhanced later if needed
    };
  }

  /**
   * Get PSAK 16 depreciation calculation table for a single asset.
   *
   * Returns the FULL computed schedule (one row per month) plus a condensed
   * view showing only the FIRST and LAST period — the two rows required by
   * "perhitungan depresiasi" tables in Indonesian accounting practice.
   *
   * Columns:
   *   period          – YYYY-MM identifier
   *   periodDate      – first day of that period
   *   openingValue    – Saldo Awal  (book value at START of period)
   *   depreciation    – Perhitungan Depresiasi (amount charged this period)
   *   accumulated     – Akumulasi Depresiasi   (cumulative to end of period)
   *   closingValue    – Saldo Akhir (book value at END of period = opening - depreciation)
   */
  async getDepreciationCalculationTable(assetId: string) {
    const schedule = await this.prisma.depreciationSchedule.findFirst({
      where: { assetId, isActive: true },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });

    if (!schedule) {
      // No schedule: return empty structure
      const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
      return {
        assetId,
        assetCode: asset?.assetCode,
        assetName: asset?.name,
        hasSchedule: false,
        schedule: null,
        fullTable: [],
        firstPeriod: null,
        lastPeriod: null,
      };
    }

    const purchasePrice = Number(schedule.asset.purchasePrice) || 0;
    const residual = Number(schedule.residualValue);
    const depreciableAmount = Number(schedule.depreciableAmount);
    const usefulLifeMonths = schedule.usefulLifeMonths;
    const method = schedule.method;

    // Build full month-by-month schedule
    type PeriodRow = {
      period: string;
      periodDate: Date;
      openingValue: number;
      depreciation: number;
      accumulated: number;
      closingValue: number;
    };

    const rows: PeriodRow[] = [];
    let accumulated = 0;
    let currentBookValue = purchasePrice;

    const startDate = new Date(schedule.startDate);

    for (let i = 0; i < usefulLifeMonths; i++) {
      const periodDate = new Date(startDate);
      periodDate.setMonth(periodDate.getMonth() + i);
      const period = periodDate.toISOString().slice(0, 7);

      const openingValue = currentBookValue;

      let periodDep: number;
      if (method === "STRAIGHT_LINE") {
        periodDep = Number(schedule.depreciationPerMonth);
      } else if (method === "SUM_OF_YEARS_DIGITS") {
        // SYD: per-period rate depends on remaining life at that year
        const usefulLifeYears = Number(schedule.usefulLifeYears);
        const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
        const completedYears = Math.floor(i / 12);
        const remainingYears = usefulLifeYears - completedYears;
        const yearFraction = remainingYears > 0 ? remainingYears / sumOfYears : 0;
        periodDep = (Number(schedule.depreciableAmount) * yearFraction) / 12;
      } else {
        // Declining balance: apply monthly rate to current book value
        const monthlyRate = Number(schedule.annualRate) / 12;
        periodDep = currentBookValue * monthlyRate;
      }

      // Do not depreciate below residual value
      const remainingDepreciable = Math.max(currentBookValue - residual, 0);
      if (periodDep > remainingDepreciable) {
        periodDep = remainingDepreciable;
      }

      accumulated += periodDep;
      const closingValue = Math.max(currentBookValue - periodDep, residual);

      rows.push({
        period,
        periodDate,
        openingValue: Math.round(openingValue),
        depreciation: Math.round(periodDep),
        accumulated: Math.round(accumulated),
        closingValue: Math.round(closingValue),
      });

      currentBookValue = closingValue;

      // Stop if fully depreciated
      if (Math.abs(closingValue - residual) < 1) break;
    }

    return {
      assetId,
      assetCode: schedule.asset.assetCode,
      assetName: schedule.asset.name,
      hasSchedule: true,
      schedule: {
        id: schedule.id,
        method: schedule.method,
        purchasePrice,
        residualValue: residual,
        depreciableAmount,
        usefulLifeMonths,
        usefulLifeYears: Number(schedule.usefulLifeYears),
        depreciationPerMonth: Number(schedule.depreciationPerMonth),
        depreciationPerYear: Number(schedule.depreciationPerYear),
        annualRate: Number(schedule.annualRate),
        startDate: schedule.startDate,
        endDate: schedule.endDate,
      },
      fullTable: rows,
      firstPeriod: rows[0] ?? null,
      lastPeriod: rows[rows.length - 1] ?? null,
      totalPeriods: rows.length,
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
      throw new NotFoundException(
        `Depreciation schedule with ID ${scheduleId} not found`,
      );
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
