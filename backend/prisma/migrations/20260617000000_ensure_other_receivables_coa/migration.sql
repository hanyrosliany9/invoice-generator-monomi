-- Ensure the system "Other Receivables" (1-2040 / Piutang Lain-lain) COA account
-- exists in every environment.
--
-- This account was previously created ONLY by prisma/seed.ts. Production runs on
-- real data (not the seed), so it never had 1-2040 — which made the Accounts
-- Receivable report 500 with "Other Receivables account (1-2040) not found"
-- (financial-statements.service.ts hard-requires it; the reimbursable/billable
-- expense model posts to it). Idempotent so it is safe on environments that
-- already have the row (e.g. seeded dev, or the prod hotfix).
INSERT INTO chart_of_accounts (
  id, code, name, "nameId", "accountType", "accountSubType", "normalBalance",
  "isSystemAccount", description, "descriptionId", "updatedAt"
) VALUES (
  'coa_other_receivables_1_2040', '1-2040', 'Other Receivables', 'Piutang Lain-Lain',
  'ASSET', 'CURRENT_ASSET', 'DEBIT', true,
  'Receivables from clients for reimbursable expenses',
  'Piutang dari klien atas penggantian biaya', now()
) ON CONFLICT (code) DO NOTHING;
