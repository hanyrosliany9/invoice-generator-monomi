-- AlterTable: Add unique constraint for paymentMilestoneId to prevent duplicate milestone invoices
-- This constraint ensures that only one invoice can be created per payment milestone
-- Critical for data integrity in milestone-based payment terms

-- Add unique constraint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paymentMilestoneId_key" UNIQUE ("paymentMilestoneId");
