-- AlterTable
ALTER TABLE "invoices"
  ADD COLUMN "projectMilestoneId" TEXT;

-- CreateIndex
CREATE INDEX "invoices_projectMilestoneId_idx" ON "invoices"("projectMilestoneId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES "project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
