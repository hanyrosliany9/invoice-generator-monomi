import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import * as puppeteer from "puppeteer";

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
    const where = projectId === "all" ? {} : { projectId };

    return this.prisma.shootingSchedule.findMany({
      where,
      include: {
        project: { select: { id: true, number: true, description: true } },
        shootDays: { orderBy: { order: "asc" } },
        _count: { select: { shootDays: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.shootingSchedule.findUnique({
      where: { id },
      include: {
        project: true,
        createdBy: { select: { id: true, name: true } },
        shootDays: {
          orderBy: { order: "asc" },
          include: { strips: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!schedule) throw new NotFoundException("Schedule not found");
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

  async autoSchedule(id: string, groupBy: "location" | "intExt" | "dayNight") {
    // Get the schedule with all data
    const schedule = await this.prisma.shootingSchedule.findUnique({
      where: { id },
      include: {
        shootDays: {
          orderBy: { order: "asc" },
          include: { strips: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!schedule) throw new NotFoundException("Schedule not found");

    // Collect all scene strips from all days
    const allStrips = schedule.shootDays.flatMap((day) =>
      day.strips.filter((s) => s.stripType === "SCENE"),
    );

    if (allStrips.length === 0) {
      return this.findOne(id);
    }

    // Group strips by the specified field
    const groups = new Map<string, typeof allStrips>();
    for (const strip of allStrips) {
      let key: string;
      switch (groupBy) {
        case "location":
          key = strip.location || "Unknown";
          break;
        case "intExt":
          key = strip.intExt || "INT";
          break;
        case "dayNight":
          key = strip.dayNight || "DAY";
          break;
        default:
          key = "Unknown";
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
      if (
        currentDayPages + stripPages > pagesPerDay &&
        currentDayStrips.length > 0
      ) {
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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private generateScheduleHtml(schedule: any): string {
    const STRIP_COLORS: Record<string, string> = {
      INT_DAY: "#FFFFFF",
      INT_NIGHT: "#FFE4B5",
      EXT_DAY: "#90EE90",
      EXT_NIGHT: "#87CEEB",
      "INT/EXT_DAY": "#FFD700",
      "INT/EXT_NIGHT": "#DDA0DD",
      DAY_BREAK: "#4A5568",
      MEAL_BREAK: "#F6AD55",
      COMPANY_MOVE: "#9F7AEA",
      NOTE: "#63B3ED",
    };

    const BANNER_ICONS: Record<string, string> = {
      DAY_BREAK: "🌙",
      MEAL_BREAK: "🍽️",
      COMPANY_MOVE: "🚚",
      NOTE: "📝",
    };

    const getStripColor = (strip: any) => {
      if (strip.stripType === "BANNER") {
        return STRIP_COLORS[strip.bannerType] || STRIP_COLORS.NOTE;
      }
      return (
        STRIP_COLORS[`${strip.intExt || "INT"}_${strip.dayNight || "DAY"}`] ||
        STRIP_COLORS.INT_DAY
      );
    };

    const getIntExtStyle = (intExt: string) => {
      const colors: Record<string, string> = {
        INT: "#3b82f6",
        EXT: "#22c55e",
        "INT/EXT": "#f59e0b",
      };
      return `background: ${colors[intExt] || colors.INT}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;`;
    };

    const getDayNightStyle = (dayNight: string) => {
      const styles: Record<string, { bg: string; color: string }> = {
        DAY: { bg: "#eab308", color: "#1a1a1a" },
        NIGHT: { bg: "#1e293b", color: "#fff" },
        DAWN: { bg: "#ea580c", color: "#fff" },
        DUSK: { bg: "#db2777", color: "#fff" },
      };
      const style = styles[dayNight] || styles.DAY;
      return `background: ${style.bg}; color: ${style.color}; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;`;
    };

    const daysHtml = schedule.shootDays
      .map((day: any) => {
        const strips = day.strips || [];
        const sceneStrips = strips.filter((s: any) => s.stripType === "SCENE");
        const totalPages = sceneStrips.reduce(
          (sum: number, s: any) => sum + (s.pageCount || 0),
          0,
        );
        const sceneCount = sceneStrips.length;

        const stripsHtml = strips
          .map((strip: any) => {
            const bgColor = getStripColor(strip);

            if (strip.stripType === "BANNER") {
              const icon = BANNER_ICONS[strip.bannerType] || "📝";
              return `<tr class="banner-row" style="background: ${bgColor};">
            <td colspan="6" style="padding: 10px 16px; color: #fff; font-weight: 600; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">
              ${icon} ${strip.bannerText || strip.bannerType?.replace("_", " ")}
            </td>
          </tr>`;
            }

            return `<tr class="scene-row" style="background: ${bgColor};">
            <td style="width: 70px; text-align: center; font-weight: 700; font-size: 14px; font-family: monospace; border-right: 1px solid rgba(0,0,0,0.1); background: rgba(0,0,0,0.03);">
              ${strip.sceneNumber || "—"}
            </td>
            <td style="width: 60px; text-align: center; padding: 6px; border-right: 1px solid rgba(0,0,0,0.1);">
              <span style="${getIntExtStyle(strip.intExt || "INT")}">${strip.intExt || "INT"}</span>
            </td>
            <td style="width: 60px; text-align: center; padding: 6px; border-right: 1px solid rgba(0,0,0,0.1);">
              <span style="${getDayNightStyle(strip.dayNight || "DAY")}">${strip.dayNight || "DAY"}</span>
            </td>
            <td style="padding: 8px 12px; border-right: 1px solid rgba(0,0,0,0.1);">
              <div style="font-size: 12px; font-weight: 500; color: #1a1a1a;">${strip.sceneName || "Untitled Scene"}</div>
              ${strip.description ? `<div style="font-size: 10px; color: rgba(0,0,0,0.6); margin-top: 2px;">${strip.description}</div>` : ""}
            </td>
            <td style="width: 100px; text-align: center; padding: 6px; font-size: 11px; color: rgba(0,0,0,0.7); border-right: 1px solid rgba(0,0,0,0.1);">
              ${strip.location || "—"}
            </td>
            <td style="width: 50px; text-align: center; font-weight: 600; font-size: 12px; background: rgba(0,0,0,0.03);">
              ${strip.pageCount?.toFixed(1) || "0"}
            </td>
          </tr>`;
          })
          .join("");

        const shootDate = day.shootDate
          ? new Date(day.shootDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "No date set";

        return `
        <!-- Day Header -->
        <tr class="day-header">
          <td colspan="6" style="background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); padding: 12px 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 20px;">
                <span style="background: rgba(0,0,0,0.3); color: #fff; padding: 6px 16px; border-radius: 4px; font-weight: 700; font-size: 12px; letter-spacing: 1px;">
                  DAY ${day.dayNumber}
                </span>
                <span style="color: #fff; font-size: 13px; font-weight: 500;">${shootDate}</span>
                ${day.location ? `<span style="color: rgba(255,255,255,0.85); font-size: 12px;">📍 ${day.location}</span>` : ""}
              </div>
              <div style="display: flex; gap: 24px; color: #fff;">
                <div style="text-align: center;">
                  <div style="font-size: 16px; font-weight: 700;">${sceneCount}</div>
                  <div style="font-size: 9px; text-transform: uppercase; opacity: 0.8;">Scenes</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 16px; font-weight: 700;">${totalPages.toFixed(1)}</div>
                  <div style="font-size: 9px; text-transform: uppercase; opacity: 0.8;">Pages</div>
                </div>
              </div>
            </div>
          </td>
        </tr>
        ${stripsHtml}`;
      })
      .join("");

    const totalScenes = schedule.shootDays.reduce(
      (sum: number, day: any) =>
        sum +
        (day.strips?.filter((s: any) => s.stripType === "SCENE").length || 0),
      0,
    );
    const totalPages = schedule.shootDays.reduce(
      (sum: number, day: any) =>
        sum +
        (day.strips
          ?.filter((s: any) => s.stripType === "SCENE")
          .reduce((p: number, s: any) => p + (s.pageCount || 0), 0) || 0),
      0,
    );

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; padding: 24px; background: #fff; }

    .header { margin-bottom: 24px; }
    .header h1 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
    .header .meta { color: #6b7280; font-size: 12px; display: flex; gap: 16px; }
    .header .stats { display: flex; gap: 24px; margin-top: 12px; }
    .header .stat { background: #f3f4f6; padding: 8px 16px; border-radius: 6px; }
    .header .stat-value { font-size: 18px; font-weight: 700; color: #1a1a1a; }
    .header .stat-label { font-size: 10px; text-transform: uppercase; color: #6b7280; }

    .schedule-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .schedule-table th {
      background: #1f2937;
      color: #fff;
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: center;
    }
    .schedule-table th:nth-child(4) { text-align: left; }

    .scene-row td { border-bottom: 1px solid rgba(0,0,0,0.08); }
    .scene-row:hover td { background: rgba(0,0,0,0.02); }

    .banner-row td { border-bottom: 1px solid rgba(0,0,0,0.15); }

    @media print {
      body { padding: 12px; }
      .schedule-table { page-break-inside: auto; }
      .day-header { page-break-before: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${schedule.name}</h1>
    <div class="meta">
      <span>Project: ${schedule.project?.number || "N/A"} - ${schedule.project?.description || schedule.project?.name || "Untitled"}</span>
      <span>Created: ${new Date(schedule.createdAt).toLocaleDateString()}</span>
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${schedule.shootDays?.length || 0}</div>
        <div class="stat-label">Shoot Days</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalScenes}</div>
        <div class="stat-label">Total Scenes</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalPages.toFixed(1)}</div>
        <div class="stat-label">Total Pages</div>
      </div>
    </div>
  </div>

  <table class="schedule-table">
    <thead>
      <tr>
        <th style="width: 70px;">Scene</th>
        <th style="width: 60px;">I/E</th>
        <th style="width: 60px;">D/N</th>
        <th>Description / Set</th>
        <th style="width: 100px;">Location</th>
        <th style="width: 50px;">Pages</th>
      </tr>
    </thead>
    <tbody>
      ${daysHtml}
    </tbody>
  </table>
</body>
</html>`;
  }
}
