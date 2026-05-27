-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'UNLINKED', 'ACTIVE');

-- CreateEnum
CREATE TYPE "CoupleStatus" AS ENUM ('ACTIVE', 'UNLINK_REQUESTED', 'DISSOLVED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MoodEmoji" AS ENUM ('HAPPY', 'LOVED', 'CALM', 'TIRED', 'SAD', 'EXCITED', 'GRATEFUL', 'MISSING_YOU');

-- CreateEnum
CREATE TYPE "BucketStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlannerEventStatus" AS ENUM ('UPCOMING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MEMORY', 'NEW_MESSAGE', 'MISS_YOU', 'UPCOMING_DATE', 'ANNIVERSARY', 'BIRTHDAY', 'BUCKET_COMPLETED', 'INVITE_ACCEPTED', 'UNLINK_REQUESTED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AiTask" AS ENUM ('MONTHLY_RECAP', 'CAPTION_SUGGEST', 'DATE_IDEAS', 'MEMORY_SUMMARY', 'RELATIONSHIP_PROMPT');

-- CreateEnum
CREATE TYPE "FcmPlatform" AS ENUM ('WEB', 'ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "MessageAttachmentType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "UnlinkRequester" AS ENUM ('USER1', 'USER2');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarPublicId" TEXT,
    "bio" TEXT,
    "birthday" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "coupleId" TEXT,
    "googleId" TEXT,
    "aiConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "aiConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Couple" (
    "id" TEXT NOT NULL,
    "status" "CoupleStatus" NOT NULL DEFAULT 'ACTIVE',
    "relationshipStart" TIMESTAMP(3) NOT NULL,
    "usedStorageBytes" BIGINT NOT NULL DEFAULT 0,
    "maxStorageBytes" BIGINT NOT NULL DEFAULT 10737418240,
    "unlinkRequestedBy" "UnlinkRequester",
    "unlinkRequestedAt" TIMESTAMP(3),
    "dissolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Couple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "coupleId" TEXT,
    "inviterId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FcmToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "FcmPlatform" NOT NULL DEFAULT 'WEB',
    "deviceInfo" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "preset" TEXT NOT NULL DEFAULT 'cream-mint',
    "bg" TEXT NOT NULL DEFAULT '#F8F4EC',
    "surface" TEXT NOT NULL DEFAULT '#FFFFFF',
    "primary" TEXT NOT NULL DEFAULT '#A8D5BA',
    "primaryDim" TEXT NOT NULL DEFAULT '#8EC4A6',
    "secondary" TEXT NOT NULL DEFAULT '#5C7A6B',
    "text" TEXT NOT NULL DEFAULT '#2B2B2B',
    "muted" TEXT NOT NULL DEFAULT '#8C8C8C',
    "border" TEXT NOT NULL DEFAULT '#E5E0D8',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mood" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mood" "MoodEmoji" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "albumId" TEXT,
    "caption" TEXT,
    "location" TEXT,
    "city" TEXT,
    "country" TEXT,
    "mood" "MoodEmoji",
    "tags" TEXT[],
    "memoryDate" TIMESTAMP(3) NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryMedia" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "bytes" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverPublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "story" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "mediaPublicId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerEvent" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "budget" DECIMAL(10,2),
    "status" "PlannerEventStatus" NOT NULL DEFAULT 'UPCOMING',
    "reminderAt" TIMESTAMP(3),
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BucketItem" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "BucketStatus" NOT NULL DEFAULT 'PENDING',
    "deadline" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "mediaPublicId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BucketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "replyToId" TEXT,
    "pinnedMemoryId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "deletedForAll" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "mediaType" "MessageAttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Countdown" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetAt" TIMESTAMP(3) NOT NULL,
    "emoji" TEXT,
    "repeat" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Countdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiOutput" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "task" "AiTask" NOT NULL,
    "input" JSONB NOT NULL,
    "output" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_coupleId_idx" ON "User"("coupleId");

-- CreateIndex
CREATE INDEX "Couple_status_idx" ON "Couple"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_token_key" ON "InviteLink"("token");

-- CreateIndex
CREATE INDEX "InviteLink_token_idx" ON "InviteLink"("token");

-- CreateIndex
CREATE INDEX "InviteLink_inviterId_idx" ON "InviteLink"("inviterId");

-- CreateIndex
CREATE INDEX "Otp_userId_idx" ON "Otp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_token_key" ON "FcmToken"("token");

-- CreateIndex
CREATE INDEX "FcmToken_userId_idx" ON "FcmToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_coupleId_key" ON "Theme"("coupleId");

-- CreateIndex
CREATE INDEX "Mood_userId_idx" ON "Mood"("userId");

-- CreateIndex
CREATE INDEX "Memory_coupleId_idx" ON "Memory"("coupleId");

-- CreateIndex
CREATE INDEX "Memory_authorId_idx" ON "Memory"("authorId");

-- CreateIndex
CREATE INDEX "Memory_albumId_idx" ON "Memory"("albumId");

-- CreateIndex
CREATE INDEX "Memory_memoryDate_idx" ON "Memory"("memoryDate");

-- CreateIndex
CREATE INDEX "Memory_coupleId_memoryDate_idx" ON "Memory"("coupleId", "memoryDate");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryMedia_publicId_key" ON "MemoryMedia"("publicId");

-- CreateIndex
CREATE INDEX "MemoryMedia_memoryId_idx" ON "MemoryMedia"("memoryId");

-- CreateIndex
CREATE INDEX "Album_coupleId_idx" ON "Album"("coupleId");

-- CreateIndex
CREATE INDEX "TimelineEvent_coupleId_idx" ON "TimelineEvent"("coupleId");

-- CreateIndex
CREATE INDEX "TimelineEvent_coupleId_eventDate_idx" ON "TimelineEvent"("coupleId", "eventDate");

-- CreateIndex
CREATE INDEX "PlannerEvent_coupleId_idx" ON "PlannerEvent"("coupleId");

-- CreateIndex
CREATE INDEX "PlannerEvent_coupleId_startsAt_idx" ON "PlannerEvent"("coupleId", "startsAt");

-- CreateIndex
CREATE INDEX "BucketItem_coupleId_idx" ON "BucketItem"("coupleId");

-- CreateIndex
CREATE INDEX "BucketItem_coupleId_status_idx" ON "BucketItem"("coupleId", "status");

-- CreateIndex
CREATE INDEX "Message_coupleId_idx" ON "Message"("coupleId");

-- CreateIndex
CREATE INDEX "Message_coupleId_createdAt_idx" ON "Message"("coupleId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageAttachment_publicId_key" ON "MessageAttachment"("publicId");

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "Countdown_coupleId_idx" ON "Countdown"("coupleId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_coupleId_idx" ON "Notification"("coupleId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiOutput_coupleId_task_idx" ON "AiOutput"("coupleId", "task");

-- CreateIndex
CREATE INDEX "AiOutput_coupleId_task_createdAt_idx" ON "AiOutput"("coupleId", "task", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mood" ADD CONSTRAINT "Mood_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryMedia" ADD CONSTRAINT "MemoryMedia_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerEvent" ADD CONSTRAINT "PlannerEvent_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerEvent" ADD CONSTRAINT "PlannerEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketItem" ADD CONSTRAINT "BucketItem_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketItem" ADD CONSTRAINT "BucketItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_pinnedMemoryId_fkey" FOREIGN KEY ("pinnedMemoryId") REFERENCES "Memory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Countdown" ADD CONSTRAINT "Countdown_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOutput" ADD CONSTRAINT "AiOutput_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOutput" ADD CONSTRAINT "AiOutput_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
