import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MateraiService } from "./materai.service";
import { MateraiController } from "./materai.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [MateraiController],
  providers: [MateraiService],
  exports: [MateraiService],
})
export class MateraiModule {}
