-- CreateFunction: Auto-create expense categories from chart of accounts
CREATE OR REPLACE FUNCTION auto_create_expense_category()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- CreateTrigger: Auto-create expense category on INSERT
CREATE TRIGGER trg_auto_create_expense_category
  AFTER INSERT ON chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_expense_category();

-- CreateTrigger: Auto-update expense category on UPDATE
CREATE TRIGGER trg_auto_update_expense_category
  AFTER UPDATE ON chart_of_accounts
  FOR EACH ROW
  WHEN (OLD.code IS DISTINCT FROM NEW.code OR OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION auto_create_expense_category();

-- Comment
COMMENT ON FUNCTION auto_create_expense_category() IS 'Automatically creates or updates expense_categories when new expense accounts (5-xxxx or 6-xxxx) are added to chart_of_accounts';
