import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ShootDaysService } from "./shoot-days.service";
import { CreateShootDayDto } from "./dto/create-shoot-day.dto";

@Controller("schedules/days")
@UseGuards(JwtAuthGuard)
export class ShootDaysController {
  constructor(private readonly service: ShootDaysService) {}

  @Post()
  async create(@Body() dto: CreateShootDayDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: Partial<CreateShootDayDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
