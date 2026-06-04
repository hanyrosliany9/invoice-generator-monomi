-- Add REJECTED value to POStatus enum
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block
ALTER TYPE "POStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
