import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { CalendarEventsService } from "./calendar-events.service";
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  QueryEventsDto,
} from "./dto";

@Controller("calendar-events")
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(private readonly service: CalendarEventsService) {}

  @Post()
  create(@Body() data: CreateCalendarEventDto, @Request() req: any) {
    return this.service.create(data, req.user.id);
  }

  @Get("upcoming")
  getUpcoming(@Query("days") days: string = "7", @Request() req: any) {
    return this.service.getUpcomingEvents(req.user.id, parseInt(days, 10));
  }

  @Get()
  findAll(@Query() query: QueryEventsDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() data: UpdateCalendarEventDto) {
    return this.service.update(id, data);
  }

  @Post(":id/reschedule")
  reschedule(
    @Param("id") id: string,
    @Body() data: { startTime: string; endTime: string },
  ) {
    return this.service.reschedule(id, data.startTime, data.endTime);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
