# Shooting Schedule & Call Sheet - Master Plan

## Overview
Create dedicated modules for Shooting Schedule (Stripboard) and Call Sheet generation, inspired by industry-standard tools like [StudioBinder](https://www.studiobinder.com/film-scheduling-software/) and [SetHero](https://sethero.com/).

## Why Separate Modules?
- **Shooting Schedule**: Production planning tool for organizing scenes across shoot days
- **Call Sheet**: Daily communication document sent to cast/crew with call times, locations, schedule

These are complementary but distinct workflows:
1. Schedule = "Which scenes shoot on which days?"
2. Call Sheet = "What does everyone need to know for TODAY?"

---

## Implementation Files

Execute in order:

| # | File | Tasks | Est. Lines |
|---|------|-------|------------|
| 1 | [SCHEDULE_01_DATABASE.md](./SCHEDULE_01_DATABASE.md) | Prisma models for Schedule + CallSheet | ~120 |
| 2 | [SCHEDULE_02_BACKEND.md](./SCHEDULE_02_BACKEND.md) | NestJS modules, DTOs, services, controllers | ~450 |
| 3 | [SCHEDULE_03_FRONTEND_SCHEDULE.md](./SCHEDULE_03_FRONTEND_SCHEDULE.md) | Schedule editor with stripboard UI | ~400 |
| 4 | [SCHEDULE_04_FRONTEND_CALLSHEET.md](./SCHEDULE_04_FRONTEND_CALLSHEET.md) | Call sheet editor and viewer | ~350 |
| 5 | [SCHEDULE_05_EXPORT.md](./SCHEDULE_05_EXPORT.md) | PDF export for both modules | ~200 |

---

## Data Model

```
ShootingSchedule (per project)
  └── ShootDay (each shoot day)
        └── ScheduleStrip (scene/banner references)

CallSheet (per shoot day)
  └── CallSheetCast[] (cast call times)
  └── CallSheetCrew[] (crew call times)
  └── CallSheetScene[] (day's scenes)
```

---

## Key Features

### Shooting Schedule (Stripboard)
| Feature | Description |
|---------|-------------|
| Scene Strips | Colored strips per scene from shot list |
| Drag & Drop | Reorder scenes within/between days |
| Day Breaks | Automatic/manual shoot day separation |
| Banners | Meal breaks, company moves, notes |
| Auto-Schedule | Sort by location, INT/EXT, day/night |
| Duration Calc | Estimate page count / shoot time |
| Reports | One-liner, DOOD Report |

### Call Sheet
| Feature | Description |
|---------|-------------|
| Header | Production info, date, weather |
| Cast Times | Individual call times per cast member |
| Crew Times | Call times by department |
| Schedule | Day's scenes with details |
| Location | Address, parking, maps link |
| Notes | General/department bulletins |
| Emergency | Nearest hospital info |
| PDF Export | Professional formatted output |
| Email Send | Send to cast/crew (future) |

---

## Tech Stack
- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: React + Ant Design + dnd-kit
- **Export**: Puppeteer for PDF
- **Weather**: OpenWeatherMap API (optional)

---

## API Routes

### Shooting Schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schedules?projectId=` | List by project |
| GET | `/schedules/:id` | Get with days/strips |
| POST | `/schedules` | Create new |
| PUT | `/schedules/:id` | Update |
| DELETE | `/schedules/:id` | Delete |
| POST | `/schedules/:id/days` | Add shoot day |
| PUT | `/schedules/days/:id` | Update shoot day |
| DELETE | `/schedules/days/:id` | Delete shoot day |
| POST | `/schedules/strips` | Add strip |
| PUT | `/schedules/strips/:id` | Update strip |
| DELETE | `/schedules/strips/:id` | Delete strip |
| POST | `/schedules/strips/reorder` | Reorder strips |
| POST | `/schedules/:id/auto-schedule` | Auto-schedule scenes |
| GET | `/schedules/:id/export/pdf` | Export PDF |

### Call Sheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/call-sheets?scheduleId=` | List by schedule |
| GET | `/call-sheets/:id` | Get full call sheet |
| POST | `/call-sheets` | Create from shoot day |
| PUT | `/call-sheets/:id` | Update |
| DELETE | `/call-sheets/:id` | Delete |
| POST | `/call-sheets/:id/cast` | Add cast member |
| PUT | `/call-sheets/cast/:id` | Update cast call |
| DELETE | `/call-sheets/cast/:id` | Remove cast |
| POST | `/call-sheets/:id/crew` | Add crew member |
| PUT | `/call-sheets/crew/:id` | Update crew call |
| DELETE | `/call-sheets/crew/:id` | Remove crew |
| GET | `/call-sheets/:id/export/pdf` | Export PDF |

---

## Frontend Routes

| Path | Component |
|------|-----------|
| `/schedules/:id` | ShootingSchedulePage |
| `/call-sheets/:id` | CallSheetEditorPage |
| `/call-sheets/:id/view` | CallSheetViewPage (read-only) |

Add links from ProjectDetailPage.

---

## Execution Order

1. **Run Database Migration** (SCHEDULE_01)
2. **Create Backend Modules** (SCHEDULE_02)
3. **Start Backend** - verify endpoints
4. **Create Schedule Frontend** (SCHEDULE_03)
5. **Create Call Sheet Frontend** (SCHEDULE_04)
6. **Add PDF Export** (SCHEDULE_05)
7. **Test Complete Flow**

---

## Integration Points

- **Shot List**: Import scenes from existing shot list
- **Projects**: Link schedules to project
- **Users**: Cast/crew from project team (future)

---

## Sources
- [StudioBinder Film Scheduling Software](https://www.studiobinder.com/film-scheduling-software/)
- [StudioBinder Call Sheet Builder](https://www.studiobinder.com/call-sheet-builder/)
- [SetHero Call Sheet Software](https://sethero.com/)
- [Shot Lister App](https://www.shotlister.com/)
- [Filmustage Shooting Schedules](https://filmustage.com/shooting-schedules/)
- [MasterClass Call Sheet Guide](https://www.masterclass.com/articles/how-to-make-a-call-sheet-for-a-film)
