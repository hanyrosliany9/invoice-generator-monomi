-- CreateEnum
CREATE TYPE "ShotStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'SHOT', 'WRAPPED', 'CUT');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('MEETING', 'PROJECT_WORK', 'MILESTONE', 'TASK', 'REMINDER', 'PHOTOSHOOT', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- AlterTable
ALTER TABLE "call_sheet_cast" ADD COLUMN     "fittingTime" TEXT;

-- AlterTable
ALTER TABLE "call_sheets" ADD COLUMN     "artNotes" TEXT,
ADD COLUMN     "basecamp" TEXT,
ADD COLUMN     "bathrooms" TEXT,
ADD COLUMN     "cameraGripNotes" TEXT,
ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "crewParking" TEXT,
ADD COLUMN     "firstAd" TEXT,
ADD COLUMN     "lunchLocation" TEXT,
ADD COLUMN     "productionOfficePhone" TEXT,
ADD COLUMN     "scheduleVersion" TEXT,
ADD COLUMN     "scriptVersion" TEXT,
ADD COLUMN     "secondAd" TEXT,
ADD COLUMN     "secondAdPhone" TEXT,
ADD COLUMN     "setMedic" TEXT,
ADD COLUMN     "setMedicPhone" TEXT,
ADD COLUMN     "stuntNotes" TEXT,
ADD COLUMN     "upm" TEXT,
ADD COLUMN     "vehicleNotes" TEXT,
ADD COLUMN     "workingTrucks" TEXT;

-- AlterTable
ALTER TABLE "schedule_strips" ADD COLUMN     "backgroundCallTime" TEXT,
ADD COLUMN     "backgroundDescription" TEXT,
ADD COLUMN     "backgroundNotes" TEXT,
ADD COLUMN     "backgroundQty" INTEGER,
ADD COLUMN     "backgroundWardrobe" TEXT,
ADD COLUMN     "hasAnimals" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasMinors" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSfx" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasStunts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasVehicles" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWaterWork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mealDuration" INTEGER,
ADD COLUMN     "mealLocation" TEXT,
ADD COLUMN     "mealTime" TEXT,
ADD COLUMN     "mealType" TEXT,
ADD COLUMN     "moveFromLocation" TEXT,
ADD COLUMN     "moveNotes" TEXT,
ADD COLUMN     "moveTime" TEXT,
ADD COLUMN     "moveToLocation" TEXT,
ADD COLUMN     "moveTravelTime" INTEGER,
ADD COLUMN     "specialReqContact" TEXT,
ADD COLUMN     "specialReqNotes" TEXT;

-- CreateTable
CREATE TABLE "shot_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shot_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shot_list_scenes" (
    "id" TEXT NOT NULL,
    "shotListId" TEXT NOT NULL,
    "sceneNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "intExt" TEXT,
    "dayNight" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shot_list_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shots" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "shotNumber" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "shotSize" TEXT,
    "shotType" TEXT,
    "cameraAngle" TEXT,
    "cameraMovement" TEXT,
    "lens" TEXT,
    "frameRate" TEXT,
    "camera" TEXT,
    "description" TEXT,
    "action" TEXT,
    "dialogue" TEXT,
    "notes" TEXT,
    "storyboardUrl" TEXT,
    "storyboardKey" TEXT,
    "setupNumber" INTEGER,
    "estimatedTime" INTEGER,
    "status" "ShotStatus" NOT NULL DEFAULT 'PLANNED',
    "vfx" TEXT,
    "sfx" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sheet_standins" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "forActor" TEXT NOT NULL,
    "callTime" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_standins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sheet_advance_days" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "estCall" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_advance_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sheet_advance_scenes" (
    "id" TEXT NOT NULL,
    "advanceDayId" TEXT NOT NULL,
    "sceneNumber" TEXT NOT NULL,
    "sceneName" TEXT,
    "castIds" TEXT,
    "dayNight" TEXT,
    "location" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_advance_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "category" "EventCategory" NOT NULL DEFAULT 'OTHER',
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "color" TEXT,
    "priority" "MilestonePriority" NOT NULL DEFAULT 'MEDIUM',
    "projectId" TEXT,
    "milestoneId" TEXT,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "assigneeId" TEXT,
    "recurrence" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendeeStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reminders" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shot_lists_projectId_idx" ON "shot_lists"("projectId");

-- CreateIndex
CREATE INDEX "shot_list_scenes_shotListId_idx" ON "shot_list_scenes"("shotListId");

-- CreateIndex
CREATE INDEX "shots_sceneId_idx" ON "shots"("sceneId");

-- CreateIndex
CREATE INDEX "call_sheet_standins_callSheetId_idx" ON "call_sheet_standins"("callSheetId");

-- CreateIndex
CREATE INDEX "call_sheet_advance_days_callSheetId_idx" ON "call_sheet_advance_days"("callSheetId");

-- CreateIndex
CREATE INDEX "call_sheet_advance_scenes_advanceDayId_idx" ON "call_sheet_advance_scenes"("advanceDayId");

-- CreateIndex
CREATE INDEX "calendar_events_startTime_endTime_idx" ON "calendar_events"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "calendar_events_createdById_idx" ON "calendar_events"("createdById");

-- CreateIndex
CREATE INDEX "calendar_events_assigneeId_idx" ON "calendar_events"("assigneeId");

-- CreateIndex
CREATE INDEX "calendar_events_projectId_idx" ON "calendar_events"("projectId");

-- CreateIndex
CREATE INDEX "calendar_events_category_idx" ON "calendar_events"("category");

-- CreateIndex
CREATE INDEX "event_attendees_eventId_idx" ON "event_attendees"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendees_eventId_userId_key" ON "event_attendees"("eventId", "userId");

-- CreateIndex
CREATE INDEX "event_reminders_eventId_idx" ON "event_reminders"("eventId");

-- AddForeignKey
ALTER TABLE "shot_lists" ADD CONSTRAINT "shot_lists_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_lists" ADD CONSTRAINT "shot_lists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_list_scenes" ADD CONSTRAINT "shot_list_scenes_shotListId_fkey" FOREIGN KEY ("shotListId") REFERENCES "shot_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "shot_list_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_standins" ADD CONSTRAINT "call_sheet_standins_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_advance_days" ADD CONSTRAINT "call_sheet_advance_days_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_advance_scenes" ADD CONSTRAINT "call_sheet_advance_scenes_advanceDayId_fkey" FOREIGN KEY ("advanceDayId") REFERENCES "call_sheet_advance_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

