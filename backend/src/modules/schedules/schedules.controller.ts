import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SchedulesService } from "./schedules.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";

@Controller("schedules")
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateScheduleDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  async findByProject(@Query("projectId") projectId: string) {
    return this.service.findByProject(projectId);
  }

  // More specific routes MUST come before generic :id routes
  @Get(":id/export/pdf")
  async exportPdf(@Param("id") id: string, @Res() res: Response) {
    const pdf = await this.service.generatePdf(id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="schedule-${id}.pdf"`,
    });
    res.send(pdf);
  }

  @Post(":id/auto-schedule")
  async autoSchedule(
    @Param("id") id: string,
    @Body("groupBy") groupBy: string,
  ) {
    return this.service.autoSchedule(id, groupBy as any);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: Partial<CreateScheduleDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
