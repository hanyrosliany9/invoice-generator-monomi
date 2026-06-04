import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateStaffDto,
  UpdateStaffDto,
  CreateSalaryPaymentDto,
  UpdateSalaryPaymentDto,
} from "./dto";
import { SalaryPaymentStatus } from "@prisma/client";

@Injectable()
export class SalariesService {
  private readonly logger = new Logger(SalariesService.name);

  constructor(private prisma: PrismaService) {}

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
    await this.findOneStaff(dto.staffId);

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

  async removePayment(id: string) {
    await this.findOnePayment(id);
    return this.prisma.salaryPayment.delete({ where: { id } });
  }

  async markPaymentPaid(id: string) {
    await this.findOnePayment(id);
    return this.prisma.salaryPayment.update({
      where: { id },
      data: {
        status: SalaryPaymentStatus.PAID,
        paidAt: new Date(),
      },
      include: { staff: true },
    });
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
}
