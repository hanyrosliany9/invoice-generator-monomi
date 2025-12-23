-- Add new fields to CallSheet for day context and enhanced times
ALTER TABLE "call_sheets" ADD COLUMN "dayNumber" INTEGER;
ALTER TABLE "call_sheets" ADD COLUMN "totalDays" INTEGER;
ALTER TABLE "call_sheets" ADD COLUMN "crewCallTime" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "estimatedWrap" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "lunchTime" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "advanceNotes" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "safetyNotes" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "announcements" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "walkieChannels" TEXT;

-- Add new fields to CallSheetCast for enhanced timing and status
ALTER TABLE "call_sheet_cast" ADD COLUMN "muCallTime" TEXT;
ALTER TABLE "call_sheet_cast" ADD COLUMN "wrapTime" TEXT;

-- Create enum for CastWorkStatus
CREATE TYPE "CastWorkStatus" AS ENUM ('SW', 'W', 'WF', 'SWF', 'H');

-- Add workStatus and other new fields to CallSheetCast
ALTER TABLE "call_sheet_cast" ADD COLUMN "workStatus" "CastWorkStatus" NOT NULL DEFAULT 'W';
ALTER TABLE "call_sheet_cast" ADD COLUMN "transportMode" TEXT;
ALTER TABLE "call_sheet_cast" ADD COLUMN "muDuration" INTEGER;
ALTER TABLE "call_sheet_cast" ADD COLUMN "wardrobeNotes" TEXT;
ALTER TABLE "call_sheet_cast" ADD COLUMN "isMinor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "call_sheet_cast" ADD COLUMN "hasStunt" BOOLEAN NOT NULL DEFAULT false;

-- Add new fields to CallSheetCrew for staggered call times
ALTER TABLE "call_sheet_crew" ADD COLUMN "callTimeOffset" INTEGER;
ALTER TABLE "call_sheet_crew" ADD COLUMN "reportLocation" TEXT;

-- Create MealType enum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'SECOND_MEAL', 'CRAFT_SERVICES', 'CATERING');

-- Create CallSheetMeal table
CREATE TABLE "call_sheet_meals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callSheetId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "location" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "call_sheet_meals_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for CallSheetMeal
CREATE INDEX "call_sheet_meals_callSheetId_idx" ON "call_sheet_meals"("callSheetId");

-- Create CallSheetMove table
CREATE TABLE "call_sheet_moves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callSheetId" TEXT NOT NULL,
    "departTime" TEXT NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "travelTime" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "call_sheet_moves_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for CallSheetMove
CREATE INDEX "call_sheet_moves_callSheetId_idx" ON "call_sheet_moves"("callSheetId");

-- Create SpecialReqType enum
CREATE TYPE "SpecialReqType" AS ENUM ('STUNTS', 'MINORS', 'ANIMALS', 'VEHICLES', 'SFX_PYRO', 'WATER_WORK', 'AERIAL_DRONE', 'WEAPONS', 'NUDITY', 'OTHER');

-- Create CallSheetSpecialReq table
CREATE TABLE "call_sheet_special_reqs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callSheetId" TEXT NOT NULL,
    "reqType" "SpecialReqType" NOT NULL,
    "description" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "safetyNotes" TEXT,
    "scenes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "call_sheet_special_reqs_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for CallSheetSpecialReq
CREATE INDEX "call_sheet_special_reqs_callSheetId_idx" ON "call_sheet_special_reqs"("callSheetId");

-- Create CallSheetBackground table
CREATE TABLE "call_sheet_background" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callSheetId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "callTime" TEXT NOT NULL,
    "reportLocation" TEXT,
    "wardrobeNotes" TEXT,
    "scenes" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "call_sheet_background_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for CallSheetBackground
CREATE INDEX "call_sheet_background_callSheetId_idx" ON "call_sheet_background"("callSheetId");
