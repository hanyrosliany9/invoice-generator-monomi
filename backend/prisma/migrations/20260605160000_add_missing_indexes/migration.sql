-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "fiscal_periods_status_startDate_endDate_idx" ON "fiscal_periods"("status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "general_ledger_fiscalPeriodId_accountId_postingDate_idx" ON "general_ledger"("fiscalPeriodId", "accountId", "postingDate");

-- CreateIndex
CREATE INDEX "journal_entries_isPosted_fiscalPeriodId_entryDate_idx" ON "journal_entries"("isPosted", "fiscalPeriodId", "entryDate");

-- CreateIndex
CREATE INDEX "journal_line_items_accountId_journalEntryId_idx" ON "journal_line_items"("accountId", "journalEntryId");

-- CreateIndex
CREATE INDEX "media_assets_status_mediaType_idx" ON "media_assets"("status", "mediaType");

-- CreateIndex
CREATE INDEX "quotations_status_createdAt_idx" ON "quotations"("status", "createdAt");

