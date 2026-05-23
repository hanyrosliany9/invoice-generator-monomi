-- CreateTable
CREATE TABLE "mcp_oauth_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "clientName" TEXT,
    "redirectUris" TEXT[],
    "grantTypes" TEXT[],
    "responseTypes" TEXT[],
    "tokenEndpointAuthMethod" TEXT,
    "scope" TEXT,
    "clientUri" TEXT,
    "logoUri" TEXT,
    "clientIdIssuedAt" INTEGER NOT NULL,
    "clientSecretExpiresAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "mcp_oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_auth_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL DEFAULT 'S256',
    "redirectUri" TEXT NOT NULL,
    "scope" TEXT,
    "resource" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_auth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_access_tokens" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT,
    "resource" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "clientId" TEXT,
    "tokenId" TEXT,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "argsHash" TEXT,
    "resultSize" INTEGER,
    "durationMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_oauth_clients_clientId_key" ON "mcp_oauth_clients"("clientId");

-- CreateIndex
CREATE INDEX "mcp_oauth_clients_clientId_idx" ON "mcp_oauth_clients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_auth_codes_code_key" ON "mcp_auth_codes"("code");

-- CreateIndex
CREATE INDEX "mcp_auth_codes_code_idx" ON "mcp_auth_codes"("code");

-- CreateIndex
CREATE INDEX "mcp_auth_codes_userId_idx" ON "mcp_auth_codes"("userId");

-- CreateIndex
CREATE INDEX "mcp_auth_codes_expiresAt_idx" ON "mcp_auth_codes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_access_tokens_accessToken_key" ON "mcp_access_tokens"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_access_tokens_refreshToken_key" ON "mcp_access_tokens"("refreshToken");

-- CreateIndex
CREATE INDEX "mcp_access_tokens_accessToken_idx" ON "mcp_access_tokens"("accessToken");

-- CreateIndex
CREATE INDEX "mcp_access_tokens_refreshToken_idx" ON "mcp_access_tokens"("refreshToken");

-- CreateIndex
CREATE INDEX "mcp_access_tokens_userId_idx" ON "mcp_access_tokens"("userId");

-- CreateIndex
CREATE INDEX "mcp_access_tokens_expiresAt_idx" ON "mcp_access_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "mcp_audit_logs_userId_createdAt_idx" ON "mcp_audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "mcp_audit_logs_kind_name_createdAt_idx" ON "mcp_audit_logs"("kind", "name", "createdAt");

-- CreateIndex
CREATE INDEX "mcp_audit_logs_createdAt_idx" ON "mcp_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "mcp_auth_codes" ADD CONSTRAINT "mcp_auth_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "mcp_oauth_clients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_auth_codes" ADD CONSTRAINT "mcp_auth_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_access_tokens" ADD CONSTRAINT "mcp_access_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "mcp_oauth_clients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_access_tokens" ADD CONSTRAINT "mcp_access_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

