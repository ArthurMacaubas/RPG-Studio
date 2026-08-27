-- Q09: briefing curado e timeline publicada explicitamente.
-- Migration aditiva: preserva eventos legados como privados até publicação OWNER.

ALTER TABLE "TimelineEvent"
  ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "TimelineEvent_campaignId_isPublished_idx"
  ON "TimelineEvent"("campaignId", "isPublished");

CREATE TABLE "CampaignBriefing" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignBriefing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignBriefing_campaignId_key"
  ON "CampaignBriefing"("campaignId");

CREATE INDEX "CampaignBriefing_campaignId_isPublished_idx"
  ON "CampaignBriefing"("campaignId", "isPublished");

ALTER TABLE "CampaignBriefing"
  ADD CONSTRAINT "CampaignBriefing_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
