-- Campaign-scoped themes keep drafts private and expose only published snapshots.
CREATE TABLE "CampaignTheme" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "draftConfig" JSONB NOT NULL,
    "publishedConfig" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignTheme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThemePreset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemePreset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Campaign" ADD COLUMN "activeThemeId" TEXT;

CREATE UNIQUE INDEX "Campaign_activeThemeId_key" ON "Campaign"("activeThemeId");
CREATE INDEX "CampaignTheme_campaignId_updatedAt_idx" ON "CampaignTheme"("campaignId", "updatedAt");
CREATE INDEX "CampaignTheme_createdById_idx" ON "CampaignTheme"("createdById");
CREATE UNIQUE INDEX "ThemePreset_ownerId_name_key" ON "ThemePreset"("ownerId", "name");
CREATE INDEX "ThemePreset_ownerId_idx" ON "ThemePreset"("ownerId");

ALTER TABLE "CampaignTheme" ADD CONSTRAINT "CampaignTheme_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignTheme" ADD CONSTRAINT "CampaignTheme_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ThemePreset" ADD CONSTRAINT "ThemePreset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_activeThemeId_fkey" FOREIGN KEY ("activeThemeId") REFERENCES "CampaignTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
