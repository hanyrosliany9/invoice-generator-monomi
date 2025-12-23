/**
 * Call Sheet PDF Template - Industry Standard
 * Enhanced with time-based operational sections, meal management, company moves,
 * special requirements, and background/extras tracking
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

  // Enhanced Cast with all timing columns
  const castRowsHtml = cs.castCalls.map((cast: any) => `
    <tr>
      <td>${cast.castNumber || ''}</td>
      <td>${cast.actorName}</td>
      <td>${cast.character || ''}</td>
      <td>${cast.workStatus || 'W'}</td>
      <td>${cast.pickupTime || '-'}</td>
      <td>${cast.muCallTime || '-'}</td>
      <td><strong>${cast.callTime}</strong></td>
      <td>${cast.onSetTime || '-'}</td>
      <td>${cast.wrapTime || '-'}</td>
      <td>${cast.muDuration ? cast.muDuration + ' min' : '-'}</td>
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

  // === NEW: Build Day Schedule Timeline ===
  const timelineEvents: any[] = [];
  if (cs.crewCallTime) timelineEvents.push({ time: cs.crewCallTime, label: 'GENERAL CREW CALL', type: 'crew' });
  if (cs.firstShotTime) timelineEvents.push({ time: cs.firstShotTime, label: 'FIRST SHOT', type: 'shot' });
  if (cs.mealBreaks) {
    cs.mealBreaks.forEach((meal: any) => {
      timelineEvents.push({ time: meal.time, label: `${meal.mealType} (${meal.duration} min)${meal.location ? ' @ ' + meal.location : ''}`, type: 'meal' });
    });
  }
  if (cs.companyMoves) {
    cs.companyMoves.forEach((move: any) => {
      timelineEvents.push({ time: move.departTime, label: `Company Move → ${move.toLocation}${move.travelTime ? ' (' + move.travelTime + ' min)' : ''}`, type: 'move' });
    });
  }
  if (cs.estimatedWrap) timelineEvents.push({ time: cs.estimatedWrap, label: 'ESTIMATED WRAP', type: 'wrap' });

  // Sort by time
  timelineEvents.sort((a, b) => a.time.localeCompare(b.time));

  const timelineHtml = timelineEvents.map(event => `
    <tr>
      <td style="font-weight: bold; width: 80px;">${event.time}</td>
      <td>${event.label}</td>
    </tr>
  `).join('');

  // === NEW: Meal Breaks ===
  const mealsHtml = cs.mealBreaks?.length > 0 ? cs.mealBreaks.map((meal: any) => `
    <tr>
      <td>${meal.mealType}</td>
      <td>${meal.time}</td>
      <td>${meal.duration} min</td>
      <td>${meal.location || ''}</td>
      <td>${meal.notes || ''}</td>
    </tr>
  `).join('') : '';

  // === NEW: Company Moves ===
  const movesHtml = cs.companyMoves?.length > 0 ? cs.companyMoves.map((move: any) => `
    <tr>
      <td>${move.departTime}</td>
      <td>${move.fromLocation}</td>
      <td>${move.toLocation}</td>
      <td>${move.travelTime ? move.travelTime + ' min' : ''}</td>
      <td>${move.notes || ''}</td>
    </tr>
  `).join('') : '';

  // === NEW: Special Requirements ===
  const reqTypeLabels: any = {
    STUNTS: 'Stunts', MINORS: 'Minors', ANIMALS: 'Animals', VEHICLES: 'Vehicles',
    SFX_PYRO: 'SFX/Pyro', WATER_WORK: 'Water Work', AERIAL_DRONE: 'Aerial/Drone',
    WEAPONS: 'Weapons', NUDITY: 'Nudity', OTHER: 'Other'
  };
  const specialReqsHtml = cs.specialRequirements?.length > 0 ? cs.specialRequirements.map((req: any) => `
    <tr>
      <td>${reqTypeLabels[req.reqType] || req.reqType}</td>
      <td>${req.description}</td>
      <td>${req.contactName || ''}</td>
      <td>${req.contactPhone || ''}</td>
      <td>${req.scenes || ''}</td>
    </tr>
  `).join('') : '';

  // === NEW: Background/Extras ===
  const backgroundHtml = cs.backgroundCalls?.length > 0 ? cs.backgroundCalls.map((bg: any) => `
    <tr>
      <td>${bg.description}</td>
      <td>${bg.quantity}</td>
      <td>${bg.callTime}</td>
      <td>${bg.reportLocation || ''}</td>
      <td>${bg.wardrobeNotes || ''}</td>
    </tr>
  `).join('') : '';

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

  <!-- === KEY TIMES BAR (Enhanced) === -->
  <div class="times-bar" style="background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%); color: #fff;">
    <div class="time-item"><label style="color: #aaa;">Crew Call</label><span style="color: #faad14; font-size: 18px;">${cs.crewCallTime || cs.generalCallTime || '-'}</span></div>
    <div class="time-item"><label style="color: #aaa;">First Shot</label><span style="color: #faad14; font-size: 18px;">${cs.firstShotTime || '-'}</span></div>
    <div class="time-item"><label style="color: #aaa;">Lunch</label><span style="color: #faad14; font-size: 18px;">${cs.lunchTime || '-'}</span></div>
    <div class="time-item"><label style="color: #aaa;">Est. Wrap</label><span style="color: #faad14; font-size: 18px;">${cs.estimatedWrap || cs.wrapTime || '-'}</span></div>
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

  <!-- === DAY SCHEDULE TIMELINE === -->
  ${timelineHtml ? `
  <div class="section">
    <div class="section-title">DAY SCHEDULE TIMELINE</div>
    <table>
      <tbody>${timelineHtml}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- === ENHANCED CAST WITH FULL TIMING === -->
  ${cs.castCalls.length > 0 ? `
  <div class="section">
    <div class="section-title">CAST (Enhanced Timing)</div>
    <table style="font-size: 10px;">
      <thead>
        <tr><th>#</th><th>Actor</th><th>Char</th><th>Status</th><th>Pickup</th><th>H/MU</th><th>Call</th><th>On Set</th><th>Wrap</th><th>MU Time</th></tr>
      </thead>
      <tbody>${castRowsHtml}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- === BACKGROUND / EXTRAS === -->
  ${backgroundHtml ? `
  <div class="section">
    <div class="section-title">BACKGROUND / EXTRAS</div>
    <table style="font-size: 10px;">
      <thead>
        <tr><th>Description</th><th>Qty</th><th>Call Time</th><th>Report To</th><th>Wardrobe</th></tr>
      </thead>
      <tbody>${backgroundHtml}</tbody>
    </table>
  </div>
  ` : ''}

  ${cs.crewCalls.length > 0 ? `
  <div class="section">
    <div class="section-title">CREW BY DEPARTMENT</div>
    ${crewHtml}
  </div>
  ` : ''}

  <!-- === MEAL BREAKS === -->
  ${mealsHtml ? `
  <div class="section">
    <div class="section-title">MEAL BREAKS</div>
    <table style="font-size: 10px;">
      <thead>
        <tr><th>Type</th><th>Time</th><th>Duration</th><th>Location</th><th>Notes</th></tr>
      </thead>
      <tbody>${mealsHtml}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- === COMPANY MOVES === -->
  ${movesHtml ? `
  <div class="section">
    <div class="section-title">COMPANY MOVES</div>
    <table style="font-size: 10px;">
      <thead>
        <tr><th>Depart</th><th>From</th><th>To</th><th>Travel Time</th><th>Notes</th></tr>
      </thead>
      <tbody>${movesHtml}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- === SPECIAL REQUIREMENTS === -->
  ${specialReqsHtml ? `
  <div class="section">
    <div class="section-title">SPECIAL REQUIREMENTS</div>
    <table style="font-size: 10px;">
      <thead>
        <tr><th>Type</th><th>Description</th><th>Contact</th><th>Phone</th><th>Scenes</th></tr>
      </thead>
      <tbody>${specialReqsHtml}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- === PRODUCTION NOTES === -->
  ${cs.generalNotes || cs.productionNotes || cs.safetyNotes || cs.announcements ? `
  <div class="section">
    <div class="section-title">PRODUCTION NOTES</div>
    ${cs.generalNotes ? `<div style="padding: 8px; background: #fffbeb; border-left: 3px solid #f59e0b; margin-bottom: 8px;"><strong>General Notes:</strong> ${cs.generalNotes}</div>` : ''}
    ${cs.safetyNotes ? `<div style="padding: 8px; background: #fee2e2; border-left: 3px solid #ef4444; margin-bottom: 8px;"><strong>Safety Notes:</strong> ${cs.safetyNotes}</div>` : ''}
    ${cs.productionNotes ? `<div style="padding: 8px; background: #dbeafe; border-left: 3px solid #3b82f6; margin-bottom: 8px;"><strong>Production Notes:</strong> ${cs.productionNotes}</div>` : ''}
    ${cs.announcements ? `<div style="padding: 8px; background: #d1fae5; border-left: 3px solid #10b981; margin-bottom: 8px;"><strong>Announcements:</strong> ${cs.announcements}</div>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    Generated on ${new Date().toLocaleString()} | Please contact production with any questions.
  </div>
</body>
</html>`;
}
