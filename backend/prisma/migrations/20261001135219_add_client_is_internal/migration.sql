-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "clients_isInternal_idx" ON "clients"("isInternal");
