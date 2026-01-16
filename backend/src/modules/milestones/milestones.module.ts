import { Module } from "@nestjs/common";
import { MilestonesService } from "./milestones.service";
import { MilestoneAnalyticsService } from "./milestone-analytics.service";
import { MilestonesController } from "./milestones.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MilestonesController],
  providers: [MilestonesService, MilestoneAnalyticsService],
  exports: [MilestonesService, MilestoneAnalyticsService],
})
export class MilestonesModule {}
