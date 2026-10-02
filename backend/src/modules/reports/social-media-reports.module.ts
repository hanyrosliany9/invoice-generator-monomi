import { Module } from "@nestjs/common";
import { ReportsController } from "./controllers/reports.controller";
import { SocialMediaReportService } from "./services/social-media-report.service";
import { UniversalCSVParserService } from "./services/csv-parser.service";
import { PDFGeneratorService } from "./services/pdf-generator.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [ReportsController],
  providers: [
    SocialMediaReportService,
    UniversalCSVParserService,
    PDFGeneratorService,
    PrismaService,
  ],
  exports: [
    SocialMediaReportService,
    UniversalCSVParserService,
    PDFGeneratorService,
  ],
})
export class SocialMediaReportsModule {}
