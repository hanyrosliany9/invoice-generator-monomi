-- CreateEnum
CREATE TYPE "StripType" AS ENUM ('SCENE', 'BANNER');

-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('DAY_BREAK', 'MEAL_BREAK', 'COMPANY_MOVE', 'NOTE');

-- CreateEnum
CREATE TYPE "CallSheetStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'UPDATED');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ON_SET', 'WRAPPED');

-- CreateTable
CREATE TABLE "shooting_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "shotListId" TEXT,
    "createdById" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "pagesPerDay" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shooting_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shoot_days" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "shootDate" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shoot_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_strips" (
    "id" TEXT NOT NULL,
    "shootDayId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "stripType" "StripType" NOT NULL DEFAULT 'SCENE',
    "sceneId" TEXT,
    "sceneNumber" TEXT,
    "sceneName" TEXT,
    "intExt" TEXT,
    "dayNight" TEXT,
    "location" TEXT,
    "pageCount" DOUBLE PRECISION,
    "estimatedTime" INTEGER,
    "bannerType" "BannerType",
    "bannerText" TEXT,
    "bannerColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_strips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sheets" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "shootDayId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "callSheetNumber" INTEGER NOT NULL DEFAULT 1,
    "productionName" TEXT,
    "director" TEXT,
    "producer" TEXT,
    "shootDate" TIMESTAMP(3) NOT NULL,
    "generalCallTime" TEXT,
    "firstShotTime" TEXT,
    "wrapTime" TEXT,
    "locationName" TEXT,
    "locationAddress" TEXT,
    "parkingNotes" TEXT,
    "mapUrl" TEXT,
    "weatherHigh" INTEGER,
    "weatherLow" INTEGER,
    "weatherCondition" TEXT,
    "sunrise" TEXT,
    "sunset" TEXT,
    "nearestHospital" TEXT,
    "hospitalAddress" TEXT,
    "hospitalPhone" TEXT,
    "generalNotes" TEXT,
    "productionNotes" TEXT,
    "status" "CallSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sheet_cast" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "castNumber" TEXT,
    "actorName" TEXT NOT NULL,
    "character" TEXT,
    "pickupTime" TEXT,
    "callTime" TEXT NOT NULL,
    "onSetTime" TEXT,
    "notes" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_cast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sheet_crew" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "department" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "callTime" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_crew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sheet_scenes" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "sceneNumber" TEXT NOT NULL,
    "sceneName" TEXT,
    "intExt" TEXT,
    "dayNight" TEXT,
    "location" TEXT,
    "pageCount" DOUBLE PRECISION,
    "castIds" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shooting_schedules_projectId_idx" ON "shooting_schedules"("projectId");

-- CreateIndex
CREATE INDEX "shoot_days_scheduleId_idx" ON "shoot_days"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_strips_shootDayId_idx" ON "schedule_strips"("shootDayId");

-- CreateIndex
CREATE UNIQUE INDEX "call_sheets_shootDayId_key" ON "call_sheets"("shootDayId");

-- CreateIndex
CREATE INDEX "call_sheets_scheduleId_idx" ON "call_sheets"("scheduleId");

-- CreateIndex
CREATE INDEX "call_sheet_cast_callSheetId_idx" ON "call_sheet_cast"("callSheetId");

-- CreateIndex
CREATE INDEX "call_sheet_crew_callSheetId_idx" ON "call_sheet_crew"("callSheetId");

-- CreateIndex
CREATE INDEX "call_sheet_scenes_callSheetId_idx" ON "call_sheet_scenes"("callSheetId");

-- AddForeignKey
ALTER TABLE "shooting_schedules" ADD CONSTRAINT "shooting_schedules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shooting_schedules" ADD CONSTRAINT "shooting_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shoot_days" ADD CONSTRAINT "shoot_days_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "shooting_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_strips" ADD CONSTRAINT "schedule_strips_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "shoot_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheets" ADD CONSTRAINT "call_sheets_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "shooting_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheets" ADD CONSTRAINT "call_sheets_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "shoot_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheets" ADD CONSTRAINT "call_sheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_cast" ADD CONSTRAINT "call_sheet_cast_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_crew" ADD CONSTRAINT "call_sheet_crew_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_scenes" ADD CONSTRAINT "call_sheet_scenes_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

