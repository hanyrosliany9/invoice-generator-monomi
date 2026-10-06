-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "WhatsAppOrigin" AS ENUM ('CUSTOMER', 'MONOMI', 'PHONE_APP', 'HISTORY');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('RECEIVED', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppConversationStatus" AS ENUM ('OPEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- AlterTable
ALTER TABLE "crm_campaigns" ADD COLUMN     "metaAdIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "crm_settings" ADD COLUMN     "whatsappQuickReplies" JSONB;

-- AlterTable
ALTER TABLE "meta_event_outbox" ADD COLUMN     "nextTryAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "phone" TEXT,
    "profileName" TEXT,
    "phoneBookName" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "lastInboundAt" TIMESTAMP(3),
    "freeEntryUntil" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastReadReceiptFor" TEXT,
    "assignedToId" TEXT,
    "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "waMessageId" TEXT,
    "conversationId" TEXT NOT NULL,
    "direction" "WhatsAppDirection" NOT NULL,
    "origin" "WhatsAppOrigin" NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "mediaId" TEXT,
    "mediaMime" TEXT,
    "mediaCaption" TEXT,
    "mediaFilename" TEXT,
    "templateName" TEXT,
    "contextWaMessageId" TEXT,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorCode" TEXT,
    "errorTitle" TEXT,
    "sentById" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "referral" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_webhook_events" (
    "id" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "fields" TEXT,
    "payload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "whatsapp_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connection" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "wabaId" TEXT,
    "phoneNumberId" TEXT,
    "displayPhoneNumber" TEXT,
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accessTokenEnc" TEXT,
    "tokenKeyId" TEXT,
    "connectedAt" TIMESTAMP(3),
    "connectedById" TEXT,
    "disconnectedAt" TIMESTAMP(3),
    "disconnectReason" TEXT,
    "lastWebhookAt" TIMESTAMP(3),
    "historySyncRequestedAt" TIMESTAMP(3),
    "contactsSyncRequestedAt" TIMESTAMP(3),
    "historyPhase" INTEGER,
    "historyProgress" INTEGER,
    "historyError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_waId_key" ON "whatsapp_contacts"("waId");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_leadId_idx" ON "whatsapp_contacts"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_contactId_key" ON "whatsapp_conversations"("contactId");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_lastMessageAt_idx" ON "whatsapp_conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_assignedToId_idx" ON "whatsapp_conversations"("assignedToId");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_status_lastMessageAt_idx" ON "whatsapp_conversations"("status", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_waMessageId_key" ON "whatsapp_messages"("waMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_conversationId_timestamp_idx" ON "whatsapp_messages"("conversationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_webhook_events_payloadHash_key" ON "whatsapp_webhook_events"("payloadHash");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_events_processedAt_nextAttemptAt_idx" ON "whatsapp_webhook_events"("processedAt", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_events_receivedAt_idx" ON "whatsapp_webhook_events"("receivedAt");

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
