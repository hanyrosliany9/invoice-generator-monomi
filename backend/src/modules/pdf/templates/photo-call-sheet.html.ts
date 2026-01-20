/**
 * Professional Photo Call Sheet PDF Template
 * Optimized for photography/fashion shoots
 * Matches the film call sheet layout style
 */

const THEME_COLORS = {
  primary: "#337EA9",
  primaryDark: "#37352F",
  success: "#448361",
  warning: "#D9730D",
  error: "#D44C47",
  lightBg: "#F1F1EF",
  mediumBg: "#E1E0DC",
  textSecondary: "#787774",
};

// Activity type colors matching frontend
const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  GENERAL: '#8c8c8c',
  PREPARATION: '#1890ff',
  STANDBY: '#faad14',
  BRIEFING: '#52c41a',
  REHEARSAL: '#722ed1',
  TRANSPORT: '#13c2c2',
  TECHNICAL: '#eb2f96',
  CUSTOM: '#595959',
};

function getPageBreakStyle(continuous: boolean): string {
  return continuous ? "" : "page-break-inside: avoid;";
}

export function generatePhotoCallSheetHTML(
  cs: any,
  logoBase64?: string | null,
  continuous: boolean = true,
): string {
  const shootDate = new Date(cs.shootDate).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  // Build shots HTML
  const shotsHtml =
    cs.shots
      ?.map(
        (shot: any) => `
    <tr>
      <td style="text-align: center; font-weight: bold;">${shot.shotNumber}</td>
      <td>${shot.shotName || ""}</td>
      <td>${shot.lookReference || ""}</td>
      <td>${shot.setupLocation || ""}</td>
      <td style="text-align: center;">${shot.estStartTime || "-"}</td>
      <td style="text-align: center;">${shot.estDuration || "-"}</td>
      <td style="font-size: 9px;">${shot.wardrobeNotes || ""}</td>
    </tr>
  `,
      )
      .join("") || "";

  // Build models HTML
  const modelsHtml =
    cs.models
      ?.map(
        (model: any) => `
    <tr>
      <td style="text-align: center;">${model.modelNumber || ""}</td>
      <td style="font-weight: bold;">${model.modelName}</td>
      <td>${model.agencyName || "-"}</td>
      <td style="font-size: 9px;">${model.arrivalType === "CAMERA_READY" ? "Camera Ready" : "Styled"}</td>
      <td style="text-align: center;">${model.arrivalTime}</td>
      <td style="text-align: center;">${model.hmuStartTime || "-"}</td>
      <td style="text-align: center;">${model.cameraReadyTime || "-"}</td>
      <td>${model.hmuArtist || "-"}</td>
    </tr>
  `,
      )
      .join("") || "";

  // Build wardrobe HTML
  const wardrobeHtml =
    cs.wardrobe
      ?.map(
        (item: any) => `
    <tr>
      <td style="font-weight: bold;">${item.itemName}</td>
      <td style="text-align: center;">${item.size || "-"}</td>
      <td>${item.color || "-"}</td>
      <td>${item.forModel || "-"}</td>
      <td>${item.forShot || "-"}</td>
      <td style="font-size: 9px;">${item.status}</td>
    </tr>
  `,
      )
      .join("") || "";

  // Build HMU HTML
  const hmuHtml =
    cs.hmuSchedule
      ?.map(
        (hmu: any) => `
    <tr>
      <td>${hmu.artistName}</td>
      <td style="font-size: 9px;">${hmu.artistRole === "KEY_STYLIST" ? "Key Stylist" : hmu.artistRole}</td>
      <td style="text-align: center;">${hmu.stationNumber || "-"}</td>
      <td style="text-align: center;">${hmu.callTime}</td>
      <td style="text-align: center;">${hmu.availableFrom || "-"}</td>
      <td style="text-align: center;">${hmu.availableUntil || "-"}</td>
      <td style="font-size: 9px;">${hmu.assignedModels || "-"}</td>
    </tr>
  `,
      )
      .join("") || "";

  // Build CSS - only add @page rules for print mode
  const pagebreakCSS = continuous
    ? ""
    : `
    @page {
      size: letter;
      margin: 0.4in;
    }
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      line-height: 1.3;
      color: #000;
    }

    ${pagebreakCSS}

    body {
      padding: 8px;
    }

    .page-container {
      width: 100%;
    }

    /* HEADER SECTION - Matching film call sheet style */
    .call-sheet-header {
      width: 100%;
      border: 3px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .header-top {
      display: grid;
      grid-template-columns: 1fr 2fr 1fr;
      gap: 0;
      border-bottom: 2px solid #000;
    }

    .header-left {
      border-right: 2px solid #000;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .company-logo-small {
      width: 80px;
      height: auto;
      margin-bottom: 8px;
    }

    .production-info-box {
      font-size: 9px;
      line-height: 1.2;
    }

    .production-info-box div {
      margin-bottom: 3px;
    }

    .production-info-label {
      font-weight: bold;
      display: inline-block;
      width: 70px;
    }

    .header-center {
      padding: 20px 12px;
      text-align: center;
      border-right: 2px solid #000;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .call-sheet-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }

    .shoot-info {
      font-size: 11px;
      line-height: 1.4;
    }

    .shoot-info-line {
      margin-bottom: 4px;
    }

    .header-right {
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .key-times-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .key-times-table tr {
      border-bottom: 1px solid #000;
    }

    .key-times-table td {
      padding: 4px 6px;
      border-right: 1px solid #000;
    }

    .key-times-table td:last-child {
      border-right: none;
    }

    .key-times-label {
      font-weight: bold;
      width: 70%;
    }

    .key-times-value {
      text-align: center;
      font-weight: bold;
      font-size: 11px;
    }

    /* LOGISTICS SECTION */
    .logistics-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .logistics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
    }

    .logistics-box {
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 8px;
      min-height: 40px;
    }

    .logistics-box:nth-child(4n) {
      border-right: none;
    }

    .logistics-box:nth-last-child(-n+4) {
      border-bottom: none;
    }

    .logistics-label {
      font-weight: bold;
      font-size: 9px;
      margin-bottom: 4px;
    }

    .logistics-value {
      font-size: 10px;
      line-height: 1.3;
    }

    /* TABLE SECTIONS */
    .data-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .section-title {
      background: ${THEME_COLORS.mediumBg};
      color: #000;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      border-bottom: 2px solid #000;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }

    .data-table th {
      background: ${THEME_COLORS.mediumBg};
      color: #000;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #999;
      font-size: 9px;
    }

    .data-table td {
      padding: 6px 4px;
      border: 1px solid #000;
    }

    .data-table tbody tr:nth-child(even) {
      background: ${THEME_COLORS.lightBg};
    }

    /* ACTIVITIES TABLE */
    .activities-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }

    .activities-table th {
      background: ${THEME_COLORS.mediumBg};
      color: #000;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #999;
      font-size: 9px;
    }

    .activities-table td {
      padding: 6px 4px;
      border: 1px solid #000;
    }

    .activities-table tbody tr:nth-child(even) {
      background: ${THEME_COLORS.lightBg};
    }

    .activity-highlighted {
      background: rgba(255, 193, 7, 0.15) !important;
    }

    /* NOTES SECTION */
    .notes-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .notes-content {
      padding: 8px;
      min-height: 40px;
      font-size: 10px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* FOOTER */
    .footer-section {
      font-size: 8px;
      color: ${THEME_COLORS.textSecondary};
      margin-top: 8px;
      padding: 8px;
      border-top: 1px solid #ddd;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- HEADER SECTION -->
    <div class="call-sheet-header">
      <div class="header-top">
        <!-- Left: Company Info -->
        <div class="header-left">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Company Logo" class="company-logo-small" />` : ""}
          <div class="production-info-box">
            <div><span class="production-info-label">Photographer:</span> ${cs.photographer || "-"}</div>
            <div><span class="production-info-label">Art Director:</span> ${cs.artDirector || "-"}</div>
            <div><span class="production-info-label">Stylist:</span> ${cs.stylist || "-"}</div>
            <div><span class="production-info-label">H&MU Lead:</span> ${cs.hmuLead || "-"}</div>
          </div>
        </div>

        <!-- Center: Title -->
        <div class="header-center">
          <div class="call-sheet-title">${cs.productionName || "PHOTO CALL SHEET"}</div>
          <div class="shoot-info">
            <div class="shoot-info-line"><strong>${shootDate}</strong></div>
            ${cs.dayNumber ? `<div class="shoot-info-line">DAY ${cs.dayNumber}${cs.totalDays ? " of " + cs.totalDays : ""}</div>` : ""}
            <div class="shoot-info-line"><strong>CREW CALL</strong></div>
            <div style="font-size: 24px; font-weight: bold; color: ${THEME_COLORS.warning};">${cs.crewCallTime || cs.generalCallTime || "—"}</div>
          </div>
        </div>

        <!-- Right: Key Times -->
        <div class="header-right">
          <table class="key-times-table">
            <tr>
              <td class="key-times-label">First Shot:</td>
              <td class="key-times-value">${cs.firstShotTime || "—"}</td>
            </tr>
            <tr>
              <td class="key-times-label">Lunch:</td>
              <td class="key-times-value">${cs.lunchTime || "—"}</td>
            </tr>
            <tr>
              <td class="key-times-label">Est. Wrap:</td>
              <td class="key-times-value">${cs.estimatedWrap || cs.wrapTime || "—"}</td>
            </tr>
            <tr>
              <td class="key-times-label">Total Looks:</td>
              <td class="key-times-value">${cs.totalLooks || cs.shots?.length || "—"}</td>
            </tr>
            <tr>
              <td class="key-times-label">Session Type:</td>
              <td class="key-times-value">${cs.sessionType || "—"}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- LOGISTICS SECTION -->
    <div class="logistics-section">
      <div class="logistics-grid">
        <div class="logistics-box">
          <div class="logistics-label">LOCATION</div>
          <div class="logistics-value">${cs.locationName || ""}<br/><small>${cs.locationAddress || ""}</small></div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">CLIENT</div>
          <div class="logistics-value">${cs.clientName || ""}<br/><small>${cs.clientContact || ""}</small></div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">AGENCY</div>
          <div class="logistics-value">${cs.agencyName || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">PARKING</div>
          <div class="logistics-value">${cs.crewParking || cs.parkingNotes || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">NEAREST HOSPITAL</div>
          <div class="logistics-value">${cs.nearestHospital || ""}<br/><small>${cs.hospitalAddress || ""}</small></div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">WEATHER</div>
          <div class="logistics-value">H: ${cs.weatherHigh || "—"}° / L: ${cs.weatherLow || "—"}°<br/>${cs.weatherCondition || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">SUNRISE</div>
          <div class="logistics-value">${cs.sunrise || "—"}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">SUNSET</div>
          <div class="logistics-value">${cs.sunset || "—"}</div>
        </div>
      </div>
    </div>

    <!-- ACTIVITIES / RUN OF SHOW -->
    ${
      cs.activities && cs.activities.length > 0
        ? `
    <div class="data-section">
      <div class="section-title">SCHEDULE / RUN OF SHOW</div>
      <table class="activities-table">
        <thead>
          <tr>
            <th style="width: 70px;">TIME</th>
            <th style="width: 90px;">TYPE</th>
            <th>ACTIVITY</th>
            <th style="width: 120px;">LOCATION</th>
            <th style="width: 120px;">PERSONNEL</th>
            <th>NOTES</th>
          </tr>
        </thead>
        <tbody>
          ${cs.activities
            .sort((a: any, b: any) => {
              if (a.startTime && b.startTime) {
                const timeCompare = a.startTime.localeCompare(b.startTime);
                if (timeCompare !== 0) return timeCompare;
              }
              return (a.order || 0) - (b.order || 0);
            })
            .map(
              (activity: any) => `
            <tr class="${activity.isHighlighted ? 'activity-highlighted' : ''}">
              <td style="font-weight: bold; white-space: nowrap;">
                ${activity.startTime || ''}${activity.endTime ? ' - ' + activity.endTime : ''}
                ${activity.duration ? '<br/><small>(' + activity.duration + ' min)</small>' : ''}
              </td>
              <td style="font-weight: bold;">${activity.activityType || 'GENERAL'}</td>
              <td>
                <strong>${activity.activityName || ''}</strong>
                ${activity.description ? '<br/><small>' + activity.description + '</small>' : ''}
              </td>
              <td>${activity.location || ''}</td>
              <td>
                ${activity.personnel || ''}
                ${activity.responsibleParty ? '<br/><small><em>In charge: ' + activity.responsibleParty + '</em></small>' : ''}
              </td>
              <td>
                ${activity.notes || ''}
                ${activity.technicalNotes ? '<br/><small><em>Tech: ' + activity.technicalNotes + '</em></small>' : ''}
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    `
        : ""
    }

    <!-- SHOT LIST -->
    <div class="data-section">
      <div class="section-title">SHOT LIST / LOOKS (${cs.shots?.length || 0} shots)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50px;">Shot #</th>
            <th>Name</th>
            <th style="width: 80px;">Look</th>
            <th style="width: 100px;">Location</th>
            <th style="width: 70px;">Est. Time</th>
            <th style="width: 60px;">Duration</th>
            <th>Wardrobe Notes</th>
          </tr>
        </thead>
        <tbody>
          ${shotsHtml || '<tr><td colspan="7" style="text-align: center; color: #999;">No shots added</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- MODELS / TALENT -->
    <div class="data-section">
      <div class="section-title">MODELS / TALENT (${cs.models?.length || 0} models)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>Model Name</th>
            <th style="width: 100px;">Agency</th>
            <th style="width: 80px;">Arrival Type</th>
            <th style="width: 65px;">Arrival</th>
            <th style="width: 65px;">H&MU Start</th>
            <th style="width: 65px;">Camera Ready</th>
            <th style="width: 80px;">H&MU Artist</th>
          </tr>
        </thead>
        <tbody>
          ${modelsHtml || '<tr><td colspan="8" style="text-align: center; color: #999;">No models added</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- WARDROBE -->
    <div class="data-section">
      <div class="section-title">WARDROBE TRACKING (${cs.wardrobe?.length || 0} items)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="width: 60px;">Size</th>
            <th style="width: 80px;">Color</th>
            <th style="width: 100px;">For Model</th>
            <th style="width: 80px;">For Shot</th>
            <th style="width: 80px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${wardrobeHtml || '<tr><td colspan="6" style="text-align: center; color: #999;">No wardrobe items added</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- H&MU SCHEDULE -->
    <div class="data-section">
      <div class="section-title">H&MU SCHEDULE (${cs.hmuSchedule?.length || 0} artists)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Artist Name</th>
            <th style="width: 80px;">Role</th>
            <th style="width: 50px;">Station</th>
            <th style="width: 65px;">Call Time</th>
            <th style="width: 65px;">Available From</th>
            <th style="width: 65px;">Available Until</th>
            <th>Assigned Models</th>
          </tr>
        </thead>
        <tbody>
          ${hmuHtml || '<tr><td colspan="7" style="text-align: center; color: #999;">No H&MU artists added</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- NOTES -->
    ${
      cs.productionNotes || cs.generalNotes
        ? `
    <div class="notes-section">
      <div class="section-title">NOTES</div>
      <div class="notes-content">${cs.productionNotes || cs.generalNotes || ""}</div>
    </div>
    `
        : ""
    }

    <!-- FOOTER -->
    <div class="footer-section">
      Generated: ${new Date().toLocaleString()} | ${cs.productionName || "Photo Call Sheet"} | Day ${cs.dayNumber || 1}
    </div>
  </div>
</body>
</html>`;
}
