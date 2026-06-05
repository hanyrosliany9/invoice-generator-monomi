-- Backfill expense_categories for EXPENSE COA rows (5-/6-) that predate the
-- auto_create_expense_category trigger.  Logic mirrors the trigger exactly:
--   • code      = UPPER(REPLACE(coa.code, '-', '_'))
--   • accountCode = coa.code
--   • expenseClass mapping:
--       5-xxxx           → COGS
--       6-1xxx           → SELLING
--       6-2010 (exact)   → LABOR_COST
--       6-2xxx (other)   → GENERAL_ADMIN
--       everything else  → OTHER
--   • name / nameId / isActive copied from coa row
--   • Defaults (defaultPPNRate, color, booleans) come from column defaults
-- ON CONFLICT (code) DO NOTHING makes this fully idempotent.

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
SELECT
    gen_random_uuid()::text,
    UPPER(REPLACE(coa.code, '-', '_')),
    coa.code,
    CASE
        WHEN coa.code LIKE '5-%'   THEN 'COGS'::"ExpenseClass"
        WHEN coa.code LIKE '6-1%'  THEN 'SELLING'::"ExpenseClass"
        WHEN coa.code = '6-2010'   THEN 'LABOR_COST'::"ExpenseClass"
        WHEN coa.code LIKE '6-2%'  THEN 'GENERAL_ADMIN'::"ExpenseClass"
        ELSE                            'OTHER'::"ExpenseClass"
    END,
    coa.name,
    coa."nameId",
    coa."isActive",
    NOW(),
    NOW()
FROM chart_of_accounts coa
LEFT JOIN expense_categories ec ON ec."accountCode" = coa.code
WHERE coa."accountType" = 'EXPENSE'
  AND (coa.code LIKE '5-%' OR coa.code LIKE '6-%')
  AND ec.id IS NULL
ON CONFLICT (code) DO NOTHING;
