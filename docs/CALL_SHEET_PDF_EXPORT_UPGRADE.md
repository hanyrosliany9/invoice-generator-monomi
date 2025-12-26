# Call Sheet PDF Export Upgrade Plan

**Goal:** Transform our PDF export to match professional industry-standard call sheet format as seen in the 5 sample images provided.

**Related Document:** `CALL_SHEET_SCHEDULE_INTEGRATION.md` (UI restructuring)

---

## Current PDF Template Analysis

**File:** `backend/src/modules/pdf/templates/call-sheet.html.ts`

### Current Sections (Lines 183-341)

| Line | Section | Industry Status | Action |
|------|---------|-----------------|--------|
| 184-195 | Header (Production Info) | OK | Keep, enhance |
| 197-203 | Key Times Bar (Gold styling) | Duplicate | Consolidate |
| 205-232 | Location & Weather (Two-column) | Partial | Restructure to logistics row |
| 234-244 | Scene Schedule table | Wrong format | Add inline meals/moves |
| 246-254 | Day Schedule Timeline | **NON-STANDARD** | **REMOVE** |
| 256-267 | Enhanced Cast | Missing columns | Add Pickup, MU/Hair, Fitting |
| 269-280 | Background/Extras | **SEPARATE** | Inline with scenes |
| 282-287 | Crew by Department | OK | Keep |
| 289-300 | Meal Breaks | **SEPARATE** | **REMOVE** (inline in schedule) |
| 302-313 | Company Moves | **SEPARATE** | **REMOVE** (inline in schedule) |
| 315-326 | Special Requirements | **SEPARATE** | Move to dept notes |
| 328-337 | Production Notes | OK | Keep |
| 339-341 | Footer | Minimal | Enhance with AD contacts |

---

## Professional Sample Analysis

### Sample 1: "FSU Production Management: The Movie"
**Source:** Professional film school template (2024)

**Key Features:**
- 3-column header layout (Production Info | Title + Crew Call | Date/Times/Weather)
- Logistics row with 6 columns (Crew Parking, Basecamp, Bathrooms, Lunch, Working Trucks, Hospital)
- Safety notes banner with red/yellow warning styling
- Scene schedule with inline company moves as colored banner rows
- Cast table with 9 columns (#, Cast, Role, Status, Report, Hair/MU, Fitting, On Set, Notes)
- Stand-ins section separate from cast
- Background section with Qty, Description, In, Ready, Scenes columns
- Special Instructions in two-column layout (Left: Art/Props/Equipment, Right: Camera/Grip/Stunts)
- Advance Schedule showing next 2 shoot days
- Footer with UPM, 1st AD, 2nd AD names and phone

### Sample 2: "We Still Say Grace"
**Source:** Indie film production

**Key Features:**
- Large centered title with script/schedule version below
- General Crew Call prominently displayed (24pt+)
- Set Medic name/phone under title
- Single row key times (Shoot Call, Lunch, Wrap)
- Compact weather box (right side)
- Scene schedule with cast ID numbers (not full names)

### Sample 3: "To Dream"
**Source:** Industry template (Excel-based)

**Key Features:**
- Traditional table-based layout
- Very dense information display
- Cast timing uses staggered columns

### Sample 4: "V for Vendetta"
**Source:** Major studio production

**Key Features:**
- Multi-page format with crew on separate page
- Dense scene information with page counts
- Studio logo placement

### Sample 5: "Set Hero Template"
**Source:** Modern production software export

**Key Features:**
- Clean modern styling
- Inline meals shown as green banner rows
- Company moves shown as blue banner rows
- Mobile-friendly single-column option

---

## Target PDF Layout (Industry Standard)

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                                  PAGE 1 (FRONT)                                   ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ PRODUCTION INFO (Left)       │    TITLE (Center)        │   DATE/TIMES (Right)   ║
║ • Company Name               │                          │ • Date: Mon, Oct 21    ║
║ • Address                    │   [PRODUCTION TITLE]     │ • DAY 1 of 15          ║
║ • Producer: Name             │                          │ ┌──────────────────┐   ║
║ • Director: Name             │   GENERAL CREW CALL      │ │ KEY TIMES        │   ║
║ • 1st AD: Name               │      7:00 AM             │ │ Shoot: 8:00 AM   │   ║
║ • UPM: Name                  │                          │ │ Lunch: 12:30 PM  │   ║
║                              │   Set Medic: Name        │ │ Wrap: 7:00 PM    │   ║
║                              │   Phone: xxx-xxxx        │ │ Sunrise: 5:45    │   ║
║                              │                          │ │ Sunset: 6:30     │   ║
║                              │   Script: WHITE v1       │ └──────────────────┘   ║
║                              │   Schedule: BLUE         │ ┌──────────────────┐   ║
║                              │                          │ │ WEATHER          │   ║
║                              │                          │ │ Hi: 87° Lo: 55°  │   ║
║                              │                          │ │ Partly Cloudy    │   ║
║                              │                          │ └──────────────────┘   ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                  LOGISTICS ROW                                     ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ CREW PARKING    │ BASECAMP     │ BATHROOMS  │ LUNCH      │ TRUCKS     │ HOSPITAL  ║
║ 1808 Miller Rd  │ Zeke's House │ On Site    │ Craft Svcs │ Back Lot   │ Memorial  ║
║ Lot A           │ 1879 Miller  │            │            │            │ Hospital  ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║             ⚠️ SAFETY NOTES: NO FORCED CALLS • SAFETY VESTS REQUIRED ⚠️           ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                               SHOOTING SCHEDULE                                    ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ SCENE │ SET / DESCRIPTION                          │ CAST    │ D/N │ PGS │ LOC   ║
╠───────┼────────────────────────────────────────────┼─────────┼─────┼─────┼───────╣
║   1   │ INT. SHOOTING RANGE - DAY                  │   2     │ D1  │ 3/8 │Stage A║
║       │ A woman shoots at the range...             │         │     │     │       ║
╠───────┼────────────────────────────────────────────┼─────────┼─────┼─────┼───────╣
║   2   │ EXT. OFFICE BUILDING - DAY                 │ 2,100   │ D2  │ 1/8 │       ║
╠═══════╧════════════════════════════════════════════╧═════════╧═════╧═════╧═══════╣
║                     🍽️ LUNCH 12:30 PM - 1:00 PM (30 MIN)                          ║
╠═══════╤════════════════════════════════════════════╤═════════╤═════╤═════╤═══════╣
║   3   │ INT. COFFEE SHOP - DAY                     │ 1,2,3   │ D1  │ 2/8 │       ║
╠═══════╧════════════════════════════════════════════╧═════════╧═════╧═════╧═══════╣
║                     🚗 COMPANY MOVE → Shell Station (45 min)                      ║
╠═══════╤════════════════════════════════════════════╤═════════╤═════╤═════╤═══════╣
║   4   │ EXT. GAS STATION - NIGHT                   │ 1,4     │ N1  │ 1/8 │Shell  ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                              TOTAL PAGES: 6 6/8   ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                   CAST TABLE                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ # │ CAST MEMBER     │ CHARACTER  │STATUS│PICKUP│HAIR/MU│FITTING│ON SET│ NOTES    ║
╠───┼─────────────────┼────────────┼──────┼──────┼───────┼───────┼──────┼──────────╣
║ 1 │ John Smith      │ DETECTIVE  │  W   │ 6:00 │ 6:30  │ 6:45  │ 7:30 │          ║
║ 2 │ Jane Doe        │ LAWYER     │  SW  │ 6:00 │ 6:30  │ 6:45  │ 7:30 │          ║
║ 3 │ Bob Johnson     │ WITNESS    │  WF  │ 8:00 │ 8:30  │  -    │ 9:00 │ Last day ║
║100│ Stunt Coord     │ STUNT DBL  │  W   │ 6:30 │  -    │  -    │11:00 │ Sc 4     ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                              STAND-INS / PHOTO DOUBLES                             ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ NAME              │ FOR         │ CALL │ NOTES                                    ║
╠───────────────────┼─────────────┼──────┼──────────────────────────────────────────╣
║ Alex Brown        │ John Smith  │ 6:30 │ Report to crew parking                   ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                              BACKGROUND / ATMOSPHERE                               ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ QTY │ DESCRIPTION              │ CALL  │ READY │ SCENES │ WARDROBE               ║
╠─────┼──────────────────────────┼───────┼───────┼────────┼────────────────────────╣
║  12 │ Office Workers           │ 9:00  │ 10:00 │  2,3   │ Business casual        ║
║   5 │ Coffee Shop Patrons      │ 11:00 │ 12:00 │   3    │ Casual                 ║
╠═════╧══════════════════════════╧═══════╧═══════╧════════╧════════════════════════╣
║                                                      TOTAL BACKGROUND: 17         ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ SPECIAL INSTRUCTIONS              │ DEPARTMENT NOTES                              ║
╠═══════════════════════════════════╪═══════════════════════════════════════════════╣
║ ART DEPT/PROPS:                   │ CAMERA:                                       ║
║ • Sc 1: Target practice setup     │ • A & B cam for Sc 4                          ║
║ • Sc 3: Coffee cups, laptop       │                                               ║
║                                   │ GRIP:                                         ║
║ VEHICLES:                         │ • Car mounts for Sc 4                         ║
║ • Picture car (Scene 4)           │                                               ║
║                                   │ STUNTS:                                       ║
║ PRODUCTION:                       │ • Sc 4: Driving sequence                      ║
║ • Safety meeting 7:00 AM          │ • Pre-rig 2 hours before call                 ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                              *** ADVANCE SCHEDULE ***                              ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ SHOOT DAY #2                    Tuesday, October 22, 2024        Est. Call: 6:00  ║
╠───────┬────────────────────────────────────────────┬─────────┬─────┬─────────────╣
║ SCENE │ SETS                                       │ CAST    │ D/N │ LOCATION    ║
╠───────┼────────────────────────────────────────────┼─────────┼─────┼─────────────╣
║   5   │ EXT. COURTHOUSE - DAY                      │ 1,2,5   │  D  │ Downtown    ║
║   6   │ INT. HALLWAY - DAY                         │  1,2    │  D  │ Courthouse  ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ SHOOT DAY #3                  Wednesday, October 23, 2024        Est. Call: 7:00  ║
╠───────┼────────────────────────────────────────────┼─────────┼─────┼─────────────╣
║   7   │ INT. APARTMENT - NIGHT                     │ 1,3     │  N  │ Stage B     ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                     FOOTER                                         ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ UPM: Emma Francis        1st AD: Maya Brown        2nd AD: Hailey Odom            ║
║ Production Office: 555-0100                        2nd AD Cell: 555-0199          ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Current vs Target Comparison

### Section-by-Section Comparison

| # | Section | Current (WRONG) | Target (CORRECT) | Changes Required |
|---|---------|-----------------|------------------|------------------|
| 1 | **Header Layout** | 2-row (top + info row) | 3-column layout | Restructure to 3-column grid |
| 2 | **General Crew Call** | In gold times bar | Large, centered, prominent | Extract and make prominent (24pt+) |
| 3 | **Key Times** | Separate gold bar | Compact box in right column | Move to header right column |
| 4 | **Weather** | Full-width card | Compact box in right column | Move to header right column |
| 5 | **Set Medic** | Not present | Under title, center column | Add new field |
| 6 | **Script/Schedule Version** | Not present | Under title, center column | Add new field |
| 7 | **Logistics Row** | Partial (Location + Hospital only) | 6-column grid | Add Crew Parking, Basecamp, Bathrooms, Trucks |
| 8 | **Safety Banner** | Not present | Yellow/red banner | Add new section |
| 9 | **Scene Schedule** | Simple table | Table WITH inline meals/moves | Major restructure |
| 10 | **Day Schedule Timeline** | Present (line 246-254) | Not standard | **REMOVE** |
| 11 | **Meal Breaks Section** | Present (line 289-300) | Inline in schedule | **REMOVE** (convert to inline) |
| 12 | **Company Moves Section** | Present (line 302-313) | Inline in schedule | **REMOVE** (convert to inline) |
| 13 | **Cast Table** | 10 columns | 9 columns (different) | Restructure columns |
| 14 | **Stand-ins** | Not present | Separate section | Add new section |
| 15 | **Background** | Present (good format) | Present | Keep, minor style tweaks |
| 16 | **Special Requirements Section** | Present (line 315-326) | Two-column dept notes | Convert to dept notes format |
| 17 | **Advance Schedule** | Not present | Next 1-2 days | Add new section |
| 18 | **Footer** | Minimal | AD names, phones | Enhance significantly |

---

## Implementation Phases

### Phase 1: Header Restructuring (Priority: HIGH)

**Current Header (Lines 184-203):**
```html
<div class="header">
  <div class="header-top">
    <div class="production-name">TITLE</div>
    <div class="call-sheet-num">Call Sheet #X</div>
  </div>
  <div class="header-info">
    <div>Date</div><div>Day</div><div>Director</div><div>Producer</div>
  </div>
</div>
<div class="times-bar">Crew Call | First Shot | Lunch | Est. Wrap</div>
```

**Target Header (3-Column):**
```html
<div class="header-grid">
  <!-- Column 1: Production Info -->
  <div class="header-col production-info">
    <div class="company-name">Production Company</div>
    <div class="company-address">123 Film Ave, Hollywood</div>
    <div class="key-personnel">
      <div>Producer: Name</div>
      <div>Director: Name</div>
      <div>1st AD: Name</div>
      <div>UPM: Name</div>
    </div>
  </div>

  <!-- Column 2: Title & Crew Call -->
  <div class="header-col title-section">
    <div class="production-title">PRODUCTION TITLE</div>
    <div class="crew-call-large">
      <div class="label">GENERAL CREW CALL</div>
      <div class="time">7:00 AM</div>
    </div>
    <div class="set-medic">Set Medic: Name • 555-0123</div>
    <div class="version-info">
      <span>Script: WHITE v1</span>
      <span>Schedule: BLUE</span>
    </div>
  </div>

  <!-- Column 3: Date, Times, Weather -->
  <div class="header-col date-times">
    <div class="shoot-date">Monday, October 21, 2024</div>
    <div class="day-of-days">DAY 1 of 15</div>
    <div class="key-times-box">
      <div class="time-row"><span>Shoot Call:</span><span>8:00 AM</span></div>
      <div class="time-row"><span>Lunch:</span><span>12:30 PM</span></div>
      <div class="time-row"><span>Est. Wrap:</span><span>7:00 PM</span></div>
      <div class="time-row"><span>Sunrise:</span><span>5:45 AM</span></div>
      <div class="time-row"><span>Sunset:</span><span>6:30 PM</span></div>
    </div>
    <div class="weather-box">
      <div class="temp">Hi: 87° / Lo: 55°</div>
      <div class="condition">Partly Cloudy</div>
    </div>
  </div>
</div>
```

**CSS Changes:**
```css
.header-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 16px;
  background: #1f2937;
  color: white;
  padding: 16px;
  margin-bottom: 0; /* No gap before logistics */
}

.production-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 16px;
}

.crew-call-large {
  text-align: center;
  margin: 16px 0;
}

.crew-call-large .label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
}

.crew-call-large .time {
  font-size: 32px;
  font-weight: bold;
  color: #faad14; /* Gold */
}

.key-times-box {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
}

.weather-box {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  padding: 8px;
  text-align: center;
}
```

**New Data Fields Required:**
- `cs.companyName`
- `cs.companyAddress`
- `cs.upm` (Unit Production Manager)
- `cs.firstAd`
- `cs.setMedic`
- `cs.setMedicPhone`
- `cs.scriptVersion` (e.g., "WHITE", "BLUE", "PINK")
- `cs.scheduleVersion`
- `cs.dayNumber` (e.g., 1)
- `cs.totalDays` (e.g., 15)

---

### Phase 2: Logistics Row (Priority: HIGH)

**Current:** Only Location + Hospital in two-column cards (lines 205-232)

**Target:** 6-column logistics grid

```html
<!-- REMOVE two-col layout for location/weather -->
<!-- REPLACE WITH: -->

<div class="logistics-row">
  <div class="logistics-item">
    <div class="logistics-label">CREW PARKING</div>
    <div class="logistics-value">${cs.crewParking || '-'}</div>
  </div>
  <div class="logistics-item">
    <div class="logistics-label">BASECAMP</div>
    <div class="logistics-value">${cs.basecamp || '-'}</div>
  </div>
  <div class="logistics-item">
    <div class="logistics-label">BATHROOMS</div>
    <div class="logistics-value">${cs.bathrooms || '-'}</div>
  </div>
  <div class="logistics-item">
    <div class="logistics-label">LUNCH</div>
    <div class="logistics-value">${cs.lunchLocation || '-'}</div>
  </div>
  <div class="logistics-item">
    <div class="logistics-label">WORKING TRUCKS</div>
    <div class="logistics-value">${cs.workingTrucks || '-'}</div>
  </div>
  <div class="logistics-item">
    <div class="logistics-label">HOSPITAL</div>
    <div class="logistics-value">${cs.nearestHospital || '-'}</div>
    <div class="logistics-subtext">${cs.hospitalAddress || ''}</div>
  </div>
</div>
```

**CSS:**
```css
.logistics-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: #e5e7eb;
  border: 1px solid #e5e7eb;
  margin-bottom: 12px;
}

.logistics-item {
  background: white;
  padding: 8px;
  text-align: center;
}

.logistics-label {
  font-size: 9px;
  font-weight: bold;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 4px;
}

.logistics-value {
  font-size: 11px;
  font-weight: 500;
}

.logistics-subtext {
  font-size: 9px;
  color: #888;
  margin-top: 2px;
}
```

**New Data Fields Required:**
- `cs.crewParking`
- `cs.basecamp`
- `cs.bathrooms`
- `cs.lunchLocation`
- `cs.workingTrucks`

---

### Phase 3: Safety Banner (Priority: MEDIUM)

**Add after logistics row:**

```html
${cs.safetyNotes ? `
<div class="safety-banner">
  <span class="safety-icon">⚠️</span>
  <span class="safety-text">${cs.safetyNotes}</span>
  <span class="safety-icon">⚠️</span>
</div>
` : ''}
```

**CSS:**
```css
.safety-banner {
  background: linear-gradient(90deg, #fef3cd 0%, #fff3cd 50%, #fef3cd 100%);
  border: 2px solid #ffc107;
  border-radius: 4px;
  padding: 8px 16px;
  text-align: center;
  font-weight: bold;
  font-size: 11px;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.safety-icon {
  margin: 0 8px;
}
```

---

### Phase 4: Scene Schedule with Inline Meals/Moves (Priority: HIGH)

**Current (Lines 234-244):** Simple scene table

**Target:** Scene table with colored banner rows for meals/moves

**Data Transformation:**

The `cs.scenes` array should be transformed to include meal/move banners:

```typescript
// In generateCallSheetHTML, before rendering:
const scheduleItems: ScheduleItem[] = [];

// Build schedule with inline meals and moves
let lastSceneOrder = -1;
for (const scene of cs.scenes) {
  // Insert any meals scheduled before this scene
  const mealsBeforeScene = cs.mealBreaks?.filter(m =>
    getTimeOrder(m.time) > lastSceneOrder &&
    getTimeOrder(m.time) < scene.order
  );
  for (const meal of mealsBeforeScene || []) {
    scheduleItems.push({ type: 'meal', data: meal });
  }

  // Insert any moves scheduled before this scene
  const movesBeforeScene = cs.companyMoves?.filter(m =>
    getTimeOrder(m.departTime) > lastSceneOrder &&
    getTimeOrder(m.departTime) < scene.order
  );
  for (const move of movesBeforeScene || []) {
    scheduleItems.push({ type: 'move', data: move });
  }

  // Add the scene
  scheduleItems.push({ type: 'scene', data: scene });
  lastSceneOrder = scene.order;
}
```

**Rendering:**

```html
<div class="section">
  <div class="section-title">SHOOTING SCHEDULE</div>
  <table class="schedule-table">
    <thead>
      <tr>
        <th style="width: 60px;">Scene</th>
        <th>Set / Description</th>
        <th style="width: 80px;">Cast</th>
        <th style="width: 50px;">D/N</th>
        <th style="width: 50px;">Pgs</th>
        <th style="width: 80px;">Location</th>
      </tr>
    </thead>
    <tbody>
      ${scheduleItems.map(item => {
        if (item.type === 'scene') {
          const scene = item.data;
          return `
            <tr class="scene-row">
              <td class="scene-number">${scene.sceneNumber}</td>
              <td>
                <strong>${scene.intExt || ''} ${scene.sceneName || ''} - ${scene.dayNight || ''}</strong>
                ${scene.description ? `<br/><span class="scene-desc">${scene.description}</span>` : ''}
              </td>
              <td class="cast-ids">${scene.castIds || ''}</td>
              <td>${scene.dayNight || ''}</td>
              <td>${scene.pageCount?.toFixed(1) || ''}</td>
              <td>${scene.location || ''}</td>
            </tr>
          `;
        } else if (item.type === 'meal') {
          const meal = item.data;
          return `
            <tr class="meal-banner">
              <td colspan="6">
                🍽️ ${meal.mealType} ${meal.time} - ${meal.endTime || ''} (${meal.duration} MIN) @ ${meal.location || 'TBD'}
              </td>
            </tr>
          `;
        } else if (item.type === 'move') {
          const move = item.data;
          return `
            <tr class="move-banner">
              <td colspan="6">
                🚗 COMPANY MOVE: ${move.fromLocation} → ${move.toLocation} (${move.travelTime} min travel)
              </td>
            </tr>
          `;
        }
      }).join('')}
    </tbody>
  </table>
  <div class="total-pages">TOTAL PAGES: ${totalPages}</div>
</div>
```

**CSS:**
```css
.schedule-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}

.schedule-table th {
  background: #1f2937;
  color: white;
  padding: 8px;
  font-size: 10px;
  text-transform: uppercase;
  text-align: left;
}

.schedule-table td {
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: top;
}

.scene-number {
  font-weight: bold;
  font-size: 14px;
  text-align: center;
}

.scene-desc {
  font-size: 10px;
  color: #666;
  font-style: italic;
}

.cast-ids {
  font-weight: bold;
  text-align: center;
}

.meal-banner td {
  background: linear-gradient(90deg, #4CAF50 0%, #66BB6A 50%, #4CAF50 100%);
  color: white;
  font-weight: bold;
  text-align: center;
  padding: 10px;
  font-size: 12px;
}

.move-banner td {
  background: linear-gradient(90deg, #2196F3 0%, #42A5F5 50%, #2196F3 100%);
  color: white;
  font-weight: bold;
  text-align: center;
  padding: 10px;
  font-size: 12px;
}

.total-pages {
  text-align: right;
  font-weight: bold;
  font-size: 11px;
  padding: 8px;
  border-top: 2px solid #1f2937;
}
```

---

### Phase 5: Cast Table Enhancement (Priority: HIGH)

**Current Columns (Line 261-262):**
```
# | Actor | Char | Status | Pickup | H/MU | Call | On Set | Wrap | MU Time
```

**Target Columns (Industry Standard):**
```
# | CAST MEMBER | CHARACTER | STATUS | PICKUP | HAIR/MU | FITTING | ON SET | NOTES
```

**Changes:**
1. Remove "Call" column (redundant with On Set)
2. Remove "Wrap" column (not standard on front page)
3. Remove "MU Time" column (duration doesn't appear on call sheet)
4. Add "FITTING" column
5. Add "NOTES" column
6. Rename columns to CAPS for professional look

**Updated HTML:**
```html
<div class="section">
  <div class="section-title">CAST</div>
  <table class="cast-table">
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th style="width: 120px;">CAST MEMBER</th>
        <th style="width: 100px;">CHARACTER</th>
        <th style="width: 50px;">STATUS</th>
        <th style="width: 50px;">PICKUP</th>
        <th style="width: 60px;">HAIR/MU</th>
        <th style="width: 60px;">FITTING</th>
        <th style="width: 60px;">ON SET</th>
        <th>NOTES</th>
      </tr>
    </thead>
    <tbody>
      ${cs.castCalls.map(cast => `
        <tr>
          <td class="cast-number">${cast.castNumber || ''}</td>
          <td>${cast.actorName}</td>
          <td class="character-name">${cast.character || ''}</td>
          <td class="status-cell">
            <span class="status-badge status-${cast.workStatus?.toLowerCase() || 'w'}">
              ${cast.workStatus || 'W'}
            </span>
          </td>
          <td>${cast.pickupTime || '-'}</td>
          <td>${cast.muCallTime || '-'}</td>
          <td>${cast.fittingTime || '-'}</td>
          <td class="onset-time">${cast.onSetTime || '-'}</td>
          <td class="cast-notes">${cast.notes || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>
```

**CSS:**
```css
.cast-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

.cast-table th {
  background: #374151;
  color: white;
  padding: 6px 8px;
  text-align: left;
  font-size: 9px;
}

.cast-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #e5e7eb;
}

.cast-number {
  font-weight: bold;
  text-align: center;
}

.character-name {
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  font-size: 9px;
}

.status-sw { background: #d1fae5; color: #065f46; }  /* Start/Work - Green */
.status-w { background: #dbeafe; color: #1e40af; }   /* Work - Blue */
.status-wf { background: #fef3c7; color: #92400e; }  /* Work/Finish - Yellow */
.status-swf { background: #ede9fe; color: #5b21b6; } /* Start/Work/Finish - Purple */
.status-h { background: #f3f4f6; color: #374151; }   /* Hold - Gray */

.onset-time {
  font-weight: bold;
}

.cast-notes {
  font-size: 9px;
  color: #666;
}
```

**New Data Field Required:**
- `cast.fittingTime`
- `cast.notes`

---

### Phase 6: Stand-ins Section (Priority: MEDIUM)

**Add after Cast table:**

```html
${cs.standIns?.length > 0 ? `
<div class="section">
  <div class="section-title">STAND-INS / PHOTO DOUBLES</div>
  <table class="standins-table">
    <thead>
      <tr>
        <th style="width: 150px;">NAME</th>
        <th style="width: 120px;">FOR</th>
        <th style="width: 60px;">CALL</th>
        <th>NOTES</th>
      </tr>
    </thead>
    <tbody>
      ${cs.standIns.map(si => `
        <tr>
          <td>${si.name}</td>
          <td>${si.forActor}</td>
          <td>${si.callTime}</td>
          <td>${si.notes || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>
` : ''}
```

**New Data Type Required:**
```typescript
interface StandIn {
  id: string;
  name: string;
  forActor: string; // "John Smith" or character name
  callTime: string;
  notes?: string;
}
```

---

### Phase 7: Special Instructions / Department Notes (Priority: MEDIUM)

**Current (Lines 315-326):** Table with Type | Description | Contact | Phone | Scenes

**Target:** Two-column layout by department

**Replace separate Special Requirements section with:**

```html
${(cs.artNotes || cs.cameraGripNotes || cs.vehicleNotes || cs.stuntNotes || cs.productionNotes) ? `
<div class="section">
  <div class="section-title">SPECIAL INSTRUCTIONS</div>
  <div class="dept-notes-grid">
    <div class="dept-notes-col">
      ${cs.artNotes ? `
        <div class="dept-note">
          <div class="dept-note-label">ART DEPT/PROPS:</div>
          <div class="dept-note-text">${cs.artNotes}</div>
        </div>
      ` : ''}
      ${cs.vehicleNotes ? `
        <div class="dept-note">
          <div class="dept-note-label">VEHICLES:</div>
          <div class="dept-note-text">${cs.vehicleNotes}</div>
        </div>
      ` : ''}
      ${cs.productionNotes ? `
        <div class="dept-note">
          <div class="dept-note-label">PRODUCTION:</div>
          <div class="dept-note-text">${cs.productionNotes}</div>
        </div>
      ` : ''}
    </div>
    <div class="dept-notes-col">
      ${cs.cameraGripNotes ? `
        <div class="dept-note">
          <div class="dept-note-label">CAMERA/GRIP:</div>
          <div class="dept-note-text">${cs.cameraGripNotes}</div>
        </div>
      ` : ''}
      ${cs.stuntNotes ? `
        <div class="dept-note">
          <div class="dept-note-label">STUNTS:</div>
          <div class="dept-note-text">${cs.stuntNotes}</div>
        </div>
      ` : ''}
    </div>
  </div>
</div>
` : ''}
```

**CSS:**
```css
.dept-notes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dept-note {
  margin-bottom: 8px;
}

.dept-note-label {
  font-weight: bold;
  font-size: 10px;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.dept-note-text {
  font-size: 10px;
  color: #374151;
  white-space: pre-line;
}
```

**New Data Fields Required:**
- `cs.artNotes`
- `cs.vehicleNotes`
- `cs.cameraGripNotes`
- `cs.stuntNotes`
(Keep existing `cs.productionNotes`)

---

### Phase 8: Advance Schedule (Priority: MEDIUM)

**Add after Special Instructions:**

```html
${cs.advanceSchedule?.length > 0 ? `
<div class="section advance-schedule">
  <div class="section-title">*** ADVANCE SCHEDULE ***</div>
  ${cs.advanceSchedule.map(day => `
    <div class="advance-day">
      <div class="advance-header">
        <span class="advance-day-label">SHOOT DAY #${day.dayNumber}</span>
        <span class="advance-date">${formatDate(day.date)}</span>
        <span class="advance-call">Est. Call: ${day.estCall || 'TBD'}</span>
      </div>
      <table class="advance-table">
        <thead>
          <tr>
            <th>Scene</th>
            <th>Sets</th>
            <th>Cast</th>
            <th>D/N</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${day.scenes.map(scene => `
            <tr>
              <td>${scene.sceneNumber}</td>
              <td>${scene.sceneName}</td>
              <td>${scene.castIds}</td>
              <td>${scene.dayNight}</td>
              <td>${scene.location}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}
</div>
` : ''}
```

**CSS:**
```css
.advance-schedule {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 12px;
  margin-top: 16px;
}

.advance-day {
  margin-bottom: 12px;
}

.advance-header {
  display: flex;
  justify-content: space-between;
  background: #374151;
  color: white;
  padding: 6px 12px;
  font-size: 11px;
}

.advance-day-label {
  font-weight: bold;
}

.advance-table {
  width: 100%;
  font-size: 10px;
}

.advance-table th {
  background: #e5e7eb;
  padding: 4px 8px;
  text-align: left;
}

.advance-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #e5e7eb;
}
```

**New Data Type Required:**
```typescript
interface AdvanceDay {
  dayNumber: number;
  date: string;
  estCall: string;
  scenes: {
    sceneNumber: string;
    sceneName: string;
    castIds: string;
    dayNight: string;
    location: string;
  }[];
}
```

---

### Phase 9: Enhanced Footer (Priority: LOW)

**Current (Lines 339-341):** Generic timestamp

**Target:** AD names, phones, professional footer

```html
<div class="footer">
  <div class="footer-grid">
    <div class="footer-item">
      <div class="footer-label">UPM</div>
      <div class="footer-value">${cs.upm || '-'}</div>
    </div>
    <div class="footer-item">
      <div class="footer-label">1st AD</div>
      <div class="footer-value">${cs.firstAd || '-'}</div>
    </div>
    <div class="footer-item">
      <div class="footer-label">2nd AD</div>
      <div class="footer-value">${cs.secondAd || '-'}</div>
      ${cs.secondAdPhone ? `<div class="footer-phone">${cs.secondAdPhone}</div>` : ''}
    </div>
    <div class="footer-item">
      <div class="footer-label">Production Office</div>
      <div class="footer-value">${cs.productionOfficePhone || '-'}</div>
    </div>
  </div>
  <div class="footer-timestamp">
    Generated ${new Date().toLocaleString()}
  </div>
</div>
```

**CSS:**
```css
.footer {
  margin-top: 24px;
  padding-top: 12px;
  border-top: 2px solid #1f2937;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 12px;
}

.footer-item {
  text-align: center;
}

.footer-label {
  font-size: 9px;
  font-weight: bold;
  text-transform: uppercase;
  color: #666;
}

.footer-value {
  font-size: 11px;
  font-weight: 500;
}

.footer-phone {
  font-size: 10px;
  color: #666;
}

.footer-timestamp {
  text-align: center;
  font-size: 8px;
  color: #999;
  margin-top: 8px;
}
```

**New Data Fields Required:**
- `cs.secondAd`
- `cs.secondAdPhone`
- `cs.productionOfficePhone`

---

## Sections to REMOVE

### 1. Day Schedule Timeline (Lines 246-254)
**Reason:** Not an industry standard element. The timeline data is better shown through inline meals/moves in the schedule.

**Code to delete:**
```html
<!-- === DAY SCHEDULE TIMELINE === -->
${timelineHtml ? `
<div class="section">
  <div class="section-title">DAY SCHEDULE TIMELINE</div>
  <table>
    <tbody>${timelineHtml}</tbody>
  </table>
</div>
` : ''}
```

Also remove the timelineEvents building logic (lines 62-86).

### 2. Separate Meal Breaks Section (Lines 289-300)
**Reason:** Meals should appear inline in the shooting schedule as banner rows.

**Code to delete:**
```html
<!-- === MEAL BREAKS === -->
${mealsHtml ? `
<div class="section">
  <div class="section-title">MEAL BREAKS</div>
  ...
</div>
` : ''}
```

### 3. Separate Company Moves Section (Lines 302-313)
**Reason:** Moves should appear inline in the shooting schedule as banner rows.

**Code to delete:**
```html
<!-- === COMPANY MOVES === -->
${movesHtml ? `
<div class="section">
  <div class="section-title">COMPANY MOVES</div>
  ...
</div>
` : ''}
```

### 4. Separate Special Requirements Table (Lines 315-326)
**Reason:** Should be converted to department notes format.

**Code to delete:**
```html
<!-- === SPECIAL REQUIREMENTS === -->
${specialReqsHtml ? `
<div class="section">
  <div class="section-title">SPECIAL REQUIREMENTS</div>
  ...
</div>
` : ''}
```

---

## New Data Fields Summary

### CallSheet Model Updates Required

```typescript
// New fields to add to CallSheet type/model:

// Company/Production Info
companyName?: string;
companyAddress?: string;
upm?: string;           // Unit Production Manager
firstAd?: string;
secondAd?: string;
secondAdPhone?: string;
productionOfficePhone?: string;

// Set Medic
setMedic?: string;
setMedicPhone?: string;

// Version Tracking
scriptVersion?: string;     // "WHITE", "BLUE", "PINK", etc.
scheduleVersion?: string;

// Day Tracking
dayNumber?: number;
totalDays?: number;

// Logistics
crewParking?: string;
basecamp?: string;
bathrooms?: string;
lunchLocation?: string;
workingTrucks?: string;

// Department Notes
artNotes?: string;
vehicleNotes?: string;
cameraGripNotes?: string;
stuntNotes?: string;
// (keep existing: generalNotes, safetyNotes, productionNotes, announcements)

// Cast Additional Fields
// In CastCall type:
fittingTime?: string;
notes?: string;

// Stand-ins (new relation)
standIns?: StandIn[];

// Advance Schedule (new relation)
advanceSchedule?: AdvanceDay[];
```

---

## Implementation Priority Order

```
HIGH PRIORITY (Core Layout Changes):
├── Phase 1: Header Restructuring (3-column layout)
├── Phase 2: Logistics Row (6-column)
├── Phase 4: Scene Schedule with Inline Meals/Moves
├── Phase 5: Cast Table Enhancement
└── REMOVE: Day Schedule Timeline, Separate Meals/Moves/Special Reqs sections

MEDIUM PRIORITY (Professional Features):
├── Phase 3: Safety Banner
├── Phase 6: Stand-ins Section
├── Phase 7: Department Notes Format
└── Phase 8: Advance Schedule

LOW PRIORITY (Polish):
├── Phase 9: Enhanced Footer
└── Fine-tune CSS styling to match samples exactly
```

---

## Dependencies

This PDF upgrade plan depends on:

1. **CALL_SHEET_SCHEDULE_INTEGRATION.md** being implemented first
   - Meals/moves must be stored as inline schedule strips
   - The PDF template will read from the combined schedule data

2. **Database Schema Updates**
   - New fields listed above must be added to Prisma schema
   - Stand-ins model must be created
   - AdvanceSchedule model must be created

3. **Backend DTO Updates**
   - CallSheet DTO must include new fields
   - Service must populate advance schedule from future shoot days

---

## Testing Checklist

```
[ ] Header displays 3-column layout correctly
[ ] General Crew Call is large and prominent (24pt+)
[ ] Key Times appear in compact box (right column)
[ ] Weather appears in compact box (right column)
[ ] Logistics row shows all 6 columns
[ ] Safety banner appears when safetyNotes is set
[ ] Scene schedule shows inline meal banners (green)
[ ] Scene schedule shows inline move banners (blue)
[ ] Cast table has correct 9 columns
[ ] Status badges have correct colors
[ ] Stand-ins section appears when data exists
[ ] Background section shows correctly
[ ] Department notes appear in two-column layout
[ ] Advance schedule shows next 1-2 days
[ ] Footer shows AD names and phones
[ ] Day Schedule Timeline section is REMOVED
[ ] Separate Meal Breaks section is REMOVED
[ ] Separate Company Moves section is REMOVED
[ ] Separate Special Requirements table is REMOVED
[ ] PDF renders correctly in paginated (print) mode
[ ] PDF renders correctly in continuous (digital) mode
[ ] PDF maintains 216mm width (LETTER format)
```

---

## Visual Reference

The target PDF should match the professional samples provided:
1. "FSU Production Management: The Movie" - Best overall layout reference
2. "We Still Say Grace" - Good header structure
3. "Set Hero Template" - Good inline meals/moves styling

Key visual characteristics:
- Clean, professional appearance
- Dense but readable information
- Clear section separation
- Prominent crew call time
- Inline meals/moves in shooting schedule (NOT separate sections)
- Color-coded banners for meals (green) and moves (blue)
- Status badges for cast work status
- Footer with AD contact information
