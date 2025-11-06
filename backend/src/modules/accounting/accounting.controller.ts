import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import type { Request as ExpressRequest } from "express";

interface AuthenticatedRequest extends ExpressRequest {
  user: { id: string };
}
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { JournalService } from "./services/journal.service";
import { LedgerService } from "./services/ledger.service";
import { FinancialStatementsService } from "./services/financial-statements.service";
import { DepreciationService } from "./services/depreciation.service";
import { ECLService } from "./services/ecl.service";
import { AccountingExportService } from "./services/accounting-export.service";
import { AccountingExcelExportService } from "./services/accounting-excel-export.service";
import { CashTransactionService } from "./services/cash-transaction.service";
import { BankTransferService } from "./services/bank-transfer.service";
import { BankReconciliationService } from "./services/bank-reconciliation.service";
import { RevenueRecognitionService } from "./services/revenue-recognition.service";
import { CreateJournalEntryDto } from "./dto/create-journal-entry.dto";
import { UpdateJournalEntryDto } from "./dto/update-journal-entry.dto";
import { JournalQueryDto } from "./dto/journal-query.dto";
import { CreateCashTransactionDto } from "./dto/create-cash-transaction.dto";
import { UpdateCashTransactionDto } from "./dto/update-cash-transaction.dto";
import { CashTransactionQueryDto } from "./dto/cash-transaction-query.dto";
import { CreateBankTransferDto } from "./dto/create-bank-transfer.dto";
import { UpdateBankTransferDto } from "./dto/update-bank-transfer.dto";
import { BankTransferQueryDto } from "./dto/bank-transfer-query.dto";
import {
  CreateBankReconciliationDto,
  CreateBankReconciliationItemDto,
} from "./dto/create-bank-reconciliation.dto";
import { UpdateBankReconciliationDto } from "./dto/update-bank-reconciliation.dto";
import { BankReconciliationQueryDto } from "./dto/bank-reconciliation-query.dto";
import {
  FinancialStatementQueryDto,
  LedgerQueryDto,
  TrialBalanceQueryDto,
} from "./dto/financial-statement-query.dto";

@Controller("accounting")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(
    private readonly journalService: JournalService,
    private readonly ledgerService: LedgerService,
    private readonly financialStatementsService: FinancialStatementsService,
    private readonly depreciationService: DepreciationService,
    private readonly eclService: ECLService,
    private readonly exportService: AccountingExportService,
    private readonly excelExportService: AccountingExcelExportService,
    private readonly cashTransactionService: CashTransactionService,
    private readonly bankTransferService: BankTransferService,
    private readonly bankReconciliationService: BankReconciliationService,
    private readonly revenueRecognitionService: RevenueRecognitionService,
  ) {}

  // ============ CHART OF ACCOUNTS ============
  @Get("chart-of-accounts")
  async getChartOfAccounts() {
    return this.journalService.getChartOfAccounts();
  }

  @Get("chart-of-accounts/:code")
  async getAccountByCode(@Param("code") code: string) {
    return this.journalService.getAccountByCode(code);
  }

  @Post("chart-of-accounts")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async createChartOfAccount(@Body() data: any) {
    return this.journalService.createChartOfAccount(data);
  }

  @Patch("chart-of-accounts/:code")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async updateChartOfAccount(@Param("code") code: string, @Body() data: any) {
    return this.journalService.updateChartOfAccount(code, data);
  }

  @Delete("chart-of-accounts/:code")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER")
  async deleteChartOfAccount(@Param("code") code: string) {
    return this.journalService.deleteChartOfAccount(code);
  }

  @Patch("chart-of-accounts/:code/toggle-status")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async toggleAccountStatus(@Param("code") code: string) {
    return this.journalService.toggleAccountStatus(code);
  }

  // ============ JOURNAL ENTRIES ============
  @Post("journal-entries")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT", "ADMIN", "USER")
  async createJournalEntry(
    @Body() createJournalEntryDto: CreateJournalEntryDto,
    @Request() req: any,
  ) {
    return this.journalService.createJournalEntry({
      ...createJournalEntryDto,
      createdBy: req.user.userId,
    });
  }

  @Get("journal-entries")
  async getJournalEntries(@Query() query: JournalQueryDto) {
    return this.journalService.getJournalEntries(query);
  }

  @Get("journal-entries/:id")
  async getJournalEntry(@Param("id") id: string) {
    return this.journalService.getJournalEntry(id);
  }

  @Patch("journal-entries/:id")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT", "ADMIN", "USER")
  async updateJournalEntry(
    @Param("id") id: string,
    @Body() updateJournalEntryDto: UpdateJournalEntryDto,
    @Request() req: any,
  ) {
    return this.journalService.updateJournalEntry(id, {
      ...updateJournalEntryDto,
      updatedBy: req.user.userId,
    });
  }

  @Post("journal-entries/:id/post")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ADMIN")
  async postJournalEntry(@Param("id") id: string, @Request() req: any) {
    return this.journalService.postJournalEntry(id, req.user.userId);
  }

  @Post("journal-entries/:id/reverse")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ADMIN")
  async reverseJournalEntry(@Param("id") id: string, @Request() req: any) {
    return this.journalService.reverseJournalEntry(id, req.user.userId);
  }

  @Delete("journal-entries/:id")
  @Roles("SUPER_ADMIN", "ADMIN")
  async deleteJournalEntry(@Param("id") id: string) {
    return this.journalService.deleteJournalEntry(id);
  }

  // ============ GENERAL LEDGER ============
  @Get("ledger")
  async getGeneralLedger(@Query() query: LedgerQueryDto) {
    return this.ledgerService.getGeneralLedger(query);
  }

  @Get("ledger/account/:accountCode")
  async getAccountLedger(
    @Param("accountCode") accountCode: string,
    @Query() query: LedgerQueryDto,
  ) {
    return this.ledgerService.getAccountLedger(accountCode, query);
  }

  @Get("ledger/trial-balance")
  async getTrialBalance(@Query() query: TrialBalanceQueryDto) {
    return this.ledgerService.getTrialBalance(query);
  }

  @Get("ledger/ar-aging")
  async getAccountsReceivableAging(@Query("asOfDate") asOfDate: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    return this.ledgerService.getAccountsReceivableAging(date);
  }

  @Get("ledger/ap-aging")
  async getAccountsPayableAging(@Query("asOfDate") asOfDate: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    return this.ledgerService.getAccountsPayableAging(date);
  }

  // ============ CASH TRANSACTIONS ============
  @Post("cash-transactions")
  @Roles("ADMIN", "USER")
  async createCashTransaction(
    @Body() createCashTransactionDto: CreateCashTransactionDto,
    @Request() req: any,
  ) {
    return this.cashTransactionService.createCashTransaction({
      ...createCashTransactionDto,
      createdBy: req.user.userId,
    });
  }

  @Get("cash-transactions")
  async getCashTransactions(@Query() query: CashTransactionQueryDto) {
    return this.cashTransactionService.getCashTransactions(query);
  }

  @Get("cash-transactions/:id")
  async getCashTransaction(@Param("id") id: string) {
    return this.cashTransactionService.getCashTransaction(id);
  }

  @Patch("cash-transactions/:id")
  @Roles("ADMIN", "USER")
  async updateCashTransaction(
    @Param("id") id: string,
    @Body() updateCashTransactionDto: UpdateCashTransactionDto,
    @Request() req: any,
  ) {
    return this.cashTransactionService.updateCashTransaction(id, {
      ...updateCashTransactionDto,
      updatedBy: req.user.userId,
    });
  }

  @Post("cash-transactions/:id/submit")
  @Roles("ADMIN", "USER")
  async submitCashTransaction(@Param("id") id: string, @Request() req: any) {
    return this.cashTransactionService.submitCashTransaction(
      id,
      req.user.userId,
    );
  }

  @Post("cash-transactions/:id/approve")
  @Roles("ADMIN")
  async approveCashTransaction(@Param("id") id: string, @Request() req: any) {
    return this.cashTransactionService.approveCashTransaction(
      id,
      req.user.userId,
    );
  }

  @Post("cash-transactions/:id/reject")
  @Roles("ADMIN")
  async rejectCashTransaction(
    @Param("id") id: string,
    @Body() data: { reason: string },
    @Request() req: any,
  ) {
    return this.cashTransactionService.rejectCashTransaction(
      id,
      req.user.userId,
      data.reason,
    );
  }

  @Post("cash-transactions/:id/void")
  @Roles("ADMIN")
  async voidCashTransaction(@Param("id") id: string, @Request() req: any) {
    return this.cashTransactionService.voidCashTransaction(id, req.user.userId);
  }

  @Delete("cash-transactions/:id")
  @Roles("ADMIN")
  async deleteCashTransaction(@Param("id") id: string) {
    return this.cashTransactionService.deleteCashTransaction(id);
  }

  // ============ BANK TRANSFERS ============
  @Post("bank-transfers")
  @Roles("ADMIN", "USER")
  async createBankTransfer(
    @Body() createBankTransferDto: CreateBankTransferDto,
    @Request() req: any,
  ) {
    return this.bankTransferService.createBankTransfer({
      ...createBankTransferDto,
      createdBy: req.user.userId,
    });
  }

  @Get("bank-transfers")
  async getBankTransfers(@Query() query: BankTransferQueryDto) {
    return this.bankTransferService.getBankTransfers(query);
  }

  @Get("bank-transfers/:id")
  async getBankTransfer(@Param("id") id: string) {
    return this.bankTransferService.getBankTransfer(id);
  }

  @Patch("bank-transfers/:id")
  @Roles("ADMIN", "USER")
  async updateBankTransfer(
    @Param("id") id: string,
    @Body() updateBankTransferDto: UpdateBankTransferDto,
    @Request() req: any,
  ) {
    return this.bankTransferService.updateBankTransfer(id, {
      ...updateBankTransferDto,
      updatedBy: req.user.userId,
    });
  }

  @Post("bank-transfers/:id/approve")
  @Roles("ADMIN")
  async approveBankTransfer(@Param("id") id: string, @Request() req: any) {
    return this.bankTransferService.approveBankTransfer(id, req.user.userId);
  }

  @Post("bank-transfers/:id/reject")
  @Roles("ADMIN")
  async rejectBankTransfer(
    @Param("id") id: string,
    @Body() data: { reason: string },
    @Request() req: any,
  ) {
    return this.bankTransferService.rejectBankTransfer(
      id,
      req.user.userId,
      data.reason,
    );
  }

  @Post("bank-transfers/:id/cancel")
  @Roles("ADMIN", "USER")
  async cancelBankTransfer(@Param("id") id: string, @Request() req: any) {
    return this.bankTransferService.cancelBankTransfer(id, req.user.userId);
  }

  @Delete("bank-transfers/:id")
  @Roles("ADMIN")
  async deleteBankTransfer(@Param("id") id: string) {
    return this.bankTransferService.deleteBankTransfer(id);
  }

  // ============ BANK RECONCILIATIONS ============
  @Post("bank-reconciliations")
  @Roles("ADMIN", "USER")
  async createBankReconciliation(
    @Body() createBankReconciliationDto: CreateBankReconciliationDto,
    @Request() req: any,
  ) {
    return this.bankReconciliationService.createBankReconciliation({
      ...createBankReconciliationDto,
      createdBy: req.user.userId,
    });
  }

  @Get("bank-reconciliations")
  async getBankReconciliations(@Query() query: BankReconciliationQueryDto) {
    return this.bankReconciliationService.getBankReconciliations(query);
  }

  @Get("bank-reconciliations/:id")
  async getBankReconciliation(@Param("id") id: string) {
    return this.bankReconciliationService.getBankReconciliation(id);
  }

  @Patch("bank-reconciliations/:id")
  @Roles("ADMIN", "USER")
  async updateBankReconciliation(
    @Param("id") id: string,
    @Body() updateBankReconciliationDto: UpdateBankReconciliationDto,
    @Request() req: any,
  ) {
    return this.bankReconciliationService.updateBankReconciliation(id, {
      ...updateBankReconciliationDto,
      updatedBy: req.user.userId,
    });
  }

  @Post("bank-reconciliations/:id/items")
  @Roles("ADMIN", "USER")
  async addReconciliationItem(
    @Param("id") id: string,
    @Body() itemDto: CreateBankReconciliationItemDto,
    @Request() req: any,
  ) {
    return this.bankReconciliationService.addReconciliationItem(
      id,
      itemDto,
      req.user.userId,
    );
  }

  @Post("bank-reconciliations/items/:itemId/match")
  @Roles("ADMIN", "USER")
  async matchReconciliationItem(
    @Param("itemId") itemId: string,
    @Body() data: { transactionId: string },
    @Request() req: any,
  ) {
    return this.bankReconciliationService.matchReconciliationItem(
      itemId,
      data.transactionId,
      req.user.userId,
    );
  }

  @Post("bank-reconciliations/:id/review")
  @Roles("ADMIN", "USER")
  async reviewBankReconciliation(@Param("id") id: string, @Request() req: any) {
    return this.bankReconciliationService.reviewBankReconciliation(
      id,
      req.user.userId,
    );
  }

  @Post("bank-reconciliations/:id/approve")
  @Roles("ADMIN")
  async approveBankReconciliation(
    @Param("id") id: string,
    @Request() req: any,
  ) {
    return this.bankReconciliationService.approveBankReconciliation(
      id,
      req.user.userId,
    );
  }

  @Post("bank-reconciliations/:id/reject")
  @Roles("ADMIN")
  async rejectBankReconciliation(
    @Param("id") id: string,
    @Body() data: { reason: string },
    @Request() req: any,
  ) {
    return this.bankReconciliationService.rejectBankReconciliation(
      id,
      req.user.userId,
      data.reason,
    );
  }

  @Delete("bank-reconciliations/:id")
  @Roles("ADMIN")
  async deleteBankReconciliation(@Param("id") id: string) {
    return this.bankReconciliationService.deleteBankReconciliation(id);
  }

  // ============ FINANCIAL STATEMENTS ============
  @Get("financial-statements/income-statement")
  async getIncomeStatement(@Query() query: FinancialStatementQueryDto) {
    return this.financialStatementsService.getIncomeStatement(query);
  }

  @Get("financial-statements/balance-sheet")
  async getBalanceSheet(@Query() query: FinancialStatementQueryDto) {
    return this.financialStatementsService.getBalanceSheet(query);
  }

  @Get("financial-statements/cash-flow")
  async getCashFlowStatement(@Query() query: FinancialStatementQueryDto) {
    return this.financialStatementsService.getCashFlowStatement(query);
  }

  @Get("financial-statements/accounts-receivable")
  async getAccountsReceivableReport(
    @Query() query: FinancialStatementQueryDto,
  ) {
    return this.financialStatementsService.getAccountsReceivableReport(query);
  }

  @Get("financial-statements/accounts-payable")
  async getAccountsPayableReport(@Query() query: FinancialStatementQueryDto) {
    return this.financialStatementsService.getAccountsPayableReport(query);
  }

  // ============ FISCAL PERIODS ============
  @Get("fiscal-periods")
  async getFiscalPeriods() {
    return this.journalService.getFiscalPeriods();
  }

  @Get("fiscal-periods/current")
  async getCurrentFiscalPeriod() {
    return this.journalService.getCurrentFiscalPeriod();
  }

  @Post("fiscal-periods/:id/close")
  @Roles("ADMIN")
  async closeFiscalPeriod(@Param("id") id: string, @Request() req: any) {
    return this.journalService.closeFiscalPeriod(id, req.user.userId);
  }

  // ============ DEPRECIATION (PSAK 16) ============
  @Post("depreciation/calculate")
  @Roles("ADMIN", "USER")
  async calculatePeriodDepreciation(@Body() data: any) {
    return this.depreciationService.calculatePeriodDepreciation(data);
  }

  @Post("depreciation/post")
  @Roles("ADMIN")
  async postDepreciationEntry(
    @Body() data: { entryId: string },
    @Request() req: any,
  ) {
    return this.depreciationService.postDepreciationEntry(
      data.entryId,
      req.user.userId,
    );
  }

  @Post("depreciation/process-monthly")
  @Roles("ADMIN")
  async processMonthlyDepreciation(
    @Body()
    data: {
      periodDate: string;
      fiscalPeriodId?: string;
      autoPost?: boolean;
    },
    @Request() req: any,
  ) {
    return this.depreciationService.processMonthlyDepreciation({
      periodDate: new Date(data.periodDate),
      fiscalPeriodId: data.fiscalPeriodId,
      userId: req.user.userId,
      autoPost: data.autoPost || false,
    });
  }

  @Get("depreciation/schedule/:assetId")
  async getAssetDepreciationSchedule(@Param("assetId") assetId: string) {
    return this.depreciationService.getAssetDepreciationSchedule(assetId);
  }

  @Get("depreciation/entries/:assetId")
  async getAssetDepreciationEntries(@Param("assetId") assetId: string) {
    return this.depreciationService.getAssetDepreciationEntries(assetId);
  }

  @Get("depreciation/summary")
  async getDepreciationSummary(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("assetId") assetId?: string,
  ) {
    return this.depreciationService.getDepreciationSummary({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      assetId,
    });
  }

  @Post("depreciation/schedule")
  @Roles("ADMIN", "USER")
  async createDepreciationSchedule(@Body() data: any) {
    return this.depreciationService.createDepreciationSchedule(data);
  }

  @Delete("depreciation/schedule/:scheduleId")
  @Roles("ADMIN")
  async deactivateDepreciationSchedule(
    @Param("scheduleId") scheduleId: string,
  ) {
    return this.depreciationService.deactivateDepreciationSchedule(scheduleId);
  }

  // ============ ECL PROVISIONS (PSAK 71) ============
  @Post("ecl/calculate")
  @Roles("ADMIN", "USER")
  async calculateECL(
    @Body()
    data: {
      invoiceId: string;
      calculationDate: string;
      fiscalPeriodId?: string;
      customECLRates?: Record<string, number>;
      eclModel?: "12_MONTH" | "LIFETIME";
    },
  ) {
    return this.eclService.calculateInvoiceECL({
      ...data,
      calculationDate: new Date(data.calculationDate),
    });
  }

  @Post("ecl/post")
  @Roles("ADMIN")
  async postECL(@Body() data: { provisionId: string }, @Request() req: any) {
    return this.eclService.postECLProvision(data.provisionId, req.user.userId);
  }

  @Post("ecl/process-monthly")
  @Roles("ADMIN")
  async processMonthlyECL(
    @Body()
    data: {
      calculationDate: string;
      fiscalPeriodId?: string;
      autoPost?: boolean;
      customECLRates?: Record<string, number>;
    },
    @Request() req: any,
  ) {
    return this.eclService.processMonthlyECL({
      calculationDate: new Date(data.calculationDate),
      fiscalPeriodId: data.fiscalPeriodId,
      userId: req.user.userId,
      autoPost: data.autoPost || false,
      customECLRates: data.customECLRates,
    });
  }

  @Post("ecl/write-off")
  @Roles("ADMIN")
  async writeOffBadDebt(
    @Body()
    data: {
      provisionId: string;
      writeOffAmount: number;
      writeOffReason: string;
    },
    @Request() req: any,
  ) {
    return this.eclService.writeOffBadDebt({
      ...data,
      userId: req.user.userId,
    });
  }

  @Post("ecl/recovery")
  @Roles("ADMIN")
  async recordBadDebtRecovery(
    @Body()
    data: {
      provisionId: string;
      recoveredAmount: number;
    },
    @Request() req: any,
  ) {
    return this.eclService.recordBadDebtRecovery({
      ...data,
      userId: req.user.userId,
    });
  }

  @Get("ecl/summary")
  async getECLSummary(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("includeWrittenOff") includeWrittenOff?: string,
  ) {
    return this.eclService.getECLSummary({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeWrittenOff: includeWrittenOff === "true",
    });
  }

  @Get("ecl/invoice/:invoiceId")
  async getInvoiceECLProvisions(@Param("invoiceId") invoiceId: string) {
    return this.eclService.getInvoiceECLProvisions(invoiceId);
  }

  // ============ EXPORT TO PDF ============
  @Get("export/trial-balance/pdf")
  async exportTrialBalancePDF(
    @Query() query: TrialBalanceQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportTrialBalancePDF({
        asOfDate: query.asOfDate.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
        includeInactive: query.includeInactive,
        includeZeroBalances: query.includeZeroBalances,
      });
      const filename = `neraca-saldo-${query.asOfDate.toISOString().split("T")[0]}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/income-statement/pdf")
  async exportIncomeStatementPDF(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportIncomeStatementPDF({
        startDate: query.startDate?.toISOString().split("T")[0] || "",
        endDate: query.endDate.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
        includeInactive: query.includeInactive,
      });
      const filename = `laporan-laba-rugi-${query.startDate?.toISOString().split("T")[0]}-${query.endDate.toISOString().split("T")[0]}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/balance-sheet/pdf")
  async exportBalanceSheetPDF(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportBalanceSheetPDF({
        endDate: query.endDate.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
        includeInactive: query.includeInactive,
      });
      const filename = `neraca-${query.endDate.toISOString().split("T")[0]}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/cash-flow/pdf")
  async exportCashFlowPDF(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportCashFlowStatementPDF({
        startDate: query.startDate?.toISOString().split("T")[0] || "",
        endDate: query.endDate.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
      });
      const filename = `laporan-arus-kas-${query.startDate?.toISOString().split("T")[0]}-${query.endDate.toISOString().split("T")[0]}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/ar-aging/pdf")
  async exportARAgingPDF(
    @Query("asOfDate") asOfDate: string,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportARAgingPDF({ asOfDate });
      const filename = `aging-piutang-${asOfDate || "current"}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/ap-aging/pdf")
  async exportAPAgingPDF(
    @Query("asOfDate") asOfDate: string,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportAPAgingPDF({ asOfDate });
      const filename = `aging-hutang-${asOfDate || "current"}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/accounts-receivable/pdf")
  async exportAccountsReceivablePDF(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportAccountsReceivablePDF({
        endDate: query.endDate.toISOString().split("T")[0],
      });
      const filename = `laporan-piutang-${query.endDate.toISOString().split("T")[0]}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/accounts-payable/pdf")
  async exportAccountsPayablePDF(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportAccountsPayablePDF({
        endDate: query.endDate.toISOString().split("T")[0],
      });
      const filename = `laporan-hutang-${query.endDate.toISOString().split("T")[0]}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/general-ledger/pdf")
  async exportGeneralLedgerPDF(
    @Query() query: LedgerQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportGeneralLedgerPDF({
        accountCode: query.accountCode,
        accountType: query.accountType?.toString(),
        startDate: query.startDate?.toISOString().split("T")[0],
        endDate: query.endDate?.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
        includeInactive: query.includeInactive,
      });
      const filename = `buku-besar-${query.startDate?.toISOString().split("T")[0] || "all"}-${query.endDate?.toISOString().split("T")[0] || "all"}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ============ EXPORT TO EXCEL (NEW) ============
  @Get("export/trial-balance/excel")
  async exportTrialBalanceExcel(
    @Query() query: TrialBalanceQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.excelExportService.exportTrialBalanceExcel({
        asOfDate: query.asOfDate.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
        includeInactive: query.includeInactive,
        includeZeroBalances: query.includeZeroBalances,
      });
      const filename = `neraca-saldo-${query.asOfDate.toISOString().split("T")[0]}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/income-statement/excel")
  async exportIncomeStatementExcel(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.excelExportService.exportIncomeStatementExcel({
        startDate: query.startDate?.toISOString().split("T")[0] || "",
        endDate: query.endDate.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
      });
      const filename = `laporan-laba-rugi-${query.startDate?.toISOString().split("T")[0]}-${query.endDate.toISOString().split("T")[0]}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/balance-sheet/excel")
  async exportBalanceSheetExcel(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.excelExportService.exportBalanceSheetExcel({
        endDate: query.endDate.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
      });
      const filename = `neraca-${query.endDate.toISOString().split("T")[0]}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/cash-flow/excel")
  async exportCashFlowExcel(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.excelExportService.exportCashFlowStatementExcel(
        {
          startDate: query.startDate?.toISOString().split("T")[0] || "",
          endDate: query.endDate.toISOString().split("T")[0],
          fiscalPeriodId: query.fiscalPeriodId,
        },
      );
      const filename = `laporan-arus-kas-${query.startDate?.toISOString().split("T")[0]}-${query.endDate.toISOString().split("T")[0]}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/ar-aging/excel")
  async exportARAgingExcel(
    @Query("asOfDate") asOfDate: string,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.excelExportService.exportARAgingExcel({
        asOfDate,
      });
      const filename = `aging-piutang-${asOfDate || "current"}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/ap-aging/excel")
  async exportAPAgingExcel(
    @Query("asOfDate") asOfDate: string,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.excelExportService.exportAPAgingExcel({
        asOfDate,
      });
      const filename = `aging-hutang-${asOfDate || "current"}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/accounts-receivable/excel")
  async exportAccountsReceivableExcel(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer =
        await this.excelExportService.exportAccountsReceivableExcel({
          endDate: query.endDate.toISOString().split("T")[0],
        });
      const filename = `laporan-piutang-${query.endDate.toISOString().split("T")[0]}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/accounts-payable/excel")
  async exportAccountsPayableExcel(
    @Query() query: FinancialStatementQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.excelExportService.exportAccountsPayableExcel({
        endDate: query.endDate.toISOString().split("T")[0],
      });
      const filename = `laporan-hutang-${query.endDate.toISOString().split("T")[0]}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Get("export/general-ledger/excel")
  async exportGeneralLedgerExcel(
    @Query() query: LedgerQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.excelExportService.exportGeneralLedgerExcel({
        accountCode: query.accountCode,
        accountType: query.accountType?.toString(),
        startDate: query.startDate?.toISOString().split("T")[0],
        endDate: query.endDate?.toISOString().split("T")[0],
        fiscalPeriodId: query.fiscalPeriodId,
        includeInactive: query.includeInactive,
      });
      const filename = `buku-besar-${query.startDate?.toISOString().split("T")[0] || "all"}-${query.endDate?.toISOString().split("T")[0] || "all"}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: "Error generating Excel",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ============ PHASE 2: REVENUE RECOGNITION & DASHBOARD ============

  /**
   * Get revenue dashboard summary
   * Returns recognized, deferred, and pending revenue metrics
   */
  @Get("revenue/dashboard")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async getRevenueDashboard(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.revenueRecognitionService.getRevenueDashboardSummary(
      start,
      end,
    );
  }

  /**
   * Get recognized revenue (PSAK 72)
   * Returns revenue recognized during specified period
   */
  @Get("revenue/recognized")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async getRecognizedRevenue(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.revenueRecognitionService.getRevenueDashboardSummary(
      start,
      end,
    );
  }

  /**
   * Get deferred revenue
   * Returns revenue received in advance but not yet earned
   */
  @Get("revenue/deferred")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async getDeferredRevenue() {
    return this.revenueRecognitionService.getRevenueDashboardSummary();
  }

  /**
   * Get revenue by project
   * Returns revenue breakdown by project
   */
  @Get("revenue/by-project")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async getRevenueByProject() {
    return this.revenueRecognitionService.getRevenueDashboardSummary();
  }

  /**
   * Get milestone revenue summary
   * Returns revenue recognition status for specific project's milestones
   */
  @Get("revenue/milestones/:projectId")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async getProjectMilestonesRevenue(@Param("projectId") projectId: string) {
    return this.revenueRecognitionService.getPaymentMilestonesSummary(projectId);
  }

  /**
   * Manually trigger revenue recognition for a paid invoice
   * Used for invoice payments outside the automatic listener
   */
  @Post("revenue/recognize/:invoiceId")
  @Roles("SUPER_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT")
  async recognizeInvoiceRevenue(
    @Param("invoiceId") invoiceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.revenueRecognitionService.recognizeRevenueFromInvoicePayment(
      invoiceId,
    );
  }
}
