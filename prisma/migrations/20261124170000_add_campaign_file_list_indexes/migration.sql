-- Supports the active/archive/trash file lists and their default updatedAt ordering.
CREATE INDEX "CampaignFile_campaignId_isTrashed_isArchived_updatedAt_idx"
ON "CampaignFile"("campaignId", "isTrashed", "isArchived", "updatedAt");

CREATE INDEX "CampaignFile_campaignId_type_isTrashed_isArchived_updatedAt_idx"
ON "CampaignFile"("campaignId", "type", "isTrashed", "isArchived", "updatedAt");
