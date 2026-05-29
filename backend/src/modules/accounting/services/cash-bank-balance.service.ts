import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCashBankBalanceDto } from "../dto/create-cash-bank-balance.dto";
import { UpdateCashBankBalanceDto } from "../dto/update-cash-bank-balance.dto";
import { CashBankBalanceQueryDto } from "../dto/cash-bank-balance-query.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class CashBankBalanceService {
  constructor(private prisma: PrismaService) {}

  private toNum(v: Prisma.Decimal | number | null | undefined): number {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(v.toString());
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Calculate cash/bank movements from journal entries for a period
   */
  private async calculateCashMovements(
    year: number,
    month: number,
  ): Promise<{ totalInflow: number; totalOutflow: number }> {
    // Get start and end dates for the period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Query all journal line items for cash/bank accounts (1-1xxx) in this period
    const cashMovements = await this.prisma.journalLineItem.findMany({
      where: {
        journalEntry: {
          entryDate: {
            gte: startDate,
            lte: endDate,
          },
          isPosted: true, // Only posted entries affect the cash position
        },
        account: {
          code: {
            startsWith: "1-1", // Cash & Bank accounts
          },
        },
      },
      include: {
        account: true,
      },
    });

    // Calculate inflows (debits) and outflows (credits)
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const item of cashMovements) {
      const debitAmount = parseFloat(item.debit?.toString() || "0");
      const creditAmount = parseFloat(item.credit?.toString() || "0");

      totalInflow += debitAmount;
      totalOutflow += creditAmount;
    }

    return { totalInflow, totalOutflow };
  }

  /**
   * The most recent balance period strictly BEFORE (year, month).
   * Walks the whole chronology — robust to gaps (e.g. a missing March between
   * February and April), unlike a naive month-minus-one lookup.
   */
  private findPriorPeriod(year: number, month: number) {
    return this.prisma.cashBankBalance.findFirst({
      where: {
        OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  /**
   * Re-chain the running balance for the period at (year, month) and EVERY
   * later period, in chronological order: each period's opening balance is set
   * to the previous period's closing balance, and the closing balance is
   * recomputed as opening + inflow − outflow.
   *
   * - The earliest period in the chain keeps its own (manually seeded) opening
   *   balance when no prior period exists.
   * - Stored inflow/outflow are used as-is (they're already period-scoped from
   *   journal entries); only the opening/closing/netChange chain is corrected.
   * - Runs as a single transaction so the chain is never left half-applied.
   */
  private async rechainFrom(year: number, month: number): Promise<void> {
    const periods = await this.prisma.cashBankBalance.findMany({
      where: {
        OR: [{ year: { gt: year } }, { year, month: { gte: month } }],
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });
    if (periods.length === 0) return;

    const prior = await this.findPriorPeriod(year, month);
    // Seed: prior period's closing, or — for the earliest period — its own
    // opening balance (the manual starting figure), preserved.
    let prevClosing = prior
      ? this.toNum(prior.closingBalance)
      : this.toNum(periods[0].openingBalance);

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const p of periods) {
      const inflow = this.toNum(p.totalInflow);
      const outflow = this.toNum(p.totalOutflow);
      const opening = prevClosing;
      const closing = opening + inflow - outflow;
      ops.push(
        this.prisma.cashBankBalance.update({
          where: { id: p.id },
          data: {
            openingBalance: new Prisma.Decimal(opening),
            closingBalance: new Prisma.Decimal(closing),
            netChange: new Prisma.Decimal(inflow - outflow),
          },
        }),
      );
      prevClosing = closing;
    }

    await this.prisma.$transaction(ops);
  }

  /**
   * Create a new cash/bank balance record.
   * Opening balance auto-chains from the previous period's closing balance;
   * the manual openingBalance is used only as the seed for the very first
   * period. Later periods are re-chained so inserting an out-of-order period
   * keeps the whole chronology consistent.
   */
  async create(dto: CreateCashBankBalanceDto) {
    // Check if balance for this period already exists
    const existing = await this.prisma.cashBankBalance.findUnique({
      where: {
        year_month: {
          year: dto.year,
          month: dto.month,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Balance for ${dto.period} already exists. Please update instead.`,
      );
    }

    // Calculate movements from journal entries
    const { totalInflow, totalOutflow } = await this.calculateCashMovements(
      dto.year,
      dto.month,
    );

    // Provisional opening = manual seed; rechainFrom corrects it from the prior
    // period's closing when one exists.
    const openingBalance = dto.openingBalance;
    const closingBalance = openingBalance + totalInflow - totalOutflow;
    const netChange = totalInflow - totalOutflow;

    const created = await this.prisma.cashBankBalance.create({
      data: {
        period: dto.period,
        periodDate: dto.periodDate,
        year: dto.year,
        month: dto.month,
        openingBalance: new Prisma.Decimal(openingBalance),
        closingBalance: new Prisma.Decimal(closingBalance),
        totalInflow: new Prisma.Decimal(totalInflow),
        totalOutflow: new Prisma.Decimal(totalOutflow),
        netChange: new Prisma.Decimal(netChange),
        calculatedAt: new Date(),
        calculatedBy: dto.createdBy,
        createdBy: dto.createdBy,
        notes: dto.notes,
      },
    });

    // Chain this period from the prior period's closing + cascade to later ones.
    await this.rechainFrom(dto.year, dto.month);

    return this.findOne(created.id);
  }

  /**
   * Find all balances with pagination and filtering
   */
  async findAll(query: CashBankBalanceQueryDto) {
    const {
      year,
      month,
      search,
      page = 1,
      limit = 10,
      sortBy = "periodDate",
      sortOrder = "desc",
    } = query;

    const where: Prisma.CashBankBalanceWhereInput = {};

    if (year) {
      where.year = year;
    }

    if (month) {
      where.month = month;
    }

    if (search) {
      where.OR = [
        { period: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.cashBankBalance.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cashBankBalance.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one balance by ID
   */
  async findOne(id: string) {
    const balance = await this.prisma.cashBankBalance.findUnique({
      where: { id },
    });

    if (!balance) {
      throw new NotFoundException(`Balance with ID ${id} not found`);
    }

    return balance;
  }

  /**
   * Find balance by year and month
   */
  async findByPeriod(year: number, month: number) {
    return this.prisma.cashBankBalance.findUnique({
      where: {
        year_month: {
          year,
          month,
        },
      },
    });
  }

  /**
   * Update a balance record. Recomputes this period's movements from journal
   * entries and re-chains the running balance (this period + all later ones).
   */
  async update(id: string, dto: UpdateCashBankBalanceDto) {
    const existing = await this.findOne(id);

    const { totalInflow, totalOutflow } = await this.calculateCashMovements(
      existing.year,
      existing.month,
    );

    await this.prisma.cashBankBalance.update({
      where: { id },
      data: {
        totalInflow: new Prisma.Decimal(totalInflow),
        totalOutflow: new Prisma.Decimal(totalOutflow),
        netChange: new Prisma.Decimal(totalInflow - totalOutflow),
        // Allow re-seeding the opening only for the earliest period; rechainFrom
        // overrides it for any period that has a prior.
        ...(dto.openingBalance !== undefined
          ? { openingBalance: new Prisma.Decimal(dto.openingBalance) }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedBy: dto.updatedBy,
        calculatedAt: new Date(),
        calculatedBy: dto.updatedBy,
      },
    });

    await this.rechainFrom(existing.year, existing.month);

    return this.findOne(id);
  }

  /**
   * Recalculate a single period's movements from journal entries, then
   * re-chain its opening/closing from the prior period and cascade forward.
   */
  async recalculate(id: string, userId: string) {
    const existing = await this.findOne(id);

    const { totalInflow, totalOutflow } = await this.calculateCashMovements(
      existing.year,
      existing.month,
    );

    await this.prisma.cashBankBalance.update({
      where: { id },
      data: {
        totalInflow: new Prisma.Decimal(totalInflow),
        totalOutflow: new Prisma.Decimal(totalOutflow),
        netChange: new Prisma.Decimal(totalInflow - totalOutflow),
        calculatedAt: new Date(),
        calculatedBy: userId,
        updatedBy: userId,
      },
    });

    await this.rechainFrom(existing.year, existing.month);

    return this.findOne(id);
  }

  /**
   * Recalculate EVERY period: refresh movements from journal entries and
   * re-chain the entire running balance chronologically. Repairs historical
   * records whose opening balances drifted out of chronological order.
   */
  async recalculateAll(userId: string) {
    const all = await this.prisma.cashBankBalance.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    for (const p of all) {
      const { totalInflow, totalOutflow } = await this.calculateCashMovements(
        p.year,
        p.month,
      );
      await this.prisma.cashBankBalance.update({
        where: { id: p.id },
        data: {
          totalInflow: new Prisma.Decimal(totalInflow),
          totalOutflow: new Prisma.Decimal(totalOutflow),
          netChange: new Prisma.Decimal(totalInflow - totalOutflow),
          calculatedAt: new Date(),
          calculatedBy: userId,
        },
      });
    }

    if (all.length > 0) {
      await this.rechainFrom(all[0].year, all[0].month);
    }

    return { recalculated: all.length };
  }

  /**
   * Sync a single period from current journal activity, then re-chain forward.
   * Used by the journal auto-sync (post / reverse): creates the period record if
   * it doesn't exist, refreshes its movements, and re-chains opening/closing for
   * this period and every later one. Opening is derived from the prior period's
   * closing via rechainFrom — never a manual figure here.
   */
  async syncPeriod(year: number, month: number, userId: string) {
    const { totalInflow, totalOutflow } = await this.calculateCashMovements(
      year,
      month,
    );

    const existing = await this.findByPeriod(year, month);
    if (existing) {
      await this.prisma.cashBankBalance.update({
        where: { id: existing.id },
        data: {
          totalInflow: new Prisma.Decimal(totalInflow),
          totalOutflow: new Prisma.Decimal(totalOutflow),
          netChange: new Prisma.Decimal(totalInflow - totalOutflow),
          calculatedAt: new Date(),
          calculatedBy: userId,
        },
      });
    } else {
      await this.prisma.cashBankBalance.create({
        data: {
          period: `${year}-${String(month).padStart(2, "0")}`,
          periodDate: new Date(year, month - 1, 1),
          year,
          month,
          openingBalance: new Prisma.Decimal(0), // provisional; rechainFrom sets it
          closingBalance: new Prisma.Decimal(totalInflow - totalOutflow),
          totalInflow: new Prisma.Decimal(totalInflow),
          totalOutflow: new Prisma.Decimal(totalOutflow),
          netChange: new Prisma.Decimal(totalInflow - totalOutflow),
          calculatedAt: new Date(),
          calculatedBy: userId,
          createdBy: userId,
        },
      });
    }

    await this.rechainFrom(year, month);
    return this.findByPeriod(year, month);
  }

  /**
   * Delete a balance record, then re-chain later periods so the running
   * balance stays continuous across the now-removed period.
   */
  async remove(id: string) {
    const existing = await this.findOne(id);

    await this.prisma.cashBankBalance.delete({
      where: { id },
    });

    await this.rechainFrom(existing.year, existing.month);

    return existing;
  }
}
