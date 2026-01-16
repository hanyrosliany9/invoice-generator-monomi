import { Module } from "@nestjs/common";
import { ReportsController } from "./controllers/reports.controller";
import { SocialMediaReportService } from "./services/social-media-report.service";
import { UniversalCSVParserService } from "./services/csv-parser.service";
import { PDFGeneratorService } from "./services/pdf-generator.service";
import { PDFTemplateService } from "./services/pdf-template.service";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";

@Module({
  controllers: [ReportsController],
  providers: [
    SocialMediaReportService,
    UniversalCSVParserService,
    PDFGeneratorService,
    PDFTemplateService,
    MediaService,
    PrismaService,
  ],
  exports: [
    SocialMediaReportService,
    UniversalCSVParserService,
    PDFGeneratorService,
  ],
})
export class SocialMediaReportsModule {}
