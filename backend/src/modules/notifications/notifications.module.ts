import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationSchedulerService } from "./notification-scheduler.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [ConfigModule, PrismaModule, ScheduleModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationSchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
