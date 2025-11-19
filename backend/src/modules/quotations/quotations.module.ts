import { Module, forwardRef } from "@nestjs/common";
import { QuotationsController } from "./quotations.controller";
import { QuotationsService } from "./quotations.service";
import { PaymentMilestonesService } from "./services/payment-milestones.service";
import { PaymentMilestonesController } from "./controllers/payment-milestones.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { InvoicesModule } from "../invoices/invoices.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SettingsModule } from "../settings/settings.module";
import { DocumentsModule } from "../documents/documents.module";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InvoicesModule),
    NotificationsModule,
    SettingsModule,
    DocumentsModule,
  ],
  controllers: [QuotationsController, PaymentMilestonesController],
  providers: [QuotationsService, PaymentMilestonesService],
  exports: [QuotationsService, PaymentMilestonesService],
})
export class QuotationsModule {}
