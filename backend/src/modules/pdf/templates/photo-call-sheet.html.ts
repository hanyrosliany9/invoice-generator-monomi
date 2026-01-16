/**
 * Professional Photo Call Sheet PDF Template
 * Optimized for photography/fashion shoots
 * Includes shot list, model roster, wardrobe, and HMU schedule
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
      <td>${item.brand || "-"}</td>
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

  // Build CSS
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

    .page {
      width: 100%;
      min-height: 100vh;
      padding: 0;
      margin: 0;
      break-after: page;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
    }

    .header-left h1 {
      font-size: 16px;
      font-weight: bold;
      margin: 0;
    }

    .header-right {
      text-align: right;
      font-size: 9px;
    }

    .section-title {
      background: ${THEME_COLORS.mediumBg};
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      margin-top: 12px;
      margin-bottom: 4px;
      border: 1px solid #ccc;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1px;
      margin-bottom: 12px;
      background: #ccc;
    }

    .info-cell {
      background: #fff;
      padding: 6px;
      font-size: 9px;
    }

    .info-cell-label {
      font-weight: bold;
      font-size: 8px;
      text-transform: uppercase;
      color: ${THEME_COLORS.textSecondary};
      margin-bottom: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9px;
    }

    th {
      background: ${THEME_COLORS.mediumBg};
      padding: 4px 6px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #999;
    }

    td {
      padding: 3px 6px;
      border: 1px solid #ddd;
    }

    tr:nth-child(even) {
      background: #f9f9f9;
    }

    .footer {
      font-size: 8px;
      color: ${THEME_COLORS.textSecondary};
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>

<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>${cs.productionName || "PHOTO CALL SHEET"}</h1>
    </div>
    <div class="header-right">
      <div><strong>${shootDate}</strong></div>
      <div>Call Sheet #${cs.callSheetNumber || 1}</div>
    </div>
  </div>

  <!-- Production Info -->
  <div class="section-title">Production Info</div>
  <div class="info-grid">
    <div class="info-cell">
      <div class="info-cell-label">Photographer</div>
      <div>${cs.photographer || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Art Director</div>
      <div>${cs.artDirector || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Stylist</div>
      <div>${cs.stylist || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">H&MU Lead</div>
      <div>${cs.hmuLead || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Client</div>
      <div>${cs.clientName || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Contact</div>
      <div>${cs.clientContact || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Agency</div>
      <div>${cs.agencyName || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Session Type</div>
      <div>${cs.sessionType || "-"}</div>
    </div>
  </div>

  <!-- Call Times -->
  <div class="section-title">Call Times & Logistics</div>
  <div class="info-grid">
    <div class="info-cell">
      <div class="info-cell-label">Crew Call</div>
      <div>${cs.crewCallTime || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">First Shot</div>
      <div>${cs.firstShotTime || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Lunch</div>
      <div>${cs.lunchTime || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Est. Wrap</div>
      <div>${cs.estimatedWrap || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Location</div>
      <div>${cs.locationName || "-"}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Total Looks</div>
      <div>${cs.totalLooks || "-"}</div>
    </div>
  </div>

  <!-- Shot List -->
  <div class="section-title">Shot List / Looks (${cs.shots?.length || 0} shots)</div>
  <table>
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

  <!-- Models / Talent -->
  <div class="section-title">Models / Talent (${cs.models?.length || 0} models)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Model Name</th>
        <th style="width: 120px;">Agency</th>
        <th style="width: 80px;">Arrival Type</th>
        <th style="width: 70px;">Arrival Time</th>
        <th style="width: 70px;">H&MU Start</th>
        <th style="width: 70px;">Camera Ready</th>
        <th style="width: 80px;">H&MU Artist</th>
      </tr>
    </thead>
    <tbody>
      ${modelsHtml || '<tr><td colspan="8" style="text-align: center; color: #999;">No models added</td></tr>'}
    </tbody>
  </table>

  <!-- Wardrobe -->
  <div class="section-title">Wardrobe Tracking (${cs.wardrobe?.length || 0} items)</div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="width: 80px;">Brand</th>
        <th style="width: 60px;">Size</th>
        <th style="width: 70px;">Color</th>
        <th style="width: 80px;">For Model</th>
        <th style="width: 70px;">For Shot</th>
        <th style="width: 70px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${wardrobeHtml || '<tr><td colspan="7" style="text-align: center; color: #999;">No wardrobe items added</td></tr>'}
    </tbody>
  </table>

  <!-- H&MU Schedule -->
  <div class="section-title">H&MU Schedule (${cs.hmuSchedule?.length || 0} artists)</div>
  <table>
    <thead>
      <tr>
        <th>Artist Name</th>
        <th style="width: 80px;">Role</th>
        <th style="width: 60px;">Station</th>
        <th style="width: 70px;">Call Time</th>
        <th style="width: 70px;">Available From</th>
        <th style="width: 70px;">Available Until</th>
        <th>Assigned Models</th>
      </tr>
    </thead>
    <tbody>
      ${hmuHtml || '<tr><td colspan="7" style="text-align: center; color: #999;">No H&MU artists added</td></tr>'}
    </tbody>
  </table>

  ${
    cs.productionNotes
      ? `
    <div class="section-title">Notes</div>
    <div style="background: #f9f9f9; border: 1px solid #ddd; padding: 8px; margin-bottom: 12px; font-size: 9px;">
      ${cs.productionNotes}
    </div>
  `
      : ""
  }

  <div class="footer">
    Generated: ${new Date().toLocaleString()} | Call Sheet #${cs.callSheetNumber || 1}
  </div>
</div>

</body>
</html>`;
}
