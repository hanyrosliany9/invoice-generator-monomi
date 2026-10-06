import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CrmFlowService } from "./crm-flow.service";
import { CrmOutboxService } from "./crm-outbox.service";

/**
 * Tiny global module (Prisma only) exposing the CRM hooks to the quotation /
 * invoice / payment services without circular module imports.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [CrmOutboxService, CrmFlowService],
  exports: [CrmOutboxService, CrmFlowService],
})
export class CrmCoreModule {}
