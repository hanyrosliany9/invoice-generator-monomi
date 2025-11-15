import { Module } from "@nestjs/common";
import { CompanySettingsService } from "./company-settings.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanyModule {}
