import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import * as puppeteer from 'puppeteer';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateScheduleDto) {
    return this.prisma.shootingSchedule.create({
      data: { ...dto, createdById: userId },
      include: { shootDays: { include: { strips: true } } },
    });
  }

  async findByProject(projectId: string) {
    // If 'all' is passed, return all schedules (for list page)
    const where = projectId === 'all' ? {} : { projectId };

    return this.prisma.shootingSchedule.findMany({
      where,
      include: {
        project: { select: { id: true, number: true, description: true } },
        shootDays: { orderBy: { order: 'asc' } },
        _count: { select: { shootDays: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.shootingSchedule.findUnique({
      where: { id },
      include: {
        project: true,
        createdBy: { select: { id: true, name: true } },
        shootDays: {
          orderBy: { order: 'asc' },
          include: { strips: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async update(id: string, dto: Partial<CreateScheduleDto>) {
    return this.prisma.shootingSchedule.update({
      where: { id },
      data: dto,
      include: { shootDays: { include: { strips: true } } },
    });
  }

  async remove(id: string) {
    await this.prisma.shootingSchedule.delete({ where: { id } });
    return { success: true };
  }

  async autoSchedule(id: string, groupBy: 'location' | 'intExt' | 'dayNight') {
    // Get the schedule with all data
    const schedule = await this.prisma.shootingSchedule.findUnique({
      where: { id },
      include: {
        shootDays: {
          orderBy: { order: 'asc' },
          include: { strips: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!schedule) throw new NotFoundException('Schedule not found');

    // Collect all scene strips from all days
    const allStrips = schedule.shootDays.flatMap((day) =>
      day.strips.filter((s) => s.stripType === 'SCENE')
    );

    if (allStrips.length === 0) {
      return this.findOne(id);
    }

    // Group strips by the specified field
    const groups = new Map<string, typeof allStrips>();
    for (const strip of allStrips) {
      let key: string;
      switch (groupBy) {
        case 'location':
          key = strip.location || 'Unknown';
          break;
        case 'intExt':
          key = strip.intExt || 'INT';
          break;
        case 'dayNight':
          key = strip.dayNight || 'DAY';
          break;
        default:
          key = 'Unknown';
      }
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(strip);
    }

    // Flatten groups back to a sorted array (grouped together)
    const sortedStrips = Array.from(groups.values()).flat();

    // Calculate pages per day (default to 8 if not set)
    const pagesPerDay = schedule.pagesPerDay || 8;

    // Distribute strips across shoot days
    const dayAssignments: { dayId: string; stripIds: string[] }[] = [];
    let currentDayIndex = 0;
    let currentDayPages = 0;
    let currentDayStrips: string[] = [];

    // Ensure we have enough shoot days
    const existingDays = schedule.shootDays;
    const dayIds = existingDays.map((d) => d.id);

    for (const strip of sortedStrips) {
      const stripPages = strip.pageCount || 1;

      // If adding this strip would exceed pages per day, start a new day
      if (currentDayPages + stripPages > pagesPerDay && currentDayStrips.length > 0) {
        if (currentDayIndex < dayIds.length) {
          dayAssignments.push({
            dayId: dayIds[currentDayIndex],
            stripIds: currentDayStrips,
          });
        }
        currentDayIndex++;
        currentDayPages = 0;
        currentDayStrips = [];
      }

      currentDayStrips.push(strip.id);
      currentDayPages += stripPages;
    }

    // Add remaining strips to the last day
    if (currentDayStrips.length > 0 && currentDayIndex < dayIds.length) {
      dayAssignments.push({
        dayId: dayIds[currentDayIndex],
        stripIds: currentDayStrips,
      });
    }

    // Update strip assignments in database
    await this.prisma.$transaction(async (tx) => {
      for (const assignment of dayAssignments) {
        for (let i = 0; i < assignment.stripIds.length; i++) {
          await tx.scheduleStrip.update({
            where: { id: assignment.stripIds[i] },
            data: {
              shootDayId: assignment.dayId,
              order: i,
            },
          });
        }
      }
    });

    return this.findOne(id);
  }

  async generatePdf(id: string): Promise<Buffer> {
    const schedule = await this.findOne(id);
    const html = this.generateScheduleHtml(schedule);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private generateScheduleHtml(schedule: any): string {
    const STRIP_COLORS: Record<string, string> = {
      'INT_DAY': '#FFFFFF',
      'INT_NIGHT': '#FFE4B5',
      'EXT_DAY': '#90EE90',
      'EXT_NIGHT': '#87CEEB',
      'DAY_BREAK': '#4A5568',
      'MEAL_BREAK': '#F6AD55',
      'COMPANY_MOVE': '#9F7AEA',
      'NOTE': '#63B3ED',
    };

    const getStripColor = (strip: any) => {
      if (strip.stripType === 'BANNER') {
        return STRIP_COLORS[strip.bannerType] || STRIP_COLORS.NOTE;
      }
      return STRIP_COLORS[`${strip.intExt || 'INT'}_${strip.dayNight || 'DAY'}`] || STRIP_COLORS.INT_DAY;
    };

    const daysHtml = schedule.shootDays.map((day: any) => {
      const stripsHtml = day.strips.map((strip: any) => {
        const bgColor = getStripColor(strip);
        const textColor = strip.stripType === 'BANNER' ? '#fff' : '#000';

        if (strip.stripType === 'BANNER') {
          return `<div class="strip banner" style="background: ${bgColor}; color: ${textColor};">
            ${strip.bannerText || strip.bannerType}
          </div>`;
        }

        return `<div class="strip scene" style="background: ${bgColor};">
          <div class="strip-row">
            <span class="scene-num">${strip.sceneNumber}</span>
            <span class="ie-dn">${strip.intExt || ''} ${strip.dayNight || ''}</span>
            <span class="pages">${strip.pageCount?.toFixed(1) || '0'}p</span>
          </div>
          <div class="scene-name">${strip.sceneName || ''}</div>
          ${strip.location ? `<div class="location">${strip.location}</div>` : ''}
        </div>`;
      }).join('');

      const totalPages = day.strips
        .filter((s: any) => s.stripType === 'SCENE')
        .reduce((sum: number, s: any) => sum + (s.pageCount || 0), 0);

      return `<div class="day-column">
        <div class="day-header">
          <strong>Day ${day.dayNumber}</strong>
          ${day.shootDate ? `<span>${new Date(day.shootDate).toLocaleDateString()}</span>` : ''}
          <span>${totalPages.toFixed(1)} pages</span>
        </div>
        <div class="strips">${stripsHtml}</div>
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; padding: 20px; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 16px; font-size: 11px; }
    .schedule { display: flex; gap: 12px; flex-wrap: wrap; }
    .day-column { min-width: 200px; max-width: 220px; border: 1px solid #ddd; border-radius: 4px; }
    .day-header { background: #1f2937; color: #fff; padding: 8px; display: flex; flex-direction: column; gap: 2px; font-size: 11px; }
    .strips { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
    .strip { padding: 6px 8px; border-radius: 3px; font-size: 9px; }
    .strip.banner { text-align: center; font-weight: bold; }
    .strip.scene { border: 1px solid #ccc; }
    .strip-row { display: flex; justify-content: space-between; align-items: center; }
    .scene-num { font-weight: bold; }
    .ie-dn { font-size: 8px; color: #666; }
    .pages { font-size: 8px; color: #666; }
    .scene-name { margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .location { font-size: 8px; color: #888; margin-top: 2px; }
  </style>
</head>
<body>
  <h1>${schedule.name}</h1>
  <div class="meta">
    Project: ${schedule.project?.name || 'N/A'} | Created: ${new Date(schedule.createdAt).toLocaleDateString()}
  </div>
  <div class="schedule">${daysHtml}</div>
</body>
</html>`;
  }
}
