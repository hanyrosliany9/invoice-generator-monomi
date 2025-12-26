# Call Sheet Schedule Integration Plan

**Goal:** Move Meal Breaks, Company Moves, Special Requirements, and Background/Extras from cluttering the call sheet into the **Scene Schedule/Stripboard** where they can be inserted between scenes.

---

## The Problem

Currently:
- Call Sheet has 4 separate sections taking up space
- These items are NOT linked to specific scenes
- User has to manage them separately from the scene flow
- Doesn't match professional stripboard workflow

---

## Phase 0: Current State Analysis & Required Cleanup

### 0.1 Duplicated Time Fields in Database/Types

The CallSheet type has **duplicate fields** for the same concepts:

| Concept | Legacy Field | New Field | Status |
|---------|-------------|-----------|--------|
| General crew call | `generalCallTime` | `crewCallTime` | Both exist - pick one |
| End of day | `wrapTime` | `estimatedWrap` | Both exist - pick one |
| First shot | `firstShotTime` | `firstShotTime` | Single field (OK) |
| Lunch | - | `lunchTime` | New field only |

**Decision Needed:** Consolidate to use the new field names (`crewCallTime`, `estimatedWrap`, `lunchTime`, `firstShotTime`).

### 0.2 Duplicated UI Sections in CallSheetEditorPage

Two sections display overlapping time information:

**Section 1: "CALL TIMES" (Line ~530)**
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ GENERAL CALL│ FIRST SHOT  │ EST. WRAP   │ SUNRISE     │ SUNSET      │
│ (uses       │ (uses       │ (uses       │             │             │
│ generalCall │ firstShot   │ wrapTime)   │             │             │
│ Time)       │ Time)       │             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

**Section 2: "KEY TIMES BAR" (Line ~1108) - Gold bordered**
```
┌─────────────────────────────────────────────────────────────────────┐
│ CREW CALL   │ FIRST SHOT  │ LUNCH       │ EST. WRAP                │
│ (uses       │ (uses       │ (uses       │ (uses                    │
│ crewCall    │ firstShot   │ lunchTime)  │ estimatedWrap)           │
│ Time)       │ Time)       │             │                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Duplications:**
- `FIRST SHOT` appears in BOTH sections (same field `firstShotTime`)
- `EST. WRAP` appears in BOTH with DIFFERENT field names (`wrapTime` vs `estimatedWrap`)

### 0.3 Cluttered Components Already Implemented (Need Removal)

The following components were added to CallSheetEditorPage but should be **removed** per the integration plan:

| Component | File | Line | Status |
|-----------|------|------|--------|
| `KeyTimesBar` | `components/callsheet/KeyTimesBar.tsx` | ~1104-1114 | **REMOVE** (duplicates CALL TIMES) |
| `DayScheduleTimeline` | `components/callsheet/DayScheduleTimeline.tsx` | ~1116-1125 | **REMOVE** |
| `MealBreaksSection` | `components/callsheet/MealBreaksSection.tsx` | ~1127-1137 | **REMOVE** (move to Schedule) |
| `CompanyMovesSection` | `components/callsheet/CompanyMovesSection.tsx` | ~1139-1149 | **REMOVE** (move to Schedule) |
| `SpecialRequirementsSection` | `components/callsheet/SpecialRequirementsSection.tsx` | ~1151-1161 | **REMOVE** (move to Schedule) |
| `BackgroundCallsSection` | `components/callsheet/BackgroundCallsSection.tsx` | ~1163-1173 | **REMOVE** (move to Schedule) |

### 0.4 Backend Tables Already Created (May Need Migration)

These tables were added by the recent industry upgrade but should eventually migrate to ScheduleStrip:

| Model | Status |
|-------|--------|
| `CallSheetMeal` | Exists - migrate data to ScheduleStrip banners |
| `CallSheetMove` | Exists - migrate data to ScheduleStrip banners |
| `CallSheetSpecialReq` | Exists - migrate to scene strip flags |
| `CallSheetBackground` | Exists - migrate to scene strip fields |

### 0.5 Cleanup Checklist Before Integration

```
Phase 0 Cleanup:
├── [ ] Remove KeyTimesBar from CallSheetEditorPage (duplicates CALL TIMES)
├── [ ] Remove DayScheduleTimeline from CallSheetEditorPage
├── [ ] Remove MealBreaksSection from CallSheetEditorPage
├── [ ] Remove CompanyMovesSection from CallSheetEditorPage
├── [ ] Remove SpecialRequirementsSection from CallSheetEditorPage
├── [ ] Remove BackgroundCallsSection from CallSheetEditorPage
├── [ ] Consolidate time fields (use crewCallTime, estimatedWrap consistently)
├── [ ] Update CALL TIMES section to include Lunch time
├── [ ] Remove unused imports from CallSheetEditorPage
├── [ ] Remove unused mutation hooks for meals/moves/special reqs/background
└── [ ] Clean up component files in frontend/src/components/callsheet/
```

### 0.6 Files to Clean Up

**Frontend components to remove/archive:**
```
frontend/src/components/callsheet/
├── KeyTimesBar.tsx          # REMOVE (duplicate)
├── DayScheduleTimeline.tsx  # REMOVE
├── MealBreaksSection.tsx    # REMOVE (move functionality to Schedule)
├── CompanyMovesSection.tsx  # REMOVE (move functionality to Schedule)
├── SpecialRequirementsSection.tsx  # REMOVE (move to Schedule)
├── BackgroundCallsSection.tsx      # REMOVE (move to Schedule)
└── CastStatusBadge.tsx      # KEEP (still useful)
```

**Backend files potentially affected:**
```
backend/src/modules/call-sheets/
├── call-sheets.service.ts   # Remove meal/move/special-req/background methods
├── call-sheets.controller.ts # Remove related endpoints
└── dto/                     # Remove CreateMealDto, CreateMoveDto, etc.
```

---

## Industry Standard Call Sheet Sections (2025 Research)

### Analysis of Professional Call Sheet Samples

Based on analysis of 5 professional call sheets:
- "We Still Say Grace" (indie film)
- "To Dream" (Excel template standard)
- "V for Vendetta" (major studio production)
- "Production Management: The Movie" (FSU Film School, 2024)

### Standard Professional Call Sheet Layout

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              HEADER SECTION                                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ PRODUCTION INFO (Left)    │    TITLE (Center, Large)    │   DATE/DAY (Right)  ║
║ • Production Company      │                              │ • Date              ║
║ • Office Address          │    [PRODUCTION TITLE]        │ • DAY __ of __      ║
║ • Phone                   │                              │                     ║
║ • Producer                │    GENERAL CREW CALL         │ ┌─────────────────┐ ║
║ • Director                │         7:00 AM              │ │ KEY TIMES       │ ║
║ • 1st AD                  │    (Large, Prominent)        │ │ Crew Call: 7AM  │ ║
║ • UPM                     │                              │ │ Shoot Call: 8AM │ ║
║                           │ Script Ver: WHITE            │ │ Lunch: 12PM     │ ║
║                           │ Schedule Ver: BLUE           │ │ Wrap: 7PM       │ ║
║                           │                              │ └─────────────────┘ ║
║                           │ Set Medic: Name • Phone      │ ┌─────────────────┐ ║
║                           │                              │ │ WEATHER         │ ║
║                           │                              │ │ Hi: 87° Lo: 55° │ ║
║                           │                              │ │ Partly Cloudy   │ ║
║                           │                              │ │ Sunrise: 5:46AM │ ║
║                           │                              │ │ Sunset: 7:56PM  │ ║
║                           │                              │ └─────────────────┘ ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                           LOGISTICS ROW                                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ CREW PARKING │ BASECAMP      │ BATHROOMS │ LUNCH      │ WORKING    │ HOSPITAL  ║
║              │               │           │            │ TRUCKS     │           ║
║ 1808 Miller  │ Zeke's House  │ Zeke's    │ Zeke's     │ Cemetery   │ Memorial  ║
║ Landing Rd   │ 1879 Miller   │ House     │ House      │ Lot        │ Hospital  ║
║              │ Landing Rd    │           │            │            │ + Address ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                    ⚠️ SAFETY NOTES / IMPORTANT NOTICES ⚠️                      ║
║  "NO FORCED CALLS WITHOUT APPROVAL" • "NO VISITORS" • "SAFETY VESTS REQUIRED" ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                           SCENE SCHEDULE                                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ SCENE │ SET & DESCRIPTION                        │ CAST    │ D/N │ PGS │ LOC  ║
╠───────┼──────────────────────────────────────────┼─────────┼─────┼─────┼──────╣
║   1   │ INT. SHOOTING RANGE                      │    2    │ N1  │ 3/8 │Zeke's║
║       │ A Woman shoots at the range...          │         │     │     │House ║
╠───────┼──────────────────────────────────────────┼─────────┼─────┼─────┼──────╣
║   2   │ EXT. ROSE & ASSOCIATES OFFICE            │  2,100  │ D2  │ 1/8 │      ║
║       │ Money drives and enters                  │         │     │     │      ║
╠═══════╧══════════════════════════════════════════╧═════════╧═════╧═════╧══════╣
║                    🚗 COMPANY MOVE TO SHELL STATION 🚗                         ║
║                         (Inline banner - NOT separate section!)                ║
╠═══════╤══════════════════════════════════════════╤═════════╤═════╤═════╤══════╣
║   3   │ EXT. SIDE OF THE ROAD                    │ 1,2,3,4 │ D1  │ 3/8 │Shell ║
║       │ Ember pees on the side of the road...   │         │     │     │Stn   ║
╠═══════╧══════════════════════════════════════════╧═════════╧═════╧═════╧══════╣
║                                                          TOTAL PAGES: 6 6/8   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                              CAST TABLE                                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ # │ CAST          │ ROLE      │STATUS│ REPORT │ HAIR/MU │ FITTING │ON SET│NOTE║
╠───┼───────────────┼───────────┼──────┼────────┼─────────┼─────────┼──────┼────╣
║ 1 │ Aleigha Burt  │ EMBER     │  W   │  6:30  │  6:45   │  6:30   │ 7:30 │    ║
║ 2 │ Jasmine Nguyen│ TESSA     │  W   │  6:30  │  6:45   │  6:30   │ 7:30 │    ║
║ 3 │ Tabitha Getty │ ABIGAIL   │  W   │  6:30  │  6:45   │  6:30   │ 7:30 │    ║
║100│ Arden Loftus  │STUNT COORD│  SW  │  6:30  │ 11:00   │  6:30   │ 7:30 │    ║
║1X │ Cori Schell   │EMBER DBL  │  SW  │  6:30  │ 11:00   │  6:30   │ 7:30 │    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                         STAND-INS / PHOTO DOUBLES                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ # │ NAME            │ IN   │ NOTES                                             ║
╠───┼─────────────────┼──────┼──────────────────────────────────────────────────╣
║ 1 │ Lexie Bron      │ 6:30 │ RPT TO CREW PARKING                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                         BACKGROUND / ATMOSPHERE                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ QTY │ DESCRIPTION          │ IN    │ READY ON SET │ SCENES                    ║
╠─────┼──────────────────────┼───────┼──────────────┼───────────────────────────╣
║  12 │ Restaurant Patrons   │  9:00 │    10:00     │  12                       ║
╠═════╧══════════════════════╧═══════╧══════════════╧═══════════════════════════╣
║                                              TOTAL BACKGROUND: 12             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║      SPECIAL INSTRUCTIONS                  │    DEPARTMENT NOTES              ║
╠════════════════════════════════════════════╪══════════════════════════════════╣
║ ART DEPT/PROPS:                            │ CAMERA:                          ║
║ • Sc 13pt1: License Plates, Laptop         │                                  ║
║                                            │ GRIP:                            ║
║ SPECIAL EQUIPMENT:                         │ • Sc 13pt1: Freedom Mounts       ║
║ • Sc 12: Towing Trailer, Uhaul Trailer     │                                  ║
║                                            │ STUNTS:                          ║
║ PRODUCTION:                                │ • Sc 13pt1: Lexi Hangs Out       ║
║ • Safety Vests, Lead/Follow Car            │                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                        *** ADVANCE SCHEDULE ***                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ SHOOT DAY #2                    Tuesday, October 22, 2024    Est. Call: 6:00  ║
╠───────┬─────────────────────────────────────┬─────────┬─────┬─────┬───────────╣
║ SCENE │ SETS                                │ CAST    │ D/N │ PGS │ LOCATION  ║
╠───────┼─────────────────────────────────────┼─────────┼─────┼─────┼───────────╣
║   9   │ EXT. PAPA BOYD'S HOUSE              │ 1,5,9   │  D  │ 3⅜  │Zeke's Hse ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ SHOOT DAY #3                  Wednesday, October 23, 2024    Est. Call: 6:00  ║
╠───────┬─────────────────────────────────────┬─────────┬─────┬─────┬───────────╣
║  10   │ EXT. PAPA BOYD'S HOUSE              │1,5,7,9  │ D1  │ 6/8 │Zeke's Hse ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                 FOOTER                                         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ UPM: Emma Francis          1st AD: Maya Brown          2nd AD: Hailey Odom    ║
║                                                              863.709.4077     ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Key Industry Standard Sections (From Sample Analysis)

| # | Section | Description | Our Status |
|---|---------|-------------|------------|
| 1 | **Header** | Production info, title, date, day number | ✅ Have |
| 2 | **Key Personnel** | Producer, Director, 1st AD, UPM names | ✅ Have (Production Info) |
| 3 | **General Crew Call** | Large prominent time display | ❌ Duplicate (2 sections!) |
| 4 | **Key Times Box** | Crew Call, Shoot Call, Meals, Wrap | ❌ Duplicate (2 sections!) |
| 5 | **Weather Box** | Hi/Lo, conditions, sunrise/sunset | ✅ Have |
| 6 | **Script/Schedule Version** | WHITE, BLUE, PINK revisions | ❌ Missing |
| 7 | **Set Medic** | Name and phone number | ❌ Missing |
| 8 | **Logistics Row** | Parking, Basecamp, Bathrooms, Hospital | ⚠️ Partial (no Parking/Basecamp) |
| 9 | **Safety Notes Banner** | Important safety/policy notices | ❌ Missing |
| 10 | **Scene Schedule** | Scenes with inline cast numbers | ✅ Have |
| 11 | **Company Move (INLINE)** | Banner row IN scene schedule | ❌ Wrong place (separate section) |
| 12 | **Cast Table** | With Status, Pickup, MU/Hair, On Set times | ⚠️ Partial (missing columns) |
| 13 | **Stand-ins Section** | Photo doubles with call times | ❌ Missing |
| 14 | **Background Section** | Qty, Description, In, Ready, Scenes | ❌ Wrong place (separate section) |
| 15 | **Special Instructions** | By department (Props, SFX, Stunts, etc.) | ❌ Wrong place (separate section) |
| 16 | **Advance Schedule** | Next 1-2 shoot days preview | ❌ Missing |
| 17 | **Footer** | AD names, phone numbers, signatures | ❌ Missing |

### Work Status Codes (Industry Standard)

| Code | Meaning | Description |
|------|---------|-------------|
| **SW** | Start/Work | First day of actor's work |
| **W** | Work | Regular work day |
| **WF** | Work/Finish | Last day of actor's work |
| **SWF** | Start/Work/Finish | Only day actor works |
| **H** | Hold | On hold, not working today |
| **R** | Rehearsal | Rehearsal only |
| **T** | Travel | Travel day |
| **PW** | Post-Work | ADR, dubbing, etc. |

### Cast Table Columns (Industry Standard)

```
┌───┬──────────────┬───────────┬────────┬────────┬─────────┬─────────┬────────┬───────┐
│ # │ CAST (Actor) │ CHARACTER │ STATUS │ PICKUP │ HAIR/MU │ FITTING │ ON SET │ NOTES │
│   │              │  (Role)   │(SW/W/H)│  Time  │  Call   │COSTUMES │  Time  │       │
└───┴──────────────┴───────────┴────────┴────────┴─────────┴─────────┴────────┴───────┘
```

**Our current Cast columns:** # | Name | Character | Call Time | Status | Actions
**Missing columns:** Pickup, Hair/MU, Fitting/Costumes, On Set, Notes/Remarks

### Our Current Implementation vs Industry Standard (Detailed)

| Section | Industry Standard | Our Implementation | Status | Action |
|---------|-------------------|-------------------|--------|--------|
| **Header** | Title, Date, Day # | ✅ Production Info | OK | - |
| **Key Personnel** | Producer, Director, 1st AD, UPM | ✅ In Production Info | OK | - |
| **General Crew Call** | Large prominent display | ❌ TWO sections! | **DUPLICATE** | Merge into one |
| **Key Times Box** | Crew/Shoot/Lunch/Wrap | ❌ TWO sections! | **DUPLICATE** | Merge into one |
| **Weather** | Hi/Lo, conditions, sun times | ✅ Location & Weather | OK | - |
| **Script/Schedule Version** | WHITE, BLUE, PINK | ❌ Missing | **MISSING** | Add field |
| **Set Medic** | Name + Phone | ❌ Missing | **MISSING** | Add to header |
| **Logistics Row** | Parking, Basecamp, Bathrooms | ⚠️ Partial | **INCOMPLETE** | Add Parking, Basecamp |
| **Safety Notes Banner** | Important notices | ❌ Missing | **MISSING** | Add banner |
| **Scene Schedule** | Scenes in table | ✅ Have | OK | - |
| **Company Move (inline)** | Banner IN schedule | ❌ Separate section | **WRONG PLACE** | Move to Schedule page |
| **Cast Table** | Full timing columns | ⚠️ Partial | **INCOMPLETE** | Add Pickup, MU, On Set |
| **Stand-ins** | Separate section | ❌ Missing | **MISSING** | Add section |
| **Background** | Qty, In, Ready, Scenes | ❌ Separate section | **WRONG PLACE** | Move to Schedule page |
| **Special Instructions** | By department | ❌ Separate section | **WRONG PLACE** | Consider moving |
| **Advance Schedule** | Next 1-2 days preview | ❌ Missing | **MISSING** | Add section |
| **Footer** | AD names, phones | ❌ Missing | **MISSING** | Add footer |
| **DayScheduleTimeline** | Not standard | ❌ Have it | **REMOVE** | Delete component |
| **KeyTimesBar** | Duplicates Call Times | ❌ Have it | **REMOVE** | Delete component |

### Key Problems Identified

**1. DUPLICATED TIME DISPLAY:**
```
Current (WRONG):
┌─────────────────────────────────────┐
│ CALL TIMES Section (line ~530)       │  ← Shows: General Call, First Shot,
│                                      │           Est. Wrap, Sunrise, Sunset
├─────────────────────────────────────┤
│ ... other sections ...               │
├─────────────────────────────────────┤
│ KEY TIMES BAR (line ~1108)           │  ← Shows: Crew Call, First Shot,
│                                      │           Lunch, Est. Wrap
└─────────────────────────────────────┘

Industry Standard (CORRECT):
┌─────────────────────────────────────┐
│ KEY TIMES (ONE section only!)        │  ← Shows ALL times in ONE place:
│ Crew Call | First Shot | Lunch |     │     General Call, First Shot,
│ Est. Wrap | Sunrise | Sunset         │     Lunch, Wrap, Sunrise, Sunset
└─────────────────────────────────────┘
```

**2. MEALS/MOVES/SPECIAL REQS IN WRONG LOCATION:**
```
Current (WRONG):
┌─────────────────────────────────────┐
│ Scene Schedule                       │
│ - Scene 1                            │
│ - Scene 2                            │
│ - Scene 3                            │
├─────────────────────────────────────┤
│ Meal Breaks Section (separate!)      │  ← CLUTTERS the page
├─────────────────────────────────────┤
│ Company Moves Section (separate!)    │  ← CLUTTERS the page
├─────────────────────────────────────┤
│ Special Requirements (separate!)     │  ← CLUTTERS the page
├─────────────────────────────────────┤
│ Background Calls (separate!)         │  ← CLUTTERS the page
└─────────────────────────────────────┘

Industry Standard (CORRECT):
┌─────────────────────────────────────┐
│ Shooting Schedule                    │
│ - Scene 1 (⚠️ Stunts, 👥 5 BG)       │  ← Inline flags & BG count
│ - 🍽️ LUNCH 12:00 PM (30 min)         │  ← Meal INLINE in sequence
│ - Scene 2                            │
│ - 🚗 COMPANY MOVE → Location B       │  ← Move INLINE in sequence
│ - Scene 3 (👶 Minor on set)          │  ← Inline flags
└─────────────────────────────────────┘
```

**3. UNNECESSARY COMPONENTS:**
- `DayScheduleTimeline` - Not a standard call sheet element
- `KeyTimesBar` - Duplicates existing Call Times section

### Recommended Consolidated Call Times Section

Replace BOTH "Call Times" and "KeyTimesBar" with ONE section:

```
┌───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
│ CREW CALL │ FIRST SHOT│ LUNCH     │ EST. WRAP │ SUNRISE   │ SUNSET    │
│ 7:00 AM   │ 9:00 AM   │ 12:30 PM  │ 7:00 PM   │ 5:45 AM   │ 6:30 PM   │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
```

**Fields to use (consolidated):**
- `crewCallTime` (remove `generalCallTime`)
- `firstShotTime`
- `lunchTime`
- `estimatedWrap` (remove `wrapTime`)
- `sunrise`
- `sunset`

## The Solution

Professional stripboards use **"Banner Strips"** inserted between scene strips:

```
┌─────────────────────────────────────────────────────────┐
│ Scene 12 - INT. COFFEE SHOP - DAY                       │
├─────────────────────────────────────────────────────────┤
│ 🍽️ LUNCH BREAK - 12:00 PM (30 min) - Craft Services     │  ← Banner Strip
├─────────────────────────────────────────────────────────┤
│ Scene 14 - EXT. PARKING LOT - DAY                       │
├─────────────────────────────────────────────────────────┤
│ 🚗 COMPANY MOVE - 2:00 PM → Warehouse (45 min travel)   │  ← Banner Strip
├─────────────────────────────────────────────────────────┤
│ Scene 22 - INT. WAREHOUSE - NIGHT                       │
│   ⚠️ STUNTS: Car crash - Stunt Coord: John              │  ← Scene Flag
│   👥 BG: 20 Warehouse Workers                           │  ← Scene Flag
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Approach

### Option A: Extend ScheduleStrip Model (Recommended)

The `ScheduleStrip` model already has `stripType` which supports `SCENE` and `BANNER`. We extend this:

**Current:**
```prisma
enum StripType {
  SCENE
  BANNER
}

enum BannerType {
  DAY_BREAK
  MEAL_BREAK
  COMPANY_MOVE
  NOTE
}
```

**Enhanced:**
```prisma
enum StripType {
  SCENE
  BANNER
}

enum BannerType {
  DAY_BREAK
  MEAL_BREAK      // ← Use for meals
  COMPANY_MOVE    // ← Use for company moves
  NOTE
  SPECIAL_REQ     // ← NEW: For stunts, minors, etc.
}
```

And add fields to ScheduleStrip for the banner data:
- `mealType`, `mealDuration`, `mealLocation`
- `moveFromLocation`, `moveToLocation`, `moveTravelTime`
- `specialReqType`, `specialReqContact`, `specialReqSafetyNotes`
- `backgroundDescription`, `backgroundQty`, `backgroundWardrobe`

### Option B: Keep Separate Tables, Link to Strips

Keep the existing tables but add `stripId` or `afterStripId` to indicate position in schedule.

---

## Recommended Implementation: Option A (Extend ScheduleStrip)

This is cleaner because:
1. Everything is part of the schedule/stripboard
2. Drag-and-drop reordering works naturally
3. Single data model for the day's schedule
4. Call sheet just reads from the schedule

---

## Phase 1: Database Schema Changes

### 1.1 Update ScheduleStrip Model

**File:** `backend/prisma/schema.prisma`

```prisma
model ScheduleStrip {
  id          String    @id @default(cuid())
  shootDayId  String
  shootDay    ShootDay  @relation(fields: [shootDayId], references: [id], onDelete: Cascade)
  order       Int       @default(0)

  // Strip type
  stripType   StripType @default(SCENE)

  // === SCENE DATA (when stripType = SCENE) ===
  sceneId     String?
  sceneNumber String?
  sceneName   String?
  intExt      String?
  dayNight    String?
  location    String?
  pageCount   Float?
  estimatedTime Int?

  // Scene-specific flags (for scenes only)
  hasStunts       Boolean   @default(false)
  hasMinors       Boolean   @default(false)
  hasAnimals      Boolean   @default(false)
  hasVehicles     Boolean   @default(false)
  hasSfx          Boolean   @default(false)
  hasWaterWork    Boolean   @default(false)
  specialReqNotes String?   // Details about special requirements
  specialReqContact String? // Contact person for special requirements

  // Background/Extras for this scene
  backgroundDescription String?  // "20 Office Workers"
  backgroundQty         Int?
  backgroundCallTime    String?
  backgroundWardrobe    String?
  backgroundNotes       String?

  // === BANNER DATA (when stripType = BANNER) ===
  bannerType    BannerType?
  bannerText    String?
  bannerColor   String?

  // Meal Break data (when bannerType = MEAL_BREAK)
  mealType      String?       // "BREAKFAST", "LUNCH", "SECOND_MEAL"
  mealTime      String?       // "12:00 PM"
  mealDuration  Int?          // 30 minutes
  mealLocation  String?       // "Craft Services Tent"

  // Company Move data (when bannerType = COMPANY_MOVE)
  moveTime          String?   // "2:00 PM"
  moveFromLocation  String?   // "Downtown Studio"
  moveToLocation    String?   // "Warehouse Location"
  moveTravelTime    Int?      // 45 minutes
  moveNotes         String?   // "Shuttle buses provided"

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([shootDayId])
  @@map("schedule_strips")
}

enum BannerType {
  DAY_BREAK
  MEAL_BREAK
  COMPANY_MOVE
  NOTE
}
```

### 1.2 Migration

```bash
cd backend && npx prisma migrate dev --name schedule_strip_enhancements
```

---

## Phase 2: Backend API Updates

### 2.1 Update Strip DTOs

**File:** `backend/src/modules/schedules/dto/create-strip.dto.ts`

```typescript
import { IsString, IsOptional, IsInt, IsBoolean, IsEnum } from 'class-validator';

export class CreateStripDto {
  @IsString()
  shootDayId: string;

  @IsEnum(['SCENE', 'BANNER'])
  stripType: string;

  // Scene data
  @IsOptional() @IsString() sceneId?: string;
  @IsOptional() @IsString() sceneNumber?: string;
  @IsOptional() @IsString() sceneName?: string;
  @IsOptional() @IsString() intExt?: string;
  @IsOptional() @IsString() dayNight?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() pageCount?: number;
  @IsOptional() @IsInt() estimatedTime?: number;

  // Scene flags
  @IsOptional() @IsBoolean() hasStunts?: boolean;
  @IsOptional() @IsBoolean() hasMinors?: boolean;
  @IsOptional() @IsBoolean() hasAnimals?: boolean;
  @IsOptional() @IsBoolean() hasVehicles?: boolean;
  @IsOptional() @IsBoolean() hasSfx?: boolean;
  @IsOptional() @IsBoolean() hasWaterWork?: boolean;
  @IsOptional() @IsString() specialReqNotes?: string;
  @IsOptional() @IsString() specialReqContact?: string;

  // Background/Extras
  @IsOptional() @IsString() backgroundDescription?: string;
  @IsOptional() @IsInt() backgroundQty?: number;
  @IsOptional() @IsString() backgroundCallTime?: string;
  @IsOptional() @IsString() backgroundWardrobe?: string;
  @IsOptional() @IsString() backgroundNotes?: string;

  // Banner data
  @IsOptional() @IsEnum(['DAY_BREAK', 'MEAL_BREAK', 'COMPANY_MOVE', 'NOTE'])
  bannerType?: string;
  @IsOptional() @IsString() bannerText?: string;
  @IsOptional() @IsString() bannerColor?: string;

  // Meal break
  @IsOptional() @IsString() mealType?: string;
  @IsOptional() @IsString() mealTime?: string;
  @IsOptional() @IsInt() mealDuration?: number;
  @IsOptional() @IsString() mealLocation?: string;

  // Company move
  @IsOptional() @IsString() moveTime?: string;
  @IsOptional() @IsString() moveFromLocation?: string;
  @IsOptional() @IsString() moveToLocation?: string;
  @IsOptional() @IsInt() moveTravelTime?: number;
  @IsOptional() @IsString() moveNotes?: string;

  @IsOptional() @IsInt() order?: number;
}
```

### 2.2 Add Quick Insert Methods

**File:** `backend/src/modules/schedules/strips.service.ts`

```typescript
// Quick method to insert meal break after a strip
async insertMealBreak(afterStripId: string, data: {
  mealType: string;
  mealTime: string;
  mealDuration?: number;
  mealLocation?: string;
}) {
  const afterStrip = await this.prisma.scheduleStrip.findUnique({
    where: { id: afterStripId },
  });
  if (!afterStrip) throw new NotFoundException('Strip not found');

  // Increment order of all strips after this one
  await this.prisma.scheduleStrip.updateMany({
    where: {
      shootDayId: afterStrip.shootDayId,
      order: { gt: afterStrip.order },
    },
    data: { order: { increment: 1 } },
  });

  // Insert the meal break
  return this.prisma.scheduleStrip.create({
    data: {
      shootDayId: afterStrip.shootDayId,
      order: afterStrip.order + 1,
      stripType: 'BANNER',
      bannerType: 'MEAL_BREAK',
      bannerText: `${data.mealType} - ${data.mealTime}`,
      bannerColor: '#4CAF50', // Green for meals
      mealType: data.mealType,
      mealTime: data.mealTime,
      mealDuration: data.mealDuration || 30,
      mealLocation: data.mealLocation,
    },
  });
}

// Quick method to insert company move after a strip
async insertCompanyMove(afterStripId: string, data: {
  moveTime: string;
  moveFromLocation: string;
  moveToLocation: string;
  moveTravelTime?: number;
  moveNotes?: string;
}) {
  const afterStrip = await this.prisma.scheduleStrip.findUnique({
    where: { id: afterStripId },
  });
  if (!afterStrip) throw new NotFoundException('Strip not found');

  // Increment order of all strips after this one
  await this.prisma.scheduleStrip.updateMany({
    where: {
      shootDayId: afterStrip.shootDayId,
      order: { gt: afterStrip.order },
    },
    data: { order: { increment: 1 } },
  });

  // Insert the company move
  return this.prisma.scheduleStrip.create({
    data: {
      shootDayId: afterStrip.shootDayId,
      order: afterStrip.order + 1,
      stripType: 'BANNER',
      bannerType: 'COMPANY_MOVE',
      bannerText: `Move: ${data.moveFromLocation} → ${data.moveToLocation}`,
      bannerColor: '#2196F3', // Blue for moves
      moveTime: data.moveTime,
      moveFromLocation: data.moveFromLocation,
      moveToLocation: data.moveToLocation,
      moveTravelTime: data.moveTravelTime,
      moveNotes: data.moveNotes,
    },
  });
}
```

---

## Phase 3: Frontend Schedule UI Updates

### 3.1 Update Strip Component to Show Different Types

**File:** `frontend/src/components/schedule/ScheduleStrip.tsx`

```tsx
import { Card, Tag, Space, Tooltip, Button } from 'antd';
import {
  CoffeeOutlined,
  CarOutlined,
  WarningOutlined,
  TeamOutlined,
} from '@ant-design/icons';

interface ScheduleStripProps {
  strip: ScheduleStrip;
  onEdit: (strip: ScheduleStrip) => void;
  onDelete: (id: string) => void;
  onInsertAfter: (id: string, type: 'meal' | 'move') => void;
}

export function ScheduleStripComponent({ strip, onEdit, onDelete, onInsertAfter }: ScheduleStripProps) {
  // BANNER STRIP (Meal Break, Company Move, etc.)
  if (strip.stripType === 'BANNER') {
    return (
      <Card
        size="small"
        style={{
          background: strip.bannerColor || '#333',
          borderLeft: `4px solid ${strip.bannerColor || '#666'}`,
          margin: '4px 0',
        }}
      >
        <Space>
          {strip.bannerType === 'MEAL_BREAK' && (
            <>
              <CoffeeOutlined />
              <span>{strip.mealType} - {strip.mealTime}</span>
              <Tag>{strip.mealDuration} min</Tag>
              {strip.mealLocation && <Tag color="green">{strip.mealLocation}</Tag>}
            </>
          )}
          {strip.bannerType === 'COMPANY_MOVE' && (
            <>
              <CarOutlined />
              <span>{strip.moveFromLocation} → {strip.moveToLocation}</span>
              <Tag>{strip.moveTravelTime} min travel</Tag>
            </>
          )}
        </Space>
      </Card>
    );
  }

  // SCENE STRIP
  return (
    <Card
      size="small"
      style={{
        margin: '4px 0',
        borderLeft: `4px solid ${strip.intExt === 'INT' ? '#1890ff' : '#52c41a'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tag color={strip.intExt === 'INT' ? 'blue' : 'green'}>{strip.intExt}</Tag>
          <strong>{strip.sceneNumber}</strong>
          <span>{strip.sceneName}</span>
          <Tag>{strip.dayNight}</Tag>
          {strip.pageCount && <Tag>{strip.pageCount} pgs</Tag>}
        </Space>

        {/* Special Requirement Flags */}
        <Space>
          {strip.hasStunts && <Tooltip title="Stunts"><WarningOutlined style={{ color: '#ff4d4f' }} /></Tooltip>}
          {strip.hasMinors && <Tooltip title="Minors"><Tag color="orange">MINOR</Tag></Tooltip>}
          {strip.hasAnimals && <Tooltip title="Animals"><span>🐕</span></Tooltip>}
          {strip.hasSfx && <Tooltip title="SFX/Pyro"><span>💥</span></Tooltip>}
          {strip.backgroundQty && (
            <Tooltip title={`${strip.backgroundDescription} (${strip.backgroundQty})`}>
              <Tag icon={<TeamOutlined />}>{strip.backgroundQty} BG</Tag>
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Context menu for insert */}
      <div style={{ marginTop: 8, borderTop: '1px dashed #333', paddingTop: 8 }}>
        <Space size="small">
          <Button size="small" icon={<CoffeeOutlined />} onClick={() => onInsertAfter(strip.id, 'meal')}>
            + Meal
          </Button>
          <Button size="small" icon={<CarOutlined />} onClick={() => onInsertAfter(strip.id, 'move')}>
            + Move
          </Button>
        </Space>
      </div>
    </Card>
  );
}
```

### 3.2 Add Insert Modals

**File:** `frontend/src/components/schedule/InsertMealModal.tsx`

```tsx
import { Modal, Form, Select, TimePicker, InputNumber, Input } from 'antd';
import dayjs from 'dayjs';

interface InsertMealModalProps {
  open: boolean;
  afterStripId: string | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function InsertMealModal({ open, afterStripId, onClose, onSubmit }: InsertMealModalProps) {
  const [form] = Form.useForm();

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      afterStripId,
      mealType: values.mealType,
      mealTime: values.mealTime.format('h:mm A'),
      mealDuration: values.mealDuration,
      mealLocation: values.mealLocation,
    });
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Insert Meal Break"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="mealType" label="Meal Type" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="BREAKFAST">Breakfast</Select.Option>
            <Select.Option value="LUNCH">Lunch</Select.Option>
            <Select.Option value="SECOND_MEAL">Second Meal</Select.Option>
            <Select.Option value="CRAFT_SERVICES">Craft Services</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="mealTime" label="Time" rules={[{ required: true }]}>
          <TimePicker format="h:mm A" use12Hours />
        </Form.Item>
        <Form.Item name="mealDuration" label="Duration (minutes)" initialValue={30}>
          <InputNumber min={15} max={120} />
        </Form.Item>
        <Form.Item name="mealLocation" label="Location">
          <Input placeholder="Craft Services Tent" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

---

## Phase 4: Update Call Sheet to READ from Schedule

### 4.1 Call Sheet Derives Data from ShootDay.strips

The call sheet should NOT have its own meal/move/background tables. Instead, it reads from the schedule:

**File:** `backend/src/modules/call-sheets/call-sheets.service.ts`

```typescript
async findOne(id: string) {
  const callSheet = await this.prisma.callSheet.findUnique({
    where: { id },
    include: {
      schedule: { include: { project: true } },
      shootDay: {
        include: {
          strips: { orderBy: { order: 'asc' } }
        }
      },
      // ... other relations
    },
  });

  // Derive meals, moves, special reqs from strips
  const strips = callSheet?.shootDay?.strips || [];

  const derivedData = {
    ...callSheet,
    // Extract meal breaks from banner strips
    mealBreaks: strips
      .filter(s => s.stripType === 'BANNER' && s.bannerType === 'MEAL_BREAK')
      .map(s => ({
        id: s.id,
        mealType: s.mealType,
        time: s.mealTime,
        duration: s.mealDuration,
        location: s.mealLocation,
      })),

    // Extract company moves from banner strips
    companyMoves: strips
      .filter(s => s.stripType === 'BANNER' && s.bannerType === 'COMPANY_MOVE')
      .map(s => ({
        id: s.id,
        departTime: s.moveTime,
        fromLocation: s.moveFromLocation,
        toLocation: s.moveToLocation,
        travelTime: s.moveTravelTime,
        notes: s.moveNotes,
      })),

    // Extract special requirements from scene strips
    specialRequirements: strips
      .filter(s => s.stripType === 'SCENE' && (s.hasStunts || s.hasMinors || s.hasAnimals || s.hasSfx))
      .map(s => ({
        sceneNumber: s.sceneNumber,
        hasStunts: s.hasStunts,
        hasMinors: s.hasMinors,
        hasAnimals: s.hasAnimals,
        hasSfx: s.hasSfx,
        notes: s.specialReqNotes,
        contact: s.specialReqContact,
      })),

    // Extract background/extras from scene strips
    backgroundCalls: strips
      .filter(s => s.stripType === 'SCENE' && s.backgroundQty)
      .map(s => ({
        sceneNumber: s.sceneNumber,
        description: s.backgroundDescription,
        quantity: s.backgroundQty,
        callTime: s.backgroundCallTime,
        wardrobe: s.backgroundWardrobe,
        notes: s.backgroundNotes,
      })),
  };

  return derivedData;
}
```

---

## Phase 5: Remove Redundant Tables (Optional Cleanup)

After migrating to schedule-based approach, you can optionally remove:

```prisma
// REMOVE THESE MODELS (data now lives in ScheduleStrip):
// - CallSheetMeal
// - CallSheetMove
// - CallSheetSpecialReq
// - CallSheetBackground
```

And remove the related sections from CallSheetEditorPage, since they're now managed in the Schedule page.

---

## Phase 6: Frontend Call Sheet Simplification

### 6.1 Remove Direct Edit Sections

**File:** `frontend/src/pages/CallSheetEditorPage.tsx`

Remove:
- `<MealBreaksSection />`
- `<CompanyMovesSection />`
- `<SpecialRequirementsSection />`
- `<BackgroundCallsSection />`

Replace with read-only displays that link to the schedule:

```tsx
{/* Meals, Moves, Special Reqs - Read from Schedule */}
<Card title="Day Schedule" extra={<Button onClick={() => navigate(`/schedules/${callSheet.scheduleId}`)}>Edit in Schedule</Button>}>
  <DayScheduleTimeline
    crewCallTime={callSheet.crewCallTime}
    firstShotTime={callSheet.firstShotTime}
    estimatedWrap={callSheet.estimatedWrap}
    meals={callSheet.mealBreaks}
    moves={callSheet.companyMoves}
  />
</Card>

{/* Special Requirements - Read-only summary */}
{callSheet.specialRequirements?.length > 0 && (
  <Card title="Special Requirements" size="small">
    {callSheet.specialRequirements.map(req => (
      <Tag key={req.sceneNumber} color="red">
        Scene {req.sceneNumber}: {req.hasStunts && 'Stunts'} {req.hasMinors && 'Minors'} {req.hasAnimals && 'Animals'}
      </Tag>
    ))}
  </Card>
)}

{/* Background - Read-only summary */}
{callSheet.backgroundCalls?.length > 0 && (
  <Card title="Background/Extras" size="small">
    <Table
      dataSource={callSheet.backgroundCalls}
      columns={[
        { title: 'Scene', dataIndex: 'sceneNumber' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Qty', dataIndex: 'quantity' },
        { title: 'Call', dataIndex: 'callTime' },
      ]}
      size="small"
      pagination={false}
    />
  </Card>
)}
```

---

## Summary: New Workflow

### Before (Current - Cluttered)
```
Schedule Page: Just scenes
Call Sheet Page: Scenes + Meals + Moves + Special Reqs + Background (4 separate sections)
```

### After (Clean - Industry Standard)
```
Schedule Page: Scenes + Meal Breaks + Company Moves (as banner strips between scenes)
               Each scene can have: Special Req flags, Background/Extras info

Call Sheet Page: Reads from schedule, displays in clean timeline format
                 Edit link takes you to schedule page
```

---

## Implementation Order

```
Session 1: Schema Migration
├── Update ScheduleStrip model with new fields
├── Run migration
└── Verify database

Session 2: Backend APIs
├── Update strip DTOs
├── Add insertMealBreak, insertCompanyMove methods
├── Update schedule service
└── Test endpoints

Session 3: Schedule Page UI
├── Update strip component to show meals/moves
├── Add special req flags to scene strips
├── Add background info to scene strips
├── Add insert buttons/modals

Session 4: Call Sheet Simplification
├── Remove direct edit sections from call sheet
├── Add read-only timeline display
├── Link to schedule for editing
├── Update PDF template to read from derived data

Session 5: Cleanup (Optional)
├── Remove CallSheetMeal, CallSheetMove, etc. models
├── Remove related frontend components
├── Update documentation
```

---

## Benefits of This Approach

1. **Single Source of Truth** - Schedule has all the data
2. **Visual Context** - See meals/moves in relation to scenes
3. **Drag & Drop** - Reorder strips including banners naturally
4. **Less Clutter** - Call sheet is clean, focused on key info
5. **Professional Workflow** - Matches industry stripboard tools
6. **No Data Duplication** - Call sheet derives from schedule

---

## Executive Summary: Required Changes

### 🔴 REMOVE (Duplicates/Non-Standard)

| Component | Reason | Priority |
|-----------|--------|----------|
| `KeyTimesBar` | Duplicates Call Times section | HIGH |
| `DayScheduleTimeline` | Not an industry standard element | HIGH |
| `MealBreaksSection` | Move to Schedule page | HIGH |
| `CompanyMovesSection` | Move to Schedule page | HIGH |
| `SpecialRequirementsSection` | Move to Schedule page | MEDIUM |
| `BackgroundCallsSection` | Move to Schedule page | MEDIUM |
| `generalCallTime` field | Use `crewCallTime` instead | HIGH |
| `wrapTime` field | Use `estimatedWrap` instead | HIGH |

### 🟡 ADD (Missing Features)

| Feature | Industry Standard | Priority |
|---------|-------------------|----------|
| Script/Schedule Version | WHITE, BLUE, PINK revision tracking | LOW |
| Set Medic | Name + Phone in header | MEDIUM |
| Logistics Row | Crew Parking, Basecamp, Bathrooms | MEDIUM |
| Safety Notes Banner | Important notices/policies | MEDIUM |
| Stand-ins Section | Photo doubles with call times | LOW |
| Advance Schedule | Next 1-2 shoot days preview | MEDIUM |
| Footer | AD names, phone numbers | LOW |
| Cast columns: Pickup, MU/Hair, On Set | Full timing flow | HIGH |

### 🟢 KEEP (Already Good)

| Section | Status |
|---------|--------|
| Production Info header | ✅ Good |
| Weather display | ✅ Good |
| Location with hospital | ✅ Good |
| Scene Schedule table | ✅ Good |
| Cast section | ✅ Good (needs more columns) |
| Crew by department | ✅ Good |
| Notes section | ✅ Good |
| CastStatusBadge component | ✅ Keep |

### 🔵 MOVE (Wrong Location)

| Item | Current Location | Correct Location |
|------|-----------------|------------------|
| Meal Breaks | Call Sheet separate section | Schedule page (inline banner) |
| Company Moves | Call Sheet separate section | Schedule page (inline banner) |
| Special Requirements | Call Sheet separate section | Schedule page (scene flags) |
| Background/Extras | Call Sheet separate section | Schedule page (scene fields) |

---

## Quick Reference: Industry Standard Order

```
1. HEADER (Title, Date, Day#, Key Personnel)
2. GENERAL CREW CALL (Large, prominent - ONE TIME ONLY!)
3. KEY TIMES BOX (Crew/Shoot/Meals/Wrap - ONE SECTION!)
4. WEATHER BOX (Hi/Lo, conditions, sunrise/sunset)
5. LOGISTICS ROW (Parking, Basecamp, Hospital)
6. SAFETY NOTES BANNER
7. SCENE SCHEDULE (with inline meals/moves/flags)
8. CAST TABLE (with Status, Pickup, MU, On Set)
9. STAND-INS
10. BACKGROUND/EXTRAS
11. SPECIAL INSTRUCTIONS (by department)
12. ADVANCE SCHEDULE
13. FOOTER (AD names, contacts)
```

