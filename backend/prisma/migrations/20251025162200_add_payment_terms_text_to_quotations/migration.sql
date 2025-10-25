-- Add paymentTermsText column to quotations
ALTER TABLE "quotations"
ADD COLUMN IF NOT EXISTS "paymentTermsText" TEXT;
