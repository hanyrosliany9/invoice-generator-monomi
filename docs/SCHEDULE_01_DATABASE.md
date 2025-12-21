# Shooting Schedule & Call Sheet - Database Schema

## Task: Add Prisma models for Shooting Schedule and Call Sheet

### File: `backend/prisma/schema.prisma`

Add at end of file:

```prisma
// ============================================
// SHOOTING SCHEDULE MODELS
// ============================================

model ShootingSchedule {
  id          String   @id @default(cuid())
  name        String
  description String?
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  shotListId  String?  // Optional link to shot list
  createdById String
  createdBy   User     @relation("ScheduleCreator", fields: [createdById], references: [id])

  // Settings
  startDate   DateTime?
  pagesPerDay Float    @default(5)  // Estimated pages per day

  shootDays   ShootDay[]
  callSheets  CallSheet[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
  @@map("shooting_schedules")
}

model ShootDay {
  id          String           @id @default(cuid())
  scheduleId  String
  schedule    ShootingSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  dayNumber   Int              // Day 1, Day 2, etc.
  shootDate   DateTime?        // Actual date if set
  location    String?          // Main location for the day
  notes       String?
  order       Int              @default(0)

  strips      ScheduleStrip[]
  callSheet   CallSheet?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([scheduleId])
  @@map("shoot_days")
}

model ScheduleStrip {
  id          String    @id @default(cuid())
  shootDayId  String
  shootDay    ShootDay  @relation(fields: [shootDayId], references: [id], onDelete: Cascade)
  order       Int       @default(0)

  // Strip type
  stripType   StripType @default(SCENE)

  // Scene reference (if SCENE type)
  sceneId     String?   // Reference to ShotListScene

  // Scene data (denormalized for display)
  sceneNumber String?
  sceneName   String?
  intExt      String?   // INT / EXT
  dayNight    String?   // DAY / NIGHT
  location    String?
  pageCount   Float?    // 1/8 pages (e.g., 2.5 = 2 4/8)
  estimatedTime Int?    // Minutes

  // Banner data (if BANNER type)
  bannerType  BannerType?
  bannerText  String?
  bannerColor String?   // Hex color

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shootDayId])
  @@map("schedule_strips")
}

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

// ============================================
// CALL SHEET MODELS
// ============================================

model CallSheet {
  id            String           @id @default(cuid())
  scheduleId    String
  schedule      ShootingSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  shootDayId    String           @unique
  shootDay      ShootDay         @relation(fields: [shootDayId], references: [id], onDelete: Cascade)
  createdById   String
  createdBy     User             @relation("CallSheetCreator", fields: [createdById], references: [id])

  // Header Info
  callSheetNumber Int            @default(1)
  productionName  String?
  director        String?
  producer        String?

  // Date & Time
  shootDate       DateTime
  generalCallTime String?        // e.g., "7:00 AM"
  firstShotTime   String?        // e.g., "8:00 AM"
  wrapTime        String?        // Estimated wrap

  // Location
  locationName    String?
  locationAddress String?
  parkingNotes    String?
  mapUrl          String?

  // Weather (optional integration)
  weatherHigh     Int?
  weatherLow      Int?
  weatherCondition String?
  sunrise         String?
  sunset          String?

  // Emergency
  nearestHospital String?
  hospitalAddress String?
  hospitalPhone   String?

  // Notes
  generalNotes    String?
  productionNotes String?

  // Status
  status          CallSheetStatus @default(DRAFT)
  sentAt          DateTime?

  // Relations
  castCalls       CallSheetCast[]
  crewCalls       CallSheetCrew[]
  scenes          CallSheetScene[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([scheduleId])
  @@map("call_sheets")
}

model CallSheetCast {
  id          String    @id @default(cuid())
  callSheetId String
  callSheet   CallSheet @relation(fields: [callSheetId], references: [id], onDelete: Cascade)
  order       Int       @default(0)

  // Cast info
  castNumber  String?   // #1, #2, etc.
  actorName   String
  character   String?

  // Times
  pickupTime  String?   // e.g., "5:30 AM"
  callTime    String    // e.g., "6:00 AM"
  onSetTime   String?   // e.g., "7:30 AM"

  // Notes
  notes       String?
  status      CallStatus @default(PENDING)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([callSheetId])
  @@map("call_sheet_cast")
}

model CallSheetCrew {
  id          String    @id @default(cuid())
  callSheetId String
  callSheet   CallSheet @relation(fields: [callSheetId], references: [id], onDelete: Cascade)
  order       Int       @default(0)

  // Crew info
  department  String    // e.g., "Camera", "Grip", "Art"
  position    String    // e.g., "DP", "1st AC", "Gaffer"
  name        String

  // Times
  callTime    String    // e.g., "6:30 AM"

  // Contact
  phone       String?
  email       String?

  // Notes
  notes       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([callSheetId])
  @@map("call_sheet_crew")
}

model CallSheetScene {
  id          String    @id @default(cuid())
  callSheetId String
  callSheet   CallSheet @relation(fields: [callSheetId], references: [id], onDelete: Cascade)
  order       Int       @default(0)

  // Scene info (from schedule strip)
  sceneNumber String
  sceneName   String?
  intExt      String?
  dayNight    String?
  location    String?
  pageCount   Float?

  // Cast in scene
  castIds     String?   // Comma-separated cast numbers: "1,2,5"

  // Notes
  description String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([callSheetId])
  @@map("call_sheet_scenes")
}

enum CallSheetStatus {
  DRAFT
  READY
  SENT
  UPDATED
}

enum CallStatus {
  PENDING
  CONFIRMED
  ON_SET
  WRAPPED
}
```

### Add Relations to Existing Models

Find `model Project` and add:
```prisma
  shootingSchedules  ShootingSchedule[]
```

Find `model User` and add:
```prisma
  shootingSchedules  ShootingSchedule[]  @relation("ScheduleCreator")
  callSheets         CallSheet[]         @relation("CallSheetCreator")
```

---

## Run Migration

```bash
cd backend && npx prisma migrate dev --name add_schedule_callsheet_models
```

---

## Verification

After migration, verify tables exist:
```bash
docker compose -f docker-compose.dev.yml exec db psql -U invoiceuser -d invoices -c "\dt *schedule* *call* *strip*"
```

Expected tables:
```
shooting_schedules
shoot_days
schedule_strips
call_sheets
call_sheet_cast
call_sheet_crew
call_sheet_scenes
```
