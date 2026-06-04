import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCashBankBalanceDto } from "../dto/create-cash-bank-balance.dto";
import { UpdateCashBankBalanceDto } from "../dto/update-cash-bank-balance.dto";
import { CashBankBalanceQueryDto } from "../dto/cash-bank-balance-query.dto";
import { Prisma } from "@prisma/client";
import { classifyCashAccount } from "../cash-accounts.util";

/**
 * Per-account cash & bank running balances.
 *
 * Each cash/bank account (Kas, Rekening Bank, USD, Crypto — see
 * cash-accounts.util) gets its own monthly row with opening/inflow/outflow/
 * closing. Opening balances chain chronologically PER ACCOUNT (gap-aware), so
 * each account carries forward independently and the page can show them grouped
 * (Cash vs Bank) with a correct combined total.
 */
@Injectable()
export class CashBankBalanceService {
  constructor(private prisma: PrismaService) {}

  private toNum(v: Prisma.Decimal | number | null | undefined): number {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(v.toString());
    return Number.isFinite(n) ? n : 0;
  }

  /** All cash/bank accounts (excludes inventory etc. via the classification util). */
  private async getCashBankAccounts() {
    const candidates = await this.prisma.chartOfAccounts.findMany({
      where: { code: { startsWith: "1-10" } },
      select: { id: true, code: true, name: true, nameId: true },
      orderBy: { code: "asc" },
    });
    return candidates
      .map((a) => ({ ...a, group: classifyCashAccount(a.code) }))
      .filter((a) => a.group !== null) as Array<{
      id: string;
      code: string;
      name: string;
      nameId: string | null;
      group: "CASH" | "BANK";
    }>;
  }

  /** Posted movements for ONE account in a period (debits = inflow, credits = outflow). */
  private async calculateAccountMovements(
    accountId: string,
    year: number,
    month: number,
  ): Promise<{ totalInflow: number; totalOutflow: number }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const items = await this.prisma.journalLineItem.findMany({
      where: {
        accountId,
        journalEntry: {
          entryDate: { gte: startDate, lte: endDate },
          isPosted: true, // only posted entries affect the cash position
        },
      },
      select: { debit: true, credit: true },
    });
    let totalInflow = 0;
    let totalOutflow = 0;
    for (const it of items) {
      totalInflow += this.toNum(it.debit);
      totalOutflow += this.toNum(it.credit);
    }
    return { totalInflow, totalOutflow };
  }

  /** Most recent row for an account strictly before (year, month) — gap-aware. */
  private findPriorRow(accountId: string, year: number, month: number) {
    return this.prisma.cashBankBalance.findFirst({
      where: {
        accountId,
        OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  /**
   * Re-chain running balances from (year, month) onward, INDEPENDENTLY per
   * account: each account's opening = its own prior period's closing (or its
   * earliest seed when none), closing = opening + inflow − outflow.
   */
  private async rechainFrom(year: number, month: number): Promise<void> {
    const rows = await this.prisma.cashBankBalance.findMany({
      where: { OR: [{ year: { gt: year } }, { year, month: { gte: month } }] },
      orderBy: [{ accountId: "asc" }, { year: "asc" }, { month: "asc" }],
    });
    if (rows.length === 0) return;

    const byAccount = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!byAccount.has(r.accountId)) byAccount.set(r.accountId, []);
      byAccount.get(r.accountId)!.push(r);
    }

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const [accountId, accRows] of byAccount) {
      const prior = await this.findPriorRow(accountId, year, month);
      let prevClosing = prior
        ? this.toNum(prior.closingBalance)
        : this.toNum(accRows[0].openingBalance);
      for (const r of accRows) {
        // Recompute inflow/outflow from posted line items for this account+period
        // to correct any stale values left by back-dated journal entries.
        const { totalInflow: inflow, totalOutflow: outflow } =
          await this.calculateAccountMovements(accountId, r.year, r.month);
        const opening = prevClosing;
        const closing = opening + inflow - outflow;
        ops.push(
          this.prisma.cashBankBalance.update({
            where: { id: r.id },
            data: {
              totalInflow: new Prisma.Decimal(inflow),
              totalOutflow: new Prisma.Decimal(outflow),
              openingBalance: new Prisma.Decimal(opening),
              closingBalance: new Prisma.Decimal(closing),
              netChange: new Prisma.Decimal(inflow - outflow),
            },
          }),
        );
        prevClosing = closing;
      }
    }
    await this.prisma.$transaction(ops);
  }

  /**
   * Sync one period: for every cash/bank account that has activity that month
   * (or already carries a prior balance), upsert its row with fresh movements,
   * then re-chain. Called by the journal auto-sync on post/reverse.
   */
  async syncPeriod(year: number, month: number, userId: string) {
    const accounts = await this.getCashBankAccounts();
    const periodLabel = `${year}-${String(month).padStart(2, "0")}`;

    for (const acct of accounts) {
      const { totalInflow, totalOutflow } = await this.calculateAccountMovements(
        acct.id,
        year,
        month,
      );
      const existing = await this.prisma.cashBankBalance.findUnique({
        where: { accountId_year_month: { accountId: acct.id, year, month } },
      });
      const prior = await this.findPriorRow(acct.id, year, month);
      const hasActivity = totalInflow !== 0 || totalOutflow !== 0;

      if (existing) {
        await this.prisma.cashBankBalance.update({
          where: { id: existing.id },
          data: {
            totalInflow: new Prisma.Decimal(totalInflow),
            totalOutflow: new Prisma.Decimal(totalOutflow),
            netChange: new Prisma.Decimal(totalInflow - totalOutflow),
            accountCode: acct.code,
            accountName: acct.nameId || acct.name,
            group: acct.group,
            calculatedAt: new Date(),
            calculatedBy: userId,
          },
        });
      } else if (hasActivity || prior) {
        // Only materialise a row once an account has activity or a carried balance.
        await this.prisma.cashBankBalance.create({
          data: {
            accountId: acct.id,
            accountCode: acct.code,
            accountName: acct.nameId || acct.name,
            group: acct.group,
            period: periodLabel,
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
    }

    await this.rechainFrom(year, month);
    return this.findByPeriod(year, month);
  }

  /**
   * Full rebuild: recompute every per-account period row from posted journal
   * entries and re-chain. Repairs/initialises history (run once after the
   * per-account migration, or any time totals look off).
   */
  async recalculateAll(userId: string) {
    const accounts = await this.getCashBankAccounts();
    const accountIds = accounts.map((a) => a.id);
    const meta = new Map(accounts.map((a) => [a.id, a]));

    // Every (account, year, month) with posted activity.
    const lines = await this.prisma.journalLineItem.findMany({
      where: {
        accountId: { in: accountIds },
        journalEntry: { isPosted: true },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
        journalEntry: { select: { entryDate: true } },
      },
    });

    type Agg = { inflow: number; outflow: number };
    const buckets = new Map<string, Agg>(); // key: accountId|year|month
    for (const l of lines) {
      const d = new Date(l.journalEntry.entryDate);
      const key = `${l.accountId}|${d.getFullYear()}|${d.getMonth() + 1}`;
      const b = buckets.get(key) || { inflow: 0, outflow: 0 };
      b.inflow += this.toNum(l.debit);
      b.outflow += this.toNum(l.credit);
      buckets.set(key, b);
    }

    // Clean rebuild.
    await this.prisma.cashBankBalance.deleteMany({});

    let created = 0;
    for (const [key, agg] of buckets) {
      const [accountId, yStr, mStr] = key.split("|");
      const year = Number(yStr);
      const month = Number(mStr);
      const acct = meta.get(accountId)!;
      await this.prisma.cashBankBalance.create({
        data: {
          accountId,
          accountCode: acct.code,
          accountName: acct.nameId || acct.name,
          group: acct.group,
          period: `${year}-${String(month).padStart(2, "0")}`,
          periodDate: new Date(year, month - 1, 1),
          year,
          month,
          openingBalance: new Prisma.Decimal(0),
          closingBalance: new Prisma.Decimal(agg.inflow - agg.outflow),
          totalInflow: new Prisma.Decimal(agg.inflow),
          totalOutflow: new Prisma.Decimal(agg.outflow),
          netChange: new Prisma.Decimal(agg.inflow - agg.outflow),
          calculatedAt: new Date(),
          calculatedBy: userId,
          createdBy: userId,
        },
      });
      created++;
    }

    // Re-chain everything from the earliest period present.
    const earliest = await this.prisma.cashBankBalance.findFirst({
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });
    if (earliest) await this.rechainFrom(earliest.year, earliest.month);

    return { recalculated: created };
  }

  /** List per-account rows (newest period first by default). */
  async findAll(query: CashBankBalanceQueryDto) {
    const {
      year,
      month,
      search,
      page = 1,
      limit = 200,
      sortBy = "periodDate",
      sortOrder = "desc",
    } = query;

    const where: Prisma.CashBankBalanceWhereInput = {};
    if (year) where.year = year;
    if (month) where.month = month;
    if (search) {
      where.OR = [
        { period: { contains: search, mode: "insensitive" } },
        { accountName: { contains: search, mode: "insensitive" } },
        { accountCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.cashBankBalance.findMany({
        where,
        orderBy: [{ [sortBy]: sortOrder }, { group: "asc" }, { accountCode: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cashBankBalance.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const balance = await this.prisma.cashBankBalance.findUnique({ where: { id } });
    if (!balance) throw new NotFoundException(`Balance with ID ${id} not found`);
    return balance;
  }

  /** All account rows for a period. */
  async findByPeriod(year: number, month: number) {
    return this.prisma.cashBankBalance.findMany({
      where: { year, month },
      orderBy: [{ group: "asc" }, { accountCode: "asc" }],
    });
  }

  /** Manual "calculate / sync this period" — recomputes all accounts for the month. */
  async create(dto: CreateCashBankBalanceDto) {
    return this.syncPeriod(dto.year, dto.month, dto.createdBy ?? "system");
  }

  /** Recompute the row's whole period (opening is auto-chained, not manual). */
  async update(id: string, dto: UpdateCashBankBalanceDto) {
    const existing = await this.findOne(id);
    return this.syncPeriod(existing.year, existing.month, dto.updatedBy ?? "system");
  }

  /** Recalculate a single period (the row's month). */
  async recalculate(id: string, userId: string) {
    const existing = await this.findOne(id);
    return this.syncPeriod(existing.year, existing.month, userId);
  }

  /** Delete one account-period row, then re-chain that account forward. */
  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.cashBankBalance.delete({ where: { id } });
    await this.rechainFrom(existing.year, existing.month);
    return existing;
  }
}
