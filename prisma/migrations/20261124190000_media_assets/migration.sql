-- Centralized metadata for object-stored media. Existing Attachment rows are
-- intentionally retained as legacy references; no image payload is migrated.
CREATE TYPE "MediaVisibility" AS ENUM ('PRIVATE', 'PUBLISHED');

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "storageProvider" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "altText" TEXT,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "thumbnailKey" TEXT,
  "focalX" DOUBLE PRECISION,
  "focalY" DOUBLE PRECISION,
  "category" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "visibility" "MediaVisibility" NOT NULL DEFAULT 'PRIVATE',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaReference" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_campaignId_updatedAt_idx" ON "MediaAsset"("campaignId", "updatedAt");
CREATE INDEX "MediaAsset_campaignId_visibility_updatedAt_idx" ON "MediaAsset"("campaignId", "visibility", "updatedAt");
CREATE INDEX "MediaAsset_campaignId_category_updatedAt_idx" ON "MediaAsset"("campaignId", "category", "updatedAt");
CREATE UNIQUE INDEX "MediaReference_assetId_fileId_purpose_position_key" ON "MediaReference"("assetId", "fileId", "purpose", "position");
CREATE INDEX "MediaReference_fileId_purpose_position_idx" ON "MediaReference"("fileId", "purpose", "position");

ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MediaReference" ADD CONSTRAINT "MediaReference_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaReference" ADD CONSTRAINT "MediaReference_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
