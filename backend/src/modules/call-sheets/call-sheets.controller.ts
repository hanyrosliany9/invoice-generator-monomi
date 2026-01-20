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
import { CallSheetsService } from "./call-sheets.service";
import { CreateCallSheetDto } from "./dto/create-call-sheet.dto";
import { UpdateCallSheetDto } from "./dto/update-call-sheet.dto";
import {
  CreateCastCallDto,
  UpdateCastCallDto,
} from "./dto/create-cast-call.dto";
import {
  CreateCrewCallDto,
  UpdateCrewCallDto,
} from "./dto/create-crew-call.dto";
import { CreateCallSheetSceneDto } from "./dto/create-scene.dto";
import { CreateMealDto, UpdateMealDto } from "./dto/create-meal.dto";
import {
  CreateCompanyMoveDto,
  UpdateCompanyMoveDto,
} from "./dto/create-company-move.dto";
import {
  CreateSpecialReqDto,
  UpdateSpecialReqDto,
} from "./dto/create-special-req.dto";
import {
  CreateBackgroundDto,
  UpdateBackgroundDto,
} from "./dto/create-background.dto";
import { CreateShotDto, UpdateShotDto } from "./dto/create-shot.dto";
import { CreateModelDto, UpdateModelDto } from "./dto/create-model.dto";
import {
  CreateWardrobeDto,
  UpdateWardrobeDto,
} from "./dto/create-wardrobe.dto";
import { CreateHmuDto, UpdateHmuDto } from "./dto/create-hmu.dto";
import {
  CreateActivityDto,
  UpdateActivityDto,
} from "./dto/create-activity.dto";

@Controller("call-sheets")
@UseGuards(JwtAuthGuard)
export class CallSheetsController {
  constructor(private readonly service: CallSheetsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateCallSheetDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  async findBySchedule(@Query("scheduleId") scheduleId?: string) {
    if (!scheduleId) {
      return this.service.findAll();
    }
    return this.service.findBySchedule(scheduleId);
  }

  /**
   * Search for addresses using Nominatim (proxy to avoid CORS)
   */
  @Get("search/addresses")
  async searchAddresses(@Query("q") query: string) {
    return this.service.searchAddresses(query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateCallSheetDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  // Cast endpoints
  @Post(":id/cast")
  async addCast(
    @Param("id") id: string,
    @Body() dto: Omit<CreateCastCallDto, "callSheetId">,
  ) {
    return this.service.addCast({ ...dto, callSheetId: id });
  }

  @Put("cast/:id")
  async updateCast(@Param("id") id: string, @Body() dto: UpdateCastCallDto) {
    return this.service.updateCast(id, dto);
  }

  @Delete("cast/:id")
  async removeCast(@Param("id") id: string) {
    return this.service.removeCast(id);
  }

  // Crew endpoints
  @Post(":id/crew")
  async addCrew(
    @Param("id") id: string,
    @Body() dto: Omit<CreateCrewCallDto, "callSheetId">,
  ) {
    return this.service.addCrew({ ...dto, callSheetId: id });
  }

  @Put("crew/:id")
  async updateCrew(@Param("id") id: string, @Body() dto: UpdateCrewCallDto) {
    return this.service.updateCrew(id, dto);
  }

  @Delete("crew/:id")
  async removeCrew(@Param("id") id: string) {
    return this.service.removeCrew(id);
  }

  // Scene endpoints
  @Post(":id/scenes")
  async addScene(
    @Param("id") id: string,
    @Body() dto: CreateCallSheetSceneDto,
  ) {
    return this.service.addScene(id, dto);
  }

  @Delete("scenes/:id")
  async removeScene(@Param("id") id: string) {
    return this.service.removeScene(id);
  }

  // ============ AUTO-FILL ENDPOINTS ============

  /**
   * Auto-fill all external data (weather, sun times, hospital)
   */
  @Post(":id/auto-fill")
  async autoFillCallSheet(@Param("id") id: string) {
    return this.service.autoFillCallSheet(id);
  }

  /**
   * Auto-fill only weather data
   */
  @Post(":id/auto-fill/weather")
  async autoFillWeather(@Param("id") id: string) {
    return this.service.autoFillWeather(id);
  }

  /**
   * Auto-fill only sun times
   */
  @Post(":id/auto-fill/sun-times")
  async autoFillSunTimes(@Param("id") id: string) {
    return this.service.autoFillSunTimes(id);
  }

  /**
   * Auto-fill only hospital information
   */
  @Post(":id/auto-fill/hospital")
  async autoFillHospital(@Param("id") id: string) {
    return this.service.autoFillHospital(id);
  }

  /**
   * Search for hospitals near the location (preview, no save)
   */
  @Get(":id/search-hospitals")
  async searchHospitals(@Param("id") id: string) {
    return this.service.searchHospitals(id);
  }

  // ============ END AUTO-FILL ENDPOINTS ============

  @Get(":id/export/pdf")
  async exportPdf(@Param("id") id: string, @Res() res: Response) {
    const pdf = await this.service.generatePdf(id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="call-sheet-${id}.pdf"`,
    });
    res.send(pdf);
  }

  // ============ MEAL BREAKS ============
  @Post(":id/meals")
  async addMeal(@Param("id") id: string, @Body() dto: CreateMealDto) {
    return this.service.addMeal(id, dto);
  }

  @Put("meals/:id")
  async updateMeal(@Param("id") id: string, @Body() dto: UpdateMealDto) {
    return this.service.updateMeal(id, dto);
  }

  @Delete("meals/:id")
  async removeMeal(@Param("id") id: string) {
    return this.service.removeMeal(id);
  }

  // ============ COMPANY MOVES ============
  @Post(":id/moves")
  async addMove(@Param("id") id: string, @Body() dto: CreateCompanyMoveDto) {
    return this.service.addMove(id, dto);
  }

  @Put("moves/:id")
  async updateMove(@Param("id") id: string, @Body() dto: UpdateCompanyMoveDto) {
    return this.service.updateMove(id, dto);
  }

  @Delete("moves/:id")
  async removeMove(@Param("id") id: string) {
    return this.service.removeMove(id);
  }

  // ============ SPECIAL REQUIREMENTS ============
  @Post(":id/special-reqs")
  async addSpecialReq(
    @Param("id") id: string,
    @Body() dto: CreateSpecialReqDto,
  ) {
    return this.service.addSpecialReq(id, dto);
  }

  @Put("special-reqs/:id")
  async updateSpecialReq(
    @Param("id") id: string,
    @Body() dto: UpdateSpecialReqDto,
  ) {
    return this.service.updateSpecialReq(id, dto);
  }

  @Delete("special-reqs/:id")
  async removeSpecialReq(@Param("id") id: string) {
    return this.service.removeSpecialReq(id);
  }

  // ============ BACKGROUND/EXTRAS ============
  @Post(":id/background")
  async addBackground(
    @Param("id") id: string,
    @Body() dto: CreateBackgroundDto,
  ) {
    return this.service.addBackground(id, dto);
  }

  @Put("background/:id")
  async updateBackground(
    @Param("id") id: string,
    @Body() dto: UpdateBackgroundDto,
  ) {
    return this.service.updateBackground(id, dto);
  }

  @Delete("background/:id")
  async removeBackground(@Param("id") id: string) {
    return this.service.removeBackground(id);
  }

  // ============ PHOTO-SPECIFIC: SHOTS ============
  @Post(":id/shots")
  async addShot(@Param("id") id: string, @Body() dto: CreateShotDto) {
    return this.service.addShot(id, dto);
  }

  @Put("shots/:id")
  async updateShot(@Param("id") id: string, @Body() dto: UpdateShotDto) {
    return this.service.updateShot(id, dto);
  }

  @Delete("shots/:id")
  async removeShot(@Param("id") id: string) {
    return this.service.removeShot(id);
  }

  // ============ PHOTO-SPECIFIC: MODELS ============
  @Post(":id/models")
  async addModel(@Param("id") id: string, @Body() dto: CreateModelDto) {
    return this.service.addModel(id, dto);
  }

  @Put("models/:id")
  async updateModel(@Param("id") id: string, @Body() dto: UpdateModelDto) {
    return this.service.updateModel(id, dto);
  }

  @Delete("models/:id")
  async removeModel(@Param("id") id: string) {
    return this.service.removeModel(id);
  }

  // ============ PHOTO-SPECIFIC: WARDROBE ============
  @Post(":id/wardrobe")
  async addWardrobe(@Param("id") id: string, @Body() dto: CreateWardrobeDto) {
    return this.service.addWardrobe(id, dto);
  }

  @Put("wardrobe/:id")
  async updateWardrobe(
    @Param("id") id: string,
    @Body() dto: UpdateWardrobeDto,
  ) {
    return this.service.updateWardrobe(id, dto);
  }

  @Delete("wardrobe/:id")
  async removeWardrobe(@Param("id") id: string) {
    return this.service.removeWardrobe(id);
  }

  // ============ PHOTO-SPECIFIC: HMU SCHEDULE ============
  @Post(":id/hmu")
  async addHmu(@Param("id") id: string, @Body() dto: CreateHmuDto) {
    return this.service.addHmu(id, dto);
  }

  @Put("hmu/:id")
  async updateHmu(@Param("id") id: string, @Body() dto: UpdateHmuDto) {
    return this.service.updateHmu(id, dto);
  }

  @Delete("hmu/:id")
  async removeHmu(@Param("id") id: string) {
    return this.service.removeHmu(id);
  }

  // ============ GENERAL ACTIVITIES (Run of Show) ============
  @Post(":id/activities")
  async addActivity(@Param("id") id: string, @Body() dto: CreateActivityDto) {
    return this.service.addActivity(id, dto);
  }

  @Put("activities/:id")
  async updateActivity(
    @Param("id") id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.service.updateActivity(id, dto);
  }

  @Delete("activities/:id")
  async removeActivity(@Param("id") id: string) {
    return this.service.removeActivity(id);
  }

  @Post(":id/activities/reorder")
  async reorderActivities(
    @Param("id") id: string,
    @Body() dto: { activities: { id: string; order: number }[] },
  ) {
    return this.service.reorderActivities(id, dto.activities);
  }
}
