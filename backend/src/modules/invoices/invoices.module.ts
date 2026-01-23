import { Module, forwardRef } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { InvoiceCounterService } from "./services/invoice-counter.service";
import { PrismaModule } from "../prisma/prisma.module";
import { QuotationsModule } from "../quotations/quotations.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AccountingModule } from "../accounting/accounting.module";
import { DocumentsModule } from "../documents/documents.module";
import { ProjectsModule } from "../projects/projects.module";
// import { InvoicePaymentListener } from "./listeners/invoice-payment.listener";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => QuotationsModule),
    NotificationsModule,
    AccountingModule,
    DocumentsModule,
    forwardRef(() => ProjectsModule), // For ProfitCalculationService
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceCounterService], // InvoicePaymentListener temporarily disabled
  exports: [InvoicesService, InvoiceCounterService],
})
export class InvoicesModule {}
