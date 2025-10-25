-- Create PaymentType enum
CREATE TYPE "PaymentType" AS ENUM ('FULL_PAYMENT', 'MILESTONE_BASED');

-- Add paymentType column to quotations
ALTER TABLE "quotations"
ADD COLUMN "paymentType" "PaymentType" NOT NULL DEFAULT 'FULL_PAYMENT';
