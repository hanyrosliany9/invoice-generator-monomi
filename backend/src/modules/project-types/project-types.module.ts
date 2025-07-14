import { Module } from '@nestjs/common';
import { ProjectTypesService } from './project-types.service';
import { ProjectTypesController } from './project-types.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectTypesController],
  providers: [ProjectTypesService],
  exports: [ProjectTypesService],
})
export class ProjectTypesModule {}