/*
  M3 — Integridade estrutural do escopo das pontas de Relationship.

  Pré-condição: auditoria somente leitura sem inconsistências em
  Relationship.campaignId versus CampaignFile.campaignId, sem pontas ausentes
  e sem duplicidades em CampaignFile(campaignId, id).

  Relationship.typeId permanece com sua FK simples para permitir tipos globais
  (RelationshipType.campaignId IS NULL).
*/

-- CampaignFile.id continua sendo a chave primária global. Esta chave candidata
-- fornece o alvo para as FKs compostas que incluem o escopo da campanha.
CREATE UNIQUE INDEX "CampaignFile_campaignId_id_key"
  ON "CampaignFile" ("campaignId", "id");

-- Remover as FKs simples das pontas evita duas relações Prisma concorrentes para
-- os mesmos campos e substitui a garantia por escopo + id. A cascata é mantida.
ALTER TABLE "Relationship"
  DROP CONSTRAINT "Relationship_fromId_fkey",
  DROP CONSTRAINT "Relationship_toId_fkey";

ALTER TABLE "Relationship"
  ADD CONSTRAINT "Relationship_from_campaign_file_scope_fkey"
    FOREIGN KEY ("campaignId", "fromId")
    REFERENCES "CampaignFile" ("campaignId", "id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  ADD CONSTRAINT "Relationship_to_campaign_file_scope_fkey"
    FOREIGN KEY ("campaignId", "toId")
    REFERENCES "CampaignFile" ("campaignId", "id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
