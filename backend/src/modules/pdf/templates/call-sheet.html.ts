/**
 * Call Sheet PDF Template
 * Production call sheet with cast, crew, and timing information
 */

export function generateCallSheetHTML(cs: any): string {
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
