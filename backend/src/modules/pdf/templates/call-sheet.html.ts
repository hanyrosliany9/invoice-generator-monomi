/**
 * Professional Call Sheet PDF Template
 * Industry-standard format with minimalist design
 * Heavy use of borders and grid-based layout
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

// Activity type colors matching frontend ActivitiesSection.tsx
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

/**
 * Generates page-break property only for print mode
 * In continuous/digital view mode, returns empty string to allow infinite scroll
 */
function getPageBreakStyle(continuous: boolean): string {
  return continuous ? "" : "page-break-inside: avoid;";
}

export function generateCallSheetHTML(
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

  // Build crew by department
  const crewByDept = cs.crewCalls?.reduce((acc: any, crew: any) => {
    if (!acc[crew.department]) acc[crew.department] = [];
    acc[crew.department].push(crew);
    return acc;
  }, {});

  // Build scenes list
  const castRowsHtml =
    cs.castCalls
      ?.map(
        (cast: any) => `
    <tr>
      <td>${cast.castNumber || ""}</td>
      <td>${cast.character || ""}</td>
      <td>${cast.actorName}</td>
      <td style="text-align: center;">${cast.workStatus || "W"}</td>
      <td style="text-align: center;">${cast.pickupTime || "-"}</td>
      <td style="text-align: center;">${cast.onSetTime || "-"}</td>
      <td style="text-align: center;">${cast.muCallTime || "-"}</td>
      <td>${cast.notes || ""}</td>
    </tr>
  `,
      )
      .join("") || "";

  // Build crew by department HTML
  const crewHtml = crewByDept
    ? Object.entries(crewByDept)
        .map(([dept, crew]: [string, any]) => {
          const crewRows = (crew as any[])
            .map(
              (c: any) => `
      <tr>
        <td><strong>${c.position}</strong></td>
        <td>${c.name}</td>
        <td>${c.callTime}</td>
        <td>${c.phone || ""}</td>
      </tr>
    `,
            )
            .join("");

          return `
      <tr>
        <td colspan="4" style="background: ${THEME_COLORS.mediumBg}; font-weight: bold; padding: 4px 8px;"><strong>${dept}</strong></td>
      </tr>
      ${crewRows}
    `;
        })
        .join("")
    : "";

  // Build CSS rules dynamically based on continuous mode
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

    /* Professional borders and boxes */
    .page-container {
      width: 100%;
    }

    /* HEADER SECTION */
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
      width: 60px;
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

    /* LOGISTICS ROW */
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

    /* SAFETY NOTES */
    .safety-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      padding: 8px;
      font-size: 10px;
      ${getPageBreakStyle(continuous)}
    }

    .safety-title {
      font-weight: bold;
      margin-bottom: 4px;
    }

    /* SCENES TABLE */
    .scenes-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .section-title {
      background: #000;
      color: white;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
    }

    .scenes-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }

    .scenes-table th {
      background: #000;
      color: white;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 9px;
    }

    .scenes-table td {
      padding: 6px 4px;
      border: 1px solid #000;
    }

    .scenes-table tbody tr:nth-child(even) {
      background: ${THEME_COLORS.lightBg};
    }

    /* ACTIVITIES TABLE (Run of Show) */
    .activities-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .activities-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }

    .activities-table th {
      background: #000;
      color: white;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 9px;
    }

    .activities-table td {
      padding: 6px 4px;
      border: 1px solid #000;
    }

    .activities-table tbody tr:nth-child(even) {
      background: ${THEME_COLORS.lightBg};
    }

    .activity-type-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .activity-highlighted {
      background: rgba(255, 193, 7, 0.15) !important;
    }

    /* CAST TABLE */
    .cast-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .cast-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }

    .cast-table th {
      background: #000;
      color: white;
      padding: 6px 4px;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 9px;
    }

    .cast-table td {
      padding: 6px 4px;
      border: 1px solid #000;
      text-align: left;
    }

    .cast-table tbody tr:nth-child(even) {
      background: ${THEME_COLORS.lightBg};
    }

    /* CREW DEPARTMENTS TABLE */
    .crew-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .crew-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }

    .crew-table th {
      background: #000;
      color: white;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 9px;
    }

    .crew-table td {
      padding: 6px 4px;
      border: 1px solid #000;
    }

    .crew-table tbody tr:nth-child(even) {
      background: ${THEME_COLORS.lightBg};
    }

    .dept-row {
      background: ${THEME_COLORS.mediumBg};
      font-weight: bold;
    }

    /* NOTES SECTIONS */
    .notes-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .notes-content {
      padding: 8px;
      min-height: 60px;
      font-size: 10px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* FOOTER INFO */
    .footer-section {
      width: 100%;
      border: 2px solid #000;
      margin-bottom: 8px;
      ${getPageBreakStyle(continuous)}
    }

    .footer-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0;
    }

    .footer-box {
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 8px;
      min-height: 50px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .footer-box:nth-child(6n) {
      border-right: none;
    }

    .footer-box:nth-last-child(-n+6) {
      border-bottom: none;
    }

    .footer-label {
      font-weight: bold;
      font-size: 9px;
      margin-bottom: 4px;
    }

    .footer-value {
      font-size: 10px;
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
            <div><span class="production-info-label">Company:</span> ${cs.companyName || "Production"}</div>
            <div><span class="production-info-label">Producer:</span> ${cs.producer || ""}</div>
            <div><span class="production-info-label">Director:</span> ${cs.director || ""}</div>
            <div><span class="production-info-label">1st AD:</span> ${cs.firstAd || ""}</div>
          </div>
        </div>

        <!-- Center: Title -->
        <div class="header-center">
          <div class="call-sheet-title">${cs.productionName || "CALL SHEET"}</div>
          <div class="shoot-info">
            <div class="shoot-info-line"><strong>${shootDate}</strong></div>
            ${cs.dayNumber ? `<div class="shoot-info-line">DAY ${cs.dayNumber}${cs.totalDays ? " of " + cs.totalDays : ""}</div>` : ""}
            <div class="shoot-info-line"><strong>GENERAL CREW CALL</strong></div>
            <div style="font-size: 24px; font-weight: bold; color: ${THEME_COLORS.warning};">${cs.crewCallTime || cs.generalCallTime || "—"}</div>
          </div>
        </div>

        <!-- Right: Key Times -->
        <div class="header-right">
          <table class="key-times-table">
            <tr>
              <td class="key-times-label">Shooting Call:</td>
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
              <td class="key-times-label">Sunrise:</td>
              <td class="key-times-value">${cs.sunrise || "—"}</td>
            </tr>
            <tr>
              <td class="key-times-label">Sunset:</td>
              <td class="key-times-value">${cs.sunset || "—"}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- LOGISTICS SECTION -->
    <div class="logistics-section">
      <div class="logistics-grid">
        <div class="logistics-box">
          <div class="logistics-label">BASECAMP</div>
          <div class="logistics-value">${cs.basecamp || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">CREW PARKING</div>
          <div class="logistics-value">${cs.crewParking || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">BATHROOMS</div>
          <div class="logistics-value">${cs.bathrooms || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">LOCATION(S)</div>
          <div class="logistics-value">${cs.locationName || cs.locationAddress || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">LUNCH LOCATION</div>
          <div class="logistics-value">${cs.lunchLocation || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">WORKING TRUCKS</div>
          <div class="logistics-value">${cs.workingTrucks || ""}</div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">NEAREST HOSPITAL</div>
          <div class="logistics-value">${cs.nearestHospital || ""}<br/><small>${cs.hospitalAddress || ""}</small></div>
        </div>
        <div class="logistics-box">
          <div class="logistics-label">WEATHER</div>
          <div class="logistics-value">H: ${cs.weatherHigh || "—"}° / L: ${cs.weatherLow || "—"}°<br/>${cs.weatherCondition || ""}</div>
        </div>
      </div>
    </div>

    <!-- SAFETY NOTES -->
    ${
      cs.safetyNotes
        ? `
    <div class="safety-section">
      <div class="safety-title">⚠️ SAFETY NOTES</div>
      <div>${cs.safetyNotes}</div>
    </div>
    `
        : ""
    }

    <!-- ACTIVITIES / RUN OF SHOW -->
    ${
      cs.activities && cs.activities.length > 0
        ? `
    <div class="activities-section">
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
              // Sort by startTime, then by order
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

    <!-- SCENES TABLE -->
    ${
      cs.scenes && cs.scenes.length > 0
        ? `
    <div class="scenes-section">
      <div class="section-title">SCENE SCHEDULE</div>
      <table class="scenes-table">
        <thead>
          <tr>
            <th>SC#</th>
            <th>INT/EXT</th>
            <th>D/N</th>
            <th>DESCRIPTION</th>
            <th>CAST</th>
            <th>PAGES</th>
            <th>LOCATION</th>
          </tr>
        </thead>
        <tbody>
          ${cs.scenes
            .map(
              (scene: any) => `
            <tr>
              <td><strong>${scene.sceneNumber}</strong></td>
              <td>${scene.intExt || ""}</td>
              <td>${scene.dayNight || ""}</td>
              <td>${scene.sceneName || scene.description || ""}</td>
              <td>${scene.castIds || ""}</td>
              <td style="text-align: center;">${scene.pageCount?.toFixed(1) || ""}</td>
              <td>${scene.location || ""}</td>
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

    <!-- CAST TABLE -->
    ${
      cs.castCalls && cs.castCalls.length > 0
        ? `
    <div class="cast-section">
      <div class="section-title">CAST</div>
      <table class="cast-table">
        <thead>
          <tr>
            <th>#</th>
            <th>CHARACTER</th>
            <th>ACTOR</th>
            <th>STATUS</th>
            <th>PICKUP</th>
            <th>ON SET</th>
            <th>HAIR/MU</th>
            <th>NOTES</th>
          </tr>
        </thead>
        <tbody>
          ${castRowsHtml}
        </tbody>
      </table>
    </div>
    `
        : ""
    }

    <!-- CREW BY DEPARTMENT -->
    ${
      crewByDept && Object.keys(crewByDept).length > 0
        ? `
    <div class="crew-section">
      <div class="section-title">CREW</div>
      <table class="crew-table">
        <thead>
          <tr>
            <th>POSITION</th>
            <th>NAME</th>
            <th>CALL TIME</th>
            <th>PHONE</th>
          </tr>
        </thead>
        <tbody>
          ${crewHtml}
        </tbody>
      </table>
    </div>
    `
        : ""
    }

    <!-- NOTES -->
    ${
      cs.generalNotes
        ? `
    <div class="notes-section">
      <div class="section-title">GENERAL NOTES</div>
      <div class="notes-content">${cs.generalNotes}</div>
    </div>
    `
        : ""
    }

    ${
      cs.productionNotes
        ? `
    <div class="notes-section">
      <div class="section-title">PRODUCTION NOTES</div>
      <div class="notes-content">${cs.productionNotes}</div>
    </div>
    `
        : ""
    }

    <!-- FOOTER INFO -->
    <div class="footer-section">
      <div class="footer-grid">
        <div class="footer-box">
          <div class="footer-label">UPM</div>
          <div class="footer-value">${cs.upm || ""}</div>
        </div>
        <div class="footer-box">
          <div class="footer-label">1st AD</div>
          <div class="footer-value">${cs.firstAd || ""}</div>
        </div>
        <div class="footer-box">
          <div class="footer-label">2nd AD</div>
          <div class="footer-value">${cs.secondAd || ""}<br/><small>${cs.secondAdPhone || ""}</small></div>
        </div>
        <div class="footer-box">
          <div class="footer-label">SET MEDIC</div>
          <div class="footer-value">${cs.setMedic || ""}<br/><small>${cs.setMedicPhone || ""}</small></div>
        </div>
        <div class="footer-box">
          <div class="footer-label">LOCATION MANAGER</div>
          <div class="footer-value"></div>
        </div>
        <div class="footer-box">
          <div class="footer-label">PRODUCTION OFFICE</div>
          <div class="footer-value">${cs.productionOfficePhone || ""}</div>
        </div>
      </div>
    </div>

  </div>
</body>
</html>`;
}
