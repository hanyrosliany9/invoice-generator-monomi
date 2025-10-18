import { Module, forwardRef } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { PrismaModule } from "../prisma/prisma.module";
import { QuotationsModule } from "../quotations/quotations.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => QuotationsModule),
    NotificationsModule,
    AccountingModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
