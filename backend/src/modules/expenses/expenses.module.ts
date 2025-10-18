import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { PPNCalculatorService } from './services/ppn-calculator.service';
import { WithholdingTaxCalculatorService } from './services/withholding-tax-calculator.service';
import { EFakturValidatorService } from './services/efaktur-validator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

/**
 * Expenses Module
 *
 * Comprehensive Indonesian-compliant expense management system.
 *
 * Features:
 * - Complete expense CRUD with approval workflows
 * - Indonesian tax compliance (PPN 12%, PPh withholding)
 * - e-Faktur validation and tracking
 * - PSAK chart of accounts integration
 * - Bilingual support (Indonesian/English)
 * - Role-based access control
 * - Budget tracking and reporting
 * - Automated journal entry creation (double-entry bookkeeping)
 *
 * Services:
 * - ExpensesService: Core business logic
 * - PPNCalculatorService: Indonesian PPN (VAT) calculations
 * - WithholdingTaxCalculatorService: PPh withholding tax calculations
 * - EFakturValidatorService: e-Faktur validation and compliance
 *
 * Dependencies:
 * - PrismaModule: Database access
 * - AccountingModule: Automated journal entries
 * - AuthModule: JWT authentication (imported by guards)
 */
@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    PPNCalculatorService,
    WithholdingTaxCalculatorService,
    EFakturValidatorService,
  ],
  exports: [
    ExpensesService,
    PPNCalculatorService,
    WithholdingTaxCalculatorService,
    EFakturValidatorService,
  ],
})
export class ExpensesModule {}
