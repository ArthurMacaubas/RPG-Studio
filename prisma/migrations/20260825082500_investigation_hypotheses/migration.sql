-- Quadro 01: Hipóteses e Evidências
-- Migration aditiva. Não executa backfill nem altera dados existentes.

CREATE TYPE "HypothesisStatus" AS ENUM ('OPEN', 'SUPPORTED', 'REFUTED', 'RESOLVED');

CREATE TYPE "EvidenceStance" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'CONTEXT');

CREATE TABLE "InvestigationHypothesis" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" "HypothesisStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationHypothesis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HypothesisEvidence" (
    "id" TEXT NOT NULL,
    "hypothesisId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "stance" "EvidenceStance" NOT NULL,
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HypothesisEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvestigationHypothesis_campaignId_status_idx"
    ON "InvestigationHypothesis"("campaignId", "status");

CREATE UNIQUE INDEX "HypothesisEvidence_hypothesisId_fileId_key"
    ON "HypothesisEvidence"("hypothesisId", "fileId");

CREATE INDEX "HypothesisEvidence_hypothesisId_stance_order_idx"
    ON "HypothesisEvidence"("hypothesisId", "stance", "order");

CREATE INDEX "HypothesisEvidence_fileId_idx"
    ON "HypothesisEvidence"("fileId");

ALTER TABLE "InvestigationHypothesis"
    ADD CONSTRAINT "InvestigationHypothesis_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HypothesisEvidence"
    ADD CONSTRAINT "HypothesisEvidence_hypothesisId_fkey"
    FOREIGN KEY ("hypothesisId") REFERENCES "InvestigationHypothesis"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HypothesisEvidence"
    ADD CONSTRAINT "HypothesisEvidence_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "CampaignFile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
