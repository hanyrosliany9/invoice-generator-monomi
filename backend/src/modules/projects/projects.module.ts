import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { ProfitCalculationService } from "./profit-calculation.service";
import { ProjectProjectionService } from "./project-projection.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProfitCalculationService,
    ProjectProjectionService,
  ],
  exports: [ProjectsService, ProfitCalculationService, ProjectProjectionService],
})
export class ProjectsModule {}
