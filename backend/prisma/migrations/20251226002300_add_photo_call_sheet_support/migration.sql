-- CreateEnum for CallSheetType
CREATE TYPE "CallSheetType" AS ENUM ('FILM', 'PHOTO');

-- CreateEnum for ModelArrivalType
CREATE TYPE "ModelArrivalType" AS ENUM ('CAMERA_READY', 'STYLED');

-- CreateEnum for WardrobeStatus
CREATE TYPE "WardrobeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ON_SET', 'IN_USE', 'WRAPPED');

-- CreateEnum for HMURole
CREATE TYPE "HMURole" AS ENUM ('HAIR', 'MAKEUP', 'BOTH', 'KEY_STYLIST');

-- AlterTable "call_sheets" - Add photo-specific fields and make schedule references optional
ALTER TABLE "call_sheets" ADD COLUMN "callSheetType" "CallSheetType" NOT NULL DEFAULT 'FILM';
ALTER TABLE "call_sheets" ADD COLUMN "photographer" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "artDirector" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "stylist" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "hmuLead" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "clientName" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "clientContact" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "clientPhone" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "agencyName" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "moodBoardUrl" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "totalLooks" INTEGER;
ALTER TABLE "call_sheets" ADD COLUMN "sessionType" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "deliverables" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "wardrobeProvider" TEXT;
ALTER TABLE "call_sheets" ADD COLUMN "stylingNotes" TEXT;

-- Make scheduleId optional for photo call sheets
ALTER TABLE "call_sheets" ALTER COLUMN "scheduleId" DROP NOT NULL;

-- Make shootDayId optional for photo call sheets
-- PostgreSQL unique constraints allow multiple NULLs, so the existing constraint is fine
ALTER TABLE "call_sheets" ALTER COLUMN "shootDayId" DROP NOT NULL;

-- CreateTable "call_sheet_shots"
CREATE TABLE "call_sheet_shots" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "shotNumber" INTEGER NOT NULL,
    "shotName" TEXT,
    "lookReference" TEXT,
    "description" TEXT,
    "setupLocation" TEXT,
    "estStartTime" TEXT,
    "estDuration" INTEGER,
    "wardrobeNotes" TEXT,
    "hmuNotes" TEXT,
    "modelIds" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_shots_pkey" PRIMARY KEY ("id")
);

-- CreateTable "call_sheet_models"
CREATE TABLE "call_sheet_models" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelNumber" TEXT,
    "agencyName" TEXT,
    "arrivalType" "ModelArrivalType" NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "hmuStartTime" TEXT,
    "cameraReadyTime" TEXT,
    "hmuArtist" TEXT,
    "hmuDuration" INTEGER,
    "wardrobeSizes" TEXT,
    "shotNumbers" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable "call_sheet_wardrobe"
CREATE TABLE "call_sheet_wardrobe" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "brand" TEXT,
    "size" TEXT,
    "color" TEXT,
    "providedBy" TEXT,
    "forModel" TEXT,
    "forShot" TEXT,
    "status" "WardrobeStatus" NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_wardrobe_pkey" PRIMARY KEY ("id")
);

-- CreateTable "call_sheet_hmu"
CREATE TABLE "call_sheet_hmu" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "artistRole" "HMURole" NOT NULL,
    "stationNumber" INTEGER,
    "callTime" TEXT NOT NULL,
    "availableFrom" TEXT,
    "availableUntil" TEXT,
    "assignedModels" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_hmu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_sheet_shots_callSheetId_idx" ON "call_sheet_shots"("callSheetId");

-- CreateIndex
CREATE INDEX "call_sheet_models_callSheetId_idx" ON "call_sheet_models"("callSheetId");

-- CreateIndex
CREATE INDEX "call_sheet_wardrobe_callSheetId_idx" ON "call_sheet_wardrobe"("callSheetId");

-- CreateIndex
CREATE INDEX "call_sheet_hmu_callSheetId_idx" ON "call_sheet_hmu"("callSheetId");

-- AddForeignKey
ALTER TABLE "call_sheet_shots" ADD CONSTRAINT "call_sheet_shots_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_models" ADD CONSTRAINT "call_sheet_models_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_wardrobe" ADD CONSTRAINT "call_sheet_wardrobe_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sheet_hmu" ADD CONSTRAINT "call_sheet_hmu_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
