# Shot List - Database Schema

## Task: Add Prisma models for Shot List

### File: `backend/prisma/schema.prisma`

Add at end of file:

```prisma
// ============================================
// SHOT LIST MODELS
// ============================================

model ShotList {
  id          String   @id @default(cuid())
  name        String
  description String?
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdById String
  createdBy   User     @relation("ShotListCreator", fields: [createdById], references: [id])

  scenes      ShotListScene[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
  @@map("shot_lists")
}

model ShotListScene {
  id          String   @id @default(cuid())
  shotListId  String
  shotList    ShotList @relation(fields: [shotListId], references: [id], onDelete: Cascade)
  sceneNumber String
  name        String
  location    String?
  intExt      String?  // INT / EXT
  dayNight    String?  // DAY / NIGHT
  description String?
  order       Int      @default(0)

  shots       Shot[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([shotListId])
  @@map("shot_list_scenes")
}

model Shot {
  id              String         @id @default(cuid())
  sceneId         String
  scene           ShotListScene  @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  shotNumber      String
  order           Int            @default(0)

  // Shot Specs
  shotSize        String?        // WIDE, MEDIUM, CLOSE-UP, EXTREME CLOSE-UP, etc.
  shotType        String?        // MASTER, SINGLE, TWO-SHOT, OTS, POV, INSERT, etc.
  cameraAngle     String?        // EYE LEVEL, LOW ANGLE, HIGH ANGLE, DUTCH, BIRD'S EYE, etc.
  cameraMovement  String?        // STATIC, PAN, TILT, DOLLY, TRACK, CRANE, HANDHELD, STEADICAM, etc.
  lens            String?        // 24mm, 35mm, 50mm, 85mm, etc.
  frameRate       String?        // 24fps, 30fps, 60fps, 120fps
  camera          String?        // A CAM, B CAM, C CAM

  // Content
  description     String?
  action          String?
  dialogue        String?
  notes           String?

  // Storyboard
  storyboardUrl   String?
  storyboardKey   String?

  // Production
  setupNumber     Int?           // Camera/lighting setup group
  estimatedTime   Int?           // Seconds
  status          ShotStatus     @default(PLANNED)

  // VFX/SFX
  vfx             String?
  sfx             String?

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([sceneId])
  @@map("shots")
}

enum ShotStatus {
  PLANNED
  IN_PROGRESS
  SHOT
  WRAPPED
  CUT
}
```

### Add Relations to Existing Models

Find `model Project` and add:
```prisma
  shotLists     ShotList[]
```

Find `model User` and add:
```prisma
  shotLists     ShotList[]     @relation("ShotListCreator")
```

---

## Run Migration

```bash
cd backend && npx prisma migrate dev --name add_shot_list_models
```

---

## Verification

After migration, verify tables exist:
```bash
docker compose -f docker-compose.dev.yml exec db psql -U invoiceuser -d invoices -c "\dt shot*"
```

Expected output:
```
        List of relations
 Schema |       Name        | Type
--------+-------------------+-------
 public | shot_list_scenes  | table
 public | shot_lists        | table
 public | shots             | table
```
