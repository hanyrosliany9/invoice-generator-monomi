import {
  Injectable,
  BadRequestException,
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
   * Create a new cash/bank balance record
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

    // Calculate closing balance and net change
    const openingBalance = dto.openingBalance;
    const closingBalance = openingBalance + totalInflow - totalOutflow;
    const netChange = totalInflow - totalOutflow;

    // Create the balance record
    return this.prisma.cashBankBalance.create({
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
   * Update a balance record
   */
  async update(id: string, dto: UpdateCashBankBalanceDto) {
    const existing = await this.findOne(id);

    // Recalculate if opening balance changed or user requested recalculation
    let updateData: any = {
      updatedBy: dto.updatedBy,
      notes: dto.notes,
    };

    if (dto.openingBalance !== undefined) {
      // Recalculate with new opening balance
      const { totalInflow, totalOutflow } = await this.calculateCashMovements(
        existing.year,
        existing.month,
      );

      const openingBalance = dto.openingBalance;
      const closingBalance = openingBalance + totalInflow - totalOutflow;
      const netChange = totalInflow - totalOutflow;

      updateData = {
        ...updateData,
        openingBalance: new Prisma.Decimal(openingBalance),
        closingBalance: new Prisma.Decimal(closingBalance),
        totalInflow: new Prisma.Decimal(totalInflow),
        totalOutflow: new Prisma.Decimal(totalOutflow),
        netChange: new Prisma.Decimal(netChange),
        calculatedAt: new Date(),
        calculatedBy: dto.updatedBy,
      };
    }

    return this.prisma.cashBankBalance.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Recalculate balance for a specific period
   * ✅ FIX: Also recalculate opening balance from previous month
   */
  async recalculate(id: string, userId: string) {
    const existing = await this.findOne(id);

    // ✅ FIX: Get opening balance from previous month's closing balance
    const prevMonth = existing.month === 1 ? 12 : existing.month - 1;
    const prevYear = existing.month === 1 ? existing.year - 1 : existing.year;

    const previousBalance = await this.prisma.cashBankBalance.findUnique({
      where: {
        year_month: { year: prevYear, month: prevMonth },
      },
    });

    const openingBalance = previousBalance
      ? parseFloat(previousBalance.closingBalance.toString())
      : 0;

    const { totalInflow, totalOutflow } = await this.calculateCashMovements(
      existing.year,
      existing.month,
    );

    const closingBalance = openingBalance + totalInflow - totalOutflow;
    const netChange = totalInflow - totalOutflow;

    return this.prisma.cashBankBalance.update({
      where: { id },
      data: {
        openingBalance: new Prisma.Decimal(openingBalance), // ✅ FIX: Update opening balance
        closingBalance: new Prisma.Decimal(closingBalance),
        totalInflow: new Prisma.Decimal(totalInflow),
        totalOutflow: new Prisma.Decimal(totalOutflow),
        netChange: new Prisma.Decimal(netChange),
        calculatedAt: new Date(),
        calculatedBy: userId,
        updatedBy: userId,
      },
    });
  }

  /**
   * Delete a balance record
   */
  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.cashBankBalance.delete({
      where: { id },
    });
  }
}
