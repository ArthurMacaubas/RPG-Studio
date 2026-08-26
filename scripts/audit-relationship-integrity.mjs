import { PrismaClient } from '@prisma/client';

if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') {
  throw new Error('Defina RUN_DB_TESTS=1 e INTEGRATION_TEST_DATABASE=1 para executar a auditoria contra um banco de teste.');
}

const prisma = new PrismaClient();

async function count(queryPromise) {
  const rows = await queryPromise;
  return Number(rows[0]?.count ?? 0);
}

try {
  const [duplicateGroups, fromCampaignMismatches, toCampaignMismatches, missingFromFiles, missingToFiles, candidateKeyDuplicateGroups, invalidTypeScopes] = await Promise.all([
    count(prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "campaignId", "fromId", "toId", "typeId"
        FROM "Relationship"
        GROUP BY "campaignId", "fromId", "toId", "typeId"
        HAVING COUNT(*) > 1
      ) duplicate_groups;
    `),
    count(prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Relationship" relationship
      JOIN "CampaignFile" source ON source."id" = relationship."fromId"
      WHERE relationship."campaignId" <> source."campaignId";
    `),
    count(prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Relationship" relationship
      JOIN "CampaignFile" target ON target."id" = relationship."toId"
      WHERE relationship."campaignId" <> target."campaignId";
    `),
    count(prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Relationship" relationship
      LEFT JOIN "CampaignFile" source ON source."id" = relationship."fromId"
      WHERE source."id" IS NULL;
    `),
    count(prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Relationship" relationship
      LEFT JOIN "CampaignFile" target ON target."id" = relationship."toId"
      WHERE target."id" IS NULL;
    `),
    count(prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "campaignId", "id"
        FROM "CampaignFile"
        GROUP BY "campaignId", "id"
        HAVING COUNT(*) > 1
      ) candidate_key_duplicate_groups;
    `),
    count(prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Relationship" relationship
      JOIN "RelationshipType" relationship_type ON relationship_type."id" = relationship."typeId"
      WHERE relationship_type."campaignId" IS NOT NULL
        AND relationship_type."campaignId" <> relationship."campaignId";
    `)
  ]);

  const audit = {
    duplicateGroups,
    fromCampaignMismatches,
    toCampaignMismatches,
    missingFromFiles,
    missingToFiles,
    candidateKeyDuplicateGroups,
    invalidTypeScopes
  };
  const ok = Object.values(audit).every((value) => value === 0);
  console.log(JSON.stringify({ ok, audit }, null, 2));
  if (!ok) {
    console.error('BLOQUEADO — dados incompatíveis');
    process.exitCode = 3;
  }
} finally {
  await prisma.$disconnect();
}
