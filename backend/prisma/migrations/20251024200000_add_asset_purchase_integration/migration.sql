-- AddColumn to assets table for Purchase-to-Pay Integration
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "goodsReceiptId" TEXT;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "vendorInvoiceId" TEXT;
