import { Module } from "@nestjs/common";
import { CalendarEventsService } from "./calendar-events.service";
import { CalendarEventsController } from "./calendar-events.controller";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [CalendarEventsController],
  providers: [CalendarEventsService, PrismaService],
  exports: [CalendarEventsService],
})
export class CalendarEventsModule {}
