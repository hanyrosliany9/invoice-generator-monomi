--
-- PostgreSQL database dump
--

\restrict FYB29cRzdNcKWqAZBBwHPtAbDYIHtCJ7a2wyYUbc6oVrcAgX311m4BBSJ1GEVbu

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.work_in_progress DROP CONSTRAINT IF EXISTS "work_in_progress_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.work_in_progress DROP CONSTRAINT IF EXISTS "work_in_progress_fiscalPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_payments DROP CONSTRAINT IF EXISTS "vendor_payments_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_payment_allocations DROP CONSTRAINT IF EXISTS "vendor_payment_allocations_paymentId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_payment_allocations DROP CONSTRAINT IF EXISTS "vendor_payment_allocations_apId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_invoices DROP CONSTRAINT IF EXISTS "vendor_invoices_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_invoices DROP CONSTRAINT IF EXISTS "vendor_invoices_poId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_invoices DROP CONSTRAINT IF EXISTS "vendor_invoices_grId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_invoices DROP CONSTRAINT IF EXISTS "vendor_invoices_accountsPayableId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_invoice_items DROP CONSTRAINT IF EXISTS "vendor_invoice_items_viId_fkey";
ALTER TABLE IF EXISTS ONLY public.vendor_invoice_items DROP CONSTRAINT IF EXISTS "vendor_invoice_items_poItemId_fkey";
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS "user_preferences_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.social_media_reports DROP CONSTRAINT IF EXISTS "social_media_reports_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.report_sections DROP CONSTRAINT IF EXISTS "report_sections_reportId_fkey";
ALTER TABLE IF EXISTS ONLY public.quotations DROP CONSTRAINT IF EXISTS "quotations_rejectedBy_fkey";
ALTER TABLE IF EXISTS ONLY public.quotations DROP CONSTRAINT IF EXISTS "quotations_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.quotations DROP CONSTRAINT IF EXISTS "quotations_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.quotations DROP CONSTRAINT IF EXISTS "quotations_clientId_fkey";
ALTER TABLE IF EXISTS ONLY public.quotations DROP CONSTRAINT IF EXISTS "quotations_approvedBy_fkey";
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS "purchase_orders_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS "purchase_orders_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.purchase_order_items DROP CONSTRAINT IF EXISTS "purchase_order_items_poId_fkey";
ALTER TABLE IF EXISTS ONLY public.purchase_order_items DROP CONSTRAINT IF EXISTS "purchase_order_items_expenseCategoryId_fkey";
ALTER TABLE IF EXISTS ONLY public.purchase_order_items DROP CONSTRAINT IF EXISTS "purchase_order_items_assetId_fkey";
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS "projects_projectTypeId_fkey";
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS "projects_clientId_fkey";
ALTER TABLE IF EXISTS ONLY public.project_team_members DROP CONSTRAINT IF EXISTS "project_team_members_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.project_team_members DROP CONSTRAINT IF EXISTS "project_team_members_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.project_milestones DROP CONSTRAINT IF EXISTS "project_milestones_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.project_milestones DROP CONSTRAINT IF EXISTS "project_milestones_predecessorId_fkey";
ALTER TABLE IF EXISTS ONLY public.project_equipment_usage DROP CONSTRAINT IF EXISTS "project_equipment_usage_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.project_equipment_usage DROP CONSTRAINT IF EXISTS "project_equipment_usage_assetId_fkey";
ALTER TABLE IF EXISTS ONLY public.project_cost_allocations DROP CONSTRAINT IF EXISTS "project_cost_allocations_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.project_cost_allocations DROP CONSTRAINT IF EXISTS "project_cost_allocations_expenseId_fkey";
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS "payments_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.payment_milestones DROP CONSTRAINT IF EXISTS "payment_milestones_quotationId_fkey";
ALTER TABLE IF EXISTS ONLY public.payment_milestones DROP CONSTRAINT IF EXISTS "payment_milestones_projectMilestoneId_fkey";
ALTER TABLE IF EXISTS ONLY public.maintenance_schedules DROP CONSTRAINT IF EXISTS "maintenance_schedules_assetId_fkey";
ALTER TABLE IF EXISTS ONLY public.maintenance_records DROP CONSTRAINT IF EXISTS "maintenance_records_assetId_fkey";
ALTER TABLE IF EXISTS ONLY public.labor_entries DROP CONSTRAINT IF EXISTS "labor_entries_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.labor_entries DROP CONSTRAINT IF EXISTS "labor_entries_teamMemberId_fkey";
ALTER TABLE IF EXISTS ONLY public.labor_entries DROP CONSTRAINT IF EXISTS "labor_entries_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.labor_entries DROP CONSTRAINT IF EXISTS "labor_entries_expenseId_fkey";
ALTER TABLE IF EXISTS ONLY public.labor_entries DROP CONSTRAINT IF EXISTS "labor_entries_costAllocationId_fkey";
ALTER TABLE IF EXISTS ONLY public.journal_line_items DROP CONSTRAINT IF EXISTS "journal_line_items_journalEntryId_fkey";
ALTER TABLE IF EXISTS ONLY public.journal_line_items DROP CONSTRAINT IF EXISTS "journal_line_items_accountId_fkey";
ALTER TABLE IF EXISTS ONLY public.journal_entries DROP CONSTRAINT IF EXISTS "journal_entries_reversedEntryId_fkey";
ALTER TABLE IF EXISTS ONLY public.journal_entries DROP CONSTRAINT IF EXISTS "journal_entries_fiscalPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS "invoices_quotationId_fkey";
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS "invoices_projectMilestoneId_fkey";
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS "invoices_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS "invoices_paymentMilestoneId_fkey";
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS "invoices_markedPaidBy_fkey";
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS "invoices_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS "invoices_clientId_fkey";
ALTER TABLE IF EXISTS ONLY public.goods_receipts DROP CONSTRAINT IF EXISTS "goods_receipts_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public.goods_receipts DROP CONSTRAINT IF EXISTS "goods_receipts_poId_fkey";
ALTER TABLE IF EXISTS ONLY public.goods_receipt_items DROP CONSTRAINT IF EXISTS "goods_receipt_items_poItemId_fkey";
ALTER TABLE IF EXISTS ONLY public.goods_receipt_items DROP CONSTRAINT IF EXISTS "goods_receipt_items_grId_fkey";
ALTER TABLE IF EXISTS ONLY public.general_ledger DROP CONSTRAINT IF EXISTS "general_ledger_journalEntryId_fkey";
ALTER TABLE IF EXISTS ONLY public.general_ledger DROP CONSTRAINT IF EXISTS "general_ledger_accountId_fkey";
ALTER TABLE IF EXISTS ONLY public.feature_flag_events DROP CONSTRAINT IF EXISTS "feature_flag_events_flagId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_vendorInvoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_purchaseOrderId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_paymentId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_clientId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_categoryId_fkey";
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS "expenses_approvedBy_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_documents DROP CONSTRAINT IF EXISTS "expense_documents_expenseId_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_comments DROP CONSTRAINT IF EXISTS "expense_comments_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_comments DROP CONSTRAINT IF EXISTS "expense_comments_expenseId_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_categories DROP CONSTRAINT IF EXISTS "expense_categories_parentId_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_budgets DROP CONSTRAINT IF EXISTS "expense_budgets_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_budgets DROP CONSTRAINT IF EXISTS "expense_budgets_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_budgets DROP CONSTRAINT IF EXISTS "expense_budgets_categoryId_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_approval_history DROP CONSTRAINT IF EXISTS "expense_approval_history_expenseId_fkey";
ALTER TABLE IF EXISTS ONLY public.expense_approval_history DROP CONSTRAINT IF EXISTS "expense_approval_history_actionBy_fkey";
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS "documents_quotationId_fkey";
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS "documents_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS "documents_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.depreciation_schedules DROP CONSTRAINT IF EXISTS "depreciation_schedules_assetId_fkey";
ALTER TABLE IF EXISTS ONLY public.depreciation_entries DROP CONSTRAINT IF EXISTS "depreciation_entries_scheduleId_fkey";
ALTER TABLE IF EXISTS ONLY public.depreciation_entries DROP CONSTRAINT IF EXISTS "depreciation_entries_journalEntryId_fkey";
ALTER TABLE IF EXISTS ONLY public.depreciation_entries DROP CONSTRAINT IF EXISTS "depreciation_entries_fiscalPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public.depreciation_entries DROP CONSTRAINT IF EXISTS "depreciation_entries_assetId_fkey";
ALTER TABLE IF EXISTS ONLY public.deferred_revenue DROP CONSTRAINT IF EXISTS "deferred_revenue_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.deferred_revenue DROP CONSTRAINT IF EXISTS "deferred_revenue_fiscalPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public.content_media DROP CONSTRAINT IF EXISTS "content_media_contentId_fkey";
ALTER TABLE IF EXISTS ONLY public.content_calendar_items DROP CONSTRAINT IF EXISTS "content_calendar_items_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.content_calendar_items DROP CONSTRAINT IF EXISTS "content_calendar_items_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.content_calendar_items DROP CONSTRAINT IF EXISTS "content_calendar_items_clientId_fkey";
ALTER TABLE IF EXISTS ONLY public.chart_of_accounts DROP CONSTRAINT IF EXISTS "chart_of_accounts_parentId_fkey";
ALTER TABLE IF EXISTS ONLY public.cash_transactions DROP CONSTRAINT IF EXISTS "cash_transactions_offsetAccountId_fkey";
ALTER TABLE IF EXISTS ONLY public.cash_transactions DROP CONSTRAINT IF EXISTS "cash_transactions_cashAccountId_fkey";
ALTER TABLE IF EXISTS ONLY public.business_journey_events DROP CONSTRAINT IF EXISTS "business_journey_events_quotationId_fkey";
ALTER TABLE IF EXISTS ONLY public.business_journey_events DROP CONSTRAINT IF EXISTS "business_journey_events_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.business_journey_events DROP CONSTRAINT IF EXISTS "business_journey_events_paymentId_fkey";
ALTER TABLE IF EXISTS ONLY public.business_journey_events DROP CONSTRAINT IF EXISTS "business_journey_events_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.business_journey_events DROP CONSTRAINT IF EXISTS "business_journey_events_createdBy_fkey";
ALTER TABLE IF EXISTS ONLY public.business_journey_events DROP CONSTRAINT IF EXISTS "business_journey_events_clientId_fkey";
ALTER TABLE IF EXISTS ONLY public.business_journey_event_metadata DROP CONSTRAINT IF EXISTS "business_journey_event_metadata_eventId_fkey";
ALTER TABLE IF EXISTS ONLY public.bank_transfers DROP CONSTRAINT IF EXISTS "bank_transfers_toAccountId_fkey";
ALTER TABLE IF EXISTS ONLY public.bank_transfers DROP CONSTRAINT IF EXISTS "bank_transfers_fromAccountId_fkey";
ALTER TABLE IF EXISTS ONLY public.bank_reconciliations DROP CONSTRAINT IF EXISTS "bank_reconciliations_bankAccountId_fkey";
ALTER TABLE IF EXISTS ONLY public.bank_reconciliation_items DROP CONSTRAINT IF EXISTS "bank_reconciliation_items_reconciliationId_fkey";
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS "audit_logs_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS "assets_vendorInvoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS "assets_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS "assets_purchaseOrderId_fkey";
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS "assets_goodsReceiptId_fkey";
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS "assets_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public.asset_reservations DROP CONSTRAINT IF EXISTS "asset_reservations_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.asset_reservations DROP CONSTRAINT IF EXISTS "asset_reservations_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public.asset_reservations DROP CONSTRAINT IF EXISTS "asset_reservations_assetId_fkey";
ALTER TABLE IF EXISTS ONLY public.asset_kit_items DROP CONSTRAINT IF EXISTS "asset_kit_items_kitId_fkey";
ALTER TABLE IF EXISTS ONLY public.asset_kit_items DROP CONSTRAINT IF EXISTS "asset_kit_items_assetId_fkey";
ALTER TABLE IF EXISTS ONLY public.allowance_for_doubtful_accounts DROP CONSTRAINT IF EXISTS "allowance_for_doubtful_accounts_journalEntryId_fkey";
ALTER TABLE IF EXISTS ONLY public.allowance_for_doubtful_accounts DROP CONSTRAINT IF EXISTS "allowance_for_doubtful_accounts_invoiceId_fkey";
ALTER TABLE IF EXISTS ONLY public.allowance_for_doubtful_accounts DROP CONSTRAINT IF EXISTS "allowance_for_doubtful_accounts_fiscalPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public.accounts_payable DROP CONSTRAINT IF EXISTS "accounts_payable_vendorId_fkey";
ALTER TABLE IF EXISTS ONLY public.accounts_payable DROP CONSTRAINT IF EXISTS "accounts_payable_expenseId_fkey";
ALTER TABLE IF EXISTS ONLY public.account_balances DROP CONSTRAINT IF EXISTS "account_balances_fiscalPeriodId_fkey";
ALTER TABLE IF EXISTS ONLY public.account_balances DROP CONSTRAINT IF EXISTS "account_balances_accountId_fkey";
DROP TRIGGER IF EXISTS trg_auto_update_expense_category ON public.chart_of_accounts;
DROP TRIGGER IF EXISTS trg_auto_create_expense_category ON public.chart_of_accounts;
DROP INDEX IF EXISTS public."work_in_progress_projectId_periodDate_key";
DROP INDEX IF EXISTS public."work_in_progress_projectId_idx";
DROP INDEX IF EXISTS public."work_in_progress_periodDate_idx";
DROP INDEX IF EXISTS public."work_in_progress_isCompleted_idx";
DROP INDEX IF EXISTS public."work_in_progress_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public."vendors_vendorType_idx";
DROP INDEX IF EXISTS public."vendors_vendorCode_key";
DROP INDEX IF EXISTS public."vendors_vendorCode_idx";
DROP INDEX IF EXISTS public.vendors_npwp_key;
DROP INDEX IF EXISTS public.vendors_npwp_idx;
DROP INDEX IF EXISTS public.vendors_name_idx;
DROP INDEX IF EXISTS public."vendors_isActive_idx";
DROP INDEX IF EXISTS public."vendor_payments_vendorId_idx";
DROP INDEX IF EXISTS public.vendor_payments_status_idx;
DROP INDEX IF EXISTS public."vendor_payments_paymentNumber_key";
DROP INDEX IF EXISTS public."vendor_payments_paymentNumber_idx";
DROP INDEX IF EXISTS public."vendor_payments_paymentDate_idx";
DROP INDEX IF EXISTS public."vendor_payment_allocations_paymentId_idx";
DROP INDEX IF EXISTS public."vendor_payment_allocations_apId_idx";
DROP INDEX IF EXISTS public."vendor_invoices_vendorId_idx";
DROP INDEX IF EXISTS public.vendor_invoices_status_idx;
DROP INDEX IF EXISTS public."vendor_invoices_poId_idx";
DROP INDEX IF EXISTS public."vendor_invoices_matchingStatus_idx";
DROP INDEX IF EXISTS public."vendor_invoices_invoiceDate_idx";
DROP INDEX IF EXISTS public."vendor_invoices_internalNumber_key";
DROP INDEX IF EXISTS public."vendor_invoices_internalNumber_idx";
DROP INDEX IF EXISTS public."vendor_invoices_grId_idx";
DROP INDEX IF EXISTS public."vendor_invoices_eFakturNSFP_key";
DROP INDEX IF EXISTS public."vendor_invoices_eFakturNSFP_idx";
DROP INDEX IF EXISTS public."vendor_invoices_dueDate_idx";
DROP INDEX IF EXISTS public."vendor_invoices_accountsPayableId_key";
DROP INDEX IF EXISTS public."vendor_invoice_items_viId_idx";
DROP INDEX IF EXISTS public."vendor_invoice_items_poItemId_idx";
DROP INDEX IF EXISTS public."ux_metrics_userId_idx";
DROP INDEX IF EXISTS public."ux_metrics_metricName_idx";
DROP INDEX IF EXISTS public."ux_metrics_eventType_idx";
DROP INDEX IF EXISTS public."ux_metrics_createdAt_idx";
DROP INDEX IF EXISTS public."ux_metrics_componentName_idx";
DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public."user_preferences_userId_key";
DROP INDEX IF EXISTS public.social_media_reports_year_month_idx;
DROP INDEX IF EXISTS public.social_media_reports_status_idx;
DROP INDEX IF EXISTS public."social_media_reports_projectId_year_month_key";
DROP INDEX IF EXISTS public."social_media_reports_projectId_idx";
DROP INDEX IF EXISTS public."report_sections_reportId_order_idx";
DROP INDEX IF EXISTS public."quotations_validUntil_idx";
DROP INDEX IF EXISTS public."quotations_status_validUntil_idx";
DROP INDEX IF EXISTS public.quotations_status_idx;
DROP INDEX IF EXISTS public."quotations_quotationNumber_key";
DROP INDEX IF EXISTS public."quotations_quotationNumber_idx";
DROP INDEX IF EXISTS public."quotations_projectId_status_idx";
DROP INDEX IF EXISTS public."quotations_projectId_idx";
DROP INDEX IF EXISTS public."quotations_createdBy_status_idx";
DROP INDEX IF EXISTS public."quotations_createdBy_idx";
DROP INDEX IF EXISTS public."quotations_createdAt_status_idx";
DROP INDEX IF EXISTS public."quotations_createdAt_idx";
DROP INDEX IF EXISTS public."quotations_clientId_status_idx";
DROP INDEX IF EXISTS public."quotations_clientId_idx";
DROP INDEX IF EXISTS public.quotation_counters_year_month_key;
DROP INDEX IF EXISTS public.quotation_counters_year_month_idx;
DROP INDEX IF EXISTS public."purchase_orders_vendorId_idx";
DROP INDEX IF EXISTS public.purchase_orders_status_idx;
DROP INDEX IF EXISTS public."purchase_orders_requestedBy_idx";
DROP INDEX IF EXISTS public."purchase_orders_projectId_idx";
DROP INDEX IF EXISTS public."purchase_orders_poNumber_key";
DROP INDEX IF EXISTS public."purchase_orders_poNumber_idx";
DROP INDEX IF EXISTS public."purchase_orders_poDate_idx";
DROP INDEX IF EXISTS public."purchase_orders_approvalStatus_idx";
DROP INDEX IF EXISTS public."purchase_order_items_poId_idx";
DROP INDEX IF EXISTS public."purchase_order_items_expenseCategoryId_idx";
DROP INDEX IF EXISTS public."purchase_order_items_assetId_idx";
DROP INDEX IF EXISTS public."projects_totalAllocatedCosts_idx";
DROP INDEX IF EXISTS public.projects_status_idx;
DROP INDEX IF EXISTS public."projects_status_createdAt_idx";
DROP INDEX IF EXISTS public."projects_projectedNetMargin_idx";
DROP INDEX IF EXISTS public."projects_projectTypeId_status_idx";
DROP INDEX IF EXISTS public."projects_projectTypeId_idx";
DROP INDEX IF EXISTS public."projects_profitCalculatedAt_idx";
DROP INDEX IF EXISTS public.projects_number_key;
DROP INDEX IF EXISTS public.projects_number_idx;
DROP INDEX IF EXISTS public."projects_netMarginPercent_idx";
DROP INDEX IF EXISTS public."projects_grossMarginPercent_idx";
DROP INDEX IF EXISTS public."projects_createdAt_idx";
DROP INDEX IF EXISTS public."projects_clientId_status_idx";
DROP INDEX IF EXISTS public."projects_clientId_status_createdAt_idx";
DROP INDEX IF EXISTS public."projects_clientId_idx";
DROP INDEX IF EXISTS public."project_type_configs_sortOrder_idx";
DROP INDEX IF EXISTS public."project_type_configs_isActive_idx";
DROP INDEX IF EXISTS public.project_type_configs_code_key;
DROP INDEX IF EXISTS public.project_type_configs_code_idx;
DROP INDEX IF EXISTS public."project_team_members_userId_idx";
DROP INDEX IF EXISTS public."project_team_members_startDate_idx";
DROP INDEX IF EXISTS public."project_team_members_projectId_userId_assignedDate_key";
DROP INDEX IF EXISTS public."project_team_members_projectId_idx";
DROP INDEX IF EXISTS public."project_team_members_isActive_idx";
DROP INDEX IF EXISTS public."project_team_members_endDate_idx";
DROP INDEX IF EXISTS public."project_milestones_status_plannedEndDate_idx";
DROP INDEX IF EXISTS public.project_milestones_status_idx;
DROP INDEX IF EXISTS public."project_milestones_projectId_plannedStartDate_idx";
DROP INDEX IF EXISTS public."project_milestones_projectId_milestoneNumber_key";
DROP INDEX IF EXISTS public."project_milestones_projectId_idx";
DROP INDEX IF EXISTS public.project_milestones_priority_idx;
DROP INDEX IF EXISTS public."project_milestones_predecessorId_idx";
DROP INDEX IF EXISTS public."project_milestones_milestoneNumber_idx";
DROP INDEX IF EXISTS public."project_milestones_completionPercentage_idx";
DROP INDEX IF EXISTS public."project_equipment_usage_startDate_idx";
DROP INDEX IF EXISTS public."project_equipment_usage_returnDate_idx";
DROP INDEX IF EXISTS public."project_equipment_usage_projectId_idx";
DROP INDEX IF EXISTS public."project_equipment_usage_projectId_assetId_idx";
DROP INDEX IF EXISTS public."project_equipment_usage_assetId_startDate_idx";
DROP INDEX IF EXISTS public."project_equipment_usage_assetId_idx";
DROP INDEX IF EXISTS public."project_cost_allocations_projectId_idx";
DROP INDEX IF EXISTS public."project_cost_allocations_expenseId_idx";
DROP INDEX IF EXISTS public."project_cost_allocations_costType_idx";
DROP INDEX IF EXISTS public."project_cost_allocations_allocationDate_idx";
DROP INDEX IF EXISTS public."payments_status_paymentDate_idx";
DROP INDEX IF EXISTS public.payments_status_idx;
DROP INDEX IF EXISTS public."payments_paymentMethod_idx";
DROP INDEX IF EXISTS public."payments_paymentDate_idx";
DROP INDEX IF EXISTS public."payments_invoiceId_status_idx";
DROP INDEX IF EXISTS public."payments_invoiceId_idx";
DROP INDEX IF EXISTS public."payment_milestones_quotationId_milestoneNumber_key";
DROP INDEX IF EXISTS public."payment_milestones_quotationId_isInvoiced_idx";
DROP INDEX IF EXISTS public."payment_milestones_quotationId_idx";
DROP INDEX IF EXISTS public."payment_milestones_projectMilestoneId_idx";
DROP INDEX IF EXISTS public."payment_milestones_isInvoiced_idx";
DROP INDEX IF EXISTS public."maintenance_schedules_nextMaintenanceDate_idx";
DROP INDEX IF EXISTS public."maintenance_schedules_isActive_nextMaintenanceDate_idx";
DROP INDEX IF EXISTS public."maintenance_schedules_isActive_idx";
DROP INDEX IF EXISTS public."maintenance_schedules_assetId_idx";
DROP INDEX IF EXISTS public."maintenance_records_performedDate_idx";
DROP INDEX IF EXISTS public."maintenance_records_maintenanceType_idx";
DROP INDEX IF EXISTS public."maintenance_records_assetId_idx";
DROP INDEX IF EXISTS public."labor_entries_workDate_idx";
DROP INDEX IF EXISTS public."labor_entries_userId_idx";
DROP INDEX IF EXISTS public."labor_entries_teamMemberId_workDate_key";
DROP INDEX IF EXISTS public."labor_entries_teamMemberId_idx";
DROP INDEX IF EXISTS public.labor_entries_status_idx;
DROP INDEX IF EXISTS public."labor_entries_projectId_idx";
DROP INDEX IF EXISTS public."labor_entries_expenseId_idx";
DROP INDEX IF EXISTS public."journal_line_items_projectId_idx";
DROP INDEX IF EXISTS public."journal_line_items_journalEntryId_idx";
DROP INDEX IF EXISTS public."journal_line_items_clientId_idx";
DROP INDEX IF EXISTS public."journal_line_items_accountId_idx";
DROP INDEX IF EXISTS public."journal_entries_transactionType_idx";
DROP INDEX IF EXISTS public."journal_entries_transactionId_idx";
DROP INDEX IF EXISTS public.journal_entries_status_idx;
DROP INDEX IF EXISTS public."journal_entries_isPosted_idx";
DROP INDEX IF EXISTS public."journal_entries_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public."journal_entries_entryNumber_key";
DROP INDEX IF EXISTS public."journal_entries_entryNumber_idx";
DROP INDEX IF EXISTS public."journal_entries_entryDate_idx";
DROP INDEX IF EXISTS public.invoices_status_idx;
DROP INDEX IF EXISTS public."invoices_status_dueDate_idx";
DROP INDEX IF EXISTS public."invoices_status_createdAt_idx";
DROP INDEX IF EXISTS public."invoices_quotationId_status_idx";
DROP INDEX IF EXISTS public."invoices_quotationId_idx";
DROP INDEX IF EXISTS public."invoices_projectMilestoneId_idx";
DROP INDEX IF EXISTS public."invoices_projectId_idx";
DROP INDEX IF EXISTS public."invoices_paymentMilestoneId_key";
DROP INDEX IF EXISTS public."invoices_paymentMilestoneId_idx";
DROP INDEX IF EXISTS public."invoices_materaiRequired_totalAmount_idx";
DROP INDEX IF EXISTS public."invoices_materaiRequired_materaiApplied_status_idx";
DROP INDEX IF EXISTS public."invoices_materaiRequired_idx";
DROP INDEX IF EXISTS public."invoices_invoiceNumber_key";
DROP INDEX IF EXISTS public."invoices_invoiceNumber_idx";
DROP INDEX IF EXISTS public."invoices_dueDate_idx";
DROP INDEX IF EXISTS public."invoices_createdAt_status_idx";
DROP INDEX IF EXISTS public."invoices_createdAt_idx";
DROP INDEX IF EXISTS public."invoices_clientId_status_idx";
DROP INDEX IF EXISTS public."invoices_clientId_projectId_status_idx";
DROP INDEX IF EXISTS public."invoices_clientId_idx";
DROP INDEX IF EXISTS public.invoice_counters_year_month_key;
DROP INDEX IF EXISTS public.invoice_counters_year_month_idx;
DROP INDEX IF EXISTS public.indonesian_holidays_year_idx;
DROP INDEX IF EXISTS public.indonesian_holidays_type_idx;
DROP INDEX IF EXISTS public.indonesian_holidays_region_idx;
DROP INDEX IF EXISTS public.indonesian_holidays_date_region_key;
DROP INDEX IF EXISTS public.indonesian_holidays_date_idx;
DROP INDEX IF EXISTS public."goods_receipts_vendorId_idx";
DROP INDEX IF EXISTS public.goods_receipts_status_idx;
DROP INDEX IF EXISTS public."goods_receipts_poId_idx";
DROP INDEX IF EXISTS public."goods_receipts_grNumber_key";
DROP INDEX IF EXISTS public."goods_receipts_grNumber_idx";
DROP INDEX IF EXISTS public."goods_receipts_grDate_idx";
DROP INDEX IF EXISTS public."goods_receipt_items_poItemId_idx";
DROP INDEX IF EXISTS public."goods_receipt_items_grId_idx";
DROP INDEX IF EXISTS public."general_ledger_transactionType_idx";
DROP INDEX IF EXISTS public."general_ledger_projectId_idx";
DROP INDEX IF EXISTS public."general_ledger_postingDate_idx";
DROP INDEX IF EXISTS public."general_ledger_journalEntryId_idx";
DROP INDEX IF EXISTS public."general_ledger_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public."general_ledger_entryDate_idx";
DROP INDEX IF EXISTS public."general_ledger_clientId_idx";
DROP INDEX IF EXISTS public."general_ledger_accountId_postingDate_idx";
DROP INDEX IF EXISTS public."general_ledger_accountId_idx";
DROP INDEX IF EXISTS public."general_ledger_accountId_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public.fiscal_periods_status_idx;
DROP INDEX IF EXISTS public."fiscal_periods_startDate_idx";
DROP INDEX IF EXISTS public."fiscal_periods_endDate_idx";
DROP INDEX IF EXISTS public.fiscal_periods_code_key;
DROP INDEX IF EXISTS public.fiscal_periods_code_idx;
DROP INDEX IF EXISTS public."financial_statements_statementType_idx";
DROP INDEX IF EXISTS public."financial_statements_startDate_endDate_idx";
DROP INDEX IF EXISTS public."financial_statements_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public.feature_flags_name_key;
DROP INDEX IF EXISTS public."feature_flag_events_userId_idx";
DROP INDEX IF EXISTS public."feature_flag_events_flagId_idx";
DROP INDEX IF EXISTS public."feature_flag_events_eventType_idx";
DROP INDEX IF EXISTS public."expenses_vendorInvoiceId_idx";
DROP INDEX IF EXISTS public."expenses_vendorId_status_idx";
DROP INDEX IF EXISTS public."expenses_vendorId_idx";
DROP INDEX IF EXISTS public."expenses_userId_idx";
DROP INDEX IF EXISTS public."expenses_status_userId_idx";
DROP INDEX IF EXISTS public.expenses_status_idx;
DROP INDEX IF EXISTS public."expenses_status_expenseDate_idx";
DROP INDEX IF EXISTS public."expenses_purchaseType_idx";
DROP INDEX IF EXISTS public."expenses_purchaseSource_idx";
DROP INDEX IF EXISTS public."expenses_purchaseOrderId_idx";
DROP INDEX IF EXISTS public."expenses_projectId_status_idx";
DROP INDEX IF EXISTS public."expenses_projectId_idx";
DROP INDEX IF EXISTS public."expenses_projectId_categoryId_idx";
DROP INDEX IF EXISTS public."expenses_ppnCategory_idx";
DROP INDEX IF EXISTS public."expenses_paymentStatus_idx";
DROP INDEX IF EXISTS public."expenses_expenseNumber_key";
DROP INDEX IF EXISTS public."expenses_expenseNumber_idx";
DROP INDEX IF EXISTS public."expenses_expenseDate_idx";
DROP INDEX IF EXISTS public."expenses_expenseClass_idx";
DROP INDEX IF EXISTS public."expenses_eFakturNSFP_idx";
DROP INDEX IF EXISTS public."expenses_dueDate_idx";
DROP INDEX IF EXISTS public."expenses_createdAt_idx";
DROP INDEX IF EXISTS public."expenses_clientId_idx";
DROP INDEX IF EXISTS public."expenses_categoryId_idx";
DROP INDEX IF EXISTS public."expenses_buktiPengeluaranNumber_key";
DROP INDEX IF EXISTS public."expenses_buktiPengeluaranNumber_idx";
DROP INDEX IF EXISTS public."expenses_accountsPayableId_key";
DROP INDEX IF EXISTS public."expenses_accountCode_idx";
DROP INDEX IF EXISTS public."expense_documents_uploadedAt_idx";
DROP INDEX IF EXISTS public."expense_documents_mimeType_idx";
DROP INDEX IF EXISTS public."expense_documents_expenseId_idx";
DROP INDEX IF EXISTS public.expense_documents_category_idx;
DROP INDEX IF EXISTS public."expense_comments_userId_idx";
DROP INDEX IF EXISTS public."expense_comments_expenseId_idx";
DROP INDEX IF EXISTS public."expense_comments_createdAt_idx";
DROP INDEX IF EXISTS public."expense_categories_parentId_idx";
DROP INDEX IF EXISTS public."expense_categories_isActive_idx";
DROP INDEX IF EXISTS public."expense_categories_expenseClass_idx";
DROP INDEX IF EXISTS public.expense_categories_code_key;
DROP INDEX IF EXISTS public.expense_categories_code_idx;
DROP INDEX IF EXISTS public."expense_categories_accountCode_idx";
DROP INDEX IF EXISTS public."expense_budgets_userId_idx";
DROP INDEX IF EXISTS public."expense_budgets_startDate_endDate_idx";
DROP INDEX IF EXISTS public."expense_budgets_projectId_idx";
DROP INDEX IF EXISTS public."expense_budgets_isActive_idx";
DROP INDEX IF EXISTS public."expense_budgets_categoryId_idx";
DROP INDEX IF EXISTS public."expense_approval_history_expenseId_idx";
DROP INDEX IF EXISTS public."expense_approval_history_actionDate_idx";
DROP INDEX IF EXISTS public."expense_approval_history_actionBy_idx";
DROP INDEX IF EXISTS public."exchange_rates_isActive_idx";
DROP INDEX IF EXISTS public."exchange_rates_fromCurrency_toCurrency_idx";
DROP INDEX IF EXISTS public."exchange_rates_fromCurrency_toCurrency_effectiveDate_key";
DROP INDEX IF EXISTS public."exchange_rates_effectiveDate_idx";
DROP INDEX IF EXISTS public."documents_uploadedAt_idx";
DROP INDEX IF EXISTS public."documents_quotationId_idx";
DROP INDEX IF EXISTS public."documents_projectId_idx";
DROP INDEX IF EXISTS public."documents_mimeType_idx";
DROP INDEX IF EXISTS public."documents_invoiceId_idx";
DROP INDEX IF EXISTS public.documents_category_idx;
DROP INDEX IF EXISTS public."depreciation_schedules_startDate_idx";
DROP INDEX IF EXISTS public."depreciation_schedules_isFulfilled_idx";
DROP INDEX IF EXISTS public."depreciation_schedules_isActive_idx";
DROP INDEX IF EXISTS public."depreciation_schedules_endDate_idx";
DROP INDEX IF EXISTS public."depreciation_schedules_assetId_idx";
DROP INDEX IF EXISTS public.depreciation_entries_status_idx;
DROP INDEX IF EXISTS public."depreciation_entries_scheduleId_idx";
DROP INDEX IF EXISTS public."depreciation_entries_periodDate_idx";
DROP INDEX IF EXISTS public."depreciation_entries_journalEntryId_idx";
DROP INDEX IF EXISTS public."depreciation_entries_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public."depreciation_entries_assetId_periodDate_key";
DROP INDEX IF EXISTS public."depreciation_entries_assetId_idx";
DROP INDEX IF EXISTS public.deferred_revenue_status_idx;
DROP INDEX IF EXISTS public."deferred_revenue_recognitionDate_idx";
DROP INDEX IF EXISTS public."deferred_revenue_paymentDate_idx";
DROP INDEX IF EXISTS public."deferred_revenue_invoiceId_idx";
DROP INDEX IF EXISTS public."deferred_revenue_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public."content_media_uploadedAt_idx";
DROP INDEX IF EXISTS public.content_media_type_idx;
DROP INDEX IF EXISTS public."content_media_contentId_idx";
DROP INDEX IF EXISTS public."content_calendar_items_status_scheduledAt_idx";
DROP INDEX IF EXISTS public.content_calendar_items_status_idx;
DROP INDEX IF EXISTS public."content_calendar_items_scheduledAt_idx";
DROP INDEX IF EXISTS public."content_calendar_items_projectId_idx";
DROP INDEX IF EXISTS public."content_calendar_items_createdBy_idx";
DROP INDEX IF EXISTS public."content_calendar_items_clientId_idx";
DROP INDEX IF EXISTS public."clients_status_createdAt_idx";
DROP INDEX IF EXISTS public.clients_phone_idx;
DROP INDEX IF EXISTS public.clients_name_status_idx;
DROP INDEX IF EXISTS public.clients_name_idx;
DROP INDEX IF EXISTS public.clients_email_idx;
DROP INDEX IF EXISTS public."clients_createdAt_idx";
DROP INDEX IF EXISTS public."chart_of_accounts_parentId_idx";
DROP INDEX IF EXISTS public."chart_of_accounts_isActive_idx";
DROP INDEX IF EXISTS public.chart_of_accounts_code_key;
DROP INDEX IF EXISTS public.chart_of_accounts_code_idx;
DROP INDEX IF EXISTS public."chart_of_accounts_accountType_idx";
DROP INDEX IF EXISTS public."cash_transactions_transactionType_idx";
DROP INDEX IF EXISTS public."cash_transactions_transactionNumber_key";
DROP INDEX IF EXISTS public."cash_transactions_transactionNumber_idx";
DROP INDEX IF EXISTS public."cash_transactions_transactionDate_idx";
DROP INDEX IF EXISTS public.cash_transactions_status_idx;
DROP INDEX IF EXISTS public."cash_transactions_projectId_idx";
DROP INDEX IF EXISTS public."cash_transactions_offsetAccountId_idx";
DROP INDEX IF EXISTS public."cash_transactions_createdBy_idx";
DROP INDEX IF EXISTS public."cash_transactions_createdAt_idx";
DROP INDEX IF EXISTS public."cash_transactions_clientId_idx";
DROP INDEX IF EXISTS public.cash_transactions_category_idx;
DROP INDEX IF EXISTS public."cash_transactions_cashAccountId_idx";
DROP INDEX IF EXISTS public.cash_bank_balances_year_month_key;
DROP INDEX IF EXISTS public.cash_bank_balances_year_month_idx;
DROP INDEX IF EXISTS public."cash_bank_balances_periodDate_idx";
DROP INDEX IF EXISTS public."cash_bank_balances_createdAt_idx";
DROP INDEX IF EXISTS public.business_journey_events_type_status_idx;
DROP INDEX IF EXISTS public.business_journey_events_type_idx;
DROP INDEX IF EXISTS public.business_journey_events_status_idx;
DROP INDEX IF EXISTS public."business_journey_events_status_createdAt_idx";
DROP INDEX IF EXISTS public."business_journey_events_quotationId_idx";
DROP INDEX IF EXISTS public."business_journey_events_projectId_idx";
DROP INDEX IF EXISTS public."business_journey_events_invoiceId_idx";
DROP INDEX IF EXISTS public."business_journey_events_createdAt_idx";
DROP INDEX IF EXISTS public."business_journey_events_clientId_type_createdAt_idx";
DROP INDEX IF EXISTS public."business_journey_events_clientId_status_createdAt_idx";
DROP INDEX IF EXISTS public."business_journey_events_clientId_idx";
DROP INDEX IF EXISTS public.business_journey_events_amount_idx;
DROP INDEX IF EXISTS public.business_journey_event_metadata_source_idx;
DROP INDEX IF EXISTS public.business_journey_event_metadata_priority_idx;
DROP INDEX IF EXISTS public."business_journey_event_metadata_materaiRequired_idx";
DROP INDEX IF EXISTS public."business_journey_event_metadata_eventId_key";
DROP INDEX IF EXISTS public."bank_transfers_transferNumber_key";
DROP INDEX IF EXISTS public."bank_transfers_transferNumber_idx";
DROP INDEX IF EXISTS public."bank_transfers_transferDate_idx";
DROP INDEX IF EXISTS public."bank_transfers_toAccountId_idx";
DROP INDEX IF EXISTS public.bank_transfers_status_idx;
DROP INDEX IF EXISTS public."bank_transfers_projectId_idx";
DROP INDEX IF EXISTS public."bank_transfers_fromAccountId_idx";
DROP INDEX IF EXISTS public."bank_transfers_createdBy_idx";
DROP INDEX IF EXISTS public."bank_transfers_createdAt_idx";
DROP INDEX IF EXISTS public."bank_transfers_clientId_idx";
DROP INDEX IF EXISTS public.bank_reconciliations_status_idx;
DROP INDEX IF EXISTS public."bank_reconciliations_statementDate_idx";
DROP INDEX IF EXISTS public."bank_reconciliations_reconciliationNumber_key";
DROP INDEX IF EXISTS public."bank_reconciliations_reconciliationNumber_idx";
DROP INDEX IF EXISTS public."bank_reconciliations_periodStartDate_periodEndDate_idx";
DROP INDEX IF EXISTS public."bank_reconciliations_isBalanced_idx";
DROP INDEX IF EXISTS public."bank_reconciliations_createdBy_idx";
DROP INDEX IF EXISTS public."bank_reconciliations_createdAt_idx";
DROP INDEX IF EXISTS public."bank_reconciliations_bankAccountId_idx";
DROP INDEX IF EXISTS public.bank_reconciliation_items_status_idx;
DROP INDEX IF EXISTS public."bank_reconciliation_items_reconciliationId_idx";
DROP INDEX IF EXISTS public."bank_reconciliation_items_itemType_idx";
DROP INDEX IF EXISTS public."bank_reconciliation_items_itemDate_idx";
DROP INDEX IF EXISTS public."bank_reconciliation_items_isMatched_idx";
DROP INDEX IF EXISTS public.assets_status_idx;
DROP INDEX IF EXISTS public.assets_status_condition_idx;
DROP INDEX IF EXISTS public."assets_createdById_idx";
DROP INDEX IF EXISTS public."assets_createdAt_idx";
DROP INDEX IF EXISTS public.assets_condition_idx;
DROP INDEX IF EXISTS public.assets_category_status_idx;
DROP INDEX IF EXISTS public.assets_category_idx;
DROP INDEX IF EXISTS public."assets_assetCode_key";
DROP INDEX IF EXISTS public."assets_assetCode_idx";
DROP INDEX IF EXISTS public."asset_reservations_userId_idx";
DROP INDEX IF EXISTS public.asset_reservations_status_idx;
DROP INDEX IF EXISTS public."asset_reservations_startDate_idx";
DROP INDEX IF EXISTS public."asset_reservations_projectId_idx";
DROP INDEX IF EXISTS public."asset_reservations_endDate_idx";
DROP INDEX IF EXISTS public."asset_reservations_assetId_status_idx";
DROP INDEX IF EXISTS public."asset_reservations_assetId_startDate_endDate_idx";
DROP INDEX IF EXISTS public."asset_reservations_assetId_idx";
DROP INDEX IF EXISTS public."asset_kits_isActive_idx";
DROP INDEX IF EXISTS public."asset_kit_items_kitId_idx";
DROP INDEX IF EXISTS public."asset_kit_items_kitId_assetId_key";
DROP INDEX IF EXISTS public."asset_kit_items_assetId_idx";
DROP INDEX IF EXISTS public."allowance_for_doubtful_accounts_provisionStatus_idx";
DROP INDEX IF EXISTS public."allowance_for_doubtful_accounts_journalEntryId_idx";
DROP INDEX IF EXISTS public."allowance_for_doubtful_accounts_invoiceId_idx";
DROP INDEX IF EXISTS public."allowance_for_doubtful_accounts_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public."allowance_for_doubtful_accounts_daysPastDue_idx";
DROP INDEX IF EXISTS public."allowance_for_doubtful_accounts_calculationDate_idx";
DROP INDEX IF EXISTS public."allowance_for_doubtful_accounts_agingBucket_idx";
DROP INDEX IF EXISTS public."accounts_payable_vendorInvoiceId_key";
DROP INDEX IF EXISTS public."accounts_payable_vendorId_idx";
DROP INDEX IF EXISTS public."accounts_payable_paymentStatus_idx";
DROP INDEX IF EXISTS public."accounts_payable_invoiceDate_idx";
DROP INDEX IF EXISTS public."accounts_payable_expenseId_key";
DROP INDEX IF EXISTS public."accounts_payable_dueDate_idx";
DROP INDEX IF EXISTS public."accounts_payable_apNumber_key";
DROP INDEX IF EXISTS public."accounts_payable_apNumber_idx";
DROP INDEX IF EXISTS public."accounts_payable_agingBucket_idx";
DROP INDEX IF EXISTS public."account_balances_isClosed_idx";
DROP INDEX IF EXISTS public."account_balances_fiscalPeriodId_idx";
DROP INDEX IF EXISTS public."account_balances_accountId_idx";
DROP INDEX IF EXISTS public."account_balances_accountId_fiscalPeriodId_key";
ALTER TABLE IF EXISTS ONLY public.work_in_progress DROP CONSTRAINT IF EXISTS work_in_progress_pkey;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_payment_allocations DROP CONSTRAINT IF EXISTS vendor_payment_allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_invoices DROP CONSTRAINT IF EXISTS vendor_invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_invoice_items DROP CONSTRAINT IF EXISTS vendor_invoice_items_pkey;
ALTER TABLE IF EXISTS ONLY public.ux_metrics DROP CONSTRAINT IF EXISTS ux_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.social_media_reports DROP CONSTRAINT IF EXISTS social_media_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.report_sections DROP CONSTRAINT IF EXISTS report_sections_pkey;
ALTER TABLE IF EXISTS ONLY public.quotations DROP CONSTRAINT IF EXISTS quotations_pkey;
ALTER TABLE IF EXISTS ONLY public.quotation_counters DROP CONSTRAINT IF EXISTS quotation_counters_pkey;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE IF EXISTS ONLY public.project_type_configs DROP CONSTRAINT IF EXISTS project_type_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.project_team_members DROP CONSTRAINT IF EXISTS project_team_members_pkey;
ALTER TABLE IF EXISTS ONLY public.project_milestones DROP CONSTRAINT IF EXISTS project_milestones_pkey;
ALTER TABLE IF EXISTS ONLY public.project_equipment_usage DROP CONSTRAINT IF EXISTS project_equipment_usage_pkey;
ALTER TABLE IF EXISTS ONLY public.project_cost_allocations DROP CONSTRAINT IF EXISTS project_cost_allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_milestones DROP CONSTRAINT IF EXISTS payment_milestones_pkey;
ALTER TABLE IF EXISTS ONLY public.maintenance_schedules DROP CONSTRAINT IF EXISTS maintenance_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_pkey;
ALTER TABLE IF EXISTS ONLY public.labor_entries DROP CONSTRAINT IF EXISTS labor_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.journal_line_items DROP CONSTRAINT IF EXISTS journal_line_items_pkey;
ALTER TABLE IF EXISTS ONLY public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.invoice_counters DROP CONSTRAINT IF EXISTS invoice_counters_pkey;
ALTER TABLE IF EXISTS ONLY public.indonesian_holidays DROP CONSTRAINT IF EXISTS indonesian_holidays_pkey;
ALTER TABLE IF EXISTS ONLY public.goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_pkey;
ALTER TABLE IF EXISTS ONLY public.goods_receipt_items DROP CONSTRAINT IF EXISTS goods_receipt_items_pkey;
ALTER TABLE IF EXISTS ONLY public.general_ledger DROP CONSTRAINT IF EXISTS general_ledger_pkey;
ALTER TABLE IF EXISTS ONLY public.fiscal_periods DROP CONSTRAINT IF EXISTS fiscal_periods_pkey;
ALTER TABLE IF EXISTS ONLY public.financial_statements DROP CONSTRAINT IF EXISTS financial_statements_pkey;
ALTER TABLE IF EXISTS ONLY public.feature_flags DROP CONSTRAINT IF EXISTS feature_flags_pkey;
ALTER TABLE IF EXISTS ONLY public.feature_flag_events DROP CONSTRAINT IF EXISTS feature_flag_events_pkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_pkey;
ALTER TABLE IF EXISTS ONLY public.expense_documents DROP CONSTRAINT IF EXISTS expense_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.expense_comments DROP CONSTRAINT IF EXISTS expense_comments_pkey;
ALTER TABLE IF EXISTS ONLY public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.expense_budgets DROP CONSTRAINT IF EXISTS expense_budgets_pkey;
ALTER TABLE IF EXISTS ONLY public.expense_approval_history DROP CONSTRAINT IF EXISTS expense_approval_history_pkey;
ALTER TABLE IF EXISTS ONLY public.exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_pkey;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY public.depreciation_schedules DROP CONSTRAINT IF EXISTS depreciation_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.depreciation_entries DROP CONSTRAINT IF EXISTS depreciation_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.deferred_revenue DROP CONSTRAINT IF EXISTS deferred_revenue_pkey;
ALTER TABLE IF EXISTS ONLY public.content_media DROP CONSTRAINT IF EXISTS content_media_pkey;
ALTER TABLE IF EXISTS ONLY public.content_calendar_items DROP CONSTRAINT IF EXISTS content_calendar_items_pkey;
ALTER TABLE IF EXISTS ONLY public.company_settings DROP CONSTRAINT IF EXISTS company_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE IF EXISTS ONLY public.chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_pkey;
ALTER TABLE IF EXISTS ONLY public.cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.cash_bank_balances DROP CONSTRAINT IF EXISTS cash_bank_balances_pkey;
ALTER TABLE IF EXISTS ONLY public.business_journey_events DROP CONSTRAINT IF EXISTS business_journey_events_pkey;
ALTER TABLE IF EXISTS ONLY public.business_journey_event_metadata DROP CONSTRAINT IF EXISTS business_journey_event_metadata_pkey;
ALTER TABLE IF EXISTS ONLY public.bank_transfers DROP CONSTRAINT IF EXISTS bank_transfers_pkey;
ALTER TABLE IF EXISTS ONLY public.bank_reconciliations DROP CONSTRAINT IF EXISTS bank_reconciliations_pkey;
ALTER TABLE IF EXISTS ONLY public.bank_reconciliation_items DROP CONSTRAINT IF EXISTS bank_reconciliation_items_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS assets_pkey;
ALTER TABLE IF EXISTS ONLY public.asset_reservations DROP CONSTRAINT IF EXISTS asset_reservations_pkey;
ALTER TABLE IF EXISTS ONLY public.asset_kits DROP CONSTRAINT IF EXISTS asset_kits_pkey;
ALTER TABLE IF EXISTS ONLY public.asset_kit_items DROP CONSTRAINT IF EXISTS asset_kit_items_pkey;
ALTER TABLE IF EXISTS ONLY public.allowance_for_doubtful_accounts DROP CONSTRAINT IF EXISTS allowance_for_doubtful_accounts_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_payable DROP CONSTRAINT IF EXISTS accounts_payable_pkey;
ALTER TABLE IF EXISTS ONLY public.account_balances DROP CONSTRAINT IF EXISTS account_balances_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.work_in_progress;
DROP TABLE IF EXISTS public.vendors;
DROP TABLE IF EXISTS public.vendor_payments;
DROP TABLE IF EXISTS public.vendor_payment_allocations;
DROP TABLE IF EXISTS public.vendor_invoices;
DROP TABLE IF EXISTS public.vendor_invoice_items;
DROP TABLE IF EXISTS public.ux_metrics;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_preferences;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.social_media_reports;
DROP TABLE IF EXISTS public.report_sections;
DROP TABLE IF EXISTS public.quotations;
DROP TABLE IF EXISTS public.quotation_counters;
DROP TABLE IF EXISTS public.purchase_orders;
DROP TABLE IF EXISTS public.purchase_order_items;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.project_type_configs;
DROP TABLE IF EXISTS public.project_team_members;
DROP TABLE IF EXISTS public.project_milestones;
DROP TABLE IF EXISTS public.project_equipment_usage;
DROP TABLE IF EXISTS public.project_cost_allocations;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.payment_milestones;
DROP TABLE IF EXISTS public.maintenance_schedules;
DROP TABLE IF EXISTS public.maintenance_records;
DROP TABLE IF EXISTS public.labor_entries;
DROP TABLE IF EXISTS public.journal_line_items;
DROP TABLE IF EXISTS public.journal_entries;
DROP TABLE IF EXISTS public.invoices;
DROP TABLE IF EXISTS public.invoice_counters;
DROP TABLE IF EXISTS public.indonesian_holidays;
DROP TABLE IF EXISTS public.goods_receipts;
DROP TABLE IF EXISTS public.goods_receipt_items;
DROP TABLE IF EXISTS public.general_ledger;
DROP TABLE IF EXISTS public.fiscal_periods;
DROP TABLE IF EXISTS public.financial_statements;
DROP TABLE IF EXISTS public.feature_flags;
DROP TABLE IF EXISTS public.feature_flag_events;
DROP TABLE IF EXISTS public.expenses;
DROP TABLE IF EXISTS public.expense_documents;
DROP TABLE IF EXISTS public.expense_comments;
DROP TABLE IF EXISTS public.expense_categories;
DROP TABLE IF EXISTS public.expense_budgets;
DROP TABLE IF EXISTS public.expense_approval_history;
DROP TABLE IF EXISTS public.exchange_rates;
DROP TABLE IF EXISTS public.documents;
DROP TABLE IF EXISTS public.depreciation_schedules;
DROP TABLE IF EXISTS public.depreciation_entries;
DROP TABLE IF EXISTS public.deferred_revenue;
DROP TABLE IF EXISTS public.content_media;
DROP TABLE IF EXISTS public.content_calendar_items;
DROP TABLE IF EXISTS public.company_settings;
DROP TABLE IF EXISTS public.clients;
DROP TABLE IF EXISTS public.chart_of_accounts;
DROP TABLE IF EXISTS public.cash_transactions;
DROP TABLE IF EXISTS public.cash_bank_balances;
DROP TABLE IF EXISTS public.business_journey_events;
DROP TABLE IF EXISTS public.business_journey_event_metadata;
DROP TABLE IF EXISTS public.bank_transfers;
DROP TABLE IF EXISTS public.bank_reconciliations;
DROP TABLE IF EXISTS public.bank_reconciliation_items;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.assets;
DROP TABLE IF EXISTS public.asset_reservations;
DROP TABLE IF EXISTS public.asset_kits;
DROP TABLE IF EXISTS public.asset_kit_items;
DROP TABLE IF EXISTS public.allowance_for_doubtful_accounts;
DROP TABLE IF EXISTS public.accounts_payable;
DROP TABLE IF EXISTS public.account_balances;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP FUNCTION IF EXISTS public.auto_create_expense_category();
DROP TYPE IF EXISTS public."WithholdingTaxType";
DROP TYPE IF EXISTS public."VendorType";
DROP TYPE IF EXISTS public."VendorPaymentStatus";
DROP TYPE IF EXISTS public."VIStatus";
DROP TYPE IF EXISTS public."UserRole";
DROP TYPE IF EXISTS public."TransferMethod";
DROP TYPE IF EXISTS public."TransactionType";
DROP TYPE IF EXISTS public."StatementType";
DROP TYPE IF EXISTS public."ReservationStatus";
DROP TYPE IF EXISTS public."ReportStatus";
DROP TYPE IF EXISTS public."QuotationStatus";
DROP TYPE IF EXISTS public."QualityStatus";
DROP TYPE IF EXISTS public."PurchaseType";
DROP TYPE IF EXISTS public."PurchaseSource";
DROP TYPE IF EXISTS public."ProjectStatus";
DROP TYPE IF EXISTS public."PeriodType";
DROP TYPE IF EXISTS public."PeriodStatus";
DROP TYPE IF EXISTS public."PaymentType";
DROP TYPE IF EXISTS public."PaymentStatus";
DROP TYPE IF EXISTS public."PaymentMethod";
DROP TYPE IF EXISTS public."PPNCategory";
DROP TYPE IF EXISTS public."POStatus";
DROP TYPE IF EXISTS public."POItemType";
DROP TYPE IF EXISTS public."PKPStatus";
DROP TYPE IF EXISTS public."MilestoneStatus";
DROP TYPE IF EXISTS public."MilestonePriority";
DROP TYPE IF EXISTS public."MediaType";
DROP TYPE IF EXISTS public."MatchingStatus";
DROP TYPE IF EXISTS public."MaintenanceFrequency";
DROP TYPE IF EXISTS public."LaborType";
DROP TYPE IF EXISTS public."LaborEntryStatus";
DROP TYPE IF EXISTS public."JournalStatus";
DROP TYPE IF EXISTS public."InvoiceStatus";
DROP TYPE IF EXISTS public."InspectionStatus";
DROP TYPE IF EXISTS public."HolidayType";
DROP TYPE IF EXISTS public."GRStatus";
DROP TYPE IF EXISTS public."FeeType";
DROP TYPE IF EXISTS public."ExpenseStatus";
DROP TYPE IF EXISTS public."ExpensePaymentStatus";
DROP TYPE IF EXISTS public."ExpenseDocumentCategory";
DROP TYPE IF EXISTS public."ExpenseClass";
DROP TYPE IF EXISTS public."ExpenseApprovalAction";
DROP TYPE IF EXISTS public."EFakturStatus";
DROP TYPE IF EXISTS public."ECLProvisionStatus";
DROP TYPE IF EXISTS public."DocumentCategory";
DROP TYPE IF EXISTS public."DepreciationStatus";
DROP TYPE IF EXISTS public."DepreciationMethod";
DROP TYPE IF EXISTS public."DeferredRevenueStatus";
DROP TYPE IF EXISTS public."Currency";
DROP TYPE IF EXISTS public."CostType";
DROP TYPE IF EXISTS public."ContentStatus";
DROP TYPE IF EXISTS public."ContentPlatform";
DROP TYPE IF EXISTS public."CashTransactionType";
DROP TYPE IF EXISTS public."CashTransactionStatus";
DROP TYPE IF EXISTS public."CashCategory";
DROP TYPE IF EXISTS public."BusinessJourneyPriority";
DROP TYPE IF EXISTS public."BusinessJourneyEventType";
DROP TYPE IF EXISTS public."BusinessJourneyEventStatus";
DROP TYPE IF EXISTS public."BusinessJourneyEventSource";
DROP TYPE IF EXISTS public."BudgetPeriod";
DROP TYPE IF EXISTS public."BankTransferStatus";
DROP TYPE IF EXISTS public."BankRecStatus";
DROP TYPE IF EXISTS public."BankRecItemType";
DROP TYPE IF EXISTS public."BankRecItemStatus";
DROP TYPE IF EXISTS public."BalanceType";
DROP TYPE IF EXISTS public."AssetStatus";
DROP TYPE IF EXISTS public."AssetCondition";
DROP TYPE IF EXISTS public."ApprovalStatus";
DROP TYPE IF EXISTS public."AllocationMethod";
DROP TYPE IF EXISTS public."AccountType";
DROP TYPE IF EXISTS public."APSourceType";
DROP TYPE IF EXISTS public."APPaymentStatus";
--
-- Name: APPaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."APPaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'WRITTEN_OFF'
);


--
-- Name: APSourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."APSourceType" AS ENUM (
    'VENDOR_INVOICE',
    'EXPENSE',
    'MANUAL_ENTRY'
);


--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountType" AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'REVENUE',
    'EXPENSE'
);


--
-- Name: AllocationMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AllocationMethod" AS ENUM (
    'PERCENTAGE',
    'HOURS',
    'DIRECT',
    'SQUARE_METER',
    'HEADCOUNT'
);


--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: AssetCondition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssetCondition" AS ENUM (
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'POOR',
    'BROKEN'
);


--
-- Name: AssetStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssetStatus" AS ENUM (
    'AVAILABLE',
    'RESERVED',
    'CHECKED_OUT',
    'IN_MAINTENANCE',
    'BROKEN',
    'RETIRED'
);


--
-- Name: BalanceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BalanceType" AS ENUM (
    'DEBIT',
    'CREDIT'
);


--
-- Name: BankRecItemStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BankRecItemStatus" AS ENUM (
    'PENDING',
    'MATCHED',
    'ADJUSTED',
    'CLEARED',
    'UNRESOLVED'
);


--
-- Name: BankRecItemType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BankRecItemType" AS ENUM (
    'DEPOSIT_IN_TRANSIT',
    'OUTSTANDING_CHECK',
    'BANK_CHARGE',
    'BANK_INTEREST',
    'NSF_CHECK',
    'AUTOMATIC_PAYMENT',
    'DIRECT_DEPOSIT',
    'BANK_ERROR',
    'BOOK_ERROR',
    'OTHER_ADJUSTMENT'
);


--
-- Name: BankRecStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BankRecStatus" AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'REVIEWED',
    'APPROVED',
    'REJECTED',
    'COMPLETED'
);


--
-- Name: BankTransferStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BankTransferStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: BudgetPeriod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BudgetPeriod" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'YEARLY',
    'CUSTOM'
);


--
-- Name: BusinessJourneyEventSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessJourneyEventSource" AS ENUM (
    'SYSTEM',
    'USER',
    'API',
    'WEBHOOK'
);


--
-- Name: BusinessJourneyEventStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessJourneyEventStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'REQUIRES_ATTENTION'
);


--
-- Name: BusinessJourneyEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessJourneyEventType" AS ENUM (
    'CLIENT_CREATED',
    'PROJECT_STARTED',
    'QUOTATION_DRAFT',
    'QUOTATION_SENT',
    'QUOTATION_APPROVED',
    'QUOTATION_DECLINED',
    'QUOTATION_REVISED',
    'INVOICE_GENERATED',
    'INVOICE_SENT',
    'PAYMENT_RECEIVED',
    'PAYMENT_OVERDUE',
    'MATERAI_REQUIRED',
    'MATERAI_APPLIED'
);


--
-- Name: BusinessJourneyPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessJourneyPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: CashCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CashCategory" AS ENUM (
    'SALES_REVENUE',
    'SERVICE_REVENUE',
    'OTHER_INCOME',
    'OPERATING_EXPENSE',
    'ASSET_PURCHASE',
    'LOAN_REPAYMENT',
    'OTHER_EXPENSE'
);


--
-- Name: CashTransactionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CashTransactionStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'POSTED',
    'REJECTED',
    'VOID'
);


--
-- Name: CashTransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CashTransactionType" AS ENUM (
    'RECEIPT',
    'DISBURSEMENT'
);


--
-- Name: ContentPlatform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContentPlatform" AS ENUM (
    'INSTAGRAM',
    'TIKTOK',
    'FACEBOOK',
    'TWITTER',
    'LINKEDIN',
    'YOUTUBE'
);


--
-- Name: ContentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContentStatus" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'PUBLISHED',
    'FAILED',
    'ARCHIVED'
);


--
-- Name: CostType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CostType" AS ENUM (
    'MATERIAL',
    'LABOR',
    'OVERHEAD',
    'SUBCONTRACTOR',
    'EQUIPMENT'
);


--
-- Name: Currency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Currency" AS ENUM (
    'IDR',
    'USD',
    'USDT'
);


--
-- Name: DeferredRevenueStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeferredRevenueStatus" AS ENUM (
    'DEFERRED',
    'PARTIALLY_RECOGNIZED',
    'FULLY_RECOGNIZED',
    'REFUNDED'
);


--
-- Name: DepreciationMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DepreciationMethod" AS ENUM (
    'STRAIGHT_LINE',
    'DECLINING_BALANCE',
    'DOUBLE_DECLINING',
    'SUM_OF_YEARS_DIGITS',
    'UNITS_OF_PRODUCTION'
);


--
-- Name: DepreciationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DepreciationStatus" AS ENUM (
    'CALCULATED',
    'POSTED',
    'REVERSED',
    'ADJUSTED'
);


--
-- Name: DocumentCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentCategory" AS ENUM (
    'SUPPORTING_DOCUMENT',
    'CONTRACT',
    'RECEIPT',
    'INVOICE_ATTACHMENT',
    'OTHER'
);


--
-- Name: ECLProvisionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ECLProvisionStatus" AS ENUM (
    'ACTIVE',
    'WRITTEN_OFF',
    'RECOVERED',
    'REVERSED'
);


--
-- Name: EFakturStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EFakturStatus" AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'UPLOADED',
    'VALID',
    'INVALID',
    'EXPIRED'
);


--
-- Name: ExpenseApprovalAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseApprovalAction" AS ENUM (
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'RECALLED',
    'PAYMENT_REQUESTED',
    'PAYMENT_COMPLETED'
);


--
-- Name: ExpenseClass; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseClass" AS ENUM (
    'SELLING',
    'GENERAL_ADMIN',
    'OTHER',
    'LABOR_COST',
    'COGS'
);


--
-- Name: ExpenseDocumentCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseDocumentCategory" AS ENUM (
    'RECEIPT',
    'SUPPORTING_DOC',
    'CONTRACT',
    'BUKTI_POTONG',
    'OTHER'
);


--
-- Name: ExpensePaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpensePaymentStatus" AS ENUM (
    'UNPAID',
    'PENDING',
    'PAID',
    'PARTIAL'
);


--
-- Name: ExpenseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'PAID',
    'CANCELLED'
);


--
-- Name: FeeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeeType" AS ENUM (
    'PERCENTAGE',
    'FIXED',
    'HOURLY'
);


--
-- Name: GRStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GRStatus" AS ENUM (
    'DRAFT',
    'RECEIVED',
    'INSPECTED',
    'POSTED',
    'CANCELLED'
);


--
-- Name: HolidayType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."HolidayType" AS ENUM (
    'NATIONAL',
    'RELIGIOUS',
    'REGIONAL',
    'SUBSTITUTE'
);


--
-- Name: InspectionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InspectionStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'PASSED',
    'FAILED',
    'PARTIAL'
);


--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


--
-- Name: JournalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JournalStatus" AS ENUM (
    'DRAFT',
    'POSTED',
    'VOID',
    'REVERSED'
);


--
-- Name: LaborEntryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LaborEntryStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'BILLED'
);


--
-- Name: LaborType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LaborType" AS ENUM (
    'REGULAR',
    'OVERTIME',
    'HOLIDAY',
    'WEEKEND'
);


--
-- Name: MaintenanceFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MaintenanceFrequency" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'SEMI_ANNUAL',
    'ANNUAL',
    'AS_NEEDED'
);


--
-- Name: MatchingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MatchingStatus" AS ENUM (
    'UNMATCHED',
    'MATCHED',
    'PARTIAL_MATCH',
    'VARIANCE',
    'FAILED'
);


--
-- Name: MediaType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MediaType" AS ENUM (
    'IMAGE',
    'VIDEO',
    'CAROUSEL'
);


--
-- Name: MilestonePriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MilestonePriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


--
-- Name: MilestoneStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MilestoneStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'ACCEPTED',
    'BILLED',
    'CANCELLED'
);


--
-- Name: PKPStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PKPStatus" AS ENUM (
    'PKP',
    'NON_PKP',
    'GOVERNMENT'
);


--
-- Name: POItemType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POItemType" AS ENUM (
    'GOODS',
    'SERVICE',
    'ASSET',
    'EXPENSE'
);


--
-- Name: POStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."POStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'SENT',
    'PARTIAL',
    'COMPLETED',
    'CANCELLED',
    'CLOSED'
);


--
-- Name: PPNCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PPNCategory" AS ENUM (
    'CREDITABLE',
    'NON_CREDITABLE',
    'EXEMPT',
    'ZERO_RATED'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'BANK_TRANSFER',
    'CASH',
    'OTHER'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'FAILED',
    'REFUNDED'
);


--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentType" AS ENUM (
    'FULL_PAYMENT',
    'MILESTONE_BASED',
    'ADVANCE_PAYMENT',
    'CUSTOM'
);


--
-- Name: PeriodStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PeriodStatus" AS ENUM (
    'OPEN',
    'CLOSED',
    'LOCKED'
);


--
-- Name: PeriodType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PeriodType" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'YEARLY'
);


--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'PLANNING',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: PurchaseSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PurchaseSource" AS ENUM (
    'MANUAL',
    'FROM_PO',
    'FROM_VENDOR_INVOICE'
);


--
-- Name: PurchaseType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PurchaseType" AS ENUM (
    'DIRECT',
    'CREDIT',
    'FROM_PO'
);


--
-- Name: QualityStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QualityStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CONDITIONAL'
);


--
-- Name: QuotationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuotationStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'APPROVED',
    'DECLINED',
    'REVISED'
);


--
-- Name: ReportStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReportStatus" AS ENUM (
    'DRAFT',
    'COMPLETED',
    'SENT'
);


--
-- Name: ReservationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReservationStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED'
);


--
-- Name: StatementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StatementType" AS ENUM (
    'INCOME_STATEMENT',
    'BALANCE_SHEET',
    'CASH_FLOW',
    'TRIAL_BALANCE',
    'ACCOUNTS_RECEIVABLE',
    'ACCOUNTS_PAYABLE'
);


--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionType" AS ENUM (
    'INVOICE_SENT',
    'INVOICE_PAID',
    'EXPENSE_SUBMITTED',
    'EXPENSE_PAID',
    'PAYMENT_RECEIVED',
    'PAYMENT_MADE',
    'DEPRECIATION',
    'ADJUSTMENT',
    'CLOSING',
    'OPENING',
    'CASH_RECEIPT',
    'CASH_DISBURSEMENT',
    'BANK_TRANSFER',
    'CAPITAL_CONTRIBUTION',
    'OWNER_DRAWING',
    'PO_APPROVED',
    'PO_CANCELLED',
    'GOODS_RECEIVED',
    'VENDOR_INVOICE_APPROVED',
    'VENDOR_PAYMENT_MADE',
    'PURCHASE_RETURN',
    'BANK_RECONCILIATION'
);


--
-- Name: TransferMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransferMethod" AS ENUM (
    'INTERNAL',
    'INTERBANK',
    'RTGS',
    'CLEARING',
    'SKN',
    'BIFAST',
    'OTHER'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'FINANCE_MANAGER',
    'ACCOUNTANT',
    'PROJECT_MANAGER',
    'STAFF',
    'VIEWER',
    'ADMIN',
    'USER'
);


--
-- Name: VIStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VIStatus" AS ENUM (
    'DRAFT',
    'PENDING_MATCH',
    'MATCHED',
    'APPROVED',
    'POSTED',
    'PAID',
    'CANCELLED'
);


--
-- Name: VendorPaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VendorPaymentStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'POSTED',
    'CLEARED',
    'CANCELLED',
    'REVERSED'
);


--
-- Name: VendorType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VendorType" AS ENUM (
    'SUPPLIER',
    'SERVICE_PROVIDER',
    'CONTRACTOR',
    'CONSULTANT',
    'UTILITY',
    'GOVERNMENT',
    'OTHER'
);


--
-- Name: WithholdingTaxType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WithholdingTaxType" AS ENUM (
    'PPH23',
    'PPH4_2',
    'PPH15',
    'NONE'
);


--
-- Name: auto_create_expense_category(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_create_expense_category() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_expense_class "ExpenseClass";
  v_code_prefix TEXT;
  v_category_code TEXT;
  v_existing_id TEXT;
BEGIN
  -- Only process if this is an EXPENSE account starting with 5- or 6-
  IF NEW."accountType" = 'EXPENSE' AND (NEW.code LIKE '5-%' OR NEW.code LIKE '6-%') THEN
    
    -- Generate category code from account code (replace - with _)
    v_category_code := UPPER(REPLACE(NEW.code, '-', '_'));
    
    -- Determine expense class based on account code pattern
    v_code_prefix := substring(NEW.code from 1 for 2);
    
    CASE 
      -- 5-xxxx: COGS (Cost of Goods Sold)
      WHEN v_code_prefix = '5-' THEN
        v_expense_class := 'COGS';
      
      -- 6-1xxx: SELLING (Sales Expenses)
      WHEN NEW.code LIKE '6-1%' THEN
        v_expense_class := 'SELLING';
      
      -- 6-2010: LABOR_COST (Special case)
      WHEN NEW.code = '6-2010' THEN
        v_expense_class := 'LABOR_COST';
      
      -- 6-2xxx: GENERAL_ADMIN (General & Administrative Expenses)
      WHEN NEW.code LIKE '6-2%' THEN
        v_expense_class := 'GENERAL_ADMIN';
      
      -- Other 6-xxxx: Default to OTHER
      ELSE
        v_expense_class := 'OTHER';
    END CASE;
    
    -- Check if expense category already exists for this accountCode
    SELECT id INTO v_existing_id
    FROM expense_categories
    WHERE "accountCode" = NEW.code
    LIMIT 1;
    
    IF v_existing_id IS NULL THEN
      -- Insert new expense category
      INSERT INTO expense_categories (
        id,
        code,
        "accountCode",
        "expenseClass",
        name,
        "nameId",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        v_category_code,
        NEW.code,
        v_expense_class,
        NEW.name,
        NEW."nameId",
        NEW."isActive",
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO UPDATE SET
        "accountCode" = EXCLUDED."accountCode",
        name = EXCLUDED.name,
        "nameId" = EXCLUDED."nameId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();
      
      RAISE NOTICE 'Auto-created expense category: % for account code: %', v_category_code, NEW.code;
    ELSE
      -- Update existing expense category
      UPDATE expense_categories SET
        name = NEW.name,
        "nameId" = NEW."nameId",
        "isActive" = NEW."isActive",
        "updatedAt" = NOW()
      WHERE id = v_existing_id;
      
      RAISE NOTICE 'Updated existing expense category for account code: %', NEW.code;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION auto_create_expense_category(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_create_expense_category() IS 'Automatically creates or updates expense_categories when new expense accounts (5-xxxx or 6-xxxx) are added to chart_of_accounts';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: account_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_balances (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "fiscalPeriodId" text NOT NULL,
    "beginningBalance" numeric(15,2) DEFAULT 0 NOT NULL,
    "debitTotal" numeric(15,2) DEFAULT 0 NOT NULL,
    "creditTotal" numeric(15,2) DEFAULT 0 NOT NULL,
    "endingBalance" numeric(15,2) DEFAULT 0 NOT NULL,
    "isClosed" boolean DEFAULT false NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "lastUpdated" timestamp(3) without time zone NOT NULL
);


--
-- Name: accounts_payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_payable (
    id text NOT NULL,
    "apNumber" text NOT NULL,
    "vendorId" text NOT NULL,
    "sourceType" public."APSourceType" NOT NULL,
    "vendorInvoiceId" text,
    "expenseId" text,
    "originalAmount" numeric(15,2) NOT NULL,
    "paidAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "outstandingAmount" numeric(15,2) NOT NULL,
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paymentStatus" public."APPaymentStatus" DEFAULT 'UNPAID'::public."APPaymentStatus" NOT NULL,
    "daysOutstanding" integer,
    "agingBucket" text,
    "journalEntryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


--
-- Name: allowance_for_doubtful_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allowance_for_doubtful_accounts (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "calculationDate" timestamp(3) without time zone NOT NULL,
    "fiscalPeriodId" text,
    "agingBucket" text NOT NULL,
    "daysPastDue" integer DEFAULT 0 NOT NULL,
    "outstandingAmount" numeric(15,2) NOT NULL,
    "eclRate" numeric(5,4) NOT NULL,
    "eclAmount" numeric(15,2) NOT NULL,
    "previousEclAmount" numeric(15,2),
    "adjustmentAmount" numeric(15,2),
    "eclModel" text DEFAULT '12_MONTH'::text NOT NULL,
    "lossRateSource" text,
    "provisionStatus" public."ECLProvisionStatus" DEFAULT 'ACTIVE'::public."ECLProvisionStatus" NOT NULL,
    "journalEntryId" text,
    "writtenOffAt" timestamp(3) without time zone,
    "writtenOffBy" text,
    "writeOffReason" text,
    "writeOffAmount" numeric(15,2),
    "recoveredAt" timestamp(3) without time zone,
    "recoveredAmount" numeric(15,2),
    "recoveryJournalId" text,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


--
-- Name: asset_kit_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_kit_items (
    id text NOT NULL,
    "kitId" text NOT NULL,
    "assetId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


--
-- Name: asset_kits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_kits (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: asset_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_reservations (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "userId" text NOT NULL,
    "projectId" text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    purpose text NOT NULL,
    status public."ReservationStatus" DEFAULT 'PENDING'::public."ReservationStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id text NOT NULL,
    "assetCode" text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    subcategory text,
    manufacturer text,
    model text,
    "serialNumber" text,
    specifications jsonb,
    "purchaseDate" timestamp(3) without time zone NOT NULL,
    "purchasePrice" numeric(15,2) NOT NULL,
    supplier text,
    "invoiceNumber" text,
    "warrantyExpiration" timestamp(3) without time zone,
    "currentValue" numeric(15,2),
    "notesFinancial" text,
    status public."AssetStatus" DEFAULT 'AVAILABLE'::public."AssetStatus" NOT NULL,
    condition public."AssetCondition" DEFAULT 'GOOD'::public."AssetCondition" NOT NULL,
    location text,
    photos text[],
    documents text[],
    "qrCode" text,
    "rfidTag" text,
    tags text[],
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text,
    "vendorId" text,
    "purchaseOrderId" text,
    "goodsReceiptId" text,
    "vendorInvoiceId" text
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "oldValues" jsonb,
    "newValues" jsonb,
    "userId" text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bank_reconciliation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_reconciliation_items (
    id text NOT NULL,
    "reconciliationId" text NOT NULL,
    "itemDate" timestamp(3) without time zone NOT NULL,
    "itemType" public."BankRecItemType" NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    amount numeric(15,2) NOT NULL,
    "isMatched" boolean DEFAULT false NOT NULL,
    "matchedTransactionId" text,
    "matchedAt" timestamp(3) without time zone,
    "matchedBy" text,
    status public."BankRecItemStatus" DEFAULT 'PENDING'::public."BankRecItemStatus" NOT NULL,
    "requiresAdjustment" boolean DEFAULT false NOT NULL,
    "adjustmentJournalId" text,
    "adjustedAt" timestamp(3) without time zone,
    "checkNumber" text,
    reference text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    notes text
);


--
-- Name: bank_reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_reconciliations (
    id text NOT NULL,
    "reconciliationNumber" text NOT NULL,
    "bankAccountId" text NOT NULL,
    "statementDate" timestamp(3) without time zone NOT NULL,
    "periodStartDate" timestamp(3) without time zone NOT NULL,
    "periodEndDate" timestamp(3) without time zone NOT NULL,
    "bookBalanceStart" numeric(15,2) NOT NULL,
    "bookBalanceEnd" numeric(15,2) NOT NULL,
    "statementBalance" numeric(15,2) NOT NULL,
    "depositsInTransit" numeric(15,2) DEFAULT 0 NOT NULL,
    "outstandingChecks" numeric(15,2) DEFAULT 0 NOT NULL,
    "bankCharges" numeric(15,2) DEFAULT 0 NOT NULL,
    "bankInterest" numeric(15,2) DEFAULT 0 NOT NULL,
    "otherAdjustments" numeric(15,2) DEFAULT 0 NOT NULL,
    "adjustedBookBalance" numeric(15,2) NOT NULL,
    "adjustedBankBalance" numeric(15,2) NOT NULL,
    difference numeric(15,2) DEFAULT 0 NOT NULL,
    "isBalanced" boolean DEFAULT false NOT NULL,
    "statementReference" text,
    "statementFilePath" text,
    status public."BankRecStatus" DEFAULT 'DRAFT'::public."BankRecStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "adjustmentJournalId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    notes text,
    "notesId" text
);


--
-- Name: bank_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_transfers (
    id text NOT NULL,
    "transferNumber" text NOT NULL,
    "transferDate" timestamp(3) without time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency public."Currency" DEFAULT 'IDR'::public."Currency" NOT NULL,
    "originalAmount" numeric(18,2),
    "exchangeRate" numeric(18,8),
    "idrAmount" numeric(15,2) NOT NULL,
    "fromAccountId" text NOT NULL,
    "toAccountId" text NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    "descriptionEn" text,
    reference text,
    "transferFee" numeric(12,2),
    "feeAccountId" text,
    "feePaymentMethod" text,
    "transferMethod" public."TransferMethod" DEFAULT 'INTERNAL'::public."TransferMethod" NOT NULL,
    "bankReference" text,
    "confirmationCode" text,
    "projectId" text,
    "clientId" text,
    "journalEntryId" text,
    status public."BankTransferStatus" DEFAULT 'PENDING'::public."BankTransferStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "completedAt" timestamp(3) without time zone,
    "completedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    notes text,
    "notesId" text
);


--
-- Name: business_journey_event_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_journey_event_metadata (
    id text NOT NULL,
    "eventId" text NOT NULL,
    "userCreated" text NOT NULL,
    "userModified" text,
    source public."BusinessJourneyEventSource" DEFAULT 'SYSTEM'::public."BusinessJourneyEventSource" NOT NULL,
    priority public."BusinessJourneyPriority" DEFAULT 'MEDIUM'::public."BusinessJourneyPriority" NOT NULL,
    tags text[],
    "relatedDocuments" text[],
    notes text,
    "ipAddress" text,
    "userAgent" text,
    "materaiRequired" boolean DEFAULT false NOT NULL,
    "materaiAmount" numeric(12,2),
    "complianceStatus" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: business_journey_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_journey_events (
    id text NOT NULL,
    type public."BusinessJourneyEventType" NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status public."BusinessJourneyEventStatus" DEFAULT 'PENDING'::public."BusinessJourneyEventStatus" NOT NULL,
    amount numeric(12,2),
    "clientId" text,
    "projectId" text,
    "quotationId" text,
    "invoiceId" text,
    "paymentId" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: cash_bank_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_bank_balances (
    id text NOT NULL,
    period character varying(100) NOT NULL,
    "periodDate" timestamp(3) without time zone NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    "openingBalance" numeric(15,2) NOT NULL,
    "closingBalance" numeric(15,2) NOT NULL,
    "totalInflow" numeric(15,2) NOT NULL,
    "totalOutflow" numeric(15,2) NOT NULL,
    "netChange" numeric(15,2) NOT NULL,
    "calculatedAt" timestamp(3) without time zone,
    "calculatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text,
    notes text
);


--
-- Name: cash_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_transactions (
    id text NOT NULL,
    "transactionNumber" text NOT NULL,
    "transactionType" public."CashTransactionType" NOT NULL,
    category public."CashCategory" NOT NULL,
    "transactionDate" timestamp(3) without time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency public."Currency" DEFAULT 'IDR'::public."Currency" NOT NULL,
    "originalAmount" numeric(18,2),
    "exchangeRate" numeric(18,8),
    "idrAmount" numeric(15,2) NOT NULL,
    "cashAccountId" text NOT NULL,
    "offsetAccountId" text NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    "descriptionEn" text,
    reference text,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    "checkNumber" text,
    "bankReference" text,
    "projectId" text,
    "clientId" text,
    "journalEntryId" text,
    status public."CashTransactionStatus" DEFAULT 'DRAFT'::public."CashTransactionStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    notes text,
    "notesId" text
);


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "nameId" text NOT NULL,
    "accountType" public."AccountType" NOT NULL,
    "accountSubType" text NOT NULL,
    "normalBalance" public."BalanceType" NOT NULL,
    "parentId" text,
    "isControlAccount" boolean DEFAULT false NOT NULL,
    "isTaxAccount" boolean DEFAULT false NOT NULL,
    "taxType" text,
    currency public."Currency" DEFAULT 'IDR'::public."Currency" NOT NULL,
    "isCurrencyAccount" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isSystemAccount" boolean DEFAULT false NOT NULL,
    description text,
    "descriptionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text NOT NULL,
    address text,
    company text,
    "contactPerson" text,
    "paymentTerms" text,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id text DEFAULT 'default'::text NOT NULL,
    "companyName" text DEFAULT 'PT Teknologi Indonesia'::text NOT NULL,
    address text,
    phone text,
    email text,
    website text,
    "taxNumber" text,
    currency text DEFAULT 'IDR'::text NOT NULL,
    "bankBCA" text,
    "bankMandiri" text,
    "bankBNI" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: content_calendar_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_calendar_items (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "scheduledAt" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone,
    status public."ContentStatus" DEFAULT 'DRAFT'::public."ContentStatus" NOT NULL,
    platforms public."ContentPlatform"[],
    "clientId" text,
    "projectId" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: content_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_media (
    id text NOT NULL,
    url text NOT NULL,
    key text NOT NULL,
    type public."MediaType" NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    width integer,
    height integer,
    duration integer,
    "originalName" text,
    "contentId" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: deferred_revenue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deferred_revenue (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "recognitionDate" timestamp(3) without time zone NOT NULL,
    "recognizedAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "remainingAmount" numeric(15,2) NOT NULL,
    status public."DeferredRevenueStatus" DEFAULT 'DEFERRED'::public."DeferredRevenueStatus" NOT NULL,
    "performanceObligation" text,
    "completionPercentage" numeric(5,2),
    "initialJournalId" text,
    "recognitionJournalId" text,
    "fiscalPeriodId" text,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "recognizedAt" timestamp(3) without time zone,
    "recognizedBy" text
);


--
-- Name: depreciation_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depreciation_entries (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "scheduleId" text NOT NULL,
    "periodDate" timestamp(3) without time zone NOT NULL,
    "fiscalPeriodId" text,
    "depreciationAmount" numeric(15,2) NOT NULL,
    "accumulatedDepreciation" numeric(15,2) NOT NULL,
    "bookValue" numeric(15,2) NOT NULL,
    "journalEntryId" text,
    status public."DepreciationStatus" DEFAULT 'CALCULATED'::public."DepreciationStatus" NOT NULL,
    "calculatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "postedAt" timestamp(3) without time zone,
    "postedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: depreciation_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depreciation_schedules (
    id text NOT NULL,
    "assetId" text NOT NULL,
    method public."DepreciationMethod" NOT NULL,
    "depreciableAmount" numeric(15,2) NOT NULL,
    "residualValue" numeric(15,2) DEFAULT 0 NOT NULL,
    "usefulLifeMonths" integer NOT NULL,
    "usefulLifeYears" numeric(5,2) NOT NULL,
    "depreciationPerMonth" numeric(15,2) NOT NULL,
    "depreciationPerYear" numeric(15,2) NOT NULL,
    "annualRate" numeric(5,4) NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isFulfilled" boolean DEFAULT false NOT NULL,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id text NOT NULL,
    "fileName" text NOT NULL,
    "originalFileName" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    category public."DocumentCategory" DEFAULT 'OTHER'::public."DocumentCategory" NOT NULL,
    description text,
    "invoiceId" text,
    "quotationId" text,
    "projectId" text,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id text NOT NULL,
    "fromCurrency" public."Currency" NOT NULL,
    "toCurrency" public."Currency" DEFAULT 'IDR'::public."Currency" NOT NULL,
    rate numeric(18,8) NOT NULL,
    "effectiveDate" timestamp(3) without time zone NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    source text,
    "isAutomatic" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


--
-- Name: expense_approval_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_approval_history (
    id text NOT NULL,
    "expenseId" text NOT NULL,
    action public."ExpenseApprovalAction" NOT NULL,
    "actionBy" text NOT NULL,
    "previousStatus" public."ExpenseStatus" NOT NULL,
    "newStatus" public."ExpenseStatus" NOT NULL,
    comments text,
    "commentsId" text,
    "commentsEn" text,
    "actionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: expense_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_budgets (
    id text NOT NULL,
    name text NOT NULL,
    "nameId" text,
    description text,
    "descriptionId" text,
    "categoryId" text,
    "projectId" text,
    "userId" text,
    amount numeric(12,2) NOT NULL,
    period public."BudgetPeriod" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    spent numeric(12,2) DEFAULT 0 NOT NULL,
    remaining numeric(12,2) NOT NULL,
    "alertThreshold" integer DEFAULT 80 NOT NULL,
    "alertSent" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id text NOT NULL,
    code text NOT NULL,
    "accountCode" text NOT NULL,
    "expenseClass" public."ExpenseClass" NOT NULL,
    name text NOT NULL,
    "nameId" text NOT NULL,
    description text,
    "descriptionId" text,
    "parentId" text,
    "defaultPPNRate" numeric(5,4) DEFAULT 0.1200 NOT NULL,
    "isLuxuryGoods" boolean DEFAULT false NOT NULL,
    "withholdingTaxType" public."WithholdingTaxType" DEFAULT 'NONE'::public."WithholdingTaxType",
    "withholdingTaxRate" numeric(5,4),
    icon text,
    color text DEFAULT '#1890ff'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isBillable" boolean DEFAULT false NOT NULL,
    "requiresReceipt" boolean DEFAULT true NOT NULL,
    "requiresEFaktur" boolean DEFAULT true NOT NULL,
    "approvalRequired" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: expense_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_comments (
    id text NOT NULL,
    "expenseId" text NOT NULL,
    "userId" text NOT NULL,
    comment text NOT NULL,
    "commentId" text,
    "commentEn" text,
    "isInternal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: expense_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_documents (
    id text NOT NULL,
    "fileName" text NOT NULL,
    "originalFileName" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    category public."ExpenseDocumentCategory" DEFAULT 'OTHER'::public."ExpenseDocumentCategory" NOT NULL,
    description text,
    "expenseId" text NOT NULL,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id text NOT NULL,
    "expenseNumber" text NOT NULL,
    "buktiPengeluaranNumber" text NOT NULL,
    "accountCode" text NOT NULL,
    "accountName" text NOT NULL,
    "accountNameEn" text,
    "expenseClass" public."ExpenseClass" NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    "descriptionEn" text,
    "ppnRate" numeric(5,4) DEFAULT 0.1200 NOT NULL,
    "ppnAmount" numeric(12,2) NOT NULL,
    "ppnCategory" public."PPNCategory" DEFAULT 'CREDITABLE'::public."PPNCategory" NOT NULL,
    "isLuxuryGoods" boolean DEFAULT false NOT NULL,
    "eFakturNSFP" text,
    "eFakturQRCode" text,
    "eFakturApprovalCode" text,
    "eFakturStatus" public."EFakturStatus" DEFAULT 'NOT_REQUIRED'::public."EFakturStatus" NOT NULL,
    "eFakturValidatedAt" timestamp(3) without time zone,
    "withholdingTaxType" public."WithholdingTaxType",
    "withholdingTaxRate" numeric(5,4),
    "withholdingTaxAmount" numeric(12,2),
    "buktiPotongNumber" text,
    "buktiPotongDate" timestamp(3) without time zone,
    "vendorName" text NOT NULL,
    "vendorNPWP" text,
    "vendorAddress" text,
    "vendorPhone" text,
    "vendorBank" text,
    "vendorAccountNo" text,
    "vendorAccountName" text,
    "grossAmount" numeric(12,2) NOT NULL,
    "withholdingAmount" numeric(12,2),
    "netAmount" numeric(12,2) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    "categoryId" text NOT NULL,
    tags text[],
    "isTaxDeductible" boolean DEFAULT true NOT NULL,
    "userId" text NOT NULL,
    "projectId" text,
    "clientId" text,
    "isBillable" boolean DEFAULT false NOT NULL,
    "billableAmount" numeric(12,2),
    "invoiceId" text,
    status public."ExpenseStatus" DEFAULT 'DRAFT'::public."ExpenseStatus" NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "paymentStatus" public."ExpensePaymentStatus" DEFAULT 'UNPAID'::public."ExpensePaymentStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paymentMethod" text,
    "paymentReference" text,
    "paymentId" text,
    "journalEntryId" text,
    "paymentJournalId" text,
    notes text,
    "notesId" text,
    "notesEn" text,
    "receiptNumber" text,
    "merchantName" text,
    location text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text,
    "purchaseType" public."PurchaseType" DEFAULT 'DIRECT'::public."PurchaseType" NOT NULL,
    "purchaseSource" public."PurchaseSource" DEFAULT 'MANUAL'::public."PurchaseSource" NOT NULL,
    "vendorId" text,
    "purchaseOrderId" text,
    "vendorInvoiceId" text,
    "accountsPayableId" text,
    "dueDate" timestamp(3) without time zone
);


--
-- Name: feature_flag_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flag_events (
    id text NOT NULL,
    "flagId" text NOT NULL,
    "userId" text,
    "eventType" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    "globalEnabled" boolean DEFAULT false NOT NULL,
    "targetUsers" text[],
    "targetGroups" text[],
    rules jsonb,
    "expiresAt" timestamp(3) without time zone,
    "disabledReason" text,
    "disabledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: financial_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_statements (
    id text NOT NULL,
    "statementType" public."StatementType" NOT NULL,
    "fiscalPeriodId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    data jsonb NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "generatedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: fiscal_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_periods (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "periodType" public."PeriodType" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."PeriodStatus" DEFAULT 'OPEN'::public."PeriodStatus" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "closedBy" text,
    "closingNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: general_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.general_ledger (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "entryDate" timestamp(3) without time zone NOT NULL,
    "postingDate" timestamp(3) without time zone NOT NULL,
    "journalEntryId" text NOT NULL,
    "journalEntryNumber" text NOT NULL,
    "lineNumber" integer NOT NULL,
    debit numeric(15,2) DEFAULT 0 NOT NULL,
    credit numeric(15,2) DEFAULT 0 NOT NULL,
    balance numeric(15,2) NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    "transactionType" public."TransactionType" NOT NULL,
    "transactionId" text NOT NULL,
    "documentNumber" text,
    "projectId" text,
    "clientId" text,
    "fiscalPeriodId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: goods_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_items (
    id text NOT NULL,
    "grId" text NOT NULL,
    "poItemId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "orderedQuantity" numeric(15,3) NOT NULL,
    "receivedQuantity" numeric(15,3) NOT NULL,
    "acceptedQuantity" numeric(15,3) NOT NULL,
    "rejectedQuantity" numeric(15,3) DEFAULT 0 NOT NULL,
    "qualityStatus" public."QualityStatus" DEFAULT 'PENDING'::public."QualityStatus" NOT NULL,
    "rejectionReason" text,
    "unitPrice" numeric(15,2) NOT NULL,
    "lineTotal" numeric(15,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: goods_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipts (
    id text NOT NULL,
    "grNumber" text NOT NULL,
    "grDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "poId" text NOT NULL,
    "vendorId" text NOT NULL,
    "deliveryNoteNumber" text,
    "receivedBy" text NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "warehouseLocation" text,
    "inspectionStatus" public."InspectionStatus" DEFAULT 'PENDING'::public."InspectionStatus" NOT NULL,
    "inspectedBy" text,
    "inspectedAt" timestamp(3) without time zone,
    "inspectionNotes" text,
    status public."GRStatus" DEFAULT 'DRAFT'::public."GRStatus" NOT NULL,
    "isPosted" boolean DEFAULT false NOT NULL,
    "postedAt" timestamp(3) without time zone,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    "journalEntryId" text
);


--
-- Name: indonesian_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indonesian_holidays (
    id text NOT NULL,
    date date NOT NULL,
    year integer NOT NULL,
    name text NOT NULL,
    "nameIndonesian" text NOT NULL,
    description text,
    type public."HolidayType" DEFAULT 'NATIONAL'::public."HolidayType" NOT NULL,
    region text,
    "isLunarBased" boolean DEFAULT false NOT NULL,
    "isSubstitute" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: invoice_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_counters (
    id text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    sequence integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "creationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "quotationId" text,
    "clientId" text NOT NULL,
    "projectId" text NOT NULL,
    "amountPerProject" numeric(12,2) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "subtotalAmount" numeric(15,2),
    "taxRate" numeric(5,2),
    "taxAmount" numeric(15,2),
    "includeTax" boolean DEFAULT false NOT NULL,
    "scopeOfWork" text,
    "priceBreakdown" jsonb,
    "paymentInfo" text NOT NULL,
    "materaiRequired" boolean DEFAULT false NOT NULL,
    "materaiApplied" boolean DEFAULT false NOT NULL,
    "materaiAppliedAt" timestamp(3) without time zone,
    "materaiAppliedBy" text,
    "materaiAmount" numeric(12,2),
    terms text,
    signature text,
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "markedPaidBy" text,
    "markedPaidAt" timestamp(3) without time zone,
    "journalEntryId" text,
    "paymentJournalId" text,
    "paymentMilestoneId" text,
    "projectMilestoneId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id text NOT NULL,
    "entryNumber" text NOT NULL,
    "entryDate" timestamp(3) without time zone NOT NULL,
    "postingDate" timestamp(3) without time zone,
    description text NOT NULL,
    "descriptionId" text,
    "descriptionEn" text,
    "transactionType" public."TransactionType" NOT NULL,
    "transactionId" text NOT NULL,
    "documentNumber" text,
    "documentDate" timestamp(3) without time zone,
    status public."JournalStatus" DEFAULT 'DRAFT'::public."JournalStatus" NOT NULL,
    "isPosted" boolean DEFAULT false NOT NULL,
    "postedAt" timestamp(3) without time zone,
    "postedBy" text,
    "fiscalPeriodId" text,
    "isReversing" boolean DEFAULT false NOT NULL,
    "reversedEntryId" text,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: journal_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_line_items (
    id text NOT NULL,
    "journalEntryId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "accountId" text NOT NULL,
    debit numeric(15,2) DEFAULT 0 NOT NULL,
    credit numeric(15,2) DEFAULT 0 NOT NULL,
    description text,
    "descriptionId" text,
    "projectId" text,
    "clientId" text,
    "departmentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: labor_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labor_entries (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "teamMemberId" text NOT NULL,
    "userId" text NOT NULL,
    "workDate" date NOT NULL,
    "hoursWorked" numeric(5,2) NOT NULL,
    "laborType" public."LaborType" DEFAULT 'REGULAR'::public."LaborType" NOT NULL,
    "laborTypeRate" numeric(3,2) NOT NULL,
    "hourlyRate" numeric(12,2) NOT NULL,
    "laborCost" numeric(15,2) NOT NULL,
    "costType" public."CostType" DEFAULT 'LABOR'::public."CostType" NOT NULL,
    "isDirect" boolean DEFAULT true NOT NULL,
    description text,
    "descriptionId" text,
    "taskPerformed" text,
    status public."LaborEntryStatus" DEFAULT 'DRAFT'::public."LaborEntryStatus" NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "expenseId" text,
    "journalEntryId" text,
    "costAllocationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


--
-- Name: maintenance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_records (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "maintenanceType" text NOT NULL,
    "performedDate" timestamp(3) without time zone NOT NULL,
    "performedBy" text,
    cost numeric(15,2),
    description text NOT NULL,
    "partsReplaced" jsonb,
    "nextMaintenanceDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: maintenance_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_schedules (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "maintenanceType" text NOT NULL,
    frequency public."MaintenanceFrequency" NOT NULL,
    "lastMaintenanceDate" timestamp(3) without time zone,
    "nextMaintenanceDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payment_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_milestones (
    id text NOT NULL,
    "quotationId" text NOT NULL,
    "milestoneNumber" integer NOT NULL,
    name text NOT NULL,
    "nameId" text,
    description text,
    "descriptionId" text,
    "paymentPercentage" numeric(5,2) NOT NULL,
    "paymentAmount" numeric(12,2) NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "dueDaysFromPrev" integer,
    deliverables jsonb,
    "isInvoiced" boolean DEFAULT false NOT NULL,
    "projectMilestoneId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "transactionRef" text,
    "bankDetails" text,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "confirmedAt" timestamp(3) without time zone,
    "journalEntryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: project_cost_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_cost_allocations (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "expenseId" text NOT NULL,
    "allocationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "allocationMethod" public."AllocationMethod" NOT NULL,
    "allocationPercentage" numeric(5,2),
    "allocatedAmount" numeric(15,2) NOT NULL,
    "journalEntryId" text,
    "costType" public."CostType" NOT NULL,
    "isDirect" boolean DEFAULT true NOT NULL,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


--
-- Name: project_equipment_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_equipment_usage (
    id text NOT NULL,
    "projectId" text,
    "assetId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "returnDate" timestamp(3) without time zone,
    condition text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_milestones (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "milestoneNumber" integer NOT NULL,
    name text NOT NULL,
    "nameId" text,
    description text,
    "descriptionId" text,
    "plannedStartDate" timestamp(3) without time zone,
    "plannedEndDate" timestamp(3) without time zone,
    "actualStartDate" timestamp(3) without time zone,
    "actualEndDate" timestamp(3) without time zone,
    "completionPercentage" numeric(5,2) DEFAULT 0 NOT NULL,
    "plannedRevenue" numeric(15,2) NOT NULL,
    "recognizedRevenue" numeric(15,2) DEFAULT 0 NOT NULL,
    "remainingRevenue" numeric(15,2) NOT NULL,
    "estimatedCost" numeric(15,2),
    "actualCost" numeric(15,2) DEFAULT 0,
    status public."MilestoneStatus" DEFAULT 'PENDING'::public."MilestoneStatus" NOT NULL,
    deliverables jsonb,
    "acceptedBy" text,
    "acceptedAt" timestamp(3) without time zone,
    "journalEntryId" text,
    notes text,
    "notesId" text,
    priority public."MilestonePriority" DEFAULT 'MEDIUM'::public."MilestonePriority" NOT NULL,
    "predecessorId" text,
    "delayDays" integer DEFAULT 0,
    "delayReason" text,
    "materaiRequired" boolean DEFAULT false NOT NULL,
    "taxTreatment" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


--
-- Name: project_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_team_members (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "userId" text NOT NULL,
    role text NOT NULL,
    "roleId" text,
    "allocationPercent" numeric(5,2) DEFAULT 100 NOT NULL,
    "hourlyRate" numeric(12,2) NOT NULL,
    "hourlyRateCurrency" text DEFAULT 'IDR'::text NOT NULL,
    "assignedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


--
-- Name: project_type_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_type_configs (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    prefix text NOT NULL,
    color text DEFAULT '#1890ff'::text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id text NOT NULL,
    number text NOT NULL,
    description text NOT NULL,
    "scopeOfWork" text,
    output text NOT NULL,
    "projectTypeId" text NOT NULL,
    "clientId" text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "estimatedBudget" numeric(12,2),
    "basePrice" numeric(12,2),
    "priceBreakdown" jsonb,
    "estimatedExpenses" jsonb,
    "projectedGrossMargin" numeric(5,2),
    "projectedNetMargin" numeric(5,2),
    "projectedProfit" numeric(15,2),
    "totalDirectCosts" numeric(15,2) DEFAULT 0,
    "totalIndirectCosts" numeric(15,2) DEFAULT 0,
    "totalAllocatedCosts" numeric(15,2) DEFAULT 0,
    "totalInvoicedAmount" numeric(15,2) DEFAULT 0,
    "totalPaidAmount" numeric(15,2) DEFAULT 0,
    "grossProfit" numeric(15,2),
    "netProfit" numeric(15,2),
    "grossMarginPercent" numeric(5,2),
    "netMarginPercent" numeric(5,2),
    "budgetVariance" numeric(15,2),
    "budgetVariancePercent" numeric(5,2),
    "profitCalculatedAt" timestamp(3) without time zone,
    "profitCalculatedBy" text,
    status public."ProjectStatus" DEFAULT 'PLANNING'::public."ProjectStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id text NOT NULL,
    "poId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "itemType" public."POItemType" NOT NULL,
    "itemCode" text,
    description text NOT NULL,
    "descriptionId" text,
    quantity numeric(15,3) NOT NULL,
    unit text NOT NULL,
    "unitPrice" numeric(15,2) NOT NULL,
    "discountPercent" numeric(5,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(15,2) NOT NULL,
    "ppnAmount" numeric(15,2) NOT NULL,
    "quantityReceived" numeric(15,3) DEFAULT 0 NOT NULL,
    "quantityInvoiced" numeric(15,3) DEFAULT 0 NOT NULL,
    "quantityOutstanding" numeric(15,3) NOT NULL,
    "assetId" text,
    "expenseCategoryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id text NOT NULL,
    "poNumber" text NOT NULL,
    "poDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "vendorId" text NOT NULL,
    "projectId" text,
    subtotal numeric(15,2) NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "ppnAmount" numeric(15,2) NOT NULL,
    "pphAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "isPPNIncluded" boolean DEFAULT true NOT NULL,
    "ppnRate" numeric(5,2) DEFAULT 12 NOT NULL,
    "withholdingTaxType" public."WithholdingTaxType" DEFAULT 'NONE'::public."WithholdingTaxType" NOT NULL,
    "withholdingTaxRate" numeric(5,2),
    "deliveryAddress" text,
    "deliveryDate" timestamp(3) without time zone,
    "paymentTerms" text DEFAULT 'NET 30'::text NOT NULL,
    "dueDate" timestamp(3) without time zone,
    status public."POStatus" DEFAULT 'DRAFT'::public."POStatus" NOT NULL,
    "approvalStatus" public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "requestedBy" text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "totalReceived" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalInvoiced" numeric(15,2) DEFAULT 0 NOT NULL,
    "isClosed" boolean DEFAULT false NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "closedBy" text,
    "closureReason" text,
    description text,
    "descriptionId" text,
    notes text,
    "termsConditions" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    "journalEntryId" text
);


--
-- Name: quotation_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotation_counters (
    id text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    sequence integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: quotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotations (
    id text NOT NULL,
    "quotationNumber" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validUntil" timestamp(3) without time zone NOT NULL,
    "clientId" text NOT NULL,
    "projectId" text NOT NULL,
    "amountPerProject" numeric(12,2) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "scopeOfWork" text,
    "priceBreakdown" jsonb,
    terms text,
    "paymentType" public."PaymentType" DEFAULT 'FULL_PAYMENT'::public."PaymentType" NOT NULL,
    "paymentTermsText" text,
    status public."QuotationStatus" DEFAULT 'DRAFT'::public."QuotationStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "subtotalAmount" numeric(15,2),
    "taxRate" numeric(5,2),
    "taxAmount" numeric(15,2),
    "includeTax" boolean DEFAULT false NOT NULL
);


--
-- Name: report_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_sections (
    id text NOT NULL,
    "reportId" text NOT NULL,
    "order" integer NOT NULL,
    title text NOT NULL,
    description text,
    "csvFileName" text NOT NULL,
    "csvFilePath" text,
    "importedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "columnTypes" jsonb NOT NULL,
    "rawData" jsonb NOT NULL,
    "rowCount" integer NOT NULL,
    visualizations jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    layout jsonb,
    "layoutVersion" integer DEFAULT 1 NOT NULL
);


--
-- Name: COLUMN report_sections.layout; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.report_sections.layout IS 'Widget-based layout for visual report builder: {widgets: [{id, type, layout, config}], cols: 12, rowHeight: 30, layoutVersion: 1}';


--
-- Name: COLUMN report_sections."layoutVersion"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.report_sections."layoutVersion" IS 'Track layout schema version for future migrations';


--
-- Name: social_media_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_media_reports (
    id text NOT NULL,
    "projectId" text NOT NULL,
    title text NOT NULL,
    description text,
    month integer NOT NULL,
    year integer NOT NULL,
    status public."ReportStatus" DEFAULT 'DRAFT'::public."ReportStatus" NOT NULL,
    "pdfUrl" text,
    "pdfGeneratedAt" timestamp(3) without time zone,
    "pdfVersion" integer DEFAULT 1 NOT NULL,
    "emailedAt" timestamp(3) without time zone,
    "emailedTo" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id text DEFAULT 'default'::text NOT NULL,
    "defaultPaymentTerms" text DEFAULT 'NET 30'::text NOT NULL,
    "materaiThreshold" integer DEFAULT 5000000 NOT NULL,
    "invoicePrefix" text DEFAULT 'INV-'::text NOT NULL,
    "quotationPrefix" text DEFAULT 'QT-'::text NOT NULL,
    "autoBackup" boolean DEFAULT true NOT NULL,
    "backupFrequency" text DEFAULT 'daily'::text NOT NULL,
    "backupTime" text DEFAULT '02:00'::text NOT NULL,
    "autoMateraiReminder" boolean DEFAULT true NOT NULL,
    "defaultCurrency" text DEFAULT 'IDR'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id text NOT NULL,
    "userId" text NOT NULL,
    timezone text DEFAULT 'Asia/Jakarta'::text NOT NULL,
    language text DEFAULT 'id-ID'::text NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "pushNotifications" boolean DEFAULT true NOT NULL,
    theme text DEFAULT 'light'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."UserRole" DEFAULT 'STAFF'::public."UserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ux_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ux_metrics (
    id text NOT NULL,
    "componentName" text NOT NULL,
    "eventType" text NOT NULL,
    "metricName" text NOT NULL,
    value double precision NOT NULL,
    "userId" text,
    "sessionId" text,
    "clientId" text,
    url text,
    "userAgent" text,
    "performanceData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: vendor_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_invoice_items (
    id text NOT NULL,
    "viId" text NOT NULL,
    "poItemId" text,
    "lineNumber" integer NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    quantity numeric(15,3) NOT NULL,
    unit text NOT NULL,
    "unitPrice" numeric(15,2) NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(15,2) NOT NULL,
    "ppnAmount" numeric(15,2) NOT NULL,
    "isMatched" boolean DEFAULT false NOT NULL,
    "varianceReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: vendor_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_invoices (
    id text NOT NULL,
    "vendorInvoiceNumber" text NOT NULL,
    "internalNumber" text NOT NULL,
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "vendorId" text NOT NULL,
    "poId" text,
    "grId" text,
    subtotal numeric(15,2) NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "ppnAmount" numeric(15,2) NOT NULL,
    "pphAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "eFakturNSFP" text,
    "eFakturQRCode" text,
    "eFakturStatus" public."EFakturStatus" DEFAULT 'NOT_REQUIRED'::public."EFakturStatus" NOT NULL,
    "eFakturUploadDate" timestamp(3) without time zone,
    "paymentTerms" text NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "matchingStatus" public."MatchingStatus" DEFAULT 'UNMATCHED'::public."MatchingStatus" NOT NULL,
    "matchedBy" text,
    "matchedAt" timestamp(3) without time zone,
    "matchingNotes" text,
    "priceVariance" numeric(15,2),
    "quantityVariance" numeric(15,3),
    "withinTolerance" boolean DEFAULT false NOT NULL,
    status public."VIStatus" DEFAULT 'DRAFT'::public."VIStatus" NOT NULL,
    "approvalStatus" public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "accountsPayableId" text,
    "journalEntryId" text,
    description text,
    "descriptionId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


--
-- Name: vendor_payment_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_payment_allocations (
    id text NOT NULL,
    "paymentId" text NOT NULL,
    "apId" text NOT NULL,
    "allocatedAmount" numeric(15,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: vendor_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_payments (
    id text NOT NULL,
    "paymentNumber" text NOT NULL,
    "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "vendorId" text NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "referenceNumber" text,
    "bankAccountId" text,
    "totalAmount" numeric(15,2) NOT NULL,
    status public."VendorPaymentStatus" DEFAULT 'DRAFT'::public."VendorPaymentStatus" NOT NULL,
    "clearedAt" timestamp(3) without time zone,
    "journalEntryId" text,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id text NOT NULL,
    "vendorCode" text NOT NULL,
    name text NOT NULL,
    "nameId" text,
    "vendorType" public."VendorType" NOT NULL,
    "industryType" text,
    "contactPerson" text,
    email text,
    phone text,
    address text,
    city text,
    province text,
    "postalCode" text,
    country text DEFAULT 'Indonesia'::text NOT NULL,
    npwp text,
    "pkpStatus" public."PKPStatus" DEFAULT 'NON_PKP'::public."PKPStatus" NOT NULL,
    "taxAddress" text,
    "bankName" text,
    "bankAccountNumber" text,
    "bankAccountName" text,
    "bankBranch" text,
    "swiftCode" text,
    "paymentTerms" text DEFAULT 'NET 30'::text NOT NULL,
    "creditLimit" numeric(15,2),
    currency text DEFAULT 'IDR'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPKP" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


--
-- Name: work_in_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_in_progress (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "periodDate" timestamp(3) without time zone NOT NULL,
    "fiscalPeriodId" text,
    "directMaterialCost" numeric(15,2) DEFAULT 0 NOT NULL,
    "directLaborCost" numeric(15,2) DEFAULT 0 NOT NULL,
    "directExpenses" numeric(15,2) DEFAULT 0 NOT NULL,
    "allocatedOverhead" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalCost" numeric(15,2) DEFAULT 0 NOT NULL,
    "billedToDate" numeric(15,2) DEFAULT 0 NOT NULL,
    "recognizedRevenue" numeric(15,2) DEFAULT 0 NOT NULL,
    "unbilledRevenue" numeric(15,2) DEFAULT 0 NOT NULL,
    "completionPercentage" numeric(5,2) DEFAULT 0 NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "costJournalId" text,
    "revenueJournalId" text,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
ed0aef86-1c98-4c3c-b9ef-19a1c7cf5f82	625059fb9411a78cb54b225cd6211c2056b16af3b10d00aae2b70ccb898dd889	\N	20251109233000_add_cash_bank_balance_table	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20251109233000_add_cash_bank_balance_table\n\nDatabase error code: 42P07\n\nDatabase error:\nERROR: relation "cash_bank_balances" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "relation \\"cash_bank_balances\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1150), routine: Some("heap_create_with_catalog") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20251109233000_add_cash_bank_balance_table"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20251109233000_add_cash_bank_balance_table"\n             at schema-engine/core/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:226	2025-11-09 16:29:40.480168+00	2025-11-09 16:29:16.206094+00	0
f7f568ed-3f3b-4e9e-9b02-598ff4ec5e43	70a0150d9e7685f2e55a4b05efe1665cd153b3ff4f920317345123395d63ff10	2025-11-08 09:12:29.827035+00	20251107173854_init_baseline	\N	\N	2025-11-08 09:12:25.770553+00	1
56876098-40aa-4621-a3b7-eb4c8838df7c	625059fb9411a78cb54b225cd6211c2056b16af3b10d00aae2b70ccb898dd889	2025-11-09 16:29:40.482645+00	20251109233000_add_cash_bank_balance_table		\N	2025-11-09 16:29:40.482645+00	0
573914cc-29d4-4c7f-af7d-3c319e8bdb35	8f46bbd65151fbf9cf849b61b6cc66d1a22eb3418520d3e6beebb6eb666118ff	2025-11-08 09:12:29.881192+00	20251108060706_add_performance_indexes	\N	\N	2025-11-08 09:12:29.832489+00	1
cb28d173-6da7-4002-a952-f636f6061e28	f41cd0f4d7078402e66e05b6e07a55b52e7bad16d7784aedd0ddcb826d34ab16	2025-11-08 09:12:29.906334+00	20251108061200_fix_milestone_invoice_race_condition	\N	\N	2025-11-08 09:12:29.884619+00	1
50197148-8331-47b9-9424-2cd1eac63b16	f5fddc1a1521c7d29cf9a897b187d224526d6ae2bbd8141301886f5159a0fe1a	2025-11-08 09:43:56.873613+00	20251108094336_add_social_media_ads_reporting	\N	\N	2025-11-08 09:43:56.511585+00	1
825da5b3-eee9-4cac-89d9-f67e17ee406f	cc2a4997510e16ab9b5ef60d5edd5c59987ba16048149d854f09f1ee0f842409	2025-11-08 09:48:02.335217+00	20251108094802_add_cogs_expense_class	\N	\N	2025-11-08 09:48:02.329771+00	1
18871c67-6930-4919-9fb0-a3f4d1e9cbb4	trigger_auto_expense_category	2025-11-08 09:52:40.96251+00	20251108095500_auto_expense_category_trigger	\N	\N	2025-11-08 09:52:40.96251+00	1
575e6ab1-ca9b-4ef6-b7c1-6dbd5911e599	e7ec736f6a11a027478d66b09a1aa8008106e801e0883372c5cc8c2b282c99ee	2025-11-08 10:43:51.28686+00	20251108103500_add_content_planning_calendar	\N	\N	2025-11-08 10:43:51.14258+00	1
b452d707-7a66-4d2f-aee9-e192a8e16974	6fbba960d9630863d16761187fd4f9ea0d1e9bc36b907596526311b06f329666	2025-11-08 15:45:57.541546+00	20251108120000_add_tax_fields_to_quotations	\N	\N	2025-11-08 15:45:57.525985+00	1
b98f61ca-63fa-42a8-bc3a-c7924386e88e	0bfc7c1d287c7e803aadad3d93fb60c0cd047b25c245d91892c73590adf75940	2025-11-09 07:09:46.047492+00	20251109140923_add_universal_social_media_reporting	\N	\N	2025-11-09 07:09:45.92257+00	1
df43261f-1117-422f-a849-447ed62084f5	088269ca1035c9c7911978bcc3e6daa9641343f8539417cf7e9fd39fff75ec81	2025-11-09 07:26:52.566638+00	20251109142637_remove_campaign_system	\N	\N	2025-11-09 07:26:52.506084+00	1
39306005-d4b3-49ca-9df1-b2973c6ba452	8aa11937a54cf79ce335cd34cd40cf01166fb54761550d01d6cd7f45c57858cf	2025-11-09 09:41:25.5782+00	20251109100000_add_report_section_layout	\N	\N	2025-11-09 09:41:25.543432+00	1
\.


--
-- Data for Name: account_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account_balances (id, "accountId", "fiscalPeriodId", "beginningBalance", "debitTotal", "creditTotal", "endingBalance", "isClosed", "closedAt", "lastUpdated") FROM stdin;
\.


--
-- Data for Name: accounts_payable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts_payable (id, "apNumber", "vendorId", "sourceType", "vendorInvoiceId", "expenseId", "originalAmount", "paidAmount", "outstandingAmount", "invoiceDate", "dueDate", "paymentStatus", "daysOutstanding", "agingBucket", "journalEntryId", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: allowance_for_doubtful_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allowance_for_doubtful_accounts (id, "invoiceId", "calculationDate", "fiscalPeriodId", "agingBucket", "daysPastDue", "outstandingAmount", "eclRate", "eclAmount", "previousEclAmount", "adjustmentAmount", "eclModel", "lossRateSource", "provisionStatus", "journalEntryId", "writtenOffAt", "writtenOffBy", "writeOffReason", "writeOffAmount", "recoveredAt", "recoveredAmount", "recoveryJournalId", notes, "notesId", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: asset_kit_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asset_kit_items (id, "kitId", "assetId", quantity) FROM stdin;
\.


--
-- Data for Name: asset_kits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asset_kits (id, name, description, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: asset_reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asset_reservations (id, "assetId", "userId", "projectId", "startDate", "endDate", purpose, status, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assets (id, "assetCode", name, category, subcategory, manufacturer, model, "serialNumber", specifications, "purchaseDate", "purchasePrice", supplier, "invoiceNumber", "warrantyExpiration", "currentValue", "notesFinancial", status, condition, location, photos, documents, "qrCode", "rfidTag", tags, notes, "createdAt", "updatedAt", "createdById", "vendorId", "purchaseOrderId", "goodsReceiptId", "vendorInvoiceId") FROM stdin;
cmhrzkq2q000nt4r0pdnwfkb1	CAM-202511-001	Fujifulm XS-20 BO + Cage	Camera	\N	\N	\N	\N	\N	2025-09-30 17:00:00	20205598.00	\N	\N	\N	\N	\N	AVAILABLE	GOOD	\N	\N	\N	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAAAklEQVR4AewaftIAAAWSSURBVO3BMZIkiQ0EsCSj//9lah2ZZ1RoSte5A2DujwAU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU+ORlMxN+zt3liZnJE3eXN81M3nR3eWJmws+5u7xpA1BiA1BiA1BiA1BiA1BiA1BiA1BiA1BiA1BiA1BiA1Diky9zd/lNZibfZGbCP7u7/CYzk2+yASixASixASixASixASixASixASixASixASixASixASjxSbmZyTe5u/wmd5cnZia/yczkm9xdmm0ASmwASmwASmwASmwASmwASmwASmwASmwASmwASmwASnzCX+3u8sTM5ImZyRN3lydmJvBfG4ASG4ASG4ASG4ASG4ASG4ASG4ASG4ASG4ASG4ASG4ASn/BXm5k8cXeBb7UBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKPFJubsL/+zu8sTMhJ9zd+HnbABKbABKbABKbABKbABKbABKbABKbABKbABKbABKbABKfPJlZib8nJnJE3eXJ2YmT9xdnpiZfJOZCf+eDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJuT8C/yczkzfdXfh7bQBKbABKbABKbABKbABKbABKbABKbABKbABKbABKbABKfPKymckTd5c3zUz499xdnpiZPDEzeeLu8qaZyRN3lydmJt/k7vKmDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJuT/yopnJN7m7PDEzeeLuws+ZmXyTuwv/ng1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiU9+mZnJE3eXJ2Ymb7q7vGlm8sTd5U13l2Yzk9/k7vKmDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJDUCJuT/yi8xM3nR3edPM5Im7yxMzk29yd3nTzOSJu8ubZiZvurs8MTN54u7ypg1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiQ1AiU/KzUzedHd508zkTTOTJ+4uT8xMnri7vGlm8sTd5TeZmTTbAJTYAJTYAJTYAJTYAJTYAJTYAJTYAJTYAJTYAJTYAJSY+yP8tWYm/Jy7yxMzkzfdXZ6YmTxxd/kmG4ASG4ASG4ASG4ASG4ASG4ASG4ASG4ASG4ASG4ASG4ASn7xsZsLPubu86e7yxMzkibvLEzOTN91dnpiZvOnuwj/bAJTYAJTYAJTYAJTYAJTYAJTYAJTYAJTYAJTYAJTYAJT45MvcXX6TmUmzu8sTM5M33V2emJk8cXd5YmbyppnJb7IBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKPFJuZnJN7m7NJuZPHF3+U1mJr/JzOSJu8ubNgAlNgAlNgAlNgAlNgAlNgAlNgAlNgAlNgAlNgAlNgAlPoH/wczkm8xMnri7PDEzeeLu8k3uLs02ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU2ACU+4a92d3liZvLE3eWbzEyemJk8cXd508zkibvLEzOTN91d3rQBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKLEBKPFJubsLP+fuws+ZmTxxd/kmd5dvsgEosQEosQEosQEosQEosQEosQEosQEosQEosQEosQEo8cmXmZnwc2Ymb7q7PDEzeeLu8qa7yxMzk28yM/lNNgAlNgAlNgAlNgAlNgAlNgAlNgAlNgAlNgAlNgAlNgAl5v4IQIENQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIkNQIn/ACq972x+/7+vAAAAAElFTkSuQmCC	\N	\N	\N	2025-11-09 17:27:30.05	2025-11-09 17:27:30.05	\N	\N	\N	\N	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, action, "entityType", "entityId", "oldValues", "newValues", "userId", "ipAddress", "userAgent", "createdAt") FROM stdin;
cmhryiyce000lt4r0y1zmae83	CREATE	invoice	cmhryiyc1000jt4r0o436hj8x	\N	{"id": "cmhryiyc1000jt4r0o436hj8x", "user": {"id": "cmhq2gicz0000tdp49v6ginqs", "name": "Admin Sistem (Legacy)", "email": "admin@monomi.id"}, "terms": "TERMS &amp; CONDITIONS:  \\n  \\n- 50% non-refundable booking deposit required (Rp 2,250,000)  \\n- Secures your shoot date and photographer's time  \\n- Balance due upon delivery of edited photos (Rp 2,250,000)\\n\\nCancellation Policy:  \\n- More than 7 days notice: Reschedule once at no charge  \\n- Full deposit forfeited, can reschedule with Additional Fee  \\n- Less than 48 hours: Full deposit forfeited  \\n- No-show: Full deposit forfeited + balance due for time committed  \\n\\nRescheduling:\\n- First reschedule: complimentary (with 7+ days notice)\\n- Additional Charged for rescheduling : Rp 1,000,000 fee\\n- Subject to photographer availability\\n\\nCopyright &amp; Usage:\\n- Client receives full usage rights as specified above\\n- Images may be used in Monomi's portfolio\\n- RAW files remain property of Monomi\\n- Edited files available for additional licen", "client": {"id": "cmhrssgrw0004q25yilsyk11p", "name": "Pravitha Utami", "email": "pravithautami@atlascopco.com", "phone": "081197611829", "status": "active", "address": "Jl. AH. Nasution No. 262", "company": "PT. ATLAS COPCO", "createdAt": "2025-11-09T14:17:33.933Z", "updatedAt": "2025-11-09T14:17:33.933Z", "paymentTerms": "Net 14", "contactPerson": "Pravitha Utami"}, "status": "DRAFT", "dueDate": "2025-12-09T16:58:07.799Z", "project": {"id": "cmhrt3q5y0005q25y5hnci7rw", "number": "PRJ-PH-202511-001", "output": "", "status": "PLANNING", "endDate": "2025-11-19T17:00:00.000Z", "clientId": "cmhrssgrw0004q25yilsyk11p", "basePrice": 4500000.0, "createdAt": "2025-11-09T14:26:19.318Z", "netProfit": 0.0, "startDate": "2025-11-12T17:00:00.000Z", "updatedAt": "2025-11-09T14:26:19.581Z", "description": "Photoshoot and Editing Service", "grossProfit": 0.0, "scopeOfWork": "1. Professional Photography Services for One and a half Days\\n\\n2. Post-Production & Deliverables:\\n- Complete archive of all RAW/unedited photos\\n- professionally edited high-resolution image\\n- Professional editing includes:\\n- Color correction and white balance\\n- Exposure and brightness optimization\\n- Contrast, saturation, and highlight/shadow adjustment\\n\\n3. Delivery Timeline: Final edited photos in 10 business days\\n\\n4. Additional & Revision Policy:  \\n- 1 complimentary revision round (minor color/crop adjustments)  \\n- Must be requested within 7 business days of delivery  \\n- Additional edited photo revision : Rp 150,000 / photo  \\n- Re-shoot: charged as new session at daily rate", "projectTypeId": "cmhq2giey0008tdp4r41zz6l5", "budgetVariance": -600000.0, "priceBreakdown": {"total": 4500000, "products": [{"name": "Photoshoot & Editing Service", "price": 4500000, "quantity": 1, "subtotal": 4500000, "description": "Photoshoot Service for One and a Half Days & Editing Service "}], "calculatedAt": "2025-11-09T14:26:19.311Z"}, "estimatedBudget": 600000.0, "projectedProfit": 3900000.0, "totalPaidAmount": 0.0, "netMarginPercent": 0.0, "totalDirectCosts": 0.0, "estimatedExpenses": {"direct": [{"notes": "Transport PP", "amount": 400000, "categoryId": "e1ed384d-57e3-4452-8ae3-a37070b7e9ac", "categoryName": "Transport Expense", "categoryNameId": "Beban Transportasi"}, {"notes": "", "amount": 200000, "categoryId": "e09d2330-5646-4d62-8ac3-bd0825d99298", "categoryName": "Accomodation Expense", "categoryNameId": "Beban Akomodasi"}], "indirect": [], "totalDirect": 600000, "calculatedAt": "2025-11-09T14:26:19.315Z", "totalIndirect": 0, "totalEstimated": 600000}, "grossMarginPercent": 0.0, "profitCalculatedAt": "2025-11-09T14:26:19.580Z", "profitCalculatedBy": null, "projectedNetMargin": 86.67, "totalIndirectCosts": 0.0, "totalAllocatedCosts": 0.0, "totalInvoicedAmount": 0.0, "projectedGrossMargin": 86.67, "budgetVariancePercent": -100.0}, "taxRate": null, "clientId": "cmhrssgrw0004q25yilsyk11p", "createdAt": "2025-11-09T16:58:07.825Z", "createdBy": "cmhq2gicz0000tdp49v6ginqs", "projectId": "cmhrt3q5y0005q25y5hnci7rw", "signature": null, "taxAmount": null, "updatedAt": "2025-11-09T16:58:07.825Z", "includeTax": false, "paymentInfo": "Bank Transfer", "quotationId": "cmhryd90z0003t4r0y9b2b6lb", "scopeOfWork": "1. Professional Photography Services for One and a half Days\\n\\n2. Post-Production & Deliverables:\\n- Complete archive of all RAW/unedited photos\\n- professionally edited high-resolution image\\n- Professional editing includes:\\n- Color correction and white balance\\n- Exposure and brightness optimization\\n- Contrast, saturation, and highlight/shadow adjustment\\n\\n3. Delivery Timeline: Final edited photos in 10 business days\\n\\n4. Additional & Revision Policy:  \\n- 1 complimentary revision round (minor color/crop adjustments)  \\n- Must be requested within 7 business days of delivery  \\n- Additional edited photo revision : Rp 150,000 / photo  \\n- Re-shoot: charged as new session at daily rate", "totalAmount": 2250000.0, "creationDate": "2025-11-09T16:58:07.825Z", "markedPaidAt": null, "markedPaidBy": null, "invoiceNumber": "INV-2025/11/0001", "materaiAmount": null, "journalEntryId": null, "materaiApplied": false, "priceBreakdown": {"total": 4500000, "products": [{"name": "Photoshoot & Editing Service", "price": 4500000, "quantity": 1, "subtotal": 4500000, "description": "Photoshoot Service for One and a Half Days & Editing Service "}], "calculatedAt": "2025-11-09T14:26:19.311Z"}, "subtotalAmount": null, "materaiRequired": false, "amountPerProject": 2250000.0, "materaiAppliedAt": null, "materaiAppliedBy": null, "paymentJournalId": null, "paymentMilestone": {"id": "cmhryd91q0005t4r0y7kdloui", "name": "Down Payment", "nameId": "DP 50%", "dueDate": null, "createdAt": "2025-11-09T16:53:41.774Z", "updatedAt": "2025-11-09T16:53:41.774Z", "isInvoiced": false, "description": "Initial payment upon project commencement", "quotationId": "cmhryd90z0003t4r0y9b2b6lb", "deliverables": null, "descriptionId": "Pembayaran awal saat proyek dimulai", "paymentAmount": 2250000.0, "dueDaysFromPrev": null, "milestoneNumber": 1, "paymentPercentage": 50.0, "projectMilestoneId": null}, "paymentMilestoneId": "cmhryd91q0005t4r0y7kdloui", "projectMilestoneId": null}	cmhq2gicz0000tdp49v6ginqs	\N	\N	2025-11-09 16:58:07.839
\.


--
-- Data for Name: bank_reconciliation_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_reconciliation_items (id, "reconciliationId", "itemDate", "itemType", description, "descriptionId", amount, "isMatched", "matchedTransactionId", "matchedAt", "matchedBy", status, "requiresAdjustment", "adjustmentJournalId", "adjustedAt", "checkNumber", reference, "createdAt", "updatedAt", "createdBy", notes) FROM stdin;
\.


--
-- Data for Name: bank_reconciliations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_reconciliations (id, "reconciliationNumber", "bankAccountId", "statementDate", "periodStartDate", "periodEndDate", "bookBalanceStart", "bookBalanceEnd", "statementBalance", "depositsInTransit", "outstandingChecks", "bankCharges", "bankInterest", "otherAdjustments", "adjustedBookBalance", "adjustedBankBalance", difference, "isBalanced", "statementReference", "statementFilePath", status, "reviewedBy", "reviewedAt", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "adjustmentJournalId", "createdAt", "updatedAt", "createdBy", "updatedBy", notes, "notesId") FROM stdin;
\.


--
-- Data for Name: bank_transfers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_transfers (id, "transferNumber", "transferDate", amount, currency, "originalAmount", "exchangeRate", "idrAmount", "fromAccountId", "toAccountId", description, "descriptionId", "descriptionEn", reference, "transferFee", "feeAccountId", "feePaymentMethod", "transferMethod", "bankReference", "confirmationCode", "projectId", "clientId", "journalEntryId", status, "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "completedAt", "completedBy", "createdAt", "updatedAt", "createdBy", "updatedBy", notes, "notesId") FROM stdin;
\.


--
-- Data for Name: business_journey_event_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_journey_event_metadata (id, "eventId", "userCreated", "userModified", source, priority, tags, "relatedDocuments", notes, "ipAddress", "userAgent", "materaiRequired", "materaiAmount", "complianceStatus", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: business_journey_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_journey_events (id, type, title, description, status, amount, "clientId", "projectId", "quotationId", "invoiceId", "paymentId", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: cash_bank_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_bank_balances (id, period, "periodDate", year, month, "openingBalance", "closingBalance", "totalInflow", "totalOutflow", "netChange", "calculatedAt", "calculatedBy", "createdAt", "updatedAt", "createdBy", "updatedBy", notes) FROM stdin;
cmhrz7mds000mt4r0acu1booi	November 2025	2025-11-10 00:00:00	2025	11	3629000.00	3629000.00	0.00	0.00	0.00	2025-11-09 17:17:18.736	cmhq2gicz0000tdp49v6ginqs	2025-11-09 17:17:18.737	2025-11-09 17:17:18.737	cmhq2gicz0000tdp49v6ginqs	\N	\N
\.


--
-- Data for Name: cash_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_transactions (id, "transactionNumber", "transactionType", category, "transactionDate", amount, currency, "originalAmount", "exchangeRate", "idrAmount", "cashAccountId", "offsetAccountId", description, "descriptionId", "descriptionEn", reference, "paymentMethod", "checkNumber", "bankReference", "projectId", "clientId", "journalEntryId", status, "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "createdAt", "updatedAt", "createdBy", "updatedBy", notes, "notesId") FROM stdin;
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chart_of_accounts (id, code, name, "nameId", "accountType", "accountSubType", "normalBalance", "parentId", "isControlAccount", "isTaxAccount", "taxType", currency, "isCurrencyAccount", "isActive", "isSystemAccount", description, "descriptionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, email, phone, address, company, "contactPerson", "paymentTerms", status, "createdAt", "updatedAt") FROM stdin;
cmhrssgrw0004q25yilsyk11p	Pravitha Utami	pravithautami@atlascopco.com	081197611829	Jl. AH. Nasution No. 262	PT. ATLAS COPCO	Pravitha Utami	Net 14	active	2025-11-09 14:17:33.933	2025-11-09 14:17:33.933
\.


--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_settings (id, "companyName", address, phone, email, website, "taxNumber", currency, "bankBCA", "bankMandiri", "bankBNI", "createdAt", "updatedAt") FROM stdin;
default	Monomi Agency	Taman Cibaduyut Indah Blok E 232	085156662098	admin@monomiagency.com	https://teknologi.co.id	000000000000000	IDR	0901 5881 7935			2025-11-08 10:39:35.304	2025-11-09 16:54:57.008
\.


--
-- Data for Name: content_calendar_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_calendar_items (id, title, description, "scheduledAt", "publishedAt", status, platforms, "clientId", "projectId", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: content_media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_media (id, url, key, type, "mimeType", size, width, height, duration, "originalName", "contentId", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: deferred_revenue; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deferred_revenue (id, "invoiceId", "paymentDate", "totalAmount", "recognitionDate", "recognizedAmount", "remainingAmount", status, "performanceObligation", "completionPercentage", "initialJournalId", "recognitionJournalId", "fiscalPeriodId", notes, "notesId", "createdAt", "updatedAt", "createdBy", "recognizedAt", "recognizedBy") FROM stdin;
\.


--
-- Data for Name: depreciation_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.depreciation_entries (id, "assetId", "scheduleId", "periodDate", "fiscalPeriodId", "depreciationAmount", "accumulatedDepreciation", "bookValue", "journalEntryId", status, "calculatedAt", "postedAt", "postedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: depreciation_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.depreciation_schedules (id, "assetId", method, "depreciableAmount", "residualValue", "usefulLifeMonths", "usefulLifeYears", "depreciationPerMonth", "depreciationPerYear", "annualRate", "startDate", "endDate", "isActive", "isFulfilled", notes, "notesId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, "fileName", "originalFileName", "filePath", "fileSize", "mimeType", category, description, "invoiceId", "quotationId", "projectId", "uploadedBy", "uploadedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exchange_rates (id, "fromCurrency", "toCurrency", rate, "effectiveDate", "expiryDate", source, "isAutomatic", "isActive", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: expense_approval_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_approval_history (id, "expenseId", action, "actionBy", "previousStatus", "newStatus", comments, "commentsId", "commentsEn", "actionDate") FROM stdin;
\.


--
-- Data for Name: expense_budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_budgets (id, name, "nameId", description, "descriptionId", "categoryId", "projectId", "userId", amount, period, "startDate", "endDate", spent, remaining, "alertThreshold", "alertSent", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_categories (id, code, "accountCode", "expenseClass", name, "nameId", description, "descriptionId", "parentId", "defaultPPNRate", "isLuxuryGoods", "withholdingTaxType", "withholdingTaxRate", icon, color, "isActive", "isBillable", "requiresReceipt", "requiresEFaktur", "approvalRequired", "sortOrder", "createdAt", "updatedAt") FROM stdin;
e1ed384d-57e3-4452-8ae3-a37070b7e9ac	6_2031	6-2031	GENERAL_ADMIN	Transport Expense	Beban Transportasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-09 14:12:26.063	2025-11-09 14:12:26.063
7099cad4-1901-4113-b3c5-600245efde07	6_7030	6-7030	OTHER	Music Licensing (Epidemic Sound, Artlist)	Lisensi Musik (Epidemic Sound, Artlist)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.068	2025-11-08 16:41:21.068
86bf971f-69d2-4775-a232-3604e5beee8d	6_7040	6-7040	OTHER	3D Software (Blender/Cinema 4D)	Software 3D (Blender/Cinema 4D)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.073	2025-11-08 16:41:21.073
e5a48e3f-7454-404a-9fce-da0a8bde067f	6_7050	6-7050	OTHER	Color Grading Software (DaVinci Resolve)	Software Color Grading (DaVinci Resolve)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.079	2025-11-08 16:41:21.079
c618c9eb-b79a-40ac-a097-22337562f24b	6_7060	6-7060	OTHER	Analytics Tools (Google Analytics, Hotjar)	Tools Analitik (Google Analytics, Hotjar)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.085	2025-11-08 16:41:21.085
5a92437a-97f7-44b3-a6a1-683229635af6	6_7070	6-7070	OTHER	Email Marketing Platform (Mailchimp, SendGrid)	Platform Email Marketing (Mailchimp, SendGrid)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.09	2025-11-08 16:41:21.09
f3ff8e65-9417-489e-9f7f-97de6bc90cc3	6_7080	6-7080	OTHER	CRM Software (HubSpot, Salesforce)	Software CRM (HubSpot, Salesforce)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.096	2025-11-08 16:41:21.096
4557e6db-908c-4da0-8446-4728cbed85cd	6_7090	6-7090	OTHER	Social Media Scheduling Tools (Buffer, Hootsuite)	Tools Penjadwalan Sosmed (Buffer, Hootsuite)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.101	2025-11-08 16:41:21.101
4c36d7a4-eb38-42ae-b9e6-c2204b83e818	6_7100	6-7100	OTHER	Domain & SSL Certificates	Domain & Sertifikat SSL	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.107	2025-11-08 16:41:21.107
6ea02d03-b301-4e0e-8900-1c8b6d504a2a	6_7110	6-7110	OTHER	Web Hosting Services	Layanan Web Hosting	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.112	2025-11-08 16:41:21.112
e09d2330-5646-4d62-8ac3-bd0825d99298	6_2032	6-2032	GENERAL_ADMIN	Accomodation Expense	Beban Akomodasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-09 14:12:54.618	2025-11-09 14:12:54.618
d48e9fd8-88ff-4337-939e-ff2905c31286	6_6010	6-6010	OTHER	Meta Ads (Facebook/Instagram)	Iklan Meta (Facebook/Instagram)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.034	2025-11-08 16:41:21.034
2c8d0013-5d5a-45dd-89c1-1698d43ac0e9	6_6020	6-6020	OTHER	Google Ads (Search/Display/YouTube)	Google Ads (Search/Display/YouTube)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.04	2025-11-08 16:41:21.04
dc986180-fe25-431c-a3a4-0de0522834e7	6_6030	6-6030	OTHER	TikTok Ads	Iklan TikTok	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.045	2025-11-08 16:41:21.045
36cf2917-9f8e-403a-bcbb-34fcc6a7e874	6_6040	6-6040	OTHER	LinkedIn Ads	Iklan LinkedIn	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.051	2025-11-08 16:41:21.051
699d8d1e-ff8d-4cbf-84da-2a768410c58e	6_7010	6-7010	OTHER	Figma/Sketch Subscription	Langganan Figma/Sketch	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.056	2025-11-08 16:41:21.056
59186154-c551-4215-8c36-2f13f517346d	6_7020	6-7020	OTHER	Font & Typography Licenses	Lisensi Font & Tipografi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.062	2025-11-08 16:41:21.062
3b7acf45-a2aa-482e-aa02-6104c256366a	6_7120	6-7120	OTHER	VPN & Security Software	VPN & Software Keamanan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.118	2025-11-08 16:41:21.118
48caaedb-9f7b-4dc3-b69c-a28db2fcc676	5_4010	5-4010	COGS	Freelancer - Social Media Specialist	Freelancer Spesialis Media Sosial	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.124	2025-11-08 16:41:21.124
c586ba9e-ab28-4e07-b98a-2ffba7272533	5_4020	5-4020	COGS	Freelancer - SEO Specialist	Freelancer Spesialis SEO	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.13	2025-11-08 16:41:21.13
0b34fa17-858e-4f1d-9079-2f452208db68	5_4030	5-4030	COGS	Freelancer - UI/UX Designer	Freelancer Desainer UI/UX	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.136	2025-11-08 16:41:21.136
a2f830d9-277d-4835-a9b8-bee202ed4eb5	5_4040	5-4040	COGS	Freelancer - Motion Graphics Designer	Freelancer Desainer Motion Graphics	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.141	2025-11-08 16:41:21.141
778396ce-339b-4974-9f91-4eea53336e6c	5_4050	5-4050	COGS	Freelancer - Voice Over Artist	Freelancer Pengisi Suara	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.147	2025-11-08 16:41:21.147
3be4fcdc-5db3-45a1-9656-adb78bcc9d1d	6_4020	6-4020	OTHER	Property Tax	Pajak Bumi dan Bangunan (PBB)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.741	2025-11-08 16:41:20.741
6edc1405-b630-4b61-86c9-9beb77cf6595	5_2010	5-2010	COGS	Freelancer - Videographer	Freelancer Videografer	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.846	2025-11-08 16:41:20.846
cmhqihic4000mg1uc0uvd4svg	LABOR	6-2010	LABOR_COST	Labor Costs	Biaya Tenaga Kerja	Labor and personnel costs generated from time tracking	Biaya tenaga kerja dan personel dari pelacakan waktu	\N	0.0000	f	NONE	\N	team	#722ed1	t	f	t	f	t	10	2025-11-08 16:41:20.404	2025-11-08 16:41:20.404
cmhqihiav000dg1uc4bszuxsp	SELLING_SALARIES	6-1010	SELLING	Sales Salaries	Gaji Penjualan	Salaries and allowances for sales staff	Gaji dan tunjangan karyawan penjualan	\N	0.0000	f	NONE	\N	user	#1890ff	t	f	t	f	t	1	2025-11-08 16:41:20.359	2025-11-08 16:41:20.494
cmhqihib2000eg1ucvf5a471s	ADVERTISING	6-1030	SELLING	Advertising & Promotion	Iklan dan Promosi	Advertising, promotion, and marketing costs	Biaya iklan, promosi, dan marketing	\N	0.1200	f	NONE	\N	sound	#fa8c16	t	t	t	t	t	3	2025-11-08 16:41:20.366	2025-11-08 16:41:20.497
cmhqihib7000fg1uczugb08d1	DIGITAL_MARKETING	6-1070	SELLING	Digital Marketing	Marketing Digital	Online marketing costs (Google Ads, Facebook Ads, etc.)	Biaya marketing online (Google Ads, Facebook Ads, dll)	\N	0.1200	f	NONE	\N	global	#eb2f96	t	t	t	t	t	7	2025-11-08 16:41:20.371	2025-11-08 16:41:20.5
cmhqihibc000gg1ucasdn1sb7	OFFICE_RENT	6-2020	GENERAL_ADMIN	Office Rent	Sewa Kantor	Office building or space rental costs	Biaya sewa gedung/ruang kantor	\N	0.1200	f	PPH4_2	0.1000	home	#52c41a	t	f	t	t	t	20	2025-11-08 16:41:20.376	2025-11-08 16:41:20.503
cmhqihibh000hg1ucva31yj73	UTILITIES	6-2030	GENERAL_ADMIN	Electricity & Water	Listrik dan Air	Electricity, water, and office utilities	Biaya listrik, air, dan utilitas kantor	\N	0.1200	f	NONE	\N	bulb	#faad14	t	f	t	t	t	30	2025-11-08 16:41:20.381	2025-11-08 16:41:20.506
cmhqihibm000ig1uckrzlx97o	OFFICE_SUPPLIES	6-2050	GENERAL_ADMIN	Office Supplies	Perlengkapan Kantor	Stationery and office supplies	Biaya alat tulis dan perlengkapan kantor	\N	0.1200	f	NONE	\N	file	#2f54eb	t	f	t	t	t	50	2025-11-08 16:41:20.386	2025-11-08 16:41:20.509
cmhqihibr000jg1uc7rohcwbl	PROFESSIONAL_SERVICES	6-2070	GENERAL_ADMIN	Professional Services	Jasa Profesional	Professional services (accountants, auditors, etc.)	Biaya jasa profesional (akuntan, auditor, dll)	\N	0.1200	f	PPH23	0.0200	solution	#eb2f96	t	t	t	t	t	70	2025-11-08 16:41:20.391	2025-11-08 16:41:20.512
cmhqihibv000kg1uctbl6dukc	SOFTWARE	6-2130	GENERAL_ADMIN	Software & Licenses	Software dan Lisensi	Software, SaaS, and license costs	Biaya software, SaaS, dan lisensi	\N	0.1200	f	NONE	\N	cloud	#2f54eb	t	f	t	t	t	130	2025-11-08 16:41:20.396	2025-11-08 16:41:20.515
cmhqihic0000lg1uc6739dtyb	BANK_CHARGES	6-2160	GENERAL_ADMIN	Bank Charges	Biaya Bank	Bank administration and service fees	Biaya administrasi dan layanan bank	\N	0.0000	f	NONE	\N	transaction	#faad14	t	f	t	f	t	160	2025-11-08 16:41:20.4	2025-11-08 16:41:20.518
cmhqihic9000ng1ucw9zm2b1y	MISCELLANEOUS	6-2190	GENERAL_ADMIN	Miscellaneous Expenses	Biaya Lain-Lain	Miscellaneous expenses	Biaya lain-lain	\N	0.1200	f	NONE	\N	more	#8c8c8c	t	f	t	t	t	190	2025-11-08 16:41:20.409	2025-11-08 16:41:20.521
a4e95655-2246-43d7-9090-0621026293c2	6_3010	6-3010	OTHER	Depreciation Expense	Beban Penyusutan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.523	2025-11-08 16:41:20.523
d2bcc15e-9a48-4170-a014-69409b8a0335	5_1010	5-1010	COGS	Cost of Goods Sold	Harga Pokok Penjualan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.695	2025-11-08 16:41:20.695
1c4d44bc-616b-4423-b4dd-2d8249f110e8	5_1020	5-1020	COGS	Direct Labor	Biaya Tenaga Kerja Langsung	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.701	2025-11-08 16:41:20.701
9fb8e1b6-8487-4bb4-b28e-ba82df7ef5d0	5_1030	5-1030	COGS	Manufacturing Overhead	Biaya Overhead Pabrik	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.707	2025-11-08 16:41:20.707
375ed760-2fb8-4438-8dfd-32186034bcd4	6_5010	6-5010	OTHER	Salaries - Management	Gaji Manajemen	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.713	2025-11-08 16:41:20.713
7726e052-3184-4f04-8f0a-aa5c714098ae	6_5020	6-5020	OTHER	Salaries - Administrative	Gaji Administrasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.718	2025-11-08 16:41:20.718
1a64a465-2d23-44e4-857c-79a32db5279c	6_5030	6-5030	OTHER	Employee Benefits	Tunjangan Karyawan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.724	2025-11-08 16:41:20.724
37ab9d57-2d3a-43ec-8b22-688dbf8c573c	6_5040	6-5040	OTHER	Severance Pay	Pesangon	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.73	2025-11-08 16:41:20.73
3dc0693e-d629-47d3-a245-9f3d63e21a81	6_4010	6-4010	OTHER	Income Tax Expense	Beban Pajak Penghasilan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.735	2025-11-08 16:41:20.735
d26e8c22-f92b-4446-a6ca-9bf9e27362c2	5_2020	5-2020	COGS	Freelancer - Photographer	Freelancer Fotografer	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.852	2025-11-08 16:41:20.852
ba0caa41-2250-4f1a-999c-193f41686eff	5_2030	5-2030	COGS	Freelancer - Graphic Designer	Freelancer Desainer Grafis	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.858	2025-11-08 16:41:20.858
9b2c5cba-e493-43ba-8ff3-d5205d91261a	5_2040	5-2040	COGS	Freelancer - Web Developer	Freelancer Developer Website	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.863	2025-11-08 16:41:20.863
3994f8c6-6603-4537-b80d-ca64e683fde6	5_2050	5-2050	COGS	Freelancer - Video Editor	Freelancer Editor Video	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.869	2025-11-08 16:41:20.869
87a66713-7c5b-45c3-861e-02ff08071023	5_2060	5-2060	COGS	Freelancer - Content Writer	Freelancer Penulis Konten	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.875	2025-11-08 16:41:20.875
81ebcf23-e44e-4feb-8a0a-2d2d0a02cae7	5_3010	5-3010	COGS	Stock Footage & Music	Footage & Musik Stok	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.88	2025-11-08 16:41:20.88
3aded9ca-a1db-43c9-97d4-21856772d62f	5_3020	5-3020	COGS	Props & Equipment Rental	Sewa Properti & Peralatan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.886	2025-11-08 16:41:20.886
aeb94ebc-e1fd-4725-b9ae-e593a5cbf3ab	5_3030	5-3030	COGS	Location Rental	Sewa Lokasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.891	2025-11-08 16:41:20.891
203ffd01-d0c0-4dd9-aced-6e76ae500dc5	5_3040	5-3040	COGS	Talent & Models	Talent & Model	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.897	2025-11-08 16:41:20.897
dccc080c-d8b5-41ea-bedd-cdf31ca4bab8	6_3020	6-3020	OTHER	Cloud Storage (Dropbox/Google)	Penyimpanan Cloud	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.907	2025-11-08 16:41:20.907
69b25ffc-a127-4026-b3d4-121bbb7636e8	6_3030	6-3030	OTHER	Project Management Software	Software Manajemen Proyek	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.912	2025-11-08 16:41:20.912
50f92696-e614-478a-8eaa-ec2326ffd069	6_3040	6-3040	OTHER	Stock Photo Subscriptions	Langganan Foto Stok	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.918	2025-11-08 16:41:20.918
c6681132-a82f-49a0-adf6-b0fd6ec07dd4	6_3050	6-3050	OTHER	Video Hosting & Streaming	Hosting & Streaming Video	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.924	2025-11-08 16:41:20.924
c036ea58-2c82-4ca2-b5eb-f05615577ae7	6_3060	6-3060	OTHER	Equipment Maintenance & Repair	Pemeliharaan & Perbaikan Peralatan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.929	2025-11-08 16:41:20.929
8df4b3c7-7564-45ca-9ef3-0a427597370c	6_3070	6-3070	OTHER	Internet & Bandwidth	Internet & Bandwidth	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.935	2025-11-08 16:41:20.935
773c4d54-48b8-460d-8618-027989dccafe	6_3080	6-3080	OTHER	Portfolio Website Hosting	Hosting Website Portfolio	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.94	2025-11-08 16:41:20.94
\.


--
-- Data for Name: expense_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_comments (id, "expenseId", "userId", comment, "commentId", "commentEn", "isInternal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expense_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_documents (id, "fileName", "originalFileName", "filePath", "fileSize", "mimeType", category, description, "expenseId", "uploadedBy", "uploadedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, "expenseNumber", "buktiPengeluaranNumber", "accountCode", "accountName", "accountNameEn", "expenseClass", description, "descriptionId", "descriptionEn", "ppnRate", "ppnAmount", "ppnCategory", "isLuxuryGoods", "eFakturNSFP", "eFakturQRCode", "eFakturApprovalCode", "eFakturStatus", "eFakturValidatedAt", "withholdingTaxType", "withholdingTaxRate", "withholdingTaxAmount", "buktiPotongNumber", "buktiPotongDate", "vendorName", "vendorNPWP", "vendorAddress", "vendorPhone", "vendorBank", "vendorAccountNo", "vendorAccountName", "grossAmount", "withholdingAmount", "netAmount", "totalAmount", "expenseDate", currency, "categoryId", tags, "isTaxDeductible", "userId", "projectId", "clientId", "isBillable", "billableAmount", "invoiceId", status, "submittedAt", "approvedAt", "approvedBy", "rejectedAt", "rejectionReason", "paymentStatus", "paidAt", "paymentMethod", "paymentReference", "paymentId", "journalEntryId", "paymentJournalId", notes, "notesId", "notesEn", "receiptNumber", "merchantName", location, "createdAt", "updatedAt", "createdBy", "updatedBy", "purchaseType", "purchaseSource", "vendorId", "purchaseOrderId", "vendorInvoiceId", "accountsPayableId", "dueDate") FROM stdin;
\.


--
-- Data for Name: feature_flag_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feature_flag_events (id, "flagId", "userId", "eventType", metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feature_flags (id, name, description, enabled, "globalEnabled", "targetUsers", "targetGroups", rules, "expiresAt", "disabledReason", "disabledAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: financial_statements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.financial_statements (id, "statementType", "fiscalPeriodId", "startDate", "endDate", data, "generatedAt", "generatedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: fiscal_periods; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fiscal_periods (id, name, code, "periodType", "startDate", "endDate", status, "isActive", "closedAt", "closedBy", "closingNotes", "createdAt", "updatedAt") FROM stdin;
cmhqihixv004kg1uc78f8ftq0	January 2025	2025-01	MONTHLY	2025-01-01 00:00:00	2025-01-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.188	2025-11-08 16:41:21.188
cmhqihixz004lg1ucs6zs16q7	February 2025	2025-02	MONTHLY	2025-02-01 00:00:00	2025-02-28 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.191	2025-11-08 16:41:21.191
cmhqihiy2004mg1ucvy9fq6s5	March 2025	2025-03	MONTHLY	2025-03-01 00:00:00	2025-03-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.194	2025-11-08 16:41:21.194
cmhqihiy5004ng1uct8tpdt63	April 2025	2025-04	MONTHLY	2025-04-01 00:00:00	2025-04-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.197	2025-11-08 16:41:21.197
cmhqihiy8004og1ucsh1hhfs3	May 2025	2025-05	MONTHLY	2025-05-01 00:00:00	2025-05-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.2	2025-11-08 16:41:21.2
cmhqihiyb004pg1uc6nnx1rxl	June 2025	2025-06	MONTHLY	2025-06-01 00:00:00	2025-06-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.203	2025-11-08 16:41:21.203
cmhqihiye004qg1uck83m4g46	July 2025	2025-07	MONTHLY	2025-07-01 00:00:00	2025-07-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.206	2025-11-08 16:41:21.206
cmhqihiyh004rg1uc79mxmdcv	August 2025	2025-08	MONTHLY	2025-08-01 00:00:00	2025-08-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.209	2025-11-08 16:41:21.209
cmhqihiyk004sg1uckjuecbxm	September 2025	2025-09	MONTHLY	2025-09-01 00:00:00	2025-09-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.212	2025-11-08 16:41:21.212
cmhqihiyn004tg1uc63poo3yr	October 2025	2025-10	MONTHLY	2025-10-01 00:00:00	2025-10-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.215	2025-11-08 16:41:21.215
cmhqihiyq004ug1ucai75t2r4	November 2025	2025-11	MONTHLY	2025-11-01 00:00:00	2025-11-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.218	2025-11-08 16:41:21.218
cmhqihiyt004vg1ucp0881qz5	December 2025	2025-12	MONTHLY	2025-12-01 00:00:00	2025-12-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.221	2025-11-08 16:41:21.221
\.


--
-- Data for Name: general_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.general_ledger (id, "accountId", "entryDate", "postingDate", "journalEntryId", "journalEntryNumber", "lineNumber", debit, credit, balance, description, "descriptionId", "transactionType", "transactionId", "documentNumber", "projectId", "clientId", "fiscalPeriodId", "createdAt") FROM stdin;
\.


--
-- Data for Name: goods_receipt_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.goods_receipt_items (id, "grId", "poItemId", "lineNumber", "orderedQuantity", "receivedQuantity", "acceptedQuantity", "rejectedQuantity", "qualityStatus", "rejectionReason", "unitPrice", "lineTotal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: goods_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.goods_receipts (id, "grNumber", "grDate", "poId", "vendorId", "deliveryNoteNumber", "receivedBy", "receivedAt", "warehouseLocation", "inspectionStatus", "inspectedBy", "inspectedAt", "inspectionNotes", status, "isPosted", "postedAt", notes, "notesId", "createdAt", "updatedAt", "createdBy", "updatedBy", "journalEntryId") FROM stdin;
\.


--
-- Data for Name: indonesian_holidays; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.indonesian_holidays (id, date, year, name, "nameIndonesian", description, type, region, "isLunarBased", "isSubstitute", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invoice_counters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoice_counters (id, year, month, sequence, "createdAt", "updatedAt") FROM stdin;
cmhryiybq000gt4r0ivupkq7h	2025	11	1	2025-11-09 16:58:07.815	2025-11-09 16:58:07.815
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, "invoiceNumber", "creationDate", "dueDate", "quotationId", "clientId", "projectId", "amountPerProject", "totalAmount", "subtotalAmount", "taxRate", "taxAmount", "includeTax", "scopeOfWork", "priceBreakdown", "paymentInfo", "materaiRequired", "materaiApplied", "materaiAppliedAt", "materaiAppliedBy", "materaiAmount", terms, signature, status, "createdBy", "markedPaidBy", "markedPaidAt", "journalEntryId", "paymentJournalId", "paymentMilestoneId", "projectMilestoneId", "createdAt", "updatedAt") FROM stdin;
cmhryiyc1000jt4r0o436hj8x	INV-2025/11/0001	2025-11-09 16:58:07.825	2025-11-10 17:00:00	cmhryd90z0003t4r0y9b2b6lb	cmhrssgrw0004q25yilsyk11p	cmhrt3q5y0005q25y5hnci7rw	2250000.00	2250000.00	2250000.00	0.00	0.00	f	1. Professional Photography Services for One and a half Days\n\n2. Post-Production & Deliverables:\n- Complete archive of all RAW/unedited photos\n- professionally edited high-resolution image\n- Professional editing includes:\n- Color correction and white balance\n- Exposure and brightness optimization\n- Contrast, saturation, and highlight/shadow adjustment\n\n3. Delivery Timeline: Final edited photos in 10 business days\n\n4. Additional & Revision Policy:  \n- 1 complimentary revision round (minor color/crop adjustments)  \n- Must be requested within 7 business days of delivery  \n- Additional edited photo revision : Rp 150,000 / photo  \n- Re-shoot: charged as new session at daily rate	{"total": 4500000, "products": [{"name": "Photoshoot & Editing Service", "price": 4500000, "quantity": 1, "subtotal": 4500000, "description": "Photoshoot Service for One and a Half Days & Editing Service "}], "calculatedAt": "2025-11-09T14:26:19.311Z"}	INFORMASI PEMBAYARAN:\n\nBank BCA: 0901 5881 7935 a.n. Sheryl Chandra\n\nUntuk pertanyaan pembayaran, hubungi:\nTelepon: 085156662098\nEmail: admin@monomiagency.com	f	f	\N	\N	\N	TERMS &amp; CONDITIONS:  \n  \n- 50% non-refundable booking deposit required (Rp 2,250,000)  \n- Secures your shoot date and photographer's time  \n- Balance due upon delivery of edited photos (Rp 2,250,000)\n\nCancellation Policy:  \n- More than 7 days notice: Reschedule once at no charge  \n- Full deposit forfeited, can reschedule with Additional Fee  \n- Less than 48 hours: Full deposit forfeited  \n- No-show: Full deposit forfeited + balance due for time committed  \n\nRescheduling:\n- First reschedule: complimentary (with 7+ days notice)\n- Additional Charged for rescheduling : Rp 1,000,000 fee\n- Subject to photographer availability\n\nCopyright &amp; Usage:\n- Client receives full usage rights as specified above\n- Images may be used in Monomi's portfolio\n- RAW files remain property of Monomi\n- Edited files available for additional licen	\N	SENT	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N	cmhryd91q0005t4r0y7kdloui	\N	2025-11-09 16:58:07.825	2025-11-09 17:24:46.378
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.journal_entries (id, "entryNumber", "entryDate", "postingDate", description, "descriptionId", "descriptionEn", "transactionType", "transactionId", "documentNumber", "documentDate", status, "isPosted", "postedAt", "postedBy", "fiscalPeriodId", "isReversing", "reversedEntryId", "createdBy", "updatedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: journal_line_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.journal_line_items (id, "journalEntryId", "lineNumber", "accountId", debit, credit, description, "descriptionId", "projectId", "clientId", "departmentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: labor_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.labor_entries (id, "projectId", "teamMemberId", "userId", "workDate", "hoursWorked", "laborType", "laborTypeRate", "hourlyRate", "laborCost", "costType", "isDirect", description, "descriptionId", "taskPerformed", status, "submittedAt", "approvedBy", "approvedAt", "rejectedReason", "expenseId", "journalEntryId", "costAllocationId", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: maintenance_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_records (id, "assetId", "maintenanceType", "performedDate", "performedBy", cost, description, "partsReplaced", "nextMaintenanceDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: maintenance_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_schedules (id, "assetId", "maintenanceType", frequency, "lastMaintenanceDate", "nextMaintenanceDate", "isActive", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payment_milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_milestones (id, "quotationId", "milestoneNumber", name, "nameId", description, "descriptionId", "paymentPercentage", "paymentAmount", "dueDate", "dueDaysFromPrev", deliverables, "isInvoiced", "projectMilestoneId", "createdAt", "updatedAt") FROM stdin;
cmhryd9200007t4r0zqmkv482	cmhryd90z0003t4r0y9b2b6lb	2	Final Payment	Pelunasan	Final payment upon project completion	Pembayaran akhir saat proyek selesai	50.00	2250000.00	\N	\N	\N	f	\N	2025-11-09 16:53:41.784	2025-11-09 16:53:41.784
cmhryd91q0005t4r0y7kdloui	cmhryd90z0003t4r0y9b2b6lb	1	Down Payment	DP 50%	Initial payment upon project commencement	Pembayaran awal saat proyek dimulai	50.00	2250000.00	\N	\N	\N	t	\N	2025-11-09 16:53:41.774	2025-11-09 16:58:07.834
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, "invoiceId", amount, "paymentDate", "paymentMethod", "transactionRef", "bankDetails", status, "confirmedAt", "journalEntryId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: project_cost_allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_cost_allocations (id, "projectId", "expenseId", "allocationDate", "allocationMethod", "allocationPercentage", "allocatedAmount", "journalEntryId", "costType", "isDirect", notes, "notesId", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: project_equipment_usage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_equipment_usage (id, "projectId", "assetId", "startDate", "endDate", "returnDate", condition, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: project_milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_milestones (id, "projectId", "milestoneNumber", name, "nameId", description, "descriptionId", "plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate", "completionPercentage", "plannedRevenue", "recognizedRevenue", "remainingRevenue", "estimatedCost", "actualCost", status, deliverables, "acceptedBy", "acceptedAt", "journalEntryId", notes, "notesId", priority, "predecessorId", "delayDays", "delayReason", "materaiRequired", "taxTreatment", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: project_team_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_team_members (id, "projectId", "userId", role, "roleId", "allocationPercent", "hourlyRate", "hourlyRateCurrency", "assignedDate", "startDate", "endDate", "isActive", notes, "notesId", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: project_type_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_type_configs (id, code, name, description, prefix, color, "isDefault", "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmhq2giey0008tdp4r41zz6l5	PRODUCTION	Production Work	Website development, software development, and other production tasks	PH	#52c41a	t	t	1	2025-11-08 09:12:39.994	2025-11-08 09:12:39.994
cmhq2gif60009tdp43pbx1t4n	SOCIAL_MEDIA	Social Media Management	Content creation, social media management, and digital marketing	SM	#1890ff	f	t	2	2025-11-08 09:12:40.003	2025-11-08 09:12:40.003
cmhq2gifd000atdp49z4lwaa5	CONSULTATION	Consultation Services	Business consultation, technical consultation, and advisory services	CS	#722ed1	f	t	3	2025-11-08 09:12:40.009	2025-11-08 09:12:40.009
cmhq2gifj000btdp40y8ttc5a	MAINTENANCE	Maintenance & Support	System maintenance, bug fixes, and technical support	MT	#fa8c16	f	t	4	2025-11-08 09:12:40.015	2025-11-08 09:12:40.015
cmhq2gifp000ctdp42mknwl7r	OTHER	Other Services	Miscellaneous services and custom projects	OT	#595959	f	t	5	2025-11-08 09:12:40.022	2025-11-08 09:12:40.022
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, number, description, "scopeOfWork", output, "projectTypeId", "clientId", "startDate", "endDate", "estimatedBudget", "basePrice", "priceBreakdown", "estimatedExpenses", "projectedGrossMargin", "projectedNetMargin", "projectedProfit", "totalDirectCosts", "totalIndirectCosts", "totalAllocatedCosts", "totalInvoicedAmount", "totalPaidAmount", "grossProfit", "netProfit", "grossMarginPercent", "netMarginPercent", "budgetVariance", "budgetVariancePercent", "profitCalculatedAt", "profitCalculatedBy", status, "createdAt", "updatedAt") FROM stdin;
cmhrt3q5y0005q25y5hnci7rw	PRJ-PH-202511-001	Photoshoot and Editing Service	1. Professional Photography Services for One and a half Days\n\n2. Post-Production & Deliverables:\n- Complete archive of all RAW/unedited photos\n- professionally edited high-resolution image\n- Professional editing includes:\n- Color correction and white balance\n- Exposure and brightness optimization\n- Contrast, saturation, and highlight/shadow adjustment\n\n3. Delivery Timeline: Final edited photos in 10 business days\n\n4. Additional & Revision Policy:  \n- 1 complimentary revision round (minor color/crop adjustments)  \n- Must be requested within 7 business days of delivery  \n- Additional edited photo revision : Rp 150,000 / photo  \n- Re-shoot: charged as new session at daily rate		cmhq2giey0008tdp4r41zz6l5	cmhrssgrw0004q25yilsyk11p	2025-11-12 17:00:00	2025-11-19 17:00:00	600000.00	4500000.00	{"total": 4500000, "products": [{"name": "Photoshoot & Editing Service", "price": 4500000, "quantity": 1, "subtotal": 4500000, "description": "Photoshoot Service for One and a Half Days & Editing Service "}], "calculatedAt": "2025-11-09T14:26:19.311Z"}	{"direct": [{"notes": "Transport PP", "amount": 400000, "categoryId": "e1ed384d-57e3-4452-8ae3-a37070b7e9ac", "categoryName": "Transport Expense", "categoryNameId": "Beban Transportasi"}, {"notes": "", "amount": 200000, "categoryId": "e09d2330-5646-4d62-8ac3-bd0825d99298", "categoryName": "Accomodation Expense", "categoryNameId": "Beban Akomodasi"}], "indirect": [], "totalDirect": 600000, "calculatedAt": "2025-11-09T14:26:19.315Z", "totalIndirect": 0, "totalEstimated": 600000}	86.67	86.67	3900000.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	-600000.00	-100.00	2025-11-09 14:26:19.58	\N	PLANNING	2025-11-09 14:26:19.318	2025-11-09 14:26:19.581
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_order_items (id, "poId", "lineNumber", "itemType", "itemCode", description, "descriptionId", quantity, unit, "unitPrice", "discountPercent", "discountAmount", "lineTotal", "ppnAmount", "quantityReceived", "quantityInvoiced", "quantityOutstanding", "assetId", "expenseCategoryId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_orders (id, "poNumber", "poDate", "vendorId", "projectId", subtotal, "discountAmount", "ppnAmount", "pphAmount", "totalAmount", "isPPNIncluded", "ppnRate", "withholdingTaxType", "withholdingTaxRate", "deliveryAddress", "deliveryDate", "paymentTerms", "dueDate", status, "approvalStatus", "requestedBy", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "totalReceived", "totalInvoiced", "isClosed", "closedAt", "closedBy", "closureReason", description, "descriptionId", notes, "termsConditions", "createdAt", "updatedAt", "createdBy", "updatedBy", "journalEntryId") FROM stdin;
\.


--
-- Data for Name: quotation_counters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotation_counters (id, year, month, sequence, "createdAt", "updatedAt") FROM stdin;
cmhqi9kyn0001ohstk39m2mnk	2025	11	3	2025-11-08 16:35:10.559	2025-11-09 16:53:41.743
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotations (id, "quotationNumber", date, "validUntil", "clientId", "projectId", "amountPerProject", "totalAmount", "scopeOfWork", "priceBreakdown", terms, "paymentType", "paymentTermsText", status, "createdBy", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "createdAt", "updatedAt", "subtotalAmount", "taxRate", "taxAmount", "includeTax") FROM stdin;
cmhryd90z0003t4r0y9b2b6lb	QT-202511-003	2025-11-09 16:53:41.748	2025-11-10 17:00:00	cmhrssgrw0004q25yilsyk11p	cmhrt3q5y0005q25y5hnci7rw	4500000.00	4500000.00	1. Professional Photography Services for One and a half Days\n\n2. Post-Production & Deliverables:\n- Complete archive of all RAW/unedited photos\n- professionally edited high-resolution image\n- Professional editing includes:\n- Color correction and white balance\n- Exposure and brightness optimization\n- Contrast, saturation, and highlight/shadow adjustment\n\n3. Delivery Timeline: Final edited photos in 10 business days\n\n4. Additional & Revision Policy:  \n- 1 complimentary revision round (minor color/crop adjustments)  \n- Must be requested within 7 business days of delivery  \n- Additional edited photo revision : Rp 150,000 / photo  \n- Re-shoot: charged as new session at daily rate	{"total": 4500000, "products": [{"name": "Photoshoot & Editing Service", "price": 4500000, "quantity": 1, "subtotal": 4500000, "description": "Photoshoot Service for One and a Half Days & Editing Service "}], "calculatedAt": "2025-11-09T14:26:19.311Z"}	TERMS & CONDITIONS:  \n  \n- 50% non-refundable booking deposit required (Rp 2,250,000)  \n- Secures your shoot date and photographer's time  \n- Balance due upon delivery of edited photos (Rp 2,250,000)\n\nCancellation Policy:  \n- More than 7 days notice: Reschedule once at no charge  \n- Full deposit forfeited, can reschedule with Additional Fee  \n- Less than 48 hours: Full deposit forfeited  \n- No-show: Full deposit forfeited + balance due for time committed  \n\nRescheduling:\n- First reschedule: complimentary (with 7+ days notice)\n- Additional Charged for rescheduling : Rp 1,000,000 fee\n- Subject to photographer availability\n\nCopyright & Usage:\n- Client receives full usage rights as specified above\n- Images may be used in Monomi's portfolio\n- RAW files remain property of Monomi\n- Edited files available for additional licen	FULL_PAYMENT	\N	APPROVED	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N	2025-11-09 16:53:41.748	2025-11-09 16:55:12.877	\N	\N	\N	f
\.


--
-- Data for Name: report_sections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.report_sections (id, "reportId", "order", title, description, "csvFileName", "csvFilePath", "importedAt", "columnTypes", "rawData", "rowCount", visualizations, "createdAt", "updatedAt", layout, "layoutVersion") FROM stdin;
\.


--
-- Data for Name: social_media_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.social_media_reports (id, "projectId", title, description, month, year, status, "pdfUrl", "pdfGeneratedAt", "pdfVersion", "emailedAt", "emailedTo", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, "defaultPaymentTerms", "materaiThreshold", "invoicePrefix", "quotationPrefix", "autoBackup", "backupFrequency", "backupTime", "autoMateraiReminder", "defaultCurrency", "createdAt", "updatedAt") FROM stdin;
default	NET 30	5000000	INV-	QT-	t	daily	02:00	t	IDR	2025-11-08 16:35:51.238	2025-11-08 16:35:51.238
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_preferences (id, "userId", timezone, language, currency, "emailNotifications", "pushNotifications", theme, "createdAt", "updatedAt") FROM stdin;
cmhrye8mc000at4r0wwel1qq2	cmhq2gicz0000tdp49v6ginqs	Asia/Jakarta	id	IDR	t	t	light	2025-11-09 16:54:27.877	2025-11-09 16:54:27.877
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, name, role, "isActive", "createdAt", "updatedAt") FROM stdin;
cmhq2gicz0000tdp49v6ginqs	admin@monomi.id	$2b$10$yj2WzCw994ECN6eeiqzQtuIDU8nrnafwwBr27q2zbJOLxZjWBEZuO	Admin Sistem (Legacy)	ADMIN	t	2025-11-08 09:12:39.924	2025-11-08 09:12:39.924
cmhq2gid60001tdp4aij1k24f	user@bisnis.co.id	$2b$10$yj2WzCw994ECN6eeiqzQtuIDU8nrnafwwBr27q2zbJOLxZjWBEZuO	User Bisnis (Legacy)	USER	t	2025-11-08 09:12:39.931	2025-11-08 09:12:39.931
cmhq2gidf0002tdp4w5hofa93	super.admin@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Super Admin	SUPER_ADMIN	t	2025-11-08 09:12:39.94	2025-11-08 09:12:39.94
cmhq2gidm0003tdp4du79a8ex	finance.manager@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Finance Manager	FINANCE_MANAGER	t	2025-11-08 09:12:39.947	2025-11-08 09:12:39.947
cmhq2gidr0004tdp42xpnxe32	accountant@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Accountant	ACCOUNTANT	t	2025-11-08 09:12:39.952	2025-11-08 09:12:39.952
cmhq2gidw0005tdp48po7qv3d	project.manager@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Project Manager	PROJECT_MANAGER	t	2025-11-08 09:12:39.957	2025-11-08 09:12:39.957
cmhq2gie20006tdp4cdzmz5m2	staff@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Staff User	STAFF	t	2025-11-08 09:12:39.962	2025-11-08 09:12:39.962
cmhq2gie70007tdp4nu02men3	viewer@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Viewer	VIEWER	t	2025-11-08 09:12:39.967	2025-11-08 09:12:39.967
\.


--
-- Data for Name: ux_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ux_metrics (id, "componentName", "eventType", "metricName", value, "userId", "sessionId", "clientId", url, "userAgent", "performanceData", "createdAt") FROM stdin;
\.


--
-- Data for Name: vendor_invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_invoice_items (id, "viId", "poItemId", "lineNumber", description, "descriptionId", quantity, unit, "unitPrice", "discountAmount", "lineTotal", "ppnAmount", "isMatched", "varianceReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vendor_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_invoices (id, "vendorInvoiceNumber", "internalNumber", "invoiceDate", "vendorId", "poId", "grId", subtotal, "discountAmount", "ppnAmount", "pphAmount", "totalAmount", "eFakturNSFP", "eFakturQRCode", "eFakturStatus", "eFakturUploadDate", "paymentTerms", "dueDate", "matchingStatus", "matchedBy", "matchedAt", "matchingNotes", "priceVariance", "quantityVariance", "withinTolerance", status, "approvalStatus", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "accountsPayableId", "journalEntryId", description, "descriptionId", notes, "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: vendor_payment_allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_payment_allocations (id, "paymentId", "apId", "allocatedAmount", "createdAt") FROM stdin;
\.


--
-- Data for Name: vendor_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_payments (id, "paymentNumber", "paymentDate", "vendorId", "paymentMethod", "referenceNumber", "bankAccountId", "totalAmount", status, "clearedAt", "journalEntryId", notes, "notesId", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, "vendorCode", name, "nameId", "vendorType", "industryType", "contactPerson", email, phone, address, city, province, "postalCode", country, npwp, "pkpStatus", "taxAddress", "bankName", "bankAccountNumber", "bankAccountName", "bankBranch", "swiftCode", "paymentTerms", "creditLimit", currency, "isActive", "isPKP", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: work_in_progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_in_progress (id, "projectId", "periodDate", "fiscalPeriodId", "directMaterialCost", "directLaborCost", "directExpenses", "allocatedOverhead", "totalCost", "billedToDate", "recognizedRevenue", "unbilledRevenue", "completionPercentage", "isCompleted", "costJournalId", "revenueJournalId", notes, "notesId", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_balances account_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_balances
    ADD CONSTRAINT account_balances_pkey PRIMARY KEY (id);


--
-- Name: accounts_payable accounts_payable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_pkey PRIMARY KEY (id);


--
-- Name: allowance_for_doubtful_accounts allowance_for_doubtful_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowance_for_doubtful_accounts
    ADD CONSTRAINT allowance_for_doubtful_accounts_pkey PRIMARY KEY (id);


--
-- Name: asset_kit_items asset_kit_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_kit_items
    ADD CONSTRAINT asset_kit_items_pkey PRIMARY KEY (id);


--
-- Name: asset_kits asset_kits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_kits
    ADD CONSTRAINT asset_kits_pkey PRIMARY KEY (id);


--
-- Name: asset_reservations asset_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_reservations
    ADD CONSTRAINT asset_reservations_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_reconciliation_items bank_reconciliation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliation_items
    ADD CONSTRAINT bank_reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: bank_reconciliations bank_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliations
    ADD CONSTRAINT bank_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: bank_transfers bank_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transfers
    ADD CONSTRAINT bank_transfers_pkey PRIMARY KEY (id);


--
-- Name: business_journey_event_metadata business_journey_event_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_event_metadata
    ADD CONSTRAINT business_journey_event_metadata_pkey PRIMARY KEY (id);


--
-- Name: business_journey_events business_journey_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT business_journey_events_pkey PRIMARY KEY (id);


--
-- Name: cash_bank_balances cash_bank_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_bank_balances
    ADD CONSTRAINT cash_bank_balances_pkey PRIMARY KEY (id);


--
-- Name: cash_transactions cash_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT cash_transactions_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: content_calendar_items content_calendar_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT content_calendar_items_pkey PRIMARY KEY (id);


--
-- Name: content_media content_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_media
    ADD CONSTRAINT content_media_pkey PRIMARY KEY (id);


--
-- Name: deferred_revenue deferred_revenue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deferred_revenue
    ADD CONSTRAINT deferred_revenue_pkey PRIMARY KEY (id);


--
-- Name: depreciation_entries depreciation_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT depreciation_entries_pkey PRIMARY KEY (id);


--
-- Name: depreciation_schedules depreciation_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: expense_approval_history expense_approval_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_approval_history
    ADD CONSTRAINT expense_approval_history_pkey PRIMARY KEY (id);


--
-- Name: expense_budgets expense_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_budgets
    ADD CONSTRAINT expense_budgets_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expense_comments expense_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_comments
    ADD CONSTRAINT expense_comments_pkey PRIMARY KEY (id);


--
-- Name: expense_documents expense_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_documents
    ADD CONSTRAINT expense_documents_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: feature_flag_events feature_flag_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag_events
    ADD CONSTRAINT feature_flag_events_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: financial_statements financial_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_statements
    ADD CONSTRAINT financial_statements_pkey PRIMARY KEY (id);


--
-- Name: fiscal_periods fiscal_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_periods
    ADD CONSTRAINT fiscal_periods_pkey PRIMARY KEY (id);


--
-- Name: general_ledger general_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_items goods_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: indonesian_holidays indonesian_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indonesian_holidays
    ADD CONSTRAINT indonesian_holidays_pkey PRIMARY KEY (id);


--
-- Name: invoice_counters invoice_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_counters
    ADD CONSTRAINT invoice_counters_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_line_items journal_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_line_items
    ADD CONSTRAINT journal_line_items_pkey PRIMARY KEY (id);


--
-- Name: labor_entries labor_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_pkey PRIMARY KEY (id);


--
-- Name: maintenance_records maintenance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: maintenance_schedules maintenance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (id);


--
-- Name: payment_milestones payment_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_milestones
    ADD CONSTRAINT payment_milestones_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: project_cost_allocations project_cost_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_cost_allocations
    ADD CONSTRAINT project_cost_allocations_pkey PRIMARY KEY (id);


--
-- Name: project_equipment_usage project_equipment_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_equipment_usage
    ADD CONSTRAINT project_equipment_usage_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_team_members project_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT project_team_members_pkey PRIMARY KEY (id);


--
-- Name: project_type_configs project_type_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_type_configs
    ADD CONSTRAINT project_type_configs_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: quotation_counters quotation_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_counters
    ADD CONSTRAINT quotation_counters_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: report_sections report_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sections
    ADD CONSTRAINT report_sections_pkey PRIMARY KEY (id);


--
-- Name: social_media_reports social_media_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_reports
    ADD CONSTRAINT social_media_reports_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ux_metrics ux_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ux_metrics
    ADD CONSTRAINT ux_metrics_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoice_items vendor_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoices vendor_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_pkey PRIMARY KEY (id);


--
-- Name: vendor_payment_allocations vendor_payment_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payment_allocations
    ADD CONSTRAINT vendor_payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: vendor_payments vendor_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: work_in_progress work_in_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_in_progress
    ADD CONSTRAINT work_in_progress_pkey PRIMARY KEY (id);


--
-- Name: account_balances_accountId_fiscalPeriodId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "account_balances_accountId_fiscalPeriodId_key" ON public.account_balances USING btree ("accountId", "fiscalPeriodId");


--
-- Name: account_balances_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_balances_accountId_idx" ON public.account_balances USING btree ("accountId");


--
-- Name: account_balances_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_balances_fiscalPeriodId_idx" ON public.account_balances USING btree ("fiscalPeriodId");


--
-- Name: account_balances_isClosed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_balances_isClosed_idx" ON public.account_balances USING btree ("isClosed");


--
-- Name: accounts_payable_agingBucket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounts_payable_agingBucket_idx" ON public.accounts_payable USING btree ("agingBucket");


--
-- Name: accounts_payable_apNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounts_payable_apNumber_idx" ON public.accounts_payable USING btree ("apNumber");


--
-- Name: accounts_payable_apNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accounts_payable_apNumber_key" ON public.accounts_payable USING btree ("apNumber");


--
-- Name: accounts_payable_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounts_payable_dueDate_idx" ON public.accounts_payable USING btree ("dueDate");


--
-- Name: accounts_payable_expenseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accounts_payable_expenseId_key" ON public.accounts_payable USING btree ("expenseId");


--
-- Name: accounts_payable_invoiceDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounts_payable_invoiceDate_idx" ON public.accounts_payable USING btree ("invoiceDate");


--
-- Name: accounts_payable_paymentStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounts_payable_paymentStatus_idx" ON public.accounts_payable USING btree ("paymentStatus");


--
-- Name: accounts_payable_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "accounts_payable_vendorId_idx" ON public.accounts_payable USING btree ("vendorId");


--
-- Name: accounts_payable_vendorInvoiceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "accounts_payable_vendorInvoiceId_key" ON public.accounts_payable USING btree ("vendorInvoiceId");


--
-- Name: allowance_for_doubtful_accounts_agingBucket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allowance_for_doubtful_accounts_agingBucket_idx" ON public.allowance_for_doubtful_accounts USING btree ("agingBucket");


--
-- Name: allowance_for_doubtful_accounts_calculationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allowance_for_doubtful_accounts_calculationDate_idx" ON public.allowance_for_doubtful_accounts USING btree ("calculationDate");


--
-- Name: allowance_for_doubtful_accounts_daysPastDue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allowance_for_doubtful_accounts_daysPastDue_idx" ON public.allowance_for_doubtful_accounts USING btree ("daysPastDue");


--
-- Name: allowance_for_doubtful_accounts_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allowance_for_doubtful_accounts_fiscalPeriodId_idx" ON public.allowance_for_doubtful_accounts USING btree ("fiscalPeriodId");


--
-- Name: allowance_for_doubtful_accounts_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allowance_for_doubtful_accounts_invoiceId_idx" ON public.allowance_for_doubtful_accounts USING btree ("invoiceId");


--
-- Name: allowance_for_doubtful_accounts_journalEntryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allowance_for_doubtful_accounts_journalEntryId_idx" ON public.allowance_for_doubtful_accounts USING btree ("journalEntryId");


--
-- Name: allowance_for_doubtful_accounts_provisionStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "allowance_for_doubtful_accounts_provisionStatus_idx" ON public.allowance_for_doubtful_accounts USING btree ("provisionStatus");


--
-- Name: asset_kit_items_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_kit_items_assetId_idx" ON public.asset_kit_items USING btree ("assetId");


--
-- Name: asset_kit_items_kitId_assetId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "asset_kit_items_kitId_assetId_key" ON public.asset_kit_items USING btree ("kitId", "assetId");


--
-- Name: asset_kit_items_kitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_kit_items_kitId_idx" ON public.asset_kit_items USING btree ("kitId");


--
-- Name: asset_kits_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_kits_isActive_idx" ON public.asset_kits USING btree ("isActive");


--
-- Name: asset_reservations_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_reservations_assetId_idx" ON public.asset_reservations USING btree ("assetId");


--
-- Name: asset_reservations_assetId_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_reservations_assetId_startDate_endDate_idx" ON public.asset_reservations USING btree ("assetId", "startDate", "endDate");


--
-- Name: asset_reservations_assetId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_reservations_assetId_status_idx" ON public.asset_reservations USING btree ("assetId", status);


--
-- Name: asset_reservations_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_reservations_endDate_idx" ON public.asset_reservations USING btree ("endDate");


--
-- Name: asset_reservations_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_reservations_projectId_idx" ON public.asset_reservations USING btree ("projectId");


--
-- Name: asset_reservations_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_reservations_startDate_idx" ON public.asset_reservations USING btree ("startDate");


--
-- Name: asset_reservations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asset_reservations_status_idx ON public.asset_reservations USING btree (status);


--
-- Name: asset_reservations_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "asset_reservations_userId_idx" ON public.asset_reservations USING btree ("userId");


--
-- Name: assets_assetCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "assets_assetCode_idx" ON public.assets USING btree ("assetCode");


--
-- Name: assets_assetCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "assets_assetCode_key" ON public.assets USING btree ("assetCode");


--
-- Name: assets_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assets_category_idx ON public.assets USING btree (category);


--
-- Name: assets_category_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assets_category_status_idx ON public.assets USING btree (category, status);


--
-- Name: assets_condition_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assets_condition_idx ON public.assets USING btree (condition);


--
-- Name: assets_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "assets_createdAt_idx" ON public.assets USING btree ("createdAt");


--
-- Name: assets_createdById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "assets_createdById_idx" ON public.assets USING btree ("createdById");


--
-- Name: assets_status_condition_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assets_status_condition_idx ON public.assets USING btree (status, condition);


--
-- Name: assets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assets_status_idx ON public.assets USING btree (status);


--
-- Name: bank_reconciliation_items_isMatched_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliation_items_isMatched_idx" ON public.bank_reconciliation_items USING btree ("isMatched");


--
-- Name: bank_reconciliation_items_itemDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliation_items_itemDate_idx" ON public.bank_reconciliation_items USING btree ("itemDate");


--
-- Name: bank_reconciliation_items_itemType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliation_items_itemType_idx" ON public.bank_reconciliation_items USING btree ("itemType");


--
-- Name: bank_reconciliation_items_reconciliationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliation_items_reconciliationId_idx" ON public.bank_reconciliation_items USING btree ("reconciliationId");


--
-- Name: bank_reconciliation_items_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_reconciliation_items_status_idx ON public.bank_reconciliation_items USING btree (status);


--
-- Name: bank_reconciliations_bankAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliations_bankAccountId_idx" ON public.bank_reconciliations USING btree ("bankAccountId");


--
-- Name: bank_reconciliations_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliations_createdAt_idx" ON public.bank_reconciliations USING btree ("createdAt");


--
-- Name: bank_reconciliations_createdBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliations_createdBy_idx" ON public.bank_reconciliations USING btree ("createdBy");


--
-- Name: bank_reconciliations_isBalanced_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliations_isBalanced_idx" ON public.bank_reconciliations USING btree ("isBalanced");


--
-- Name: bank_reconciliations_periodStartDate_periodEndDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliations_periodStartDate_periodEndDate_idx" ON public.bank_reconciliations USING btree ("periodStartDate", "periodEndDate");


--
-- Name: bank_reconciliations_reconciliationNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliations_reconciliationNumber_idx" ON public.bank_reconciliations USING btree ("reconciliationNumber");


--
-- Name: bank_reconciliations_reconciliationNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "bank_reconciliations_reconciliationNumber_key" ON public.bank_reconciliations USING btree ("reconciliationNumber");


--
-- Name: bank_reconciliations_statementDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_reconciliations_statementDate_idx" ON public.bank_reconciliations USING btree ("statementDate");


--
-- Name: bank_reconciliations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_reconciliations_status_idx ON public.bank_reconciliations USING btree (status);


--
-- Name: bank_transfers_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_transfers_clientId_idx" ON public.bank_transfers USING btree ("clientId");


--
-- Name: bank_transfers_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_transfers_createdAt_idx" ON public.bank_transfers USING btree ("createdAt");


--
-- Name: bank_transfers_createdBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_transfers_createdBy_idx" ON public.bank_transfers USING btree ("createdBy");


--
-- Name: bank_transfers_fromAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_transfers_fromAccountId_idx" ON public.bank_transfers USING btree ("fromAccountId");


--
-- Name: bank_transfers_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_transfers_projectId_idx" ON public.bank_transfers USING btree ("projectId");


--
-- Name: bank_transfers_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_transfers_status_idx ON public.bank_transfers USING btree (status);


--
-- Name: bank_transfers_toAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_transfers_toAccountId_idx" ON public.bank_transfers USING btree ("toAccountId");


--
-- Name: bank_transfers_transferDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_transfers_transferDate_idx" ON public.bank_transfers USING btree ("transferDate");


--
-- Name: bank_transfers_transferNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bank_transfers_transferNumber_idx" ON public.bank_transfers USING btree ("transferNumber");


--
-- Name: bank_transfers_transferNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "bank_transfers_transferNumber_key" ON public.bank_transfers USING btree ("transferNumber");


--
-- Name: business_journey_event_metadata_eventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "business_journey_event_metadata_eventId_key" ON public.business_journey_event_metadata USING btree ("eventId");


--
-- Name: business_journey_event_metadata_materaiRequired_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_event_metadata_materaiRequired_idx" ON public.business_journey_event_metadata USING btree ("materaiRequired");


--
-- Name: business_journey_event_metadata_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_journey_event_metadata_priority_idx ON public.business_journey_event_metadata USING btree (priority);


--
-- Name: business_journey_event_metadata_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_journey_event_metadata_source_idx ON public.business_journey_event_metadata USING btree (source);


--
-- Name: business_journey_events_amount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_journey_events_amount_idx ON public.business_journey_events USING btree (amount);


--
-- Name: business_journey_events_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_events_clientId_idx" ON public.business_journey_events USING btree ("clientId");


--
-- Name: business_journey_events_clientId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_events_clientId_status_createdAt_idx" ON public.business_journey_events USING btree ("clientId", status, "createdAt");


--
-- Name: business_journey_events_clientId_type_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_events_clientId_type_createdAt_idx" ON public.business_journey_events USING btree ("clientId", type, "createdAt");


--
-- Name: business_journey_events_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_events_createdAt_idx" ON public.business_journey_events USING btree ("createdAt");


--
-- Name: business_journey_events_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_events_invoiceId_idx" ON public.business_journey_events USING btree ("invoiceId");


--
-- Name: business_journey_events_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_events_projectId_idx" ON public.business_journey_events USING btree ("projectId");


--
-- Name: business_journey_events_quotationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_events_quotationId_idx" ON public.business_journey_events USING btree ("quotationId");


--
-- Name: business_journey_events_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "business_journey_events_status_createdAt_idx" ON public.business_journey_events USING btree (status, "createdAt");


--
-- Name: business_journey_events_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_journey_events_status_idx ON public.business_journey_events USING btree (status);


--
-- Name: business_journey_events_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_journey_events_type_idx ON public.business_journey_events USING btree (type);


--
-- Name: business_journey_events_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_journey_events_type_status_idx ON public.business_journey_events USING btree (type, status);


--
-- Name: cash_bank_balances_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_bank_balances_createdAt_idx" ON public.cash_bank_balances USING btree ("createdAt");


--
-- Name: cash_bank_balances_periodDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_bank_balances_periodDate_idx" ON public.cash_bank_balances USING btree ("periodDate");


--
-- Name: cash_bank_balances_year_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cash_bank_balances_year_month_idx ON public.cash_bank_balances USING btree (year, month);


--
-- Name: cash_bank_balances_year_month_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cash_bank_balances_year_month_key ON public.cash_bank_balances USING btree (year, month);


--
-- Name: cash_transactions_cashAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_cashAccountId_idx" ON public.cash_transactions USING btree ("cashAccountId");


--
-- Name: cash_transactions_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cash_transactions_category_idx ON public.cash_transactions USING btree (category);


--
-- Name: cash_transactions_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_clientId_idx" ON public.cash_transactions USING btree ("clientId");


--
-- Name: cash_transactions_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_createdAt_idx" ON public.cash_transactions USING btree ("createdAt");


--
-- Name: cash_transactions_createdBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_createdBy_idx" ON public.cash_transactions USING btree ("createdBy");


--
-- Name: cash_transactions_offsetAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_offsetAccountId_idx" ON public.cash_transactions USING btree ("offsetAccountId");


--
-- Name: cash_transactions_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_projectId_idx" ON public.cash_transactions USING btree ("projectId");


--
-- Name: cash_transactions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cash_transactions_status_idx ON public.cash_transactions USING btree (status);


--
-- Name: cash_transactions_transactionDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_transactionDate_idx" ON public.cash_transactions USING btree ("transactionDate");


--
-- Name: cash_transactions_transactionNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_transactionNumber_idx" ON public.cash_transactions USING btree ("transactionNumber");


--
-- Name: cash_transactions_transactionNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "cash_transactions_transactionNumber_key" ON public.cash_transactions USING btree ("transactionNumber");


--
-- Name: cash_transactions_transactionType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cash_transactions_transactionType_idx" ON public.cash_transactions USING btree ("transactionType");


--
-- Name: chart_of_accounts_accountType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chart_of_accounts_accountType_idx" ON public.chart_of_accounts USING btree ("accountType");


--
-- Name: chart_of_accounts_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chart_of_accounts_code_idx ON public.chart_of_accounts USING btree (code);


--
-- Name: chart_of_accounts_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX chart_of_accounts_code_key ON public.chart_of_accounts USING btree (code);


--
-- Name: chart_of_accounts_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chart_of_accounts_isActive_idx" ON public.chart_of_accounts USING btree ("isActive");


--
-- Name: chart_of_accounts_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chart_of_accounts_parentId_idx" ON public.chart_of_accounts USING btree ("parentId");


--
-- Name: clients_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "clients_createdAt_idx" ON public.clients USING btree ("createdAt");


--
-- Name: clients_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_email_idx ON public.clients USING btree (email);


--
-- Name: clients_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_name_idx ON public.clients USING btree (name);


--
-- Name: clients_name_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_name_status_idx ON public.clients USING btree (name, status);


--
-- Name: clients_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_phone_idx ON public.clients USING btree (phone);


--
-- Name: clients_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "clients_status_createdAt_idx" ON public.clients USING btree (status, "createdAt");


--
-- Name: content_calendar_items_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "content_calendar_items_clientId_idx" ON public.content_calendar_items USING btree ("clientId");


--
-- Name: content_calendar_items_createdBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "content_calendar_items_createdBy_idx" ON public.content_calendar_items USING btree ("createdBy");


--
-- Name: content_calendar_items_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "content_calendar_items_projectId_idx" ON public.content_calendar_items USING btree ("projectId");


--
-- Name: content_calendar_items_scheduledAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "content_calendar_items_scheduledAt_idx" ON public.content_calendar_items USING btree ("scheduledAt");


--
-- Name: content_calendar_items_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_calendar_items_status_idx ON public.content_calendar_items USING btree (status);


--
-- Name: content_calendar_items_status_scheduledAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "content_calendar_items_status_scheduledAt_idx" ON public.content_calendar_items USING btree (status, "scheduledAt");


--
-- Name: content_media_contentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "content_media_contentId_idx" ON public.content_media USING btree ("contentId");


--
-- Name: content_media_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_media_type_idx ON public.content_media USING btree (type);


--
-- Name: content_media_uploadedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "content_media_uploadedAt_idx" ON public.content_media USING btree ("uploadedAt");


--
-- Name: deferred_revenue_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deferred_revenue_fiscalPeriodId_idx" ON public.deferred_revenue USING btree ("fiscalPeriodId");


--
-- Name: deferred_revenue_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deferred_revenue_invoiceId_idx" ON public.deferred_revenue USING btree ("invoiceId");


--
-- Name: deferred_revenue_paymentDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deferred_revenue_paymentDate_idx" ON public.deferred_revenue USING btree ("paymentDate");


--
-- Name: deferred_revenue_recognitionDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "deferred_revenue_recognitionDate_idx" ON public.deferred_revenue USING btree ("recognitionDate");


--
-- Name: deferred_revenue_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deferred_revenue_status_idx ON public.deferred_revenue USING btree (status);


--
-- Name: depreciation_entries_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_entries_assetId_idx" ON public.depreciation_entries USING btree ("assetId");


--
-- Name: depreciation_entries_assetId_periodDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "depreciation_entries_assetId_periodDate_key" ON public.depreciation_entries USING btree ("assetId", "periodDate");


--
-- Name: depreciation_entries_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_entries_fiscalPeriodId_idx" ON public.depreciation_entries USING btree ("fiscalPeriodId");


--
-- Name: depreciation_entries_journalEntryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_entries_journalEntryId_idx" ON public.depreciation_entries USING btree ("journalEntryId");


--
-- Name: depreciation_entries_periodDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_entries_periodDate_idx" ON public.depreciation_entries USING btree ("periodDate");


--
-- Name: depreciation_entries_scheduleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_entries_scheduleId_idx" ON public.depreciation_entries USING btree ("scheduleId");


--
-- Name: depreciation_entries_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX depreciation_entries_status_idx ON public.depreciation_entries USING btree (status);


--
-- Name: depreciation_schedules_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_schedules_assetId_idx" ON public.depreciation_schedules USING btree ("assetId");


--
-- Name: depreciation_schedules_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_schedules_endDate_idx" ON public.depreciation_schedules USING btree ("endDate");


--
-- Name: depreciation_schedules_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_schedules_isActive_idx" ON public.depreciation_schedules USING btree ("isActive");


--
-- Name: depreciation_schedules_isFulfilled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_schedules_isFulfilled_idx" ON public.depreciation_schedules USING btree ("isFulfilled");


--
-- Name: depreciation_schedules_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "depreciation_schedules_startDate_idx" ON public.depreciation_schedules USING btree ("startDate");


--
-- Name: documents_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_category_idx ON public.documents USING btree (category);


--
-- Name: documents_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "documents_invoiceId_idx" ON public.documents USING btree ("invoiceId");


--
-- Name: documents_mimeType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "documents_mimeType_idx" ON public.documents USING btree ("mimeType");


--
-- Name: documents_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "documents_projectId_idx" ON public.documents USING btree ("projectId");


--
-- Name: documents_quotationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "documents_quotationId_idx" ON public.documents USING btree ("quotationId");


--
-- Name: documents_uploadedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "documents_uploadedAt_idx" ON public.documents USING btree ("uploadedAt");


--
-- Name: exchange_rates_effectiveDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exchange_rates_effectiveDate_idx" ON public.exchange_rates USING btree ("effectiveDate");


--
-- Name: exchange_rates_fromCurrency_toCurrency_effectiveDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_effectiveDate_key" ON public.exchange_rates USING btree ("fromCurrency", "toCurrency", "effectiveDate");


--
-- Name: exchange_rates_fromCurrency_toCurrency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exchange_rates_fromCurrency_toCurrency_idx" ON public.exchange_rates USING btree ("fromCurrency", "toCurrency");


--
-- Name: exchange_rates_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exchange_rates_isActive_idx" ON public.exchange_rates USING btree ("isActive");


--
-- Name: expense_approval_history_actionBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_approval_history_actionBy_idx" ON public.expense_approval_history USING btree ("actionBy");


--
-- Name: expense_approval_history_actionDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_approval_history_actionDate_idx" ON public.expense_approval_history USING btree ("actionDate");


--
-- Name: expense_approval_history_expenseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_approval_history_expenseId_idx" ON public.expense_approval_history USING btree ("expenseId");


--
-- Name: expense_budgets_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_budgets_categoryId_idx" ON public.expense_budgets USING btree ("categoryId");


--
-- Name: expense_budgets_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_budgets_isActive_idx" ON public.expense_budgets USING btree ("isActive");


--
-- Name: expense_budgets_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_budgets_projectId_idx" ON public.expense_budgets USING btree ("projectId");


--
-- Name: expense_budgets_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_budgets_startDate_endDate_idx" ON public.expense_budgets USING btree ("startDate", "endDate");


--
-- Name: expense_budgets_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_budgets_userId_idx" ON public.expense_budgets USING btree ("userId");


--
-- Name: expense_categories_accountCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_categories_accountCode_idx" ON public.expense_categories USING btree ("accountCode");


--
-- Name: expense_categories_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expense_categories_code_idx ON public.expense_categories USING btree (code);


--
-- Name: expense_categories_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX expense_categories_code_key ON public.expense_categories USING btree (code);


--
-- Name: expense_categories_expenseClass_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_categories_expenseClass_idx" ON public.expense_categories USING btree ("expenseClass");


--
-- Name: expense_categories_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_categories_isActive_idx" ON public.expense_categories USING btree ("isActive");


--
-- Name: expense_categories_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_categories_parentId_idx" ON public.expense_categories USING btree ("parentId");


--
-- Name: expense_comments_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_comments_createdAt_idx" ON public.expense_comments USING btree ("createdAt");


--
-- Name: expense_comments_expenseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_comments_expenseId_idx" ON public.expense_comments USING btree ("expenseId");


--
-- Name: expense_comments_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_comments_userId_idx" ON public.expense_comments USING btree ("userId");


--
-- Name: expense_documents_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expense_documents_category_idx ON public.expense_documents USING btree (category);


--
-- Name: expense_documents_expenseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_documents_expenseId_idx" ON public.expense_documents USING btree ("expenseId");


--
-- Name: expense_documents_mimeType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_documents_mimeType_idx" ON public.expense_documents USING btree ("mimeType");


--
-- Name: expense_documents_uploadedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expense_documents_uploadedAt_idx" ON public.expense_documents USING btree ("uploadedAt");


--
-- Name: expenses_accountCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_accountCode_idx" ON public.expenses USING btree ("accountCode");


--
-- Name: expenses_accountsPayableId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "expenses_accountsPayableId_key" ON public.expenses USING btree ("accountsPayableId");


--
-- Name: expenses_buktiPengeluaranNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_buktiPengeluaranNumber_idx" ON public.expenses USING btree ("buktiPengeluaranNumber");


--
-- Name: expenses_buktiPengeluaranNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "expenses_buktiPengeluaranNumber_key" ON public.expenses USING btree ("buktiPengeluaranNumber");


--
-- Name: expenses_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_categoryId_idx" ON public.expenses USING btree ("categoryId");


--
-- Name: expenses_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_clientId_idx" ON public.expenses USING btree ("clientId");


--
-- Name: expenses_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_createdAt_idx" ON public.expenses USING btree ("createdAt");


--
-- Name: expenses_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_dueDate_idx" ON public.expenses USING btree ("dueDate");


--
-- Name: expenses_eFakturNSFP_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_eFakturNSFP_idx" ON public.expenses USING btree ("eFakturNSFP");


--
-- Name: expenses_expenseClass_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_expenseClass_idx" ON public.expenses USING btree ("expenseClass");


--
-- Name: expenses_expenseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_expenseDate_idx" ON public.expenses USING btree ("expenseDate");


--
-- Name: expenses_expenseNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_expenseNumber_idx" ON public.expenses USING btree ("expenseNumber");


--
-- Name: expenses_expenseNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "expenses_expenseNumber_key" ON public.expenses USING btree ("expenseNumber");


--
-- Name: expenses_paymentStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_paymentStatus_idx" ON public.expenses USING btree ("paymentStatus");


--
-- Name: expenses_ppnCategory_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_ppnCategory_idx" ON public.expenses USING btree ("ppnCategory");


--
-- Name: expenses_projectId_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_projectId_categoryId_idx" ON public.expenses USING btree ("projectId", "categoryId");


--
-- Name: expenses_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_projectId_idx" ON public.expenses USING btree ("projectId");


--
-- Name: expenses_projectId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_projectId_status_idx" ON public.expenses USING btree ("projectId", status);


--
-- Name: expenses_purchaseOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_purchaseOrderId_idx" ON public.expenses USING btree ("purchaseOrderId");


--
-- Name: expenses_purchaseSource_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_purchaseSource_idx" ON public.expenses USING btree ("purchaseSource");


--
-- Name: expenses_purchaseType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_purchaseType_idx" ON public.expenses USING btree ("purchaseType");


--
-- Name: expenses_status_expenseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_status_expenseDate_idx" ON public.expenses USING btree (status, "expenseDate");


--
-- Name: expenses_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_status_idx ON public.expenses USING btree (status);


--
-- Name: expenses_status_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_status_userId_idx" ON public.expenses USING btree (status, "userId");


--
-- Name: expenses_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_userId_idx" ON public.expenses USING btree ("userId");


--
-- Name: expenses_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_vendorId_idx" ON public.expenses USING btree ("vendorId");


--
-- Name: expenses_vendorId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_vendorId_status_idx" ON public.expenses USING btree ("vendorId", status);


--
-- Name: expenses_vendorInvoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_vendorInvoiceId_idx" ON public.expenses USING btree ("vendorInvoiceId");


--
-- Name: feature_flag_events_eventType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "feature_flag_events_eventType_idx" ON public.feature_flag_events USING btree ("eventType");


--
-- Name: feature_flag_events_flagId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "feature_flag_events_flagId_idx" ON public.feature_flag_events USING btree ("flagId");


--
-- Name: feature_flag_events_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "feature_flag_events_userId_idx" ON public.feature_flag_events USING btree ("userId");


--
-- Name: feature_flags_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feature_flags_name_key ON public.feature_flags USING btree (name);


--
-- Name: financial_statements_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "financial_statements_fiscalPeriodId_idx" ON public.financial_statements USING btree ("fiscalPeriodId");


--
-- Name: financial_statements_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "financial_statements_startDate_endDate_idx" ON public.financial_statements USING btree ("startDate", "endDate");


--
-- Name: financial_statements_statementType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "financial_statements_statementType_idx" ON public.financial_statements USING btree ("statementType");


--
-- Name: fiscal_periods_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fiscal_periods_code_idx ON public.fiscal_periods USING btree (code);


--
-- Name: fiscal_periods_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fiscal_periods_code_key ON public.fiscal_periods USING btree (code);


--
-- Name: fiscal_periods_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_periods_endDate_idx" ON public.fiscal_periods USING btree ("endDate");


--
-- Name: fiscal_periods_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "fiscal_periods_startDate_idx" ON public.fiscal_periods USING btree ("startDate");


--
-- Name: fiscal_periods_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fiscal_periods_status_idx ON public.fiscal_periods USING btree (status);


--
-- Name: general_ledger_accountId_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_accountId_fiscalPeriodId_idx" ON public.general_ledger USING btree ("accountId", "fiscalPeriodId");


--
-- Name: general_ledger_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_accountId_idx" ON public.general_ledger USING btree ("accountId");


--
-- Name: general_ledger_accountId_postingDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_accountId_postingDate_idx" ON public.general_ledger USING btree ("accountId", "postingDate");


--
-- Name: general_ledger_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_clientId_idx" ON public.general_ledger USING btree ("clientId");


--
-- Name: general_ledger_entryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_entryDate_idx" ON public.general_ledger USING btree ("entryDate");


--
-- Name: general_ledger_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_fiscalPeriodId_idx" ON public.general_ledger USING btree ("fiscalPeriodId");


--
-- Name: general_ledger_journalEntryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_journalEntryId_idx" ON public.general_ledger USING btree ("journalEntryId");


--
-- Name: general_ledger_postingDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_postingDate_idx" ON public.general_ledger USING btree ("postingDate");


--
-- Name: general_ledger_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_projectId_idx" ON public.general_ledger USING btree ("projectId");


--
-- Name: general_ledger_transactionType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "general_ledger_transactionType_idx" ON public.general_ledger USING btree ("transactionType");


--
-- Name: goods_receipt_items_grId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipt_items_grId_idx" ON public.goods_receipt_items USING btree ("grId");


--
-- Name: goods_receipt_items_poItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipt_items_poItemId_idx" ON public.goods_receipt_items USING btree ("poItemId");


--
-- Name: goods_receipts_grDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipts_grDate_idx" ON public.goods_receipts USING btree ("grDate");


--
-- Name: goods_receipts_grNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipts_grNumber_idx" ON public.goods_receipts USING btree ("grNumber");


--
-- Name: goods_receipts_grNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "goods_receipts_grNumber_key" ON public.goods_receipts USING btree ("grNumber");


--
-- Name: goods_receipts_poId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipts_poId_idx" ON public.goods_receipts USING btree ("poId");


--
-- Name: goods_receipts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX goods_receipts_status_idx ON public.goods_receipts USING btree (status);


--
-- Name: goods_receipts_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "goods_receipts_vendorId_idx" ON public.goods_receipts USING btree ("vendorId");


--
-- Name: indonesian_holidays_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indonesian_holidays_date_idx ON public.indonesian_holidays USING btree (date);


--
-- Name: indonesian_holidays_date_region_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX indonesian_holidays_date_region_key ON public.indonesian_holidays USING btree (date, region);


--
-- Name: indonesian_holidays_region_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indonesian_holidays_region_idx ON public.indonesian_holidays USING btree (region);


--
-- Name: indonesian_holidays_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indonesian_holidays_type_idx ON public.indonesian_holidays USING btree (type);


--
-- Name: indonesian_holidays_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indonesian_holidays_year_idx ON public.indonesian_holidays USING btree (year);


--
-- Name: invoice_counters_year_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_counters_year_month_idx ON public.invoice_counters USING btree (year, month);


--
-- Name: invoice_counters_year_month_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoice_counters_year_month_key ON public.invoice_counters USING btree (year, month);


--
-- Name: invoices_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_clientId_idx" ON public.invoices USING btree ("clientId");


--
-- Name: invoices_clientId_projectId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_clientId_projectId_status_idx" ON public.invoices USING btree ("clientId", "projectId", status);


--
-- Name: invoices_clientId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_clientId_status_idx" ON public.invoices USING btree ("clientId", status);


--
-- Name: invoices_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_createdAt_idx" ON public.invoices USING btree ("createdAt");


--
-- Name: invoices_createdAt_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_createdAt_status_idx" ON public.invoices USING btree ("createdAt", status);


--
-- Name: invoices_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_dueDate_idx" ON public.invoices USING btree ("dueDate");


--
-- Name: invoices_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_invoiceNumber_idx" ON public.invoices USING btree ("invoiceNumber");


--
-- Name: invoices_invoiceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON public.invoices USING btree ("invoiceNumber");


--
-- Name: invoices_materaiRequired_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_materaiRequired_idx" ON public.invoices USING btree ("materaiRequired");


--
-- Name: invoices_materaiRequired_materaiApplied_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_materaiRequired_materaiApplied_status_idx" ON public.invoices USING btree ("materaiRequired", "materaiApplied", status);


--
-- Name: invoices_materaiRequired_totalAmount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_materaiRequired_totalAmount_idx" ON public.invoices USING btree ("materaiRequired", "totalAmount");


--
-- Name: invoices_paymentMilestoneId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_paymentMilestoneId_idx" ON public.invoices USING btree ("paymentMilestoneId");


--
-- Name: invoices_paymentMilestoneId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "invoices_paymentMilestoneId_key" ON public.invoices USING btree ("paymentMilestoneId");


--
-- Name: invoices_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_projectId_idx" ON public.invoices USING btree ("projectId");


--
-- Name: invoices_projectMilestoneId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_projectMilestoneId_idx" ON public.invoices USING btree ("projectMilestoneId");


--
-- Name: invoices_quotationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_quotationId_idx" ON public.invoices USING btree ("quotationId");


--
-- Name: invoices_quotationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_quotationId_status_idx" ON public.invoices USING btree ("quotationId", status);


--
-- Name: invoices_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_status_createdAt_idx" ON public.invoices USING btree (status, "createdAt");


--
-- Name: invoices_status_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoices_status_dueDate_idx" ON public.invoices USING btree (status, "dueDate");


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: journal_entries_entryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_entryDate_idx" ON public.journal_entries USING btree ("entryDate");


--
-- Name: journal_entries_entryNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_entryNumber_idx" ON public.journal_entries USING btree ("entryNumber");


--
-- Name: journal_entries_entryNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "journal_entries_entryNumber_key" ON public.journal_entries USING btree ("entryNumber");


--
-- Name: journal_entries_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_fiscalPeriodId_idx" ON public.journal_entries USING btree ("fiscalPeriodId");


--
-- Name: journal_entries_isPosted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_isPosted_idx" ON public.journal_entries USING btree ("isPosted");


--
-- Name: journal_entries_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_status_idx ON public.journal_entries USING btree (status);


--
-- Name: journal_entries_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_transactionId_idx" ON public.journal_entries USING btree ("transactionId");


--
-- Name: journal_entries_transactionType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_entries_transactionType_idx" ON public.journal_entries USING btree ("transactionType");


--
-- Name: journal_line_items_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_line_items_accountId_idx" ON public.journal_line_items USING btree ("accountId");


--
-- Name: journal_line_items_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_line_items_clientId_idx" ON public.journal_line_items USING btree ("clientId");


--
-- Name: journal_line_items_journalEntryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_line_items_journalEntryId_idx" ON public.journal_line_items USING btree ("journalEntryId");


--
-- Name: journal_line_items_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "journal_line_items_projectId_idx" ON public.journal_line_items USING btree ("projectId");


--
-- Name: labor_entries_expenseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "labor_entries_expenseId_idx" ON public.labor_entries USING btree ("expenseId");


--
-- Name: labor_entries_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "labor_entries_projectId_idx" ON public.labor_entries USING btree ("projectId");


--
-- Name: labor_entries_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX labor_entries_status_idx ON public.labor_entries USING btree (status);


--
-- Name: labor_entries_teamMemberId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "labor_entries_teamMemberId_idx" ON public.labor_entries USING btree ("teamMemberId");


--
-- Name: labor_entries_teamMemberId_workDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "labor_entries_teamMemberId_workDate_key" ON public.labor_entries USING btree ("teamMemberId", "workDate");


--
-- Name: labor_entries_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "labor_entries_userId_idx" ON public.labor_entries USING btree ("userId");


--
-- Name: labor_entries_workDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "labor_entries_workDate_idx" ON public.labor_entries USING btree ("workDate");


--
-- Name: maintenance_records_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "maintenance_records_assetId_idx" ON public.maintenance_records USING btree ("assetId");


--
-- Name: maintenance_records_maintenanceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "maintenance_records_maintenanceType_idx" ON public.maintenance_records USING btree ("maintenanceType");


--
-- Name: maintenance_records_performedDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "maintenance_records_performedDate_idx" ON public.maintenance_records USING btree ("performedDate");


--
-- Name: maintenance_schedules_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "maintenance_schedules_assetId_idx" ON public.maintenance_schedules USING btree ("assetId");


--
-- Name: maintenance_schedules_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "maintenance_schedules_isActive_idx" ON public.maintenance_schedules USING btree ("isActive");


--
-- Name: maintenance_schedules_isActive_nextMaintenanceDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "maintenance_schedules_isActive_nextMaintenanceDate_idx" ON public.maintenance_schedules USING btree ("isActive", "nextMaintenanceDate");


--
-- Name: maintenance_schedules_nextMaintenanceDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "maintenance_schedules_nextMaintenanceDate_idx" ON public.maintenance_schedules USING btree ("nextMaintenanceDate");


--
-- Name: payment_milestones_isInvoiced_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_milestones_isInvoiced_idx" ON public.payment_milestones USING btree ("isInvoiced");


--
-- Name: payment_milestones_projectMilestoneId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_milestones_projectMilestoneId_idx" ON public.payment_milestones USING btree ("projectMilestoneId");


--
-- Name: payment_milestones_quotationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_milestones_quotationId_idx" ON public.payment_milestones USING btree ("quotationId");


--
-- Name: payment_milestones_quotationId_isInvoiced_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_milestones_quotationId_isInvoiced_idx" ON public.payment_milestones USING btree ("quotationId", "isInvoiced");


--
-- Name: payment_milestones_quotationId_milestoneNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_milestones_quotationId_milestoneNumber_key" ON public.payment_milestones USING btree ("quotationId", "milestoneNumber");


--
-- Name: payments_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_invoiceId_idx" ON public.payments USING btree ("invoiceId");


--
-- Name: payments_invoiceId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_invoiceId_status_idx" ON public.payments USING btree ("invoiceId", status);


--
-- Name: payments_paymentDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_paymentDate_idx" ON public.payments USING btree ("paymentDate");


--
-- Name: payments_paymentMethod_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_paymentMethod_idx" ON public.payments USING btree ("paymentMethod");


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status);


--
-- Name: payments_status_paymentDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_status_paymentDate_idx" ON public.payments USING btree (status, "paymentDate");


--
-- Name: project_cost_allocations_allocationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_cost_allocations_allocationDate_idx" ON public.project_cost_allocations USING btree ("allocationDate");


--
-- Name: project_cost_allocations_costType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_cost_allocations_costType_idx" ON public.project_cost_allocations USING btree ("costType");


--
-- Name: project_cost_allocations_expenseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_cost_allocations_expenseId_idx" ON public.project_cost_allocations USING btree ("expenseId");


--
-- Name: project_cost_allocations_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_cost_allocations_projectId_idx" ON public.project_cost_allocations USING btree ("projectId");


--
-- Name: project_equipment_usage_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_equipment_usage_assetId_idx" ON public.project_equipment_usage USING btree ("assetId");


--
-- Name: project_equipment_usage_assetId_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_equipment_usage_assetId_startDate_idx" ON public.project_equipment_usage USING btree ("assetId", "startDate");


--
-- Name: project_equipment_usage_projectId_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_equipment_usage_projectId_assetId_idx" ON public.project_equipment_usage USING btree ("projectId", "assetId");


--
-- Name: project_equipment_usage_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_equipment_usage_projectId_idx" ON public.project_equipment_usage USING btree ("projectId");


--
-- Name: project_equipment_usage_returnDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_equipment_usage_returnDate_idx" ON public.project_equipment_usage USING btree ("returnDate");


--
-- Name: project_equipment_usage_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_equipment_usage_startDate_idx" ON public.project_equipment_usage USING btree ("startDate");


--
-- Name: project_milestones_completionPercentage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_milestones_completionPercentage_idx" ON public.project_milestones USING btree ("completionPercentage");


--
-- Name: project_milestones_milestoneNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_milestones_milestoneNumber_idx" ON public.project_milestones USING btree ("milestoneNumber");


--
-- Name: project_milestones_predecessorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_milestones_predecessorId_idx" ON public.project_milestones USING btree ("predecessorId");


--
-- Name: project_milestones_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_milestones_priority_idx ON public.project_milestones USING btree (priority);


--
-- Name: project_milestones_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_milestones_projectId_idx" ON public.project_milestones USING btree ("projectId");


--
-- Name: project_milestones_projectId_milestoneNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "project_milestones_projectId_milestoneNumber_key" ON public.project_milestones USING btree ("projectId", "milestoneNumber");


--
-- Name: project_milestones_projectId_plannedStartDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_milestones_projectId_plannedStartDate_idx" ON public.project_milestones USING btree ("projectId", "plannedStartDate");


--
-- Name: project_milestones_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_milestones_status_idx ON public.project_milestones USING btree (status);


--
-- Name: project_milestones_status_plannedEndDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_milestones_status_plannedEndDate_idx" ON public.project_milestones USING btree (status, "plannedEndDate");


--
-- Name: project_team_members_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_team_members_endDate_idx" ON public.project_team_members USING btree ("endDate");


--
-- Name: project_team_members_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_team_members_isActive_idx" ON public.project_team_members USING btree ("isActive");


--
-- Name: project_team_members_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_team_members_projectId_idx" ON public.project_team_members USING btree ("projectId");


--
-- Name: project_team_members_projectId_userId_assignedDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "project_team_members_projectId_userId_assignedDate_key" ON public.project_team_members USING btree ("projectId", "userId", "assignedDate");


--
-- Name: project_team_members_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_team_members_startDate_idx" ON public.project_team_members USING btree ("startDate");


--
-- Name: project_team_members_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_team_members_userId_idx" ON public.project_team_members USING btree ("userId");


--
-- Name: project_type_configs_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_type_configs_code_idx ON public.project_type_configs USING btree (code);


--
-- Name: project_type_configs_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX project_type_configs_code_key ON public.project_type_configs USING btree (code);


--
-- Name: project_type_configs_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_type_configs_isActive_idx" ON public.project_type_configs USING btree ("isActive");


--
-- Name: project_type_configs_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_type_configs_sortOrder_idx" ON public.project_type_configs USING btree ("sortOrder");


--
-- Name: projects_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_clientId_idx" ON public.projects USING btree ("clientId");


--
-- Name: projects_clientId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_clientId_status_createdAt_idx" ON public.projects USING btree ("clientId", status, "createdAt");


--
-- Name: projects_clientId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_clientId_status_idx" ON public.projects USING btree ("clientId", status);


--
-- Name: projects_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_createdAt_idx" ON public.projects USING btree ("createdAt");


--
-- Name: projects_grossMarginPercent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_grossMarginPercent_idx" ON public.projects USING btree ("grossMarginPercent");


--
-- Name: projects_netMarginPercent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_netMarginPercent_idx" ON public.projects USING btree ("netMarginPercent");


--
-- Name: projects_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_number_idx ON public.projects USING btree (number);


--
-- Name: projects_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX projects_number_key ON public.projects USING btree (number);


--
-- Name: projects_profitCalculatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_profitCalculatedAt_idx" ON public.projects USING btree ("profitCalculatedAt");


--
-- Name: projects_projectTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_projectTypeId_idx" ON public.projects USING btree ("projectTypeId");


--
-- Name: projects_projectTypeId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_projectTypeId_status_idx" ON public.projects USING btree ("projectTypeId", status);


--
-- Name: projects_projectedNetMargin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_projectedNetMargin_idx" ON public.projects USING btree ("projectedNetMargin");


--
-- Name: projects_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_status_createdAt_idx" ON public.projects USING btree (status, "createdAt");


--
-- Name: projects_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_status_idx ON public.projects USING btree (status);


--
-- Name: projects_totalAllocatedCosts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "projects_totalAllocatedCosts_idx" ON public.projects USING btree ("totalAllocatedCosts");


--
-- Name: purchase_order_items_assetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_order_items_assetId_idx" ON public.purchase_order_items USING btree ("assetId");


--
-- Name: purchase_order_items_expenseCategoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_order_items_expenseCategoryId_idx" ON public.purchase_order_items USING btree ("expenseCategoryId");


--
-- Name: purchase_order_items_poId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_order_items_poId_idx" ON public.purchase_order_items USING btree ("poId");


--
-- Name: purchase_orders_approvalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_approvalStatus_idx" ON public.purchase_orders USING btree ("approvalStatus");


--
-- Name: purchase_orders_poDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_poDate_idx" ON public.purchase_orders USING btree ("poDate");


--
-- Name: purchase_orders_poNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_poNumber_idx" ON public.purchase_orders USING btree ("poNumber");


--
-- Name: purchase_orders_poNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON public.purchase_orders USING btree ("poNumber");


--
-- Name: purchase_orders_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_projectId_idx" ON public.purchase_orders USING btree ("projectId");


--
-- Name: purchase_orders_requestedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_requestedBy_idx" ON public.purchase_orders USING btree ("requestedBy");


--
-- Name: purchase_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_orders_status_idx ON public.purchase_orders USING btree (status);


--
-- Name: purchase_orders_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "purchase_orders_vendorId_idx" ON public.purchase_orders USING btree ("vendorId");


--
-- Name: quotation_counters_year_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotation_counters_year_month_idx ON public.quotation_counters USING btree (year, month);


--
-- Name: quotation_counters_year_month_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX quotation_counters_year_month_key ON public.quotation_counters USING btree (year, month);


--
-- Name: quotations_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_clientId_idx" ON public.quotations USING btree ("clientId");


--
-- Name: quotations_clientId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_clientId_status_idx" ON public.quotations USING btree ("clientId", status);


--
-- Name: quotations_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_createdAt_idx" ON public.quotations USING btree ("createdAt");


--
-- Name: quotations_createdAt_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_createdAt_status_idx" ON public.quotations USING btree ("createdAt", status);


--
-- Name: quotations_createdBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_createdBy_idx" ON public.quotations USING btree ("createdBy");


--
-- Name: quotations_createdBy_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_createdBy_status_idx" ON public.quotations USING btree ("createdBy", status);


--
-- Name: quotations_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_projectId_idx" ON public.quotations USING btree ("projectId");


--
-- Name: quotations_projectId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_projectId_status_idx" ON public.quotations USING btree ("projectId", status);


--
-- Name: quotations_quotationNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_quotationNumber_idx" ON public.quotations USING btree ("quotationNumber");


--
-- Name: quotations_quotationNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "quotations_quotationNumber_key" ON public.quotations USING btree ("quotationNumber");


--
-- Name: quotations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotations_status_idx ON public.quotations USING btree (status);


--
-- Name: quotations_status_validUntil_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_status_validUntil_idx" ON public.quotations USING btree (status, "validUntil");


--
-- Name: quotations_validUntil_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quotations_validUntil_idx" ON public.quotations USING btree ("validUntil");


--
-- Name: report_sections_reportId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_sections_reportId_order_idx" ON public.report_sections USING btree ("reportId", "order");


--
-- Name: social_media_reports_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "social_media_reports_projectId_idx" ON public.social_media_reports USING btree ("projectId");


--
-- Name: social_media_reports_projectId_year_month_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "social_media_reports_projectId_year_month_key" ON public.social_media_reports USING btree ("projectId", year, month);


--
-- Name: social_media_reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX social_media_reports_status_idx ON public.social_media_reports USING btree (status);


--
-- Name: social_media_reports_year_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX social_media_reports_year_month_idx ON public.social_media_reports USING btree (year, month);


--
-- Name: user_preferences_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_preferences_userId_key" ON public.user_preferences USING btree ("userId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: ux_metrics_componentName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ux_metrics_componentName_idx" ON public.ux_metrics USING btree ("componentName");


--
-- Name: ux_metrics_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ux_metrics_createdAt_idx" ON public.ux_metrics USING btree ("createdAt");


--
-- Name: ux_metrics_eventType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ux_metrics_eventType_idx" ON public.ux_metrics USING btree ("eventType");


--
-- Name: ux_metrics_metricName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ux_metrics_metricName_idx" ON public.ux_metrics USING btree ("metricName");


--
-- Name: ux_metrics_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ux_metrics_userId_idx" ON public.ux_metrics USING btree ("userId");


--
-- Name: vendor_invoice_items_poItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoice_items_poItemId_idx" ON public.vendor_invoice_items USING btree ("poItemId");


--
-- Name: vendor_invoice_items_viId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoice_items_viId_idx" ON public.vendor_invoice_items USING btree ("viId");


--
-- Name: vendor_invoices_accountsPayableId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "vendor_invoices_accountsPayableId_key" ON public.vendor_invoices USING btree ("accountsPayableId");


--
-- Name: vendor_invoices_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoices_dueDate_idx" ON public.vendor_invoices USING btree ("dueDate");


--
-- Name: vendor_invoices_eFakturNSFP_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoices_eFakturNSFP_idx" ON public.vendor_invoices USING btree ("eFakturNSFP");


--
-- Name: vendor_invoices_eFakturNSFP_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "vendor_invoices_eFakturNSFP_key" ON public.vendor_invoices USING btree ("eFakturNSFP");


--
-- Name: vendor_invoices_grId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoices_grId_idx" ON public.vendor_invoices USING btree ("grId");


--
-- Name: vendor_invoices_internalNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoices_internalNumber_idx" ON public.vendor_invoices USING btree ("internalNumber");


--
-- Name: vendor_invoices_internalNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "vendor_invoices_internalNumber_key" ON public.vendor_invoices USING btree ("internalNumber");


--
-- Name: vendor_invoices_invoiceDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoices_invoiceDate_idx" ON public.vendor_invoices USING btree ("invoiceDate");


--
-- Name: vendor_invoices_matchingStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoices_matchingStatus_idx" ON public.vendor_invoices USING btree ("matchingStatus");


--
-- Name: vendor_invoices_poId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoices_poId_idx" ON public.vendor_invoices USING btree ("poId");


--
-- Name: vendor_invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_invoices_status_idx ON public.vendor_invoices USING btree (status);


--
-- Name: vendor_invoices_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_invoices_vendorId_idx" ON public.vendor_invoices USING btree ("vendorId");


--
-- Name: vendor_payment_allocations_apId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_payment_allocations_apId_idx" ON public.vendor_payment_allocations USING btree ("apId");


--
-- Name: vendor_payment_allocations_paymentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_payment_allocations_paymentId_idx" ON public.vendor_payment_allocations USING btree ("paymentId");


--
-- Name: vendor_payments_paymentDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_payments_paymentDate_idx" ON public.vendor_payments USING btree ("paymentDate");


--
-- Name: vendor_payments_paymentNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_payments_paymentNumber_idx" ON public.vendor_payments USING btree ("paymentNumber");


--
-- Name: vendor_payments_paymentNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "vendor_payments_paymentNumber_key" ON public.vendor_payments USING btree ("paymentNumber");


--
-- Name: vendor_payments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_payments_status_idx ON public.vendor_payments USING btree (status);


--
-- Name: vendor_payments_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_payments_vendorId_idx" ON public.vendor_payments USING btree ("vendorId");


--
-- Name: vendors_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendors_isActive_idx" ON public.vendors USING btree ("isActive");


--
-- Name: vendors_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendors_name_idx ON public.vendors USING btree (name);


--
-- Name: vendors_npwp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendors_npwp_idx ON public.vendors USING btree (npwp);


--
-- Name: vendors_npwp_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendors_npwp_key ON public.vendors USING btree (npwp);


--
-- Name: vendors_vendorCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendors_vendorCode_idx" ON public.vendors USING btree ("vendorCode");


--
-- Name: vendors_vendorCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "vendors_vendorCode_key" ON public.vendors USING btree ("vendorCode");


--
-- Name: vendors_vendorType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendors_vendorType_idx" ON public.vendors USING btree ("vendorType");


--
-- Name: work_in_progress_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "work_in_progress_fiscalPeriodId_idx" ON public.work_in_progress USING btree ("fiscalPeriodId");


--
-- Name: work_in_progress_isCompleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "work_in_progress_isCompleted_idx" ON public.work_in_progress USING btree ("isCompleted");


--
-- Name: work_in_progress_periodDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "work_in_progress_periodDate_idx" ON public.work_in_progress USING btree ("periodDate");


--
-- Name: work_in_progress_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "work_in_progress_projectId_idx" ON public.work_in_progress USING btree ("projectId");


--
-- Name: work_in_progress_projectId_periodDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "work_in_progress_projectId_periodDate_key" ON public.work_in_progress USING btree ("projectId", "periodDate");


--
-- Name: chart_of_accounts trg_auto_create_expense_category; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_create_expense_category AFTER INSERT ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.auto_create_expense_category();


--
-- Name: chart_of_accounts trg_auto_update_expense_category; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_update_expense_category AFTER UPDATE ON public.chart_of_accounts FOR EACH ROW WHEN (((old.code IS DISTINCT FROM new.code) OR (old.name IS DISTINCT FROM new.name))) EXECUTE FUNCTION public.auto_create_expense_category();


--
-- Name: account_balances account_balances_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_balances
    ADD CONSTRAINT "account_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: account_balances account_balances_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_balances
    ADD CONSTRAINT "account_balances_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accounts_payable accounts_payable_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT "accounts_payable_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accounts_payable accounts_payable_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT "accounts_payable_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: allowance_for_doubtful_accounts allowance_for_doubtful_accounts_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowance_for_doubtful_accounts
    ADD CONSTRAINT "allowance_for_doubtful_accounts_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: allowance_for_doubtful_accounts allowance_for_doubtful_accounts_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowance_for_doubtful_accounts
    ADD CONSTRAINT "allowance_for_doubtful_accounts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: allowance_for_doubtful_accounts allowance_for_doubtful_accounts_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowance_for_doubtful_accounts
    ADD CONSTRAINT "allowance_for_doubtful_accounts_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_kit_items asset_kit_items_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_kit_items
    ADD CONSTRAINT "asset_kit_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_kit_items asset_kit_items_kitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_kit_items
    ADD CONSTRAINT "asset_kit_items_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES public.asset_kits(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_reservations asset_reservations_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_reservations
    ADD CONSTRAINT "asset_reservations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_reservations asset_reservations_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_reservations
    ADD CONSTRAINT "asset_reservations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_reservations asset_reservations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_reservations
    ADD CONSTRAINT "asset_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_goodsReceiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_vendorInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_vendorInvoiceId_fkey" FOREIGN KEY ("vendorInvoiceId") REFERENCES public.vendor_invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_reconciliation_items bank_reconciliation_items_reconciliationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliation_items
    ADD CONSTRAINT "bank_reconciliation_items_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES public.bank_reconciliations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bank_reconciliations bank_reconciliations_bankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliations
    ADD CONSTRAINT "bank_reconciliations_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_transfers bank_transfers_fromAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transfers
    ADD CONSTRAINT "bank_transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_transfers bank_transfers_toAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transfers
    ADD CONSTRAINT "bank_transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_journey_event_metadata business_journey_event_metadata_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_event_metadata
    ADD CONSTRAINT "business_journey_event_metadata_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.business_journey_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_journey_events business_journey_events_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_journey_events business_journey_events_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_journey_events business_journey_events_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_journey_events business_journey_events_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_journey_events business_journey_events_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_journey_events business_journey_events_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cash_transactions cash_transactions_cashAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT "cash_transactions_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_transactions cash_transactions_offsetAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT "cash_transactions_offsetAccountId_fkey" FOREIGN KEY ("offsetAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chart_of_accounts chart_of_accounts_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: content_calendar_items content_calendar_items_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT "content_calendar_items_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: content_calendar_items content_calendar_items_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT "content_calendar_items_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: content_calendar_items content_calendar_items_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT "content_calendar_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: content_media content_media_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_media
    ADD CONSTRAINT "content_media_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public.content_calendar_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: deferred_revenue deferred_revenue_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deferred_revenue
    ADD CONSTRAINT "deferred_revenue_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: deferred_revenue deferred_revenue_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deferred_revenue
    ADD CONSTRAINT "deferred_revenue_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: depreciation_entries depreciation_entries_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT "depreciation_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: depreciation_entries depreciation_entries_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT "depreciation_entries_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: depreciation_entries depreciation_entries_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT "depreciation_entries_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: depreciation_entries depreciation_entries_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT "depreciation_entries_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public.depreciation_schedules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: depreciation_schedules depreciation_schedules_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT "depreciation_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_approval_history expense_approval_history_actionBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_approval_history
    ADD CONSTRAINT "expense_approval_history_actionBy_fkey" FOREIGN KEY ("actionBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_approval_history expense_approval_history_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_approval_history
    ADD CONSTRAINT "expense_approval_history_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_budgets expense_budgets_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_budgets
    ADD CONSTRAINT "expense_budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_budgets expense_budgets_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_budgets
    ADD CONSTRAINT "expense_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_budgets expense_budgets_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_budgets
    ADD CONSTRAINT "expense_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_categories expense_categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT "expense_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_comments expense_comments_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_comments
    ADD CONSTRAINT "expense_comments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_comments expense_comments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_comments
    ADD CONSTRAINT "expense_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_documents expense_documents_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_documents
    ADD CONSTRAINT "expense_documents_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_vendorInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_vendorInvoiceId_fkey" FOREIGN KEY ("vendorInvoiceId") REFERENCES public.vendor_invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: feature_flag_events feature_flag_events_flagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag_events
    ADD CONSTRAINT "feature_flag_events_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES public.feature_flags(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: general_ledger general_ledger_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT "general_ledger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: general_ledger general_ledger_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT "general_ledger_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_items goods_receipt_items_grId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT "goods_receipt_items_grId_fkey" FOREIGN KEY ("grId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: goods_receipt_items goods_receipt_items_poItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT "goods_receipt_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES public.purchase_order_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_poId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT "goods_receipts_poId_fkey" FOREIGN KEY ("poId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT "goods_receipts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_markedPaidBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_markedPaidBy_fkey" FOREIGN KEY ("markedPaidBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_paymentMilestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_paymentMilestoneId_fkey" FOREIGN KEY ("paymentMilestoneId") REFERENCES public.payment_milestones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_projectMilestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES public.project_milestones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_reversedEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_reversedEntryId_fkey" FOREIGN KEY ("reversedEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_line_items journal_line_items_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_line_items
    ADD CONSTRAINT "journal_line_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_line_items journal_line_items_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_line_items
    ADD CONSTRAINT "journal_line_items_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: labor_entries labor_entries_costAllocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_costAllocationId_fkey" FOREIGN KEY ("costAllocationId") REFERENCES public.project_cost_allocations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: labor_entries labor_entries_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: labor_entries labor_entries_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: labor_entries labor_entries_teamMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES public.project_team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: labor_entries labor_entries_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: maintenance_records maintenance_records_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: maintenance_schedules maintenance_schedules_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT "maintenance_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_milestones payment_milestones_projectMilestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_milestones
    ADD CONSTRAINT "payment_milestones_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES public.project_milestones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_milestones payment_milestones_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_milestones
    ADD CONSTRAINT "payment_milestones_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_cost_allocations project_cost_allocations_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_cost_allocations
    ADD CONSTRAINT "project_cost_allocations_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_cost_allocations project_cost_allocations_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_cost_allocations
    ADD CONSTRAINT "project_cost_allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_equipment_usage project_equipment_usage_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_equipment_usage
    ADD CONSTRAINT "project_equipment_usage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_equipment_usage project_equipment_usage_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_equipment_usage
    ADD CONSTRAINT "project_equipment_usage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_milestones project_milestones_predecessorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES public.project_milestones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_milestones project_milestones_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_team_members project_team_members_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT "project_team_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_team_members project_team_members_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT "project_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects projects_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: projects projects_projectTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "projects_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES public.project_type_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_order_items purchase_order_items_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT "purchase_order_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_order_items purchase_order_items_expenseCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT "purchase_order_items_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_order_items purchase_order_items_poId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT "purchase_order_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotations quotations_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: quotations quotations_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotations quotations_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotations quotations_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotations quotations_rejectedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: report_sections report_sections_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sections
    ADD CONSTRAINT "report_sections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public.social_media_reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: social_media_reports social_media_reports_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_reports
    ADD CONSTRAINT "social_media_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vendor_invoice_items vendor_invoice_items_poItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT "vendor_invoice_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES public.purchase_order_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_invoice_items vendor_invoice_items_viId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT "vendor_invoice_items_viId_fkey" FOREIGN KEY ("viId") REFERENCES public.vendor_invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_invoices vendor_invoices_accountsPayableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT "vendor_invoices_accountsPayableId_fkey" FOREIGN KEY ("accountsPayableId") REFERENCES public.accounts_payable(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_invoices vendor_invoices_grId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT "vendor_invoices_grId_fkey" FOREIGN KEY ("grId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_invoices vendor_invoices_poId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT "vendor_invoices_poId_fkey" FOREIGN KEY ("poId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_invoices vendor_invoices_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT "vendor_invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vendor_payment_allocations vendor_payment_allocations_apId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payment_allocations
    ADD CONSTRAINT "vendor_payment_allocations_apId_fkey" FOREIGN KEY ("apId") REFERENCES public.accounts_payable(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vendor_payment_allocations vendor_payment_allocations_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payment_allocations
    ADD CONSTRAINT "vendor_payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.vendor_payments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_payments vendor_payments_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT "vendor_payments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: work_in_progress work_in_progress_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_in_progress
    ADD CONSTRAINT "work_in_progress_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: work_in_progress work_in_progress_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_in_progress
    ADD CONSTRAINT "work_in_progress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FYB29cRzdNcKWqAZBBwHPtAbDYIHtCJ7a2wyYUbc6oVrcAgX311m4BBSJ1GEVbu

