import { Module } from "@nestjs/common";
import { SecurityMetricsController } from "./security-metrics.controller";
import { SecurityMetricsService } from "./security-metrics.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SecurityMetricsController],
  providers: [SecurityMetricsService],
  exports: [SecurityMetricsService],
})
export class SecurityModule {}
