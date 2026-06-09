/**
 * Shooting Schedule PDF Template
 * Comprehensive schedule with shoot days, scenes, and production information
 */

import { escapeHtml } from "./escape-html.util";

export function generateScheduleHTML(schedule: any): string {
  const BANNER_ICONS: Record<string, string> = {
    DAY_BREAK: "🌙",
    MEAL_BREAK: "🍽️",
    COMPANY_MOVE: "🚚",
    NOTE: "📝",
  };

  // Black & white theme: scene rows are white, banner rows are solid black.
  const getStripColor = (strip: any) =>
    strip.stripType === "BANNER" ? "#1a1a1a" : "#ffffff";

  // Monochrome badges. "Filled" (black) vs "outlined" (white) keeps the
  // INT/EXT and DAY/NIGHT distinction readable without using color.
  const filledBadge =
    "background: #1a1a1a; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid #1a1a1a;";
  const outlinedBadge =
    "background: #fff; color: #1a1a1a; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid #1a1a1a;";

  // EXT filled, INT outlined.
  const getIntExtStyle = (intExt: string) =>
    intExt === "EXT" ? filledBadge : outlinedBadge;

  // NIGHT filled, everything else outlined.
  const getDayNightStyle = (dayNight: string) =>
    dayNight === "NIGHT" ? filledBadge : outlinedBadge;

  const daysHtml = schedule.shootDays
    .map((day: any) => {
      const strips = day.strips || [];
      const sceneStrips = strips.filter((s: any) => s.stripType === "SCENE");
      const sceneCount = sceneStrips.length;

      const stripsHtml = strips
        .map((strip: any) => {
          const bgColor = getStripColor(strip);

          if (strip.stripType === "BANNER") {
            const icon = BANNER_ICONS[strip.bannerType] || "📝";
            return `<tr class="banner-row" style="background: ${bgColor};">
          <td colspan="5" style="padding: 10px 16px; color: #fff; font-weight: 600; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">
            ${icon} ${escapeHtml(strip.bannerText || strip.bannerType?.replace("_", " "))}
          </td>
        </tr>`;
          }

          return `<tr class="scene-row" style="background: ${bgColor};">
          <td style="width: 70px; text-align: center; font-weight: 700; font-size: 14px; font-family: monospace; border-right: 1px solid rgba(0,0,0,0.1); background: rgba(0,0,0,0.03);">
            ${escapeHtml(strip.sceneNumber) || "—"}
          </td>
          <td style="width: 60px; text-align: center; padding: 6px; border-right: 1px solid rgba(0,0,0,0.1);">
            <span style="${getIntExtStyle(strip.intExt || "INT")}">${escapeHtml(strip.intExt) || "INT"}</span>
          </td>
          <td style="width: 60px; text-align: center; padding: 6px; border-right: 1px solid rgba(0,0,0,0.1);">
            <span style="${getDayNightStyle(strip.dayNight || "DAY")}">${escapeHtml(strip.dayNight) || "DAY"}</span>
          </td>
          <td style="padding: 8px 12px; border-right: 1px solid rgba(0,0,0,0.1);">
            <div style="font-size: 12px; font-weight: 500; color: #1a1a1a;">${escapeHtml(strip.sceneName) || "Untitled Scene"}</div>
            ${strip.description ? `<div style="font-size: 10px; color: rgba(0,0,0,0.6); margin-top: 2px;">${escapeHtml(strip.description)}</div>` : ""}
          </td>
          <td style="width: 100px; text-align: center; padding: 6px; font-size: 11px; color: rgba(0,0,0,0.7);">
            ${escapeHtml(strip.location) || "—"}
          </td>
        </tr>`;
        })
        .join("");

      // Format date with Indonesian timezone to show correct local date
      const shootDate = day.shootDate
        ? new Date(day.shootDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Asia/Jakarta", // Indonesian timezone (UTC+7)
          })
        : "No date set";

      return `
      <!-- Day Header -->
      <tr class="day-header">
        <td colspan="5" style="background: #1a1a1a; padding: 12px 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 20px;">
              <span style="background: #fff; color: #1a1a1a; padding: 6px 16px; border-radius: 4px; font-weight: 700; font-size: 12px; letter-spacing: 1px;">
                DAY ${day.dayNumber}
              </span>
              <span style="color: #fff; font-size: 13px; font-weight: 500;">${shootDate}</span>
              ${day.location ? `<span style="color: rgba(255,255,255,0.85); font-size: 12px;">📍 ${escapeHtml(day.location)}</span>` : ""}
            </div>
            <div style="display: flex; gap: 24px; color: #fff;">
              <div style="text-align: center;">
                <div style="font-size: 16px; font-weight: 700;">${sceneCount}</div>
                <div style="font-size: 9px; text-transform: uppercase; opacity: 0.8;">Scenes</div>
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
      background: #1a1a1a;
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
    <h1>${escapeHtml(schedule.name)}</h1>
    <div class="meta">
      <span>Project: ${escapeHtml(schedule.project?.number || "N/A")} - ${escapeHtml(schedule.project?.description || schedule.project?.name || "Untitled")}</span>
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
      </tr>
    </thead>
    <tbody>
      ${daysHtml}
    </tbody>
  </table>
</body>
</html>`;
}
