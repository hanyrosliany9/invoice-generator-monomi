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
import { ExternalApisService } from '../../services/external-apis.service';
import * as puppeteer from 'puppeteer';

@Injectable()
export class CallSheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalApisService: ExternalApisService,
  ) {}

  async create(userId: string, dto: CreateCallSheetDto) {
    // Check if call sheet already exists for this shoot day
    const existing = await this.prisma.callSheet.findUnique({
      where: { shootDayId: dto.shootDayId },
    });
    if (existing) throw new ConflictException('Call sheet already exists for this day');

    return this.prisma.callSheet.create({
      data: { ...dto, createdById: userId },
      include: { castCalls: true, crewCalls: true, scenes: true },
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
        // === NEW RELATIONS ===
        mealBreaks: { orderBy: { order: 'asc' } },
        companyMoves: { orderBy: { order: 'asc' } },
        specialRequirements: { orderBy: { order: 'asc' } },
        backgroundCalls: { orderBy: { order: 'asc' } },
      },
    });
    if (!callSheet) throw new NotFoundException('Call sheet not found');
    return callSheet;
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
    const html = this.generateCallSheetHtml(callSheet);

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

  private generateCallSheetHtml(cs: any): string {
    const shootDate = new Date(cs.shootDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Group crew by department
    const crewByDept = cs.crewCalls.reduce((acc: any, crew: any) => {
      if (!acc[crew.department]) acc[crew.department] = [];
      acc[crew.department].push(crew);
      return acc;
    }, {});

    const castRowsHtml = cs.castCalls.map((cast: any) => `
      <tr>
        <td>${cast.castNumber || ''}</td>
        <td>${cast.actorName}</td>
        <td>${cast.character || ''}</td>
        <td>${cast.pickupTime || '-'}</td>
        <td><strong>${cast.callTime}</strong></td>
        <td>${cast.onSetTime || '-'}</td>
      </tr>
    `).join('');

    const crewHtml = Object.entries(crewByDept).map(([dept, crew]: [string, any]) => `
      <div class="dept-section">
        <div class="dept-name">${dept}</div>
        <table class="crew-table">
          ${crew.map((c: any) => `
            <tr>
              <td width="30%">${c.position}</td>
              <td width="35%">${c.name}</td>
              <td width="20%">${c.callTime}</td>
              <td width="15%">${c.phone || ''}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `).join('');

    const scenesHtml = cs.scenes.map((scene: any) => `
      <tr>
        <td>${scene.sceneNumber}</td>
        <td>${scene.intExt || ''} ${scene.dayNight || ''}</td>
        <td>${scene.sceneName || ''}</td>
        <td>${scene.location || ''}</td>
        <td>${scene.pageCount?.toFixed(1) || ''}</td>
        <td>${scene.castIds || ''}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; }

    .header { background: #1f2937; color: #fff; padding: 16px; margin-bottom: 16px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .production-name { font-size: 20px; font-weight: bold; }
    .call-sheet-num { background: #fff; color: #1f2937; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
    .header-info { display: flex; gap: 24px; }
    .header-info div { display: flex; flex-direction: column; }
    .header-info label { font-size: 9px; opacity: 0.8; text-transform: uppercase; }
    .header-info span { font-size: 14px; font-weight: bold; }

    .times-bar { display: flex; background: #f5f5f5; padding: 12px; margin-bottom: 16px; gap: 24px; }
    .time-item { text-align: center; }
    .time-item label { font-size: 9px; color: #666; display: block; }
    .time-item span { font-size: 16px; font-weight: bold; }

    .section { margin-bottom: 16px; }
    .section-title { background: #e5e7eb; padding: 6px 12px; font-weight: bold; font-size: 12px; margin-bottom: 8px; }

    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: bold; font-size: 10px; text-transform: uppercase; }

    .two-col { display: flex; gap: 24px; }
    .two-col > div { flex: 1; }

    .info-card { background: #f9fafb; padding: 12px; border-radius: 4px; margin-bottom: 12px; }
    .info-card h4 { font-size: 11px; margin-bottom: 8px; color: #374151; }
    .info-card p { margin-bottom: 4px; }

    .dept-section { margin-bottom: 12px; }
    .dept-name { font-weight: bold; background: #f3f4f6; padding: 4px 8px; margin-bottom: 4px; }
    .crew-table { font-size: 10px; }
    .crew-table td { padding: 3px 8px; border-bottom: 1px solid #f3f4f6; }

    .weather-row { display: flex; gap: 16px; }
    .weather-item { text-align: center; }

    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div class="production-name">${cs.productionName || 'Production'}</div>
      <div class="call-sheet-num">Call Sheet #${cs.callSheetNumber}</div>
    </div>
    <div class="header-info">
      <div><label>Date</label><span>${shootDate}</span></div>
      <div><label>Day</label><span>${cs.shootDay?.dayNumber || ''}</span></div>
      <div><label>Director</label><span>${cs.director || '-'}</span></div>
      <div><label>Producer</label><span>${cs.producer || '-'}</span></div>
    </div>
  </div>

  <div class="times-bar">
    <div class="time-item"><label>General Call</label><span>${cs.generalCallTime || '-'}</span></div>
    <div class="time-item"><label>First Shot</label><span>${cs.firstShotTime || '-'}</span></div>
    <div class="time-item"><label>Est. Wrap</label><span>${cs.wrapTime || '-'}</span></div>
    <div class="time-item"><label>Sunrise</label><span>${cs.sunrise || '-'}</span></div>
    <div class="time-item"><label>Sunset</label><span>${cs.sunset || '-'}</span></div>
  </div>

  <div class="two-col">
    <div>
      <div class="info-card">
        <h4>📍 LOCATION</h4>
        <p><strong>${cs.locationName || '-'}</strong></p>
        <p>${cs.locationAddress || ''}</p>
        ${cs.parkingNotes ? `<p style="margin-top: 8px;"><strong>Parking:</strong> ${cs.parkingNotes}</p>` : ''}
      </div>
    </div>
    <div>
      <div class="info-card">
        <h4>🌤️ WEATHER</h4>
        <div class="weather-row">
          <div class="weather-item"><span style="font-size: 18px;">${cs.weatherHigh || '-'}°</span><br/>High</div>
          <div class="weather-item"><span style="font-size: 18px;">${cs.weatherLow || '-'}°</span><br/>Low</div>
          <div class="weather-item"><span>${cs.weatherCondition || '-'}</span></div>
        </div>
      </div>
      ${cs.nearestHospital ? `
      <div class="info-card">
        <h4>🏥 NEAREST HOSPITAL</h4>
        <p><strong>${cs.nearestHospital}</strong></p>
        <p>${cs.hospitalAddress || ''}</p>
        <p>${cs.hospitalPhone || ''}</p>
      </div>
      ` : ''}
    </div>
  </div>

  ${cs.scenes.length > 0 ? `
  <div class="section">
    <div class="section-title">SCHEDULE</div>
    <table>
      <thead>
        <tr><th>Scene</th><th>I/E D/N</th><th>Description</th><th>Location</th><th>Pages</th><th>Cast</th></tr>
      </thead>
      <tbody>${scenesHtml}</tbody>
    </table>
  </div>
  ` : ''}

  ${cs.castCalls.length > 0 ? `
  <div class="section">
    <div class="section-title">CAST</div>
    <table>
      <thead>
        <tr><th>#</th><th>Actor</th><th>Character</th><th>Pickup</th><th>Call</th><th>On Set</th></tr>
      </thead>
      <tbody>${castRowsHtml}</tbody>
    </table>
  </div>
  ` : ''}

  ${cs.crewCalls.length > 0 ? `
  <div class="section">
    <div class="section-title">CREW</div>
    ${crewHtml}
  </div>
  ` : ''}

  ${cs.generalNotes ? `
  <div class="section">
    <div class="section-title">NOTES</div>
    <div style="padding: 8px; background: #fffbeb; border-left: 3px solid #f59e0b;">
      ${cs.generalNotes}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    Generated on ${new Date().toLocaleString()} | Please contact production with any questions.
  </div>
</body>
</html>`;
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
}
