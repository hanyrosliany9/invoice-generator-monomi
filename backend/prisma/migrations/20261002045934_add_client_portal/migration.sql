-- CreateTable
CREATE TABLE "client_portal_contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_portal_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_portal_login_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "requestIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_portal_contacts_email_idx" ON "client_portal_contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_contacts_clientId_email_key" ON "client_portal_contacts"("clientId", "email");

-- CreateIndex
CREATE INDEX "client_portal_login_codes_email_createdAt_idx" ON "client_portal_login_codes"("email", "createdAt");

-- AddForeignKey
ALTER TABLE "client_portal_contacts" ADD CONSTRAINT "client_portal_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_contacts" ADD CONSTRAINT "client_portal_contacts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

