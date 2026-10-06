import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ClientsModule } from "../clients/clients.module";
import { ProjectsModule } from "../projects/projects.module";
import { QuotationsModule } from "../quotations/quotations.module";
import { AdTrackingModule } from "../ad-tracking/ad-tracking.module";
import { CrmController } from "./crm.controller";
import { CrmCampaignsService } from "./crm-campaigns.service";
import { CrmCoreModule } from "./crm-core.module";
import { CrmLeadsService } from "./crm-leads.service";
import { CrmSettingsService } from "./crm-settings.service";
import { CrmStatsService } from "./crm-stats.service";

/**
 * CRM phase A: leads, pipeline stages, campaigns + spend, stats, Meta event
 * outbox (recorded only; the WhatsApp inbox and the Conversions API sender are
 * phase B). Quotation / invoice hooks live in the global CrmCoreModule.
 */
@Module({
  imports: [PrismaModule, CrmCoreModule, AdTrackingModule, ClientsModule, ProjectsModule, QuotationsModule],
  controllers: [CrmController],
  providers: [CrmLeadsService, CrmCampaignsService, CrmSettingsService, CrmStatsService],
  exports: [CrmLeadsService, CrmSettingsService],
})
export class CrmModule {}
