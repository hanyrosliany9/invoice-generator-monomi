-- CreateTable
CREATE TABLE "client_portal_login_failures" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_login_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_portal_login_failures_email_createdAt_idx" ON "client_portal_login_failures"("email", "createdAt");

-- CreateIndex
CREATE INDEX "client_portal_login_failures_createdAt_idx" ON "client_portal_login_failures"("createdAt");

