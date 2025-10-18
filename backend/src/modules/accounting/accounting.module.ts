import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingController } from './accounting.controller';
import { JournalService } from './services/journal.service';
import { LedgerService } from './services/ledger.service';
import { FinancialStatementsService } from './services/financial-statements.service';
import { DepreciationService } from './services/depreciation.service';
import { ECLService } from './services/ecl.service';
import { RevenueRecognitionService } from './services/revenue-recognition.service';
import { ProjectCostingService } from './services/project-costing.service';
import { TaxReconciliationService } from './services/tax-reconciliation.service';
import { AccountingExportService } from './services/accounting-export.service';
import { CashTransactionService } from './services/cash-transaction.service';
import { BankTransferService } from './services/bank-transfer.service';
import { BankReconciliationService } from './services/bank-reconciliation.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [
    JournalService,
    LedgerService,
    FinancialStatementsService,
    DepreciationService,
    ECLService,
    RevenueRecognitionService,
    ProjectCostingService,
    TaxReconciliationService,
    AccountingExportService,
    CashTransactionService,
    BankTransferService,
    BankReconciliationService,
  ],
  exports: [
    JournalService,
    LedgerService,
    FinancialStatementsService,
    DepreciationService,
    ECLService,
    RevenueRecognitionService,
    ProjectCostingService,
    TaxReconciliationService,
    AccountingExportService,
    CashTransactionService,
    BankTransferService,
    BankReconciliationService,
  ],
})
export class AccountingModule {}
