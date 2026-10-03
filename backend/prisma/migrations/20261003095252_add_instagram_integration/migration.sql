-- CreateEnum
CREATE TYPE "InstagramConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateTable
CREATE TABLE "instagram_connections" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "igUserId" TEXT NOT NULL,
    "igScopedUserId" TEXT,
    "username" TEXT NOT NULL,
    "accountType" TEXT,
    "profilePictureUrl" TEXT,
    "followersCount" INTEGER,
    "mediaCount" INTEGER,
    "accessTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenRefreshedAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "status" "InstagramConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedBy" TEXT NOT NULL,
    "activeIgUserId" TEXT,
    "tokenKeyId" TEXT,
    "syncedHandle" TEXT,
    "syncedAvatarUrl" TEXT,
    "syncedBio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_daily_metrics" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "followersCount" INTEGER,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_media_snapshots" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "mediaType" TEXT,
    "mediaProductType" TEXT,
    "permalink" TEXT,
    "caption" TEXT,
    "timestamp" TIMESTAMP(3),
    "thumbnailUrl" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_media_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_oauth_states" (
    "id" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "initiatorType" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "initiatorEmail" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "returnTo" TEXT NOT NULL,
    "syncProfile" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_data_deletion_requests" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "instagram_data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instagram_connections_clientId_key" ON "instagram_connections"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_connections_activeIgUserId_key" ON "instagram_connections"("activeIgUserId");

-- CreateIndex
CREATE INDEX "instagram_connections_igUserId_idx" ON "instagram_connections"("igUserId");

-- CreateIndex
CREATE INDEX "instagram_connections_igScopedUserId_idx" ON "instagram_connections"("igScopedUserId");

-- CreateIndex
CREATE INDEX "instagram_connections_status_idx" ON "instagram_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_daily_metrics_connectionId_date_key" ON "instagram_daily_metrics"("connectionId", "date");

-- CreateIndex
CREATE INDEX "instagram_media_snapshots_connectionId_timestamp_idx" ON "instagram_media_snapshots"("connectionId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_media_snapshots_connectionId_mediaId_key" ON "instagram_media_snapshots"("connectionId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_oauth_states_nonceHash_key" ON "instagram_oauth_states"("nonceHash");

-- CreateIndex
CREATE INDEX "instagram_oauth_states_expiresAt_idx" ON "instagram_oauth_states"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_data_deletion_requests_confirmationCode_key" ON "instagram_data_deletion_requests"("confirmationCode");

-- AddForeignKey
ALTER TABLE "instagram_connections" ADD CONSTRAINT "instagram_connections_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_daily_metrics" ADD CONSTRAINT "instagram_daily_metrics_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "instagram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_media_snapshots" ADD CONSTRAINT "instagram_media_snapshots_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "instagram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

