-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('ORDEM_PARANORMAL', 'DND_5E', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('CAMPAIGN', 'NPC', 'CHARACTER', 'PUZZLE', 'DOCUMENT', 'CLUE', 'OBJECT', 'EVENT', 'SESSION', 'MAP', 'IMAGE', 'AUDIO', 'VIDEO', 'NOTE', 'LOCATION');

-- CreateEnum
CREATE TYPE "RelationshipKind" AS ENUM ('GENERIC', 'LEADS_TO', 'BELONGS_TO', 'CONTAINS', 'BLOCKS', 'UNLOCKS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" "SystemType" NOT NULL DEFAULT 'CUSTOM',
    "coverImage" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAttribute" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortLabel" TEXT,
    "min" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 100,
    "defaultVal" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSkill" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkedAttr" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignClass" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CampaignClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRace" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CampaignRace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFile" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "FileType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "authorId" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileHistoryEntry" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7B5CFF',
    "icon" TEXT,
    "description" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileTag" (
    "fileId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "FileTag_pkey" PRIMARY KEY ("fileId","tagId")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" "RelationshipKind" NOT NULL DEFAULT 'GENERIC',
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteFolder" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCollapsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FavoriteFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteEntry" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FavoriteEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "summary" TEXT,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionFile" (
    "sessionId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "SessionFile_pkey" PRIMARY KEY ("sessionId","fileId")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "fileId" TEXT,
    "title" TEXT NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardNode" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BoardNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardEdge" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "label" TEXT,
    "color" TEXT NOT NULL DEFAULT '#E63946',
    "description" TEXT,

    CONSTRAINT "BoardEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerModeConfig" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shareSlug" TEXT,

    CONSTRAINT "PlayerModeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerVisibility" (
    "fileId" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlayerVisibility_pkey" PRIMARY KEY ("fileId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Campaign_ownerId_idx" ON "Campaign"("ownerId");

-- CreateIndex
CREATE INDEX "CampaignAttribute_campaignId_idx" ON "CampaignAttribute"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignSkill_campaignId_idx" ON "CampaignSkill"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignClass_campaignId_idx" ON "CampaignClass"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignRace_campaignId_idx" ON "CampaignRace"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignFile_campaignId_type_idx" ON "CampaignFile"("campaignId", "type");

-- CreateIndex
CREATE INDEX "CampaignFile_campaignId_isTrashed_idx" ON "CampaignFile"("campaignId", "isTrashed");

-- CreateIndex
CREATE INDEX "Attachment_fileId_idx" ON "Attachment"("fileId");

-- CreateIndex
CREATE INDEX "Comment_fileId_idx" ON "Comment"("fileId");

-- CreateIndex
CREATE INDEX "FileHistoryEntry_fileId_idx" ON "FileHistoryEntry"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_campaignId_name_key" ON "Tag"("campaignId", "name");

-- CreateIndex
CREATE INDEX "Relationship_fromId_idx" ON "Relationship"("fromId");

-- CreateIndex
CREATE INDEX "Relationship_toId_idx" ON "Relationship"("toId");

-- CreateIndex
CREATE INDEX "FavoriteFolder_campaignId_idx" ON "FavoriteFolder"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteEntry_folderId_fileId_key" ON "FavoriteEntry"("folderId", "fileId");

-- CreateIndex
CREATE INDEX "Session_campaignId_idx" ON "Session"("campaignId");

-- CreateIndex
CREATE INDEX "TimelineEvent_campaignId_idx" ON "TimelineEvent"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardNode_fileId_key" ON "BoardNode"("fileId");

-- CreateIndex
CREATE INDEX "BoardNode_campaignId_idx" ON "BoardNode"("campaignId");

-- CreateIndex
CREATE INDEX "BoardEdge_campaignId_idx" ON "BoardEdge"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerModeConfig_campaignId_key" ON "PlayerModeConfig"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerModeConfig_shareSlug_key" ON "PlayerModeConfig"("shareSlug");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAttribute" ADD CONSTRAINT "CampaignAttribute_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSkill" ADD CONSTRAINT "CampaignSkill_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignClass" ADD CONSTRAINT "CampaignClass_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRace" ADD CONSTRAINT "CampaignRace_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFile" ADD CONSTRAINT "CampaignFile_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileHistoryEntry" ADD CONSTRAINT "FileHistoryEntry_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileTag" ADD CONSTRAINT "FileTag_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileTag" ADD CONSTRAINT "FileTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_toId_fkey" FOREIGN KEY ("toId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteFolder" ADD CONSTRAINT "FavoriteFolder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteEntry" ADD CONSTRAINT "FavoriteEntry_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FavoriteFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteEntry" ADD CONSTRAINT "FavoriteEntry_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFile" ADD CONSTRAINT "SessionFile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFile" ADD CONSTRAINT "SessionFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardNode" ADD CONSTRAINT "BoardNode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardNode" ADD CONSTRAINT "BoardNode_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardEdge" ADD CONSTRAINT "BoardEdge_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardEdge" ADD CONSTRAINT "BoardEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "BoardNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardEdge" ADD CONSTRAINT "BoardEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "BoardNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerModeConfig" ADD CONSTRAINT "PlayerModeConfig_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerVisibility" ADD CONSTRAINT "PlayerVisibility_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

