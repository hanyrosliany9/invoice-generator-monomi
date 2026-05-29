import { Module } from "@nestjs/common";
import { SalariesService } from "./salaries.service";
import { SalariesController } from "./salaries.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SalariesController],
  providers: [SalariesService],
  exports: [SalariesService],
})
export class SalariesModule {}
