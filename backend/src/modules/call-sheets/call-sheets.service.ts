import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCallSheetDto } from './dto/create-call-sheet.dto';
import { UpdateCallSheetDto } from './dto/update-call-sheet.dto';
import { CreateCastCallDto, UpdateCastCallDto } from './dto/create-cast-call.dto';
import { CreateCrewCallDto, UpdateCrewCallDto } from './dto/create-crew-call.dto';
import { CreateMealDto, UpdateMealDto } from './dto/create-meal.dto';
import { CreateCompanyMoveDto, UpdateCompanyMoveDto } from './dto/create-company-move.dto';
import { CreateSpecialReqDto, UpdateSpecialReqDto } from './dto/create-special-req.dto';
import { CreateBackgroundDto, UpdateBackgroundDto } from './dto/create-background.dto';
import { CreateShotDto, UpdateShotDto } from './dto/create-shot.dto';
import { CreateModelDto, UpdateModelDto } from './dto/create-model.dto';
import { CreateWardrobeDto, UpdateWardrobeDto } from './dto/create-wardrobe.dto';
import { CreateHmuDto, UpdateHmuDto } from './dto/create-hmu.dto';
import { ExternalApisService } from '../../services/external-apis.service';
import { generateCallSheetHTML } from '../pdf/templates/call-sheet.html';
import * as puppeteer from 'puppeteer';

@Injectable()
export class CallSheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalApisService: ExternalApisService,
  ) {}

  async create(userId: string, dto: CreateCallSheetDto) {
    const callSheetType = (dto.callSheetType || 'FILM') as 'FILM' | 'PHOTO';

    // Validate based on call sheet type
    if (callSheetType === 'FILM') {
      // Film call sheets require scheduleId and shootDayId
      if (!dto.scheduleId || !dto.shootDayId) {
        throw new BadRequestException('Film call sheets require scheduleId and shootDayId');
      }

      // Check if call sheet already exists for this shoot day
      const existing = await this.prisma.callSheet.findUnique({
        where: { shootDayId: dto.shootDayId },
      });
      if (existing) throw new ConflictException('Call sheet already exists for this day');
    } else if (callSheetType === 'PHOTO') {
      // Photo call sheets are standalone and don't require schedule/shootDay
      if (!dto.shootDate) {
        throw new BadRequestException('Photo call sheets require shootDate');
      }
    }

    return this.prisma.callSheet.create({
      data: { ...dto, createdById: userId, callSheetType },
      include: {
        castCalls: true,
        crewCalls: true,
        scenes: true,
        shots: { orderBy: { order: 'asc' } },
        models: { orderBy: { order: 'asc' } },
        wardrobe: { orderBy: { order: 'asc' } },
        hmuSchedule: { orderBy: { order: 'asc' } },
      },
    });
  }

  async findAll() {
    return this.prisma.callSheet.findMany({
      include: {
        shootDay: true,
        schedule: { select: { id: true, name: true } },
        _count: { select: { castCalls: true, crewCalls: true } },
      },
      orderBy: { shootDate: 'asc' },
    });
  }

  async findBySchedule(scheduleId: string) {
    return this.prisma.callSheet.findMany({
      where: { scheduleId },
      include: {
        shootDay: true,
        _count: { select: { castCalls: true, crewCalls: true } },
      },
      orderBy: { shootDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const callSheet = await this.prisma.callSheet.findUnique({
      where: { id },
      include: {
        schedule: { include: { project: true } },
        shootDay: { include: { strips: { orderBy: { order: 'asc' } } } },
        createdBy: { select: { id: true, name: true } },
        castCalls: { orderBy: { order: 'asc' } },
        crewCalls: { orderBy: [{ department: 'asc' }, { order: 'asc' }] },
        scenes: { orderBy: { order: 'asc' } },
        // === Photo-specific relations ===
        shots: { orderBy: { order: 'asc' } },
        models: { orderBy: { order: 'asc' } },
        wardrobe: { orderBy: { order: 'asc' } },
        hmuSchedule: { orderBy: { order: 'asc' } },
        // === Legacy relations (still included for backward compatibility) ===
        mealBreaks: { orderBy: { order: 'asc' } },
        companyMoves: { orderBy: { order: 'asc' } },
        specialRequirements: { orderBy: { order: 'asc' } },
        backgroundCalls: { orderBy: { order: 'asc' } },
      },
    });
    if (!callSheet) throw new NotFoundException('Call sheet not found');

    // === DERIVE DATA FROM SCHEDULE STRIPS ===
    // This is the new approach - get meals, moves, special reqs, and background from the stripboard
    const strips = callSheet.shootDay?.strips || [];

    // Extract meal breaks from BANNER strips with MEAL_BREAK type
    const derivedMealBreaks = strips
      .filter(s => s.stripType === 'BANNER' && s.bannerType === 'MEAL_BREAK')
      .map(s => ({
        id: s.id,
        mealType: s.mealType || 'LUNCH',
        time: s.mealTime || '',
        duration: s.mealDuration || 30,
        location: s.mealLocation || '',
        notes: '',
        order: s.order,
      }));

    // Extract company moves from BANNER strips with COMPANY_MOVE type
    const derivedCompanyMoves = strips
      .filter(s => s.stripType === 'BANNER' && s.bannerType === 'COMPANY_MOVE')
      .map(s => ({
        id: s.id,
        departTime: s.moveTime || '',
        fromLocation: s.moveFromLocation || '',
        toLocation: s.moveToLocation || '',
        travelTime: s.moveTravelTime || 0,
        notes: s.moveNotes || '',
        order: s.order,
      }));

    // Extract special requirements from SCENE strips
    const derivedSpecialReqs = strips
      .filter(s => s.stripType === 'SCENE' && (s.hasStunts || s.hasMinors || s.hasAnimals || s.hasSfx || s.hasWaterWork || s.hasVehicles))
      .map(s => ({
        id: s.id,
        sceneNumber: s.sceneNumber || '',
        hasStunts: s.hasStunts || false,
        hasMinors: s.hasMinors || false,
        hasAnimals: s.hasAnimals || false,
        hasSfx: s.hasSfx || false,
        hasWaterWork: s.hasWaterWork || false,
        hasVehicles: s.hasVehicles || false,
        notes: s.specialReqNotes || '',
        contact: s.specialReqContact || '',
        order: s.order,
      }));

    // Extract background/extras from SCENE strips
    const derivedBackgroundCalls = strips
      .filter(s => s.stripType === 'SCENE' && s.backgroundQty)
      .map(s => ({
        id: s.id,
        sceneNumber: s.sceneNumber || '',
        description: s.backgroundDescription || '',
        quantity: s.backgroundQty || 0,
        callTime: s.backgroundCallTime || '',
        wardrobe: s.backgroundWardrobe || '',
        notes: s.backgroundNotes || '',
        order: s.order,
      }));

    // Return enriched call sheet with derived data
    return {
      ...callSheet,
      // Prefer derived data if available, otherwise use legacy data
      mealBreaks: derivedMealBreaks.length > 0 ? derivedMealBreaks : callSheet.mealBreaks,
      companyMoves: derivedCompanyMoves.length > 0 ? derivedCompanyMoves : callSheet.companyMoves,
      specialRequirements: derivedSpecialReqs.length > 0 ? derivedSpecialReqs : callSheet.specialRequirements,
      backgroundCalls: derivedBackgroundCalls.length > 0 ? derivedBackgroundCalls : callSheet.backgroundCalls,
    };
  }

  async update(id: string, dto: UpdateCallSheetDto) {
    return this.prisma.callSheet.update({
      where: { id },
      data: dto as any,
      include: { castCalls: true, crewCalls: true, scenes: true },
    });
  }

  async remove(id: string) {
    await this.prisma.callSheet.delete({ where: { id } });
    return { success: true };
  }

  // Cast methods
  async addCast(dto: CreateCastCallDto) {
    const maxOrder = await this.prisma.callSheetCast.aggregate({
      where: { callSheetId: dto.callSheetId },
      _max: { order: true },
    });
    const data: any = {
      ...dto,
      order: dto.order ?? (maxOrder._max.order ?? -1) + 1,
    };
    if (data.workStatus) {
      data.workStatus = data.workStatus as any; // Cast to CastWorkStatus enum
    } else {
      data.workStatus = 'W'; // Default to 'W' if not provided
    }
    return this.prisma.callSheetCast.create({ data });
  }

  async updateCast(id: string, dto: UpdateCastCallDto) {
    return this.prisma.callSheetCast.update({ where: { id }, data: dto as any });
  }

  async removeCast(id: string) {
    await this.prisma.callSheetCast.delete({ where: { id } });
    return { success: true };
  }

  // Crew methods
  async addCrew(dto: CreateCrewCallDto) {
    const maxOrder = await this.prisma.callSheetCrew.aggregate({
      where: { callSheetId: dto.callSheetId },
      _max: { order: true },
    });
    return this.prisma.callSheetCrew.create({
      data: { ...dto, order: dto.order ?? (maxOrder._max.order ?? -1) + 1 },
    });
  }

  async updateCrew(id: string, dto: UpdateCrewCallDto) {
    return this.prisma.callSheetCrew.update({ where: { id }, data: dto });
  }

  async removeCrew(id: string) {
    await this.prisma.callSheetCrew.delete({ where: { id } });
    return { success: true };
  }

  // Scene methods
  async addScene(callSheetId: string, dto: any) {
    // Get the maximum order number to assign to new scene
    const lastScene = await this.prisma.callSheetScene.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });

    const nextOrder = (lastScene?.order || 0) + 1;

    return this.prisma.callSheetScene.create({
      data: {
        callSheetId,
        order: nextOrder,
        ...dto,
      },
    });
  }

  async removeScene(id: string) {
    await this.prisma.callSheetScene.delete({ where: { id } });
    return { success: true };
  }

  // ============ AUTO-FILL METHODS ============

  /**
   * Auto-fill all external data for a call sheet
   * Fetches weather, sun times, and hospital info
   */
  async autoFillCallSheet(id: string) {
    const callSheet = await this.findOne(id);

    if (!callSheet.locationAddress) {
      throw new BadRequestException('Location address is required for auto-fill');
    }

    try {
      // Geocode the location
      const coords = await this.externalApisService.geocodeAddress(callSheet.locationAddress);
      if (!coords) {
        throw new Error('Could not geocode address');
      }

      // Fetch all data in parallel
      const [weather, sunTimes, hospitals] = await Promise.allSettled([
        this.externalApisService.getWeatherForecast(coords.lat, coords.lng, callSheet.shootDate),
        this.externalApisService.getSunTimes(coords.lat, coords.lng, callSheet.shootDate),
        this.externalApisService.findNearestHospitals(coords.lat, coords.lng, 1),
      ]);

      const weatherData = weather.status === 'fulfilled' ? weather.value : null;
      const sunData = sunTimes.status === 'fulfilled' ? sunTimes.value : null;
      const hospitalData = hospitals.status === 'fulfilled' ? hospitals.value : [];

      // Generate map URL
      const mapUrl = this.externalApisService.generateMapUrl(callSheet.locationAddress);

      // Update call sheet with auto-filled data (only empty fields)
      const updateData: any = {
        mapUrl: mapUrl || callSheet.mapUrl,
      };

      if (weatherData) {
        if (!callSheet.weatherHigh) updateData.weatherHigh = weatherData.tempHigh;
        if (!callSheet.weatherLow) updateData.weatherLow = weatherData.tempLow;
        if (!callSheet.weatherCondition) updateData.weatherCondition = weatherData.condition;
      }

      if (sunData) {
        if (!callSheet.sunrise) updateData.sunrise = sunData.sunrise;
        if (!callSheet.sunset) updateData.sunset = sunData.sunset;
      }

      if (hospitalData && hospitalData.length > 0) {
        const hospital = hospitalData[0];
        if (!callSheet.nearestHospital) updateData.nearestHospital = hospital.name;
        if (!callSheet.hospitalAddress) updateData.hospitalAddress = hospital.address;
        if (!callSheet.hospitalPhone) updateData.hospitalPhone = hospital.phone;
      }

      return this.update(id, updateData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Auto-fill failed: ${errorMsg}`);
    }
  }

  /**
   * Auto-fill only weather data
   */
  async autoFillWeather(id: string) {
    const callSheet = await this.findOne(id);

    if (!callSheet.locationAddress) {
      throw new BadRequestException('Location address is required for auto-fill');
    }

    try {
      const coords = await this.externalApisService.geocodeAddress(callSheet.locationAddress);
      if (!coords) {
        throw new Error('Could not geocode address');
      }

      const weather = await this.externalApisService.getWeatherForecast(
        coords.lat,
        coords.lng,
        callSheet.shootDate,
      );

      if (!weather) {
        throw new Error('Weather data unavailable for this location/date');
      }

      const updateData: any = {};
      if (!callSheet.weatherHigh) updateData.weatherHigh = weather.tempHigh;
      if (!callSheet.weatherLow) updateData.weatherLow = weather.tempLow;
      if (!callSheet.weatherCondition) updateData.weatherCondition = weather.condition;

      return this.update(id, updateData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Weather auto-fill failed: ${errorMsg}`);
    }
  }

  /**
   * Auto-fill only sun times
   */
  async autoFillSunTimes(id: string) {
    const callSheet = await this.findOne(id);

    if (!callSheet.locationAddress) {
      throw new BadRequestException('Location address is required for auto-fill');
    }

    try {
      const coords = await this.externalApisService.geocodeAddress(callSheet.locationAddress);
      if (!coords) {
        throw new Error('Could not geocode address');
      }

      const sunTimes = await this.externalApisService.getSunTimes(
        coords.lat,
        coords.lng,
        callSheet.shootDate,
      );

      if (!sunTimes) {
        throw new Error('Sun times unavailable for this location/date');
      }

      const updateData: any = {};
      if (!callSheet.sunrise) updateData.sunrise = sunTimes.sunrise;
      if (!callSheet.sunset) updateData.sunset = sunTimes.sunset;

      return this.update(id, updateData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Sun times auto-fill failed: ${errorMsg}`);
    }
  }

  /**
   * Auto-fill only hospital information
   */
  async autoFillHospital(id: string) {
    const callSheet = await this.findOne(id);

    if (!callSheet.locationAddress) {
      throw new BadRequestException('Location address is required for auto-fill');
    }

    try {
      const coords = await this.externalApisService.geocodeAddress(callSheet.locationAddress);
      if (!coords) {
        throw new Error('Could not geocode address');
      }

      const hospitals = await this.externalApisService.findNearestHospitals(coords.lat, coords.lng, 1);

      if (!hospitals || hospitals.length === 0) {
        throw new Error('No hospitals found in the area');
      }

      const hospital = hospitals[0];
      const updateData: any = {};
      if (!callSheet.nearestHospital) updateData.nearestHospital = hospital.name;
      if (!callSheet.hospitalAddress) updateData.hospitalAddress = hospital.address;
      if (!callSheet.hospitalPhone) updateData.hospitalPhone = hospital.phone;

      return this.update(id, updateData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Hospital auto-fill failed: ${errorMsg}`);
    }
  }

  /**
   * Search for hospitals without saving (preview mode)
   */
  async searchHospitals(id: string): Promise<any[]> {
    const callSheet = await this.findOne(id);

    if (!callSheet.locationAddress) {
      throw new BadRequestException('Location address is required for hospital search');
    }

    try {
      const coords = await this.externalApisService.geocodeAddress(callSheet.locationAddress);
      if (!coords) {
        throw new Error('Could not geocode address');
      }

      const hospitals = await this.externalApisService.findNearestHospitals(coords.lat, coords.lng, 3);
      return hospitals;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Hospital search failed: ${errorMsg}`);
    }
  }

  /**
   * Generate map URL for the call sheet location
   */
  generateMapUrl(id: string) {
    // Note: This is synchronous as it doesn't require API calls
    // Call method will fetch the call sheet and pass address
  }

  // ============ END AUTO-FILL METHODS ============

  async generatePdf(id: string): Promise<Buffer> {
    const callSheet = await this.findOne(id);
    // Use the new professional call sheet template (PDF Export Upgrade)
    const html = generateCallSheetHTML(callSheet);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'LETTER',
        printBackground: true,
        margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  /**
   * Search addresses using Nominatim API (via backend proxy)
   */
  async searchAddresses(query: string): Promise<Array<{ value: string; label: string }>> {
    console.log('[CallSheetsService] searchAddresses called with query:', query);

    if (!query || query.length < 3) {
      console.log('[CallSheetsService] Query too short, returning empty array');
      return [];
    }

    try {
      const response = await this.externalApisService.searchAddresses(query);
      console.log('[CallSheetsService] Nominatim returned', response?.length || 0, 'results');
      return response;
    } catch (error) {
      console.error('[CallSheetsService] Address search failed:', error);
      return [];
    }
  }

  // ============ MEAL BREAKS ============
  async addMeal(callSheetId: string, dto: CreateMealDto) {
    const lastMeal = await this.prisma.callSheetMeal.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.callSheetMeal.create({
      data: {
        callSheetId,
        order: (lastMeal?.order || 0) + 1,
        mealType: dto.mealType as any, // Cast to MealType enum
        time: dto.time,
        duration: dto.duration,
        location: dto.location,
        notes: dto.notes,
      },
    });
  }

  async updateMeal(id: string, dto: UpdateMealDto) {
    const data: any = {};
    if (dto.mealType) data.mealType = dto.mealType;
    if (dto.time) data.time = dto.time;
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.callSheetMeal.update({ where: { id }, data });
  }

  async removeMeal(id: string) {
    await this.prisma.callSheetMeal.delete({ where: { id } });
    return { success: true };
  }

  // ============ COMPANY MOVES ============
  async addMove(callSheetId: string, dto: CreateCompanyMoveDto) {
    const lastMove = await this.prisma.callSheetMove.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.callSheetMove.create({
      data: { callSheetId, order: (lastMove?.order || 0) + 1, ...dto },
    });
  }

  async updateMove(id: string, dto: UpdateCompanyMoveDto) {
    return this.prisma.callSheetMove.update({ where: { id }, data: dto });
  }

  async removeMove(id: string) {
    await this.prisma.callSheetMove.delete({ where: { id } });
    return { success: true };
  }

  // ============ SPECIAL REQUIREMENTS ============
  async addSpecialReq(callSheetId: string, dto: CreateSpecialReqDto) {
    const lastReq = await this.prisma.callSheetSpecialReq.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.callSheetSpecialReq.create({
      data: {
        callSheetId,
        order: (lastReq?.order || 0) + 1,
        reqType: dto.reqType as any, // Cast to SpecialReqType enum
        description: dto.description,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        safetyNotes: dto.safetyNotes,
        scenes: dto.scenes,
      },
    });
  }

  async updateSpecialReq(id: string, dto: UpdateSpecialReqDto) {
    const data: any = {};
    if (dto.reqType) data.reqType = dto.reqType;
    if (dto.description) data.description = dto.description;
    if (dto.contactName !== undefined) data.contactName = dto.contactName;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.safetyNotes !== undefined) data.safetyNotes = dto.safetyNotes;
    if (dto.scenes !== undefined) data.scenes = dto.scenes;
    return this.prisma.callSheetSpecialReq.update({ where: { id }, data });
  }

  async removeSpecialReq(id: string) {
    await this.prisma.callSheetSpecialReq.delete({ where: { id } });
    return { success: true };
  }

  // ============ BACKGROUND/EXTRAS ============
  async addBackground(callSheetId: string, dto: CreateBackgroundDto) {
    const lastBg = await this.prisma.callSheetBackground.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.callSheetBackground.create({
      data: { callSheetId, order: (lastBg?.order || 0) + 1, ...dto },
    });
  }

  async updateBackground(id: string, dto: UpdateBackgroundDto) {
    return this.prisma.callSheetBackground.update({ where: { id }, data: dto });
  }

  async removeBackground(id: string) {
    await this.prisma.callSheetBackground.delete({ where: { id } });
    return { success: true };
  }

  // ============ PHOTO-SPECIFIC: SHOTS ============
  async addShot(callSheetId: string, dto: CreateShotDto) {
    const lastShot = await this.prisma.callSheetShot.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.callSheetShot.create({
      data: {
        callSheetId,
        order: (lastShot?.order || 0) + 1,
        ...dto,
      },
    });
  }

  async updateShot(id: string, dto: UpdateShotDto) {
    return this.prisma.callSheetShot.update({ where: { id }, data: dto });
  }

  async removeShot(id: string) {
    await this.prisma.callSheetShot.delete({ where: { id } });
    return { success: true };
  }

  // ============ PHOTO-SPECIFIC: MODELS ============
  async addModel(callSheetId: string, dto: CreateModelDto) {
    const lastModel = await this.prisma.callSheetModel.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });
    const data: any = {
      callSheetId,
      order: (lastModel?.order || 0) + 1,
      ...dto,
    };
    if (data.arrivalType) {
      data.arrivalType = data.arrivalType as 'CAMERA_READY' | 'STYLED';
    }
    return this.prisma.callSheetModel.create({ data });
  }

  async updateModel(id: string, dto: UpdateModelDto) {
    const data: any = { ...dto };
    if (data.arrivalType) {
      data.arrivalType = data.arrivalType as 'CAMERA_READY' | 'STYLED';
    }
    return this.prisma.callSheetModel.update({ where: { id }, data });
  }

  async removeModel(id: string) {
    await this.prisma.callSheetModel.delete({ where: { id } });
    return { success: true };
  }

  // ============ PHOTO-SPECIFIC: WARDROBE ============
  async addWardrobe(callSheetId: string, dto: CreateWardrobeDto) {
    const lastItem = await this.prisma.callSheetWardrobe.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });
    const data: any = {
      callSheetId,
      order: (lastItem?.order || 0) + 1,
      ...dto,
    };
    if (data.status) {
      data.status = data.status as 'PENDING' | 'CONFIRMED' | 'ON_SET' | 'IN_USE' | 'WRAPPED';
    }
    return this.prisma.callSheetWardrobe.create({ data });
  }

  async updateWardrobe(id: string, dto: UpdateWardrobeDto) {
    const data: any = { ...dto };
    if (data.status) {
      data.status = data.status as 'PENDING' | 'CONFIRMED' | 'ON_SET' | 'IN_USE' | 'WRAPPED';
    }
    return this.prisma.callSheetWardrobe.update({ where: { id }, data });
  }

  async removeWardrobe(id: string) {
    await this.prisma.callSheetWardrobe.delete({ where: { id } });
    return { success: true };
  }

  // ============ PHOTO-SPECIFIC: HMU SCHEDULE ============
  async addHmu(callSheetId: string, dto: CreateHmuDto) {
    const lastHmu = await this.prisma.callSheetHMU.findFirst({
      where: { callSheetId },
      orderBy: { order: 'desc' },
    });
    const data: any = {
      callSheetId,
      order: (lastHmu?.order || 0) + 1,
      ...dto,
    };
    if (data.artistRole) {
      data.artistRole = data.artistRole as 'HAIR' | 'MAKEUP' | 'BOTH' | 'KEY_STYLIST';
    }
    return this.prisma.callSheetHMU.create({ data });
  }

  async updateHmu(id: string, dto: UpdateHmuDto) {
    const data: any = { ...dto };
    if (data.artistRole) {
      data.artistRole = data.artistRole as 'HAIR' | 'MAKEUP' | 'BOTH' | 'KEY_STYLIST';
    }
    return this.prisma.callSheetHMU.update({ where: { id }, data });
  }

  async removeHmu(id: string) {
    await this.prisma.callSheetHMU.delete({ where: { id } });
    return { success: true };
  }
}
