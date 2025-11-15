-- Fix Client.phone to be nullable
ALTER TABLE "clients" ALTER COLUMN "phone" DROP NOT NULL;

-- Add Asset.residualValue field
ALTER TABLE "assets" ADD COLUMN "residualValue" DECIMAL(15,2);

-- Add default values for auto-generated fields
ALTER TABLE "content_calendar_items" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "cash_bank_balances" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
