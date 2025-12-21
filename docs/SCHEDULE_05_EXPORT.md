# Shooting Schedule & Call Sheet - PDF Export

## Task: Add PDF export for both Schedule and Call Sheet

---

## Part 1: Schedule PDF Export

### File: `backend/src/modules/schedules/schedules.controller.ts`

Add endpoint:
```typescript
import { Response } from 'express';
import { Res, Get } from '@nestjs/common';

@Get(':id/export/pdf')
async exportPdf(@Param('id') id: string, @Res() res: Response) {
  const pdf = await this.service.generatePdf(id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="schedule-${id}.pdf"`,
  });
  res.send(pdf);
}
```

### File: `backend/src/modules/schedules/schedules.service.ts`

Add method:
```typescript
import * as puppeteer from 'puppeteer';

async generatePdf(id: string): Promise<Buffer> {
  const schedule = await this.findOne(id);
  const html = this.generateScheduleHtml(schedule);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  });

  await browser.close();
  return Buffer.from(pdf);
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
```

---

## Part 2: Call Sheet PDF Export

### File: `backend/src/modules/call-sheets/call-sheets.controller.ts`

Add endpoint:
```typescript
import { Response } from 'express';
import { Res, Get } from '@nestjs/common';

@Get(':id/export/pdf')
async exportPdf(@Param('id') id: string, @Res() res: Response) {
  const pdf = await this.service.generatePdf(id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="call-sheet-${id}.pdf"`,
  });
  res.send(pdf);
}
```

### File: `backend/src/modules/call-sheets/call-sheets.service.ts`

Add method:
```typescript
import * as puppeteer from 'puppeteer';

async generatePdf(id: string): Promise<Buffer> {
  const callSheet = await this.findOne(id);
  const html = this.generateCallSheetHtml(callSheet);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'LETTER',
    printBackground: true,
    margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
  });

  await browser.close();
  return Buffer.from(pdf);
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
```

---

## Frontend: Export Buttons

### Schedule Export Button

Add to `ShootingSchedulePage.tsx`:
```typescript
const handleExportPdf = async () => {
  try {
    message.loading('Generating PDF...', 0);
    const response = await apiClient.get(`/schedules/${id}/export/pdf`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${schedule.name.replace(/\s+/g, '_')}_schedule.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    message.destroy();
    message.success('PDF exported successfully');
  } catch (error) {
    message.destroy();
    message.error('Failed to export PDF');
  }
};

// In JSX:
<Button icon={<FilePdfOutlined />} type="primary" onClick={handleExportPdf}>
  Export PDF
</Button>
```

### Call Sheet Export Button

Add to `CallSheetEditorPage.tsx`:
```typescript
const handleExportPdf = async () => {
  try {
    message.loading('Generating PDF...', 0);
    const response = await apiClient.get(`/call-sheets/${id}/export/pdf`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `call_sheet_${callSheet.callSheetNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    message.destroy();
    message.success('PDF exported successfully');
  } catch (error) {
    message.destroy();
    message.error('Failed to export PDF');
  }
};
```

---

## Verification

### Schedule PDF:
1. Open a shooting schedule with multiple days
2. Click "Export PDF"
3. Verify PDF shows all days with strips
4. Check colors match INT/EXT, DAY/NIGHT

### Call Sheet PDF:
1. Open a call sheet with cast and crew
2. Click "Export PDF"
3. Verify professional layout with:
   - Header with production info
   - Times bar
   - Location and weather cards
   - Scene schedule table
   - Cast table with call times
   - Crew grouped by department
   - Notes section
