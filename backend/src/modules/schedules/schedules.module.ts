import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { ShootDaysController } from './shoot-days.controller';
import { ShootDaysService } from './shoot-days.service';
import { StripsController } from './strips.controller';
import { StripsService } from './strips.service';

@Module({
  controllers: [SchedulesController, ShootDaysController, StripsController],
  providers: [SchedulesService, ShootDaysService, StripsService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
