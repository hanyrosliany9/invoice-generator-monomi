import { Module, forwardRef } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { InvoicesModule } from "../invoices/invoices.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InvoicesModule),
    AccountingModule, // ✅ FIX: Add AccountingModule for JournalService
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
