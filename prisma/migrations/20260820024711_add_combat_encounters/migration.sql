-- CreateEnum
CREATE TYPE "CombatEncounterStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ENDED');

-- CreateEnum
CREATE TYPE "CombatParticipantKind" AS ENUM ('CHARACTER', 'THREAT');

-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'THREAT';

-- CreateTable
CREATE TABLE "CombatEncounter" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sessionId" TEXT,
    "name" TEXT NOT NULL,
    "status" "CombatEncounterStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "round" INTEGER NOT NULL DEFAULT 0,
    "turnIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CombatEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatParticipant" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "sourceFileId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "CombatParticipantKind" NOT NULL,
    "initiative" INTEGER NOT NULL DEFAULT 0,
    "initiativeBonus" INTEGER NOT NULL DEFAULT 0,
    "turnOrder" INTEGER NOT NULL DEFAULT 0,
    "currentHp" INTEGER,
    "maxHp" INTEGER,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "isDefeated" BOOLEAN NOT NULL DEFAULT false,
    "isVisibleToPlayers" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CombatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CombatEncounter_campaignId_status_idx" ON "CombatEncounter"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CombatEncounter_sessionId_idx" ON "CombatEncounter"("sessionId");

-- CreateIndex
CREATE INDEX "CombatParticipant_encounterId_turnOrder_idx" ON "CombatParticipant"("encounterId", "turnOrder");

-- CreateIndex
CREATE INDEX "CombatParticipant_sourceFileId_idx" ON "CombatParticipant"("sourceFileId");

-- AddForeignKey
ALTER TABLE "CombatEncounter" ADD CONSTRAINT "CombatEncounter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatEncounter" ADD CONSTRAINT "CombatEncounter_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatParticipant" ADD CONSTRAINT "CombatParticipant_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "CombatEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatParticipant" ADD CONSTRAINT "CombatParticipant_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "CampaignFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
