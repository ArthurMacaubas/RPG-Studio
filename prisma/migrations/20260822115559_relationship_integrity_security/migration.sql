/*
  Warnings:

  - A unique constraint covering the columns `[campaignId,audience]` on the table `CampaignMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[campaignId,fromId,toId,typeId]` on the table `Relationship` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CampaignMemberAudience" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RelationshipVisibility" ADD VALUE 'P1';
ALTER TYPE "RelationshipVisibility" ADD VALUE 'P2';
ALTER TYPE "RelationshipVisibility" ADD VALUE 'P3';
ALTER TYPE "RelationshipVisibility" ADD VALUE 'P4';

-- DropIndex
DROP INDEX "Relationship_campaignId_fromId_toId_typeId_idx";

-- AlterTable
ALTER TABLE "CampaignMember" ADD COLUMN     "audience" "CampaignMemberAudience";

-- A V17 audited zero duplicate groups in the target Neon database. Keep the
-- migration defensive for every other environment: do not silently delete or
-- merge records if a different dataset has not been audited first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Relationship"
    GROUP BY "campaignId", "fromId", "toId", "typeId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Não é possível aplicar a unicidade de Relationship: existem grupos duplicados não auditados.';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMember_campaignId_audience_key" ON "CampaignMember"("campaignId", "audience");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_campaignId_fromId_toId_typeId_key" ON "Relationship"("campaignId", "fromId", "toId", "typeId");
