import { ExpensesService } from "./expenses.service";

/**
 * Contract: ExpensesService.create() records an expense as PAID and posts its
 * journal immediately (DR expense / CR Cash or Bank). There is no draft path on
 * create. The frontend create form copy ("Catat Pengeluaran", footer hint) depends
 * on this, and so do the GL, cash/bank balances and project costing.
 *
 * - isBillable (reimbursable) expenses are the one exception: the GL leg is
 *   deferred until the invoice is SENT, so create() posts no journal for them.
 * - submit() on an already PAID expense is a no-op, so "submit for approval"
 *   cannot un-post or re-post anything.
 */
describe("ExpensesService.create (direct paid entry)", () => {
  const userId = "user-1";
  const category = {
    id: "cat-1",
    isActive: true,
    accountCode: "6-1010",
  };

  const baseDto: any = {
    categoryId: "cat-1",
    accountCode: "6-1010",
    accountName: "Beban Perlengkapan",
    expenseClass: "OTHER",
    description: "Baterai kamera",
    vendorName: "Toko Kamera",
    grossAmount: 100000,
    ppnAmount: 0,
    withholdingAmount: 0,
    netAmount: 100000,
    totalAmount: 100000,
    expenseDate: new Date("2026-06-15T00:00:00.000Z").toISOString(),
  };

  let prisma: any;
  let journal: any;
  let service: ExpensesService;

  beforeEach(() => {
    prisma = {
      expenseCategory: { findUnique: jest.fn().mockResolvedValue(category) },
      project: { findUnique: jest.fn() },
      client: { findUnique: jest.fn() },
      expense: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "exp-1", ...data }),
        ),
        update: jest.fn().mockResolvedValue({}),
      },
      expenseBudget: { findMany: jest.fn().mockResolvedValue([]) },
    };
    journal = {
      createJournalEntry: jest.fn().mockResolvedValue({ id: "je-1" }),
    };
    const stub: any = {};
    service = new ExpensesService(
      prisma,
      stub, // ppnCalculator (ppnAmount 0: not consulted)
      stub, // withholdingTaxCalculator (NONE: not consulted)
      stub, // eFakturValidator (no NSFP: not consulted)
      journal,
      stub, // projectCostingService (no project: not consulted)
      stub, // profitCalculationService
    );
  });

  it("creates the expense as PAID with a paidAt timestamp", async () => {
    const expense = await service.create(userId, { ...baseDto });

    const data = prisma.expense.create.mock.calls[0][0].data;
    expect(data.status).toBe("PAID");
    expect(data.paymentStatus).toBe("PAID");
    expect(data.paidAt).toBeInstanceOf(Date);
    expect(expense.status).toBe("PAID");
  });

  it("posts the journal immediately: DR expense account / CR Cash (default)", async () => {
    await service.create(userId, { ...baseDto });

    expect(journal.createJournalEntry).toHaveBeenCalledTimes(1);
    const entry = journal.createJournalEntry.mock.calls[0][0];
    expect(entry.autoPost).toBe(true);
    expect(entry.transactionType).toBe("EXPENSE_PAID");
    expect(entry.lineItems).toHaveLength(2);
    expect(entry.lineItems[0]).toMatchObject({ accountCode: "6-1010", debit: 100000, credit: 0 });
    expect(entry.lineItems[1]).toMatchObject({ accountCode: "1-1010", debit: 0, credit: 100000 });
  });

  it("links the posted journal to the expense (paymentJournalId)", async () => {
    await service.create(userId, { ...baseDto });

    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: "exp-1" },
      data: { paymentJournalId: "je-1" },
    });
  });

  it("credits the default bank account when paymentSource is BANK", async () => {
    await service.create(userId, { ...baseDto, paymentSource: "BANK" });

    const entry = journal.createJournalEntry.mock.calls[0][0];
    expect(entry.lineItems[1]).toMatchObject({ accountCode: "1-1020", credit: 100000 });
  });

  it("does not persist paymentSource on the expense row", async () => {
    await service.create(userId, { ...baseDto, paymentSource: "BANK" });

    const data = prisma.expense.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("paymentSource");
  });

  it("defers the journal for reimbursable (billable) expenses", async () => {
    await service.create(userId, { ...baseDto, isBillable: true });

    const data = prisma.expense.create.mock.calls[0][0].data;
    expect(data.status).toBe("PAID");
    expect(data.accountCode).toBe("1-2040");
    expect(journal.createJournalEntry).not.toHaveBeenCalled();
  });

  it("still returns the expense when journal posting fails (non-fatal)", async () => {
    journal.createJournalEntry.mockRejectedValue(new Error("period locked"));

    const expense = await service.create(userId, { ...baseDto });

    expect(expense.id).toBe("exp-1");
    expect(prisma.expense.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { paymentJournalId: expect.anything() } }),
    );
  });
});

describe("ExpensesService.submit on a PAID expense", () => {
  it("is a no-op: it returns the expense and writes nothing", async () => {
    const paid = { id: "exp-1", status: "PAID", userId: "user-1" };
    const prisma: any = {
      expense: { update: jest.fn() },
      expenseApprovalHistory: { create: jest.fn() },
    };
    const journal: any = { createJournalEntry: jest.fn() };
    const stub: any = {};
    const service = new ExpensesService(prisma, stub, stub, stub, journal, stub, stub);
    jest.spyOn(service, "findOne").mockResolvedValue(paid as any);

    const result = await service.submit("exp-1", "user-1", "ADMIN");

    expect(result).toBe(paid);
    expect(prisma.expense.update).not.toHaveBeenCalled();
    expect(prisma.expenseApprovalHistory.create).not.toHaveBeenCalled();
    expect(journal.createJournalEntry).not.toHaveBeenCalled();
  });
});
