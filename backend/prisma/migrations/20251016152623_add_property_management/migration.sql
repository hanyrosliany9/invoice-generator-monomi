-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'CHECKED_OUT', 'IN_MAINTENANCE', 'BROKEN', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'BROKEN');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MaintenanceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AS_NEEDED');

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "specifications" JSONB,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePrice" DECIMAL(15,2) NOT NULL,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "warrantyExpiration" TIMESTAMP(3),
    "currentValue" DECIMAL(15,2),
    "notesFinancial" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT,
    "photos" TEXT[],
    "documents" TEXT[],
    "qrCode" TEXT,
    "rfidTag" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_reservations" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "frequency" "MaintenanceFrequency" NOT NULL,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "performedDate" TIMESTAMP(3) NOT NULL,
    "performedBy" TEXT,
    "cost" DECIMAL(15,2),
    "description" TEXT NOT NULL,
    "partsReplaced" JSONB,
    "nextMaintenanceDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_kits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_kit_items" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "asset_kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_equipment_usage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "returnDate" TIMESTAMP(3),
    "condition" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_equipment_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetCode_key" ON "assets"("assetCode");

-- CreateIndex
CREATE INDEX "assets_assetCode_idx" ON "assets"("assetCode");

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_condition_idx" ON "assets"("condition");

-- CreateIndex
CREATE INDEX "assets_createdById_idx" ON "assets"("createdById");

-- CreateIndex
CREATE INDEX "assets_createdAt_idx" ON "assets"("createdAt");

-- CreateIndex
CREATE INDEX "assets_category_status_idx" ON "assets"("category", "status");

-- CreateIndex
CREATE INDEX "assets_status_condition_idx" ON "assets"("status", "condition");

-- CreateIndex
CREATE INDEX "asset_reservations_assetId_idx" ON "asset_reservations"("assetId");

-- CreateIndex
CREATE INDEX "asset_reservations_userId_idx" ON "asset_reservations"("userId");

-- CreateIndex
CREATE INDEX "asset_reservations_projectId_idx" ON "asset_reservations"("projectId");

-- CreateIndex
CREATE INDEX "asset_reservations_status_idx" ON "asset_reservations"("status");

-- CreateIndex
CREATE INDEX "asset_reservations_startDate_idx" ON "asset_reservations"("startDate");

-- CreateIndex
CREATE INDEX "asset_reservations_endDate_idx" ON "asset_reservations"("endDate");

-- CreateIndex
CREATE INDEX "asset_reservations_assetId_startDate_endDate_idx" ON "asset_reservations"("assetId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "asset_reservations_assetId_status_idx" ON "asset_reservations"("assetId", "status");

-- CreateIndex
CREATE INDEX "maintenance_schedules_assetId_idx" ON "maintenance_schedules"("assetId");

-- CreateIndex
CREATE INDEX "maintenance_schedules_nextMaintenanceDate_idx" ON "maintenance_schedules"("nextMaintenanceDate");

-- CreateIndex
CREATE INDEX "maintenance_schedules_isActive_idx" ON "maintenance_schedules"("isActive");

-- CreateIndex
CREATE INDEX "maintenance_schedules_isActive_nextMaintenanceDate_idx" ON "maintenance_schedules"("isActive", "nextMaintenanceDate");

-- CreateIndex
CREATE INDEX "maintenance_records_assetId_idx" ON "maintenance_records"("assetId");

-- CreateIndex
CREATE INDEX "maintenance_records_performedDate_idx" ON "maintenance_records"("performedDate");

-- CreateIndex
CREATE INDEX "maintenance_records_maintenanceType_idx" ON "maintenance_records"("maintenanceType");

-- CreateIndex
CREATE INDEX "asset_kits_isActive_idx" ON "asset_kits"("isActive");

-- CreateIndex
CREATE INDEX "asset_kit_items_kitId_idx" ON "asset_kit_items"("kitId");

-- CreateIndex
CREATE INDEX "asset_kit_items_assetId_idx" ON "asset_kit_items"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_kit_items_kitId_assetId_key" ON "asset_kit_items"("kitId", "assetId");

-- CreateIndex
CREATE INDEX "project_equipment_usage_projectId_idx" ON "project_equipment_usage"("projectId");

-- CreateIndex
CREATE INDEX "project_equipment_usage_assetId_idx" ON "project_equipment_usage"("assetId");

-- CreateIndex
CREATE INDEX "project_equipment_usage_startDate_idx" ON "project_equipment_usage"("startDate");

-- CreateIndex
CREATE INDEX "project_equipment_usage_returnDate_idx" ON "project_equipment_usage"("returnDate");

-- CreateIndex
CREATE INDEX "project_equipment_usage_assetId_startDate_idx" ON "project_equipment_usage"("assetId", "startDate");

-- CreateIndex
CREATE INDEX "project_equipment_usage_projectId_assetId_idx" ON "project_equipment_usage"("projectId", "assetId");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_kit_items" ADD CONSTRAINT "asset_kit_items_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "asset_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_kit_items" ADD CONSTRAINT "asset_kit_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_equipment_usage" ADD CONSTRAINT "project_equipment_usage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_equipment_usage" ADD CONSTRAINT "project_equipment_usage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
