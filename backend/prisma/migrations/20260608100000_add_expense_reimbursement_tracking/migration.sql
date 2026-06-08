-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "reimbursedAt" TIMESTAMP(3),
ADD COLUMN     "reimbursementJournalId" TEXT;
