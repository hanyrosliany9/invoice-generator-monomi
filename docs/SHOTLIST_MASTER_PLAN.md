# Shot List Feature - Master Plan

## Overview
Create a standalone Shot List module inspired by [StudioBinder](https://www.studiobinder.com/shot-list-storyboard/) - the industry standard for film production shot lists.

## Problem with Current Implementation
The current shot list is a **static deck slide template** with hardcoded text elements:
```
templateDefinitions.ts → shotListTemplate → Just visual text, NOT data
```

This is unusable because:
- ❌ No data model - just visual text
- ❌ Cannot add/remove/reorder shots
- ❌ No filtering or sorting
- ❌ No dropdowns for shot specs
- ❌ No storyboard images
- ❌ No export functionality

## Solution: Dedicated Shot List Module

### Key Features (Based on [StudioBinder Research](https://www.studiobinder.com/shot-list-software/))
| Feature | Description |
|---------|-------------|
| Table Editor | Spreadsheet-style with inline editing |
| Shot Specs | Dropdowns for size, movement, lens, angle |
| Drag & Drop | Reorder shots within scenes |
| Scenes | Group shots by scene with headers |
| Storyboard | Thumbnail image per shot |
| Time Est. | Duration estimates with totals |
| Status | Track PLANNED → SHOT → WRAPPED |
| PDF Export | Professional formatted export |

---

## Implementation Files

Execute in order:

| # | File | Tasks | Est. Lines |
|---|------|-------|------------|
| 1 | [SHOTLIST_01_DATABASE.md](./SHOTLIST_01_DATABASE.md) | Prisma models, migration | ~80 |
| 2 | [SHOTLIST_02_BACKEND.md](./SHOTLIST_02_BACKEND.md) | NestJS module, DTOs, services, controllers | ~350 |
| 3 | [SHOTLIST_03_FRONTEND.md](./SHOTLIST_03_FRONTEND.md) | Types, constants, API, page, table component | ~500 |
| 4 | [SHOTLIST_04_EXPORT.md](./SHOTLIST_04_EXPORT.md) | PDF generation with Puppeteer | ~150 |

---

## Data Model

```
ShotList (per project)
  └── ShotListScene (per scene)
        └── Shot (individual shots with specs)
```

### Shot Specs
- **Size**: EWS, WS, FS, MWS, MS, MCU, CU, ECU
- **Type**: MASTER, SINGLE, TWO_SHOT, OTS, POV, INSERT
- **Movement**: STATIC, PAN, TILT, DOLLY, TRACK, CRANE, HANDHELD, STEADICAM
- **Angle**: EYE_LEVEL, LOW_ANGLE, HIGH_ANGLE, DUTCH, BIRD'S_EYE
- **Lens**: 14mm - 200mm
- **Frame Rate**: 24fps - 120fps
- **Camera**: A CAM, B CAM, C CAM, DRONE
- **Status**: PLANNED, IN_PROGRESS, SHOT, WRAPPED, CUT

---

## Tech Stack
- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: React + Ant Design Table + dnd-kit
- **Export**: Puppeteer for PDF

---

## Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shot-lists?projectId=` | List by project |
| GET | `/shot-lists/:id` | Get with scenes/shots |
| POST | `/shot-lists` | Create new |
| DELETE | `/shot-lists/:id` | Delete |
| POST | `/shot-list-scenes` | Create scene |
| PUT | `/shot-list-scenes/:id` | Update scene |
| DELETE | `/shot-list-scenes/:id` | Delete scene |
| POST | `/shots` | Create shot |
| PUT | `/shots/:id` | Update shot |
| DELETE | `/shots/:id` | Delete shot |
| POST | `/shots/reorder/:sceneId` | Reorder |
| POST | `/shots/:id/duplicate` | Duplicate |
| GET | `/shot-lists/:id/export/pdf` | Export PDF |

---

## Frontend Routes

| Path | Component |
|------|-----------|
| `/shot-lists/:id` | ShotListEditorPage |

Add link from ProjectDetailPage to shot lists.

---

## Execution Order

1. **Run Database Migration** (SHOTLIST_01)
2. **Create Backend Module** (SHOTLIST_02)
3. **Start Backend** - verify endpoints work
4. **Create Frontend Components** (SHOTLIST_03)
5. **Add PDF Export** (SHOTLIST_04)
6. **Test Complete Flow**

---

## Sources
- [StudioBinder Shot List Software](https://www.studiobinder.com/shot-list-storyboard/)
- [StudioBinder Shot List App](https://www.studiobinder.com/shot-list-app/)
- [Shot Lister App](https://www.shotlister.com/)
- [Studiovity Shot List](https://studiovity.com/shotlist-storyboard/)
- [Shot Designer App](https://profilmmakerapps.com/app/shot-designer/)
