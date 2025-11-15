-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'COMPLETED', 'SENT');

-- CreateTable
CREATE TABLE "social_media_reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "pdfVersion" INTEGER NOT NULL DEFAULT 1,
    "emailedAt" TIMESTAMP(3),
    "emailedTo" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "social_media_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_sections" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "csvFileName" TEXT NOT NULL,
    "csvFilePath" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "columnTypes" JSONB NOT NULL,
    "rawData" JSONB NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "visualizations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_media_reports_projectId_idx" ON "social_media_reports"("projectId");

-- CreateIndex
CREATE INDEX "social_media_reports_status_idx" ON "social_media_reports"("status");

-- CreateIndex
CREATE INDEX "social_media_reports_year_month_idx" ON "social_media_reports"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "social_media_reports_projectId_year_month_key" ON "social_media_reports"("projectId", "year", "month");

-- CreateIndex
CREATE INDEX "report_sections_reportId_order_idx" ON "report_sections"("reportId", "order");

-- AddForeignKey
ALTER TABLE "social_media_reports" ADD CONSTRAINT "social_media_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "social_media_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
