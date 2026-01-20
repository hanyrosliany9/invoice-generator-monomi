-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('GENERAL', 'PREPARATION', 'STANDBY', 'BRIEFING', 'REHEARSAL', 'TRANSPORT', 'TECHNICAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "call_sheet_activities" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL DEFAULT 'GENERAL',
    "activityName" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "duration" INTEGER,
    "location" TEXT,
    "personnel" TEXT,
    "responsibleParty" TEXT,
    "technicalNotes" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_sheet_activities_callSheetId_idx" ON "call_sheet_activities"("callSheetId");

-- AddForeignKey
ALTER TABLE "call_sheet_activities" ADD CONSTRAINT "call_sheet_activities_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
