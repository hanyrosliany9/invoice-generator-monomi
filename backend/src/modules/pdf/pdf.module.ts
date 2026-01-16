import { Module } from "@nestjs/common";
import { PdfService } from "./pdf.service";
import { PdfController } from "./pdf.controller";
import { PdfAccessGuard } from "./guards/pdf-access.guard";
import { InvoicesModule } from "../invoices/invoices.module";
import { QuotationsModule } from "../quotations/quotations.module";
import { SettingsModule } from "../settings/settings.module";
import { ProjectsModule } from "../projects/projects.module";
import { ExpensesModule } from "../expenses/expenses.module";
import { SchedulesModule } from "../schedules/schedules.module";
import { CallSheetsModule } from "../call-sheets/call-sheets.module";
import { ShotListsModule } from "../shot-lists/shot-lists.module";

@Module({
  imports: [
    InvoicesModule,
    QuotationsModule,
    SettingsModule,
    ProjectsModule,
    ExpensesModule,
    SchedulesModule,
    CallSheetsModule,
    ShotListsModule,
  ],
  controllers: [PdfController],
  providers: [PdfService, PdfAccessGuard],
  exports: [PdfService],
})
export class PdfModule {}
