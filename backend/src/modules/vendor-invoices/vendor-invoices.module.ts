import { Module } from "@nestjs/common";
import { VendorInvoicesService } from "./vendor-invoices.service";
import { VendorInvoicesController } from "./vendor-invoices.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [VendorInvoicesController],
  providers: [VendorInvoicesService],
  exports: [VendorInvoicesService],
})
export class VendorInvoicesModule {}
