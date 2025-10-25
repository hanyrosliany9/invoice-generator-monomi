import { Module, forwardRef } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { PrismaModule } from "../prisma/prisma.module";
import { QuotationsModule } from "../quotations/quotations.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AccountingModule } from "../accounting/accounting.module";
// import { InvoicePaymentListener } from "./listeners/invoice-payment.listener";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => QuotationsModule),
    NotificationsModule,
    AccountingModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService], // InvoicePaymentListener temporarily disabled
  exports: [InvoicesService],
})
export class InvoicesModule {}
