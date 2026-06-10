-- Add SALE (Penjualan) to TransactionType for the direct-sales (New Sales) flow
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'SALE';
