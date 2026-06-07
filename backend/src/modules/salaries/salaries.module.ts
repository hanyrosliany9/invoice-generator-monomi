import { Module } from "@nestjs/common";
import { SalariesService } from "./salaries.service";
import { SalariesController } from "./salaries.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AccountingModule } from "../accounting/accounting.module";
import { PdfModule } from "../pdf/pdf.module";

@Module({
  imports: [PrismaModule, AccountingModule, PdfModule],
  controllers: [SalariesController],
  providers: [SalariesService],
  exports: [SalariesService],
})
export class SalariesModule {}
