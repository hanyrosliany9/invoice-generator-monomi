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
} from '@nestjs/common'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { CalendarEventsService } from './calendar-events.service'
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  QueryEventsDto,
} from './dto'

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(private readonly service: CalendarEventsService) {}

  @Post()
  create(
    @Body() data: CreateCalendarEventDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.service.create(data, user.id)
  }

  @Get()
  findAll(@Query() query: QueryEventsDto) {
    return this.service.findAll(query)
  }

  @Get('upcoming')
  getUpcoming(
    @Query('days') days: string = '7',
    @CurrentUser() user: { id: string }
  ) {
    return this.service.getUpcomingEvents(user.id, parseInt(days, 10))
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdateCalendarEventDto
  ) {
    return this.service.update(id, data)
  }

  @Post(':id/reschedule')
  reschedule(
    @Param('id') id: string,
    @Body() data: { startTime: string; endTime: string }
  ) {
    return this.service.reschedule(id, data.startTime, data.endTime)
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id)
  }
}
