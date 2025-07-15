import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ExcelExportService } from "./excel-export.service";
import { PdfExportService } from "./pdf-export.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, ExcelExportService, PdfExportService],
  exports: [ReportsService, ExcelExportService, PdfExportService],
})
export class ReportsModule {}
