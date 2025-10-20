import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { ProfitCalculationService } from "./profit-calculation.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProfitCalculationService],
  exports: [ProjectsService, ProfitCalculationService],
})
export class ProjectsModule {}
