/**
 * Shooting Schedule PDF Template
 * Comprehensive schedule with shoot days, scenes, and production information
 */

export function generateScheduleHTML(schedule: any): string {
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
        <td colspan="6" style="background: #1e293b; border-left: 4px solid #6366f1; padding: 12px 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 20px;">
              <span style="background: #6366f1; color: #fff; padding: 6px 16px; border-radius: 4px; font-weight: 700; font-size: 12px; letter-spacing: 1px;">
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
