import { Module } from "@nestjs/common";
import { PdfService } from "./pdf.service";
import { PdfController } from "./pdf.controller";
import { InvoicesModule } from "../invoices/invoices.module";
import { QuotationsModule } from "../quotations/quotations.module";
import { SettingsModule } from "../settings/settings.module";
import { ProjectsModule } from "../projects/projects.module";

@Module({
  imports: [InvoicesModule, QuotationsModule, SettingsModule, ProjectsModule],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
