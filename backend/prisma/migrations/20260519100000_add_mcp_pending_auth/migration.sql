-- CreateTable
CREATE TABLE "mcp_pending_authorizations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL DEFAULT 'S256',
    "scope" TEXT,
    "state" TEXT,
    "resource" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_pending_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mcp_pending_authorizations_expiresAt_idx" ON "mcp_pending_authorizations"("expiresAt");

