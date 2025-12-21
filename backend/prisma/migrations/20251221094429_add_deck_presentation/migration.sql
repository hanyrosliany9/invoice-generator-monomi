-- CreateEnum
CREATE TYPE "SlideTemplate" AS ENUM ('TITLE', 'TITLE_CONTENT', 'TWO_COLUMN', 'FULL_MEDIA', 'MOOD_BOARD', 'CHARACTER', 'SHOT_LIST', 'SCHEDULE', 'COMPARISON', 'BLANK');

-- CreateEnum
CREATE TYPE "DeckStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "decks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "DeckStatus" NOT NULL DEFAULT 'DRAFT',
    "theme" JSONB,
    "createdById" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "mediaProjectId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicShareToken" TEXT,
    "publicShareUrl" TEXT,
    "publicViewCount" INTEGER NOT NULL DEFAULT 0,
    "publicSharedAt" TIMESTAMP(3),
    "publicAccessLevel" "PublicAccessLevel" NOT NULL DEFAULT 'VIEW_ONLY',
    "slideWidth" INTEGER NOT NULL DEFAULT 1920,
    "slideHeight" INTEGER NOT NULL DEFAULT 1080,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_slides" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "template" "SlideTemplate" NOT NULL DEFAULT 'BLANK',
    "title" TEXT,
    "subtitle" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "backgroundColor" TEXT DEFAULT '#FFFFFF',
    "backgroundImage" TEXT,
    "backgroundImageKey" TEXT,
    "notes" TEXT,
    "transition" TEXT DEFAULT 'fade',
    "transitionDuration" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_slide_elements" (
    "id" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL DEFAULT '{}',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_slide_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_slide_comments" (
    "id" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "content" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "parentId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_slide_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_collaborators" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "userId" TEXT,
    "guestEmail" TEXT,
    "guestName" TEXT,
    "role" "CollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "inviteToken" TEXT,
    "invitedBy" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decks_publicShareToken_key" ON "decks"("publicShareToken");

-- CreateIndex
CREATE INDEX "decks_createdById_idx" ON "decks"("createdById");

-- CreateIndex
CREATE INDEX "decks_clientId_idx" ON "decks"("clientId");

-- CreateIndex
CREATE INDEX "decks_projectId_idx" ON "decks"("projectId");

-- CreateIndex
CREATE INDEX "decks_mediaProjectId_idx" ON "decks"("mediaProjectId");

-- CreateIndex
CREATE INDEX "decks_publicShareToken_idx" ON "decks"("publicShareToken");

-- CreateIndex
CREATE INDEX "decks_status_idx" ON "decks"("status");

-- CreateIndex
CREATE INDEX "deck_slides_deckId_idx" ON "deck_slides"("deckId");

-- CreateIndex
CREATE INDEX "deck_slides_deckId_order_idx" ON "deck_slides"("deckId", "order");

-- CreateIndex
CREATE INDEX "deck_slide_elements_slideId_idx" ON "deck_slide_elements"("slideId");

-- CreateIndex
CREATE INDEX "deck_slide_elements_slideId_zIndex_idx" ON "deck_slide_elements"("slideId", "zIndex");

-- CreateIndex
CREATE INDEX "deck_slide_comments_slideId_idx" ON "deck_slide_comments"("slideId");

-- CreateIndex
CREATE INDEX "deck_slide_comments_parentId_idx" ON "deck_slide_comments"("parentId");

-- CreateIndex
CREATE INDEX "deck_slide_comments_userId_idx" ON "deck_slide_comments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "deck_collaborators_inviteToken_key" ON "deck_collaborators"("inviteToken");

-- CreateIndex
CREATE INDEX "deck_collaborators_deckId_idx" ON "deck_collaborators"("deckId");

-- CreateIndex
CREATE INDEX "deck_collaborators_userId_idx" ON "deck_collaborators"("userId");

-- CreateIndex
CREATE INDEX "deck_collaborators_inviteToken_idx" ON "deck_collaborators"("inviteToken");

-- CreateIndex
CREATE INDEX "deck_collaborators_status_idx" ON "deck_collaborators"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deck_collaborators_deckId_userId_key" ON "deck_collaborators"("deckId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "deck_collaborators_deckId_guestEmail_key" ON "deck_collaborators"("deckId", "guestEmail");

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_mediaProjectId_fkey" FOREIGN KEY ("mediaProjectId") REFERENCES "media_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_slides" ADD CONSTRAINT "deck_slides_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_slide_elements" ADD CONSTRAINT "deck_slide_elements_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "deck_slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_slide_comments" ADD CONSTRAINT "deck_slide_comments_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "deck_slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_slide_comments" ADD CONSTRAINT "deck_slide_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_slide_comments" ADD CONSTRAINT "deck_slide_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "deck_slide_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_collaborators" ADD CONSTRAINT "deck_collaborators_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_collaborators" ADD CONSTRAINT "deck_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_collaborators" ADD CONSTRAINT "deck_collaborators_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
