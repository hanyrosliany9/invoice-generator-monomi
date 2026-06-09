-- Add generic PURCHASE (Pembelian) transaction type, distinct from ASSET_PURCHASE.
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PURCHASE';
