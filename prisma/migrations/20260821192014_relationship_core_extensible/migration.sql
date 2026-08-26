-- Relationship Core extensível: migration aditiva e preservadora de dados.
-- Os IDs, origem, destino, kind legado e labels existentes não são alterados.

-- CreateEnum
CREATE TYPE "RelationshipImportance" AS ENUM ('CRITICAL', 'IMPORTANT', 'NORMAL', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "RelationshipVisibility" AS ENUM ('GM', 'ALL');

-- CreateTable
CREATE TABLE "RelationshipType" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "directional" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RelationshipType_pkey" PRIMARY KEY ("id")
);

-- Additive columns remain nullable while legacy records are backfilled.
ALTER TABLE "Relationship"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "importance" "RelationshipImportance" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "typeId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3),
  ADD COLUMN "visibility" "RelationshipVisibility" NOT NULL DEFAULT 'GM';

-- Global, idempotent vocabulary. The six legacy keys retain their original meaning.
INSERT INTO "RelationshipType" ("id", "campaignId", "key", "name", "description", "directional", "createdAt", "updatedAt") VALUES
  ('reltype_global_generic', NULL, 'GENERIC', 'Relacionado a', 'Relação geral entre entidades.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_leads_to', NULL, 'LEADS_TO', 'Leva a', 'A entidade de origem conduz à entidade de destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_belongs_to', NULL, 'BELONGS_TO', 'Pertence a', 'A entidade de origem pertence à entidade de destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_contains', NULL, 'CONTAINS', 'Contém', 'A entidade de origem contém a entidade de destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_blocks', NULL, 'BLOCKS', 'Bloqueia', 'A entidade de origem bloqueia o destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_unlocks', NULL, 'UNLOCKS', 'Desbloqueia', 'A entidade de origem desbloqueia o destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_knows', NULL, 'KNOWS', 'Conhece', 'A entidade de origem conhece o destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_suspects', NULL, 'SUSPECTS', 'Suspeita de', 'A entidade de origem suspeita do destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_reveals', NULL, 'REVEALS', 'Revela', 'A entidade de origem revela o destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_depends_on', NULL, 'DEPENDS_ON', 'Depende de', 'A entidade de origem depende do destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_causes', NULL, 'CAUSES', 'Causa', 'A entidade de origem causa o destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reltype_global_contradicts', NULL, 'CONTRADICTS', 'Contradiz', 'A entidade de origem contradiz o destino.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Refuse a corrupt legacy state rather than associating one relationship with the wrong campaign.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Relationship" relationship
    JOIN "CampaignFile" source ON source."id" = relationship."fromId"
    JOIN "CampaignFile" target ON target."id" = relationship."toId"
    WHERE source."campaignId" <> target."campaignId"
  ) THEN
    RAISE EXCEPTION 'Não é possível migrar Relationship: existe relacionamento entre campanhas diferentes.';
  END IF;
END $$;

-- Derive the explicit campaign scope from the already-valid origin file.
UPDATE "Relationship" AS relationship
SET "campaignId" = file."campaignId",
    "updatedAt" = relationship."createdAt"
FROM "CampaignFile" AS file
WHERE file."id" = relationship."fromId";

-- Preserve the legacy enum as a transition mirror while attaching the new type source of truth.
UPDATE "Relationship"
SET "typeId" = CASE "kind"
  WHEN 'GENERIC' THEN 'reltype_global_generic'
  WHEN 'LEADS_TO' THEN 'reltype_global_leads_to'
  WHEN 'BELONGS_TO' THEN 'reltype_global_belongs_to'
  WHEN 'CONTAINS' THEN 'reltype_global_contains'
  WHEN 'BLOCKS' THEN 'reltype_global_blocks'
  WHEN 'UNLOCKS' THEN 'reltype_global_unlocks'
END;

ALTER TABLE "Relationship"
  ALTER COLUMN "campaignId" SET NOT NULL,
  ALTER COLUMN "typeId" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX "RelationshipType_key_idx" ON "RelationshipType"("key");
CREATE UNIQUE INDEX "RelationshipType_campaignId_key_key" ON "RelationshipType"("campaignId", "key");
CREATE UNIQUE INDEX "RelationshipType_global_key_key" ON "RelationshipType"("key") WHERE "campaignId" IS NULL;
CREATE INDEX "Relationship_campaignId_idx" ON "Relationship"("campaignId");
CREATE INDEX "Relationship_campaignId_fromId_toId_typeId_idx" ON "Relationship"("campaignId", "fromId", "toId", "typeId");

ALTER TABLE "RelationshipType" ADD CONSTRAINT "RelationshipType_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_typeId_fkey"
  FOREIGN KEY ("typeId") REFERENCES "RelationshipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
