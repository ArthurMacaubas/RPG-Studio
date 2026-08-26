-- V10: per-file viewer grants and security audit trail.
ALTER TABLE "CampaignFile"
  ADD COLUMN "restrictToGrants" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CampaignFileGrant" (
  "id" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignFileGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignFileGrant_fileId_userId_key"
  ON "CampaignFileGrant"("fileId", "userId");
CREATE INDEX "CampaignFileGrant_userId_idx"
  ON "CampaignFileGrant"("userId");
CREATE INDEX "AuditEvent_campaignId_createdAt_idx"
  ON "AuditEvent"("campaignId", "createdAt");
CREATE INDEX "AuditEvent_actorId_createdAt_idx"
  ON "AuditEvent"("actorId", "createdAt");

ALTER TABLE "CampaignFileGrant"
  ADD CONSTRAINT "CampaignFileGrant_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignFileGrant"
  ADD CONSTRAINT "CampaignFileGrant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
