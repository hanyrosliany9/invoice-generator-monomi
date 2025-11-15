-- CreateIndex
CREATE INDEX "payment_milestones_isInvoiced_idx" ON "payment_milestones"("isInvoiced");

-- CreateIndex
CREATE INDEX "payment_milestones_quotationId_isInvoiced_idx" ON "payment_milestones"("quotationId", "isInvoiced");

-- CreateIndex
CREATE INDEX "projects_clientId_status_createdAt_idx" ON "projects"("clientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "quotations_createdBy_idx" ON "quotations"("createdBy");

-- CreateIndex
CREATE INDEX "quotations_createdBy_status_idx" ON "quotations"("createdBy", "status");
