import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalService } from "../accounting/services/journal.service";
import {
  CreateStaffDto,
  UpdateStaffDto,
  CreateSalaryPaymentDto,
  UpdateSalaryPaymentDto,
} from "./dto";
import { SalaryPaymentStatus } from "@prisma/client";

// Map staff position keywords → salary-expense GL account
const SALARY_EXPENSE_ACCOUNT = "6-5020"; // default: Salaries - Administrative
const MANAGEMENT_ACCOUNT = "6-5010"; // Salaries - Management
const SALES_ACCOUNT = "6-1010"; // Sales Salaries
const CASH_ACCOUNT = "1-1010"; // Kas (Cash)
const BANK_ACCOUNT = "1-1020"; // Rekening Bank

function salaryExpenseAccount(position: string | null | undefined): string {
  if (!position) return SALARY_EXPENSE_ACCOUNT;
  const p = position.toLowerCase();
  if (/manager|management|direktur|director|ceo|cfo|coo|kepala/.test(p))
    return MANAGEMENT_ACCOUNT;
  if (/sales|penjualan|marketing/.test(p)) return SALES_ACCOUNT;
  return SALARY_EXPENSE_ACCOUNT;
}

function cashOrBankAccount(bankName: string | null | undefined): string {
  // If staff has a bank account on record, credit Bank; otherwise cash
  return bankName ? BANK_ACCOUNT : CASH_ACCOUNT;
}

@Injectable()
export class SalariesService {
  private readonly logger = new Logger(SalariesService.name);

  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  // ============================================================================
  // STAFF CRUD
  // ============================================================================

  async createStaff(dto: CreateStaffDto) {
    const data: any = {
      name: dto.name,
      position: dto.position,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      baseSalary: dto.baseSalary,
      bankName: dto.bankName ?? null,
      bankAccount: dto.bankAccount ?? null,
      notes: dto.notes ?? null,
      isActive: dto.isActive ?? true,
    };
    if (dto.joinedDate) {
      data.joinedDate = new Date(dto.joinedDate);
    }
    return this.prisma.staff.create({ data });
  }

  async findAllStaff(includeInactive = false) {
    return this.prisma.staff.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        salaryPayments: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findOneStaff(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        salaryPayments: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
      },
    });
    if (!staff) throw new NotFoundException(`Staff not found: ${id}`);
    return staff;
  }

  async updateStaff(id: string, dto: UpdateStaffDto) {
    await this.findOneStaff(id);
    const data: any = { ...dto };
    if (dto.joinedDate) {
      data.joinedDate = new Date(dto.joinedDate);
    }
    return this.prisma.staff.update({ where: { id }, data });
  }

  async removeStaff(id: string) {
    await this.findOneStaff(id);
    // Soft-delete by deactivating
    return this.prisma.staff.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================================================
  // SALARY PAYMENTS CRUD
  // ============================================================================

  async createPayment(dto: CreateSalaryPaymentDto) {
    // Ensure staff exists
    const staff = await this.findOneStaff(dto.staffId);

    // Check for duplicate period
    const existing = await this.prisma.salaryPayment.findUnique({
      where: {
        staffId_year_month: {
          staffId: dto.staffId,
          year: dto.year,
          month: dto.month,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Salary payment for staff ${dto.staffId} in ${dto.year}/${dto.month} already exists`,
      );
    }

    const allowances = dto.allowances ?? 0;
    const deductions = dto.deductions ?? 0;
    const netPay = dto.baseSalary + allowances - deductions;

    const data: any = {
      staffId: dto.staffId,
      period: dto.period,
      year: dto.year,
      month: dto.month,
      baseSalary: dto.baseSalary,
      allowances,
      deductions,
      netPay,
      notes: dto.notes ?? null,
      status: SalaryPaymentStatus.DRAFT,
    };

    if (dto.paidAt) {
      data.paidAt = new Date(dto.paidAt);
      data.status = SalaryPaymentStatus.PAID;
    }

    const payment = await this.prisma.salaryPayment.create({
      data,
      include: { staff: true },
    });

    // If created already-PAID, post the GL journal immediately
    if (payment.status === SalaryPaymentStatus.PAID) {
      await this.postSalaryJournal(payment, staff as any, "system");
    }

    return payment;
  }

  async findAllPayments(
    staffId?: string,
    year?: number,
    month?: number,
    status?: SalaryPaymentStatus,
  ) {
    return this.prisma.salaryPayment.findMany({
      where: {
        ...(staffId ? { staffId } : {}),
        ...(year ? { year } : {}),
        ...(month ? { month } : {}),
        ...(status ? { status } : {}),
      },
      include: { staff: { select: { id: true, name: true, position: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  async findOnePayment(id: string) {
    const payment = await this.prisma.salaryPayment.findUnique({
      where: { id },
      include: { staff: true },
    });
    if (!payment) throw new NotFoundException(`Salary payment not found: ${id}`);
    return payment;
  }

  async updatePayment(id: string, dto: UpdateSalaryPaymentDto) {
    const current = await this.findOnePayment(id);

    // FIX 2: Check for duplicate staffId+year+month when those fields are changing
    const newStaffId = dto.staffId ?? current.staffId;
    const newYear    = dto.year    ?? current.year;
    const newMonth   = dto.month   ?? current.month;

    const isKeyChanging =
      dto.staffId !== undefined || dto.year !== undefined || dto.month !== undefined;

    if (isKeyChanging) {
      const collision = await this.prisma.salaryPayment.findFirst({
        where: {
          staffId: newStaffId,
          year: newYear,
          month: newMonth,
          id: { not: id },
        },
      });
      if (collision) {
        throw new ConflictException(
          `Salary payment for staff ${newStaffId} in ${newYear}/${newMonth} already exists`,
        );
      }
    }

    const data: any = { ...dto };

    // Recompute netPay if amounts change
    if (
      dto.baseSalary !== undefined ||
      dto.allowances !== undefined ||
      dto.deductions !== undefined
    ) {
      const current = await this.prisma.salaryPayment.findUnique({
        where: { id },
      });
      const base =
        dto.baseSalary !== undefined
          ? dto.baseSalary
          : Number(current!.baseSalary);
      const allowances =
        dto.allowances !== undefined
          ? dto.allowances
          : Number(current!.allowances);
      const deductions =
        dto.deductions !== undefined
          ? dto.deductions
          : Number(current!.deductions);
      data.netPay = base + allowances - deductions;
    }

    if (dto.paidAt) {
      data.paidAt = new Date(dto.paidAt);
    }

    return this.prisma.salaryPayment.update({
      where: { id },
      data,
      include: { staff: true },
    });
  }

  async removePayment(id: string, userId = "system") {
    const payment = await this.findOnePayment(id);

    // Reverse posted journal before deleting (keeps GL balanced)
    if (payment.journalEntryId) {
      try {
        await this.journalService.reverseJournalEntry(
          payment.journalEntryId,
          userId,
        );
        this.logger.log(
          `✅ Reversed salary journal ${payment.journalEntryId} before deleting payment ${id}`,
        );
      } catch (err: any) {
        // Already reversed or not posted — safe to proceed
        this.logger.warn(
          `Journal reversal skipped for ${payment.journalEntryId}: ${err?.message}`,
        );
      }
    }

    return this.prisma.salaryPayment.delete({ where: { id } });
  }

  async markPaymentPaid(id: string, userId = "system") {
    const current = await this.findOnePayment(id);

    const payment = await this.prisma.salaryPayment.update({
      where: { id },
      data: {
        status: SalaryPaymentStatus.PAID,
        paidAt: new Date(),
      },
      include: { staff: true },
    });

    // Post GL journal (idempotent — skips if journalEntryId already set)
    await this.postSalaryJournal(payment, payment.staff as any, userId);

    return payment;
  }

  async getStats() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [totalStaff, thisMonthPayments, unpaidCount] = await Promise.all([
      this.prisma.staff.count({ where: { isActive: true } }),
      this.prisma.salaryPayment.findMany({
        where: { year, month },
        include: {
          staff: { select: { id: true, name: true, position: true } },
        },
      }),
      this.prisma.salaryPayment.count({
        where: { status: SalaryPaymentStatus.DRAFT },
      }),
    ]);

    const thisMonthTotal = thisMonthPayments.reduce(
      (sum, p) => sum + Number(p.netPay),
      0,
    );

    return {
      totalActiveStaff: totalStaff,
      thisMonthTotal,
      thisMonthPaid: thisMonthPayments.filter(
        (p) => p.status === SalaryPaymentStatus.PAID,
      ).length,
      thisMonthDraft: thisMonthPayments.filter(
        (p) => p.status === SalaryPaymentStatus.DRAFT,
      ).length,
      totalUnpaid: unpaidCount,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Post a double-entry salary journal for a PAID salary payment.
   * Idempotent: skips if `journalEntryId` is already set on the payment.
   *
   * Dr  <salary-expense account>   netPay   (6-5010 / 6-5020 / 6-1010)
   * Cr  <cash or bank account>     netPay   (1-1010 Cash or 1-1020 Bank)
   */
  private async postSalaryJournal(
    payment: any,
    staff: { position?: string | null; bankName?: string | null; name: string },
    userId: string,
  ): Promise<void> {
    // Idempotency: do not double-post
    const current = await this.prisma.salaryPayment.findUnique({
      where: { id: payment.id },
      select: { journalEntryId: true },
    });
    if (current?.journalEntryId) {
      this.logger.log(
        `Salary journal already posted for payment ${payment.id} — skipping`,
      );
      return;
    }

    const netPay = Number(payment.netPay);
    const expenseAccount = salaryExpenseAccount(staff.position);
    const creditAccount = cashOrBankAccount(staff.bankName);

    try {
      const journal = await this.journalService.createJournalEntry({
        description: `Pembayaran Gaji - ${staff.name} (${payment.period})`,
        entryDate: payment.paidAt ?? new Date(),
        transactionId: payment.id,
        transactionType: "SALARY_PAYMENT",
        createdBy: userId,
        autoPost: true,
        lineItems: [
          {
            accountCode: expenseAccount,
            debit: netPay,
            credit: 0,
            description: `Beban Gaji ${staff.name} - ${payment.period}`,
          },
          {
            accountCode: creditAccount,
            debit: 0,
            credit: netPay,
            description: `Pembayaran Gaji ${staff.name} - ${payment.period}`,
          },
        ],
      });

      // Link journal to payment
      await this.prisma.salaryPayment.update({
        where: { id: payment.id },
        data: { journalEntryId: journal.id },
      });

      this.logger.log(
        `✅ Posted salary journal ${journal.id} for payment ${payment.id} ` +
          `(Dr ${expenseAccount} / Cr ${creditAccount} = ${netPay})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to post salary journal for payment ${payment.id}:`,
        err,
      );
      // Do not rethrow — payment was recorded successfully
    }
  }
}
