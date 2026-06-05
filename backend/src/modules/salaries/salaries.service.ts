import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
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
import { wibYear, wibMonth } from "../../common/utils/wib-date.util";

// Map staff position keywords → salary-expense GL account
const SALARY_EXPENSE_ACCOUNT = "6-5020"; // default: Salaries - Administrative
const MANAGEMENT_ACCOUNT = "6-5010"; // Salaries - Management
const SALES_ACCOUNT = "6-1010"; // Sales Salaries
const CASH_ACCOUNT = "1-1010"; // Kas (Cash)
const BANK_ACCOUNT = "1-1020"; // Rekening Bank
// Deductions/withholding payable account (PPh 21 Payable — LIABILITY)
const DEDUCTIONS_PAYABLE_ACCOUNT = "2-2110"; // PPh 21 Payable

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
    const grossPay = dto.baseSalary + allowances;
    const netPay = grossPay - deductions;

    // FIX 4: reject negative netPay
    if (netPay < 0) {
      throw new BadRequestException(
        `Net pay cannot be negative (baseSalary ${dto.baseSalary} + allowances ${allowances} - deductions ${deductions} = ${netPay})`,
      );
    }

    // FIX 6: derive period server-side from year+month so it always matches
    const MONTH_NAMES_ID = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const derivedPeriod = `${MONTH_NAMES_ID[dto.month - 1]} ${dto.year}`;

    const data: any = {
      staffId: dto.staffId,
      period: derivedPeriod,
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

    // FIX 1: if the payment is immediately PAID, create it and post the journal
    // atomically so we never have a PAID payment without a GL entry.
    if (data.status === SalaryPaymentStatus.PAID) {
      return this.prisma.$transaction(async (tx) => {
        const payment = await tx.salaryPayment.create({
          data,
          include: { staff: true },
        });
        await this.postSalaryJournal(payment, staff as any, "system", tx as any);
        return tx.salaryPayment.findUnique({
          where: { id: payment.id },
          include: { staff: true },
        });
      });
    }

    return this.prisma.salaryPayment.create({
      data,
      include: { staff: true },
    });
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

    // FIX 3: block edits to amount fields or status downgrade on a PAID payment
    // Amount changes would diverge the already-posted GL journal. Require delete+recreate.
    if (current.status === SalaryPaymentStatus.PAID) {
      const amountFieldsTouched =
        dto.baseSalary !== undefined ||
        dto.allowances !== undefined ||
        dto.deductions !== undefined ||
        dto.paidAt !== undefined;
      const statusDowngrade =
        dto.status !== undefined && dto.status !== SalaryPaymentStatus.PAID;

      if (amountFieldsTouched || statusDowngrade) {
        throw new BadRequestException(
          "Cannot edit amount fields or downgrade status of a PAID salary payment. " +
            "Delete the payment (which auto-reverses the GL journal) and recreate it.",
        );
      }
    }

    // Check for duplicate staffId+year+month when those fields are changing
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

    const data: any = {};

    // Copy only allowed fields (exclude amount fields if we somehow reach here PAID)
    if (dto.staffId !== undefined) data.staffId = dto.staffId;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.month !== undefined) data.month = dto.month;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status !== undefined) data.status = dto.status;

    // Recompute netPay if amounts change (only reached when status !== PAID)
    if (
      dto.baseSalary !== undefined ||
      dto.allowances !== undefined ||
      dto.deductions !== undefined
    ) {
      const base =
        dto.baseSalary !== undefined
          ? dto.baseSalary
          : Number(current.baseSalary);
      const allowances =
        dto.allowances !== undefined
          ? dto.allowances
          : Number(current.allowances);
      const deductions =
        dto.deductions !== undefined
          ? dto.deductions
          : Number(current.deductions);

      // FIX 4: guard negative netPay on update too
      const netPay = base + allowances - deductions;
      if (netPay < 0) {
        throw new BadRequestException(
          `Net pay cannot be negative (baseSalary ${base} + allowances ${allowances} - deductions ${deductions} = ${netPay})`,
        );
      }

      data.baseSalary = base;
      data.allowances = allowances;
      data.deductions = deductions;
      data.netPay = netPay;
    }

    if (dto.paidAt) {
      data.paidAt = new Date(dto.paidAt);
    }

    // FIX 6: re-derive period if year or month changed
    if (dto.year !== undefined || dto.month !== undefined) {
      const MONTH_NAMES_ID = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
      ];
      data.period = `${MONTH_NAMES_ID[newMonth - 1]} ${newYear}`;
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
    await this.findOnePayment(id); // validate existence

    // FIX 1: use a transaction so the status update and journal post are atomic.
    // If postSalaryJournal throws (and it now rethrows), the prisma update is
    // rolled back and we never have a PAID payment without a GL journal.
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.salaryPayment.update({
        where: { id },
        data: {
          status: SalaryPaymentStatus.PAID,
          paidAt: new Date(),
        },
        include: { staff: true },
      });

      // Post GL journal — rethrows on failure, rolling back this transaction
      await this.postSalaryJournal(payment, payment.staff as any, userId, tx as any);

      // Re-fetch so journalEntryId is included in the returned value
      return tx.salaryPayment.findUnique({
        where: { id },
        include: { staff: true },
      });
    });
  }

  async getStats() {
    // FIX 5: use WIB calendar year/month, not UTC
    const year = wibYear();
    const month = wibMonth();

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
   * Correct payroll double-entry (FIX 2):
   *   Dr  <salary-expense account>    grossPay    (6-5010 / 6-5020 / 6-1010)
   *   Cr  <cash or bank account>      netPay      (1-1010 Cash or 1-1020 Bank)
   *   Cr  PPh 21 Payable (2-2110)     deductions  (only when deductions > 0)
   *
   * When deductions == 0 this reduces to the classic 2-line Dr expense / Cr cash entry.
   * Debits always equal credits: grossPay == netPay + deductions.
   *
   * @param txPrisma  Optional Prisma transaction client (FIX 1). When provided,
   *   the idempotency-check read and journalEntryId write participate in the same
   *   DB transaction, so a journal failure rolls back the PAID status update.
   */
  private async postSalaryJournal(
    payment: any,
    staff: { position?: string | null; bankName?: string | null; name: string },
    userId: string,
    txPrisma?: typeof this.prisma,
  ): Promise<void> {
    const db = txPrisma ?? this.prisma;

    // Idempotency: do not double-post
    const current = await db.salaryPayment.findUnique({
      where: { id: payment.id },
      select: { journalEntryId: true },
    });
    if (current?.journalEntryId) {
      this.logger.log(
        `Salary journal already posted for payment ${payment.id} — skipping`,
      );
      return;
    }

    // FIX 2: use gross for the expense debit; split credits into cash/bank + deductions payable
    const netPay = Number(payment.netPay);
    const deductions = Number(payment.deductions ?? 0);
    const grossPay = netPay + deductions; // == baseSalary + allowances

    const expenseAccount = salaryExpenseAccount(staff.position);
    const creditAccount = cashOrBankAccount(staff.bankName);

    // Build line items — always debit gross expense
    const lineItems: Array<{
      accountCode: string;
      debit: number;
      credit: number;
      description: string;
    }> = [
      {
        accountCode: expenseAccount,
        debit: grossPay,
        credit: 0,
        description: `Beban Gaji ${staff.name} - ${payment.period}`,
      },
      {
        accountCode: creditAccount,
        debit: 0,
        credit: netPay,
        description: `Pembayaran Gaji ${staff.name} - ${payment.period}`,
      },
    ];

    // Add deductions-payable credit line only when deductions > 0
    if (deductions > 0) {
      lineItems.push({
        accountCode: DEDUCTIONS_PAYABLE_ACCOUNT, // 2-2110 PPh 21 Payable
        debit: 0,
        credit: deductions,
        description: `Potongan PPh 21 ${staff.name} - ${payment.period}`,
      });
    }

    // FIX 1: do NOT swallow errors — rethrow so markPaymentPaid's transaction rolls back
    let journal: { id: string };
    try {
      journal = await this.journalService.createJournalEntry({
        description: `Pembayaran Gaji - ${staff.name} (${payment.period})`,
        entryDate: payment.paidAt ?? new Date(),
        transactionId: payment.id,
        transactionType: "SALARY_PAYMENT",
        createdBy: userId,
        autoPost: true,
        lineItems,
      });
    } catch (err) {
      this.logger.error(
        `Failed to post salary journal for payment ${payment.id}:`,
        err,
      );
      // FIX 1: rethrow — if called inside a $transaction the payment status update rolls back
      throw err;
    }

    // Link journal to payment (uses same tx client for atomicity)
    await db.salaryPayment.update({
      where: { id: payment.id },
      data: { journalEntryId: journal.id },
    });

    this.logger.log(
      `✅ Posted salary journal ${journal.id} for payment ${payment.id} ` +
        `(Dr ${expenseAccount} ${grossPay} / Cr ${creditAccount} ${netPay}` +
        (deductions > 0 ? ` + Cr ${DEDUCTIONS_PAYABLE_ACCOUNT} ${deductions}` : "") +
        `)`,
    );
  }
}
