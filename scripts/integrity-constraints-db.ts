import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isP2002(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002';
}

async function expectUniqueViolation(action: () => Promise<unknown>, label: string) {
  try {
    await action();
    throw new Error(`${label} não acionou a constraint única esperada.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('não acionou')) throw error;
    if (!isP2002(error)) throw error;
  }
}

async function main() {
  if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') {
    throw new Error('Defina RUN_DB_TESTS=1 e INTEGRATION_TEST_DATABASE=1 para autorizar escritas temporárias no banco de teste.');
  }

  const suffix = `v201-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerId = `integrity-test-owner-${suffix}`;
  let globalTypeId: string | undefined;
  const campaignIds = new Set<string>();

  try {
    await prisma.user.create({ data: { id: ownerId, name: 'Teste V20.1', email: `${ownerId}@rpgcampaignstudio.local` } });

    const globalKey = `V201_GLOBAL_${suffix}`.toUpperCase();
    const globalType = await prisma.relationshipType.create({ data: { key: globalKey, name: `Global ${suffix}`, directional: true } });
    globalTypeId = globalType.id;
    await expectUniqueViolation(
      () => prisma.relationshipType.create({ data: { key: globalKey, name: `Duplicado ${suffix}`, directional: true } }),
      'RelationshipType global'
    );

    const generic = await prisma.relationshipType.findFirst({ where: { campaignId: null, key: 'GENERIC' }, select: { id: true } });
    if (!generic) throw new Error('O tipo global GENERIC não está disponível para o teste de relacionamento.');
    const campaign = await prisma.campaign.create({ data: { name: `Integridade V20.1 ${suffix}`, system: 'CUSTOM', ownerId } });
    campaignIds.add(campaign.id);
    const [from, to] = await Promise.all([
      prisma.campaignFile.create({ data: { campaignId: campaign.id, type: 'CLUE', name: `Origem ${suffix}` } }),
      prisma.campaignFile.create({ data: { campaignId: campaign.id, type: 'NPC', name: `Destino ${suffix}` } })
    ]);
    await prisma.relationship.create({ data: { campaignId: campaign.id, fromId: from.id, toId: to.id, typeId: generic.id, kind: 'GENERIC' } });
    await expectUniqueViolation(
      () => prisma.relationship.create({ data: { campaignId: campaign.id, fromId: from.id, toId: to.id, typeId: generic.id, kind: 'GENERIC' } }),
      'Relationship(campaignId, fromId, toId, typeId)'
    );

    const rollbackCampaignId = `rollback-${suffix}`;
    await expectUniqueViolation(async () => {
      await prisma.$transaction(async (tx) => {
        const rollbackCampaign = await tx.campaign.create({ data: { id: rollbackCampaignId, name: `Rollback ${suffix}`, system: 'CUSTOM', ownerId } });
        const [rollbackFrom, rollbackTo] = await Promise.all([
          tx.campaignFile.create({ data: { campaignId: rollbackCampaign.id, type: 'CLUE', name: `Rollback origem ${suffix}` } }),
          tx.campaignFile.create({ data: { campaignId: rollbackCampaign.id, type: 'NPC', name: `Rollback destino ${suffix}` } })
        ]);
        await tx.relationship.create({ data: { campaignId: rollbackCampaign.id, fromId: rollbackFrom.id, toId: rollbackTo.id, typeId: generic.id, kind: 'GENERIC' } });
        await tx.relationship.create({ data: { campaignId: rollbackCampaign.id, fromId: rollbackFrom.id, toId: rollbackTo.id, typeId: generic.id, kind: 'GENERIC' } });
      });
    }, 'Rollback transacional de importação');
    const rolledBack = await prisma.campaign.findUnique({ where: { id: rollbackCampaignId }, select: { id: true } });
    if (rolledBack) throw new Error('A campanha temporária da transação falha permaneceu no banco.');

    console.log(JSON.stringify({ ok: true, constraints: ['RelationshipType_global_key_key', 'Relationship_campaignId_fromId_toId_typeId_key'], rollback: true }));
  } finally {
    for (const campaignId of campaignIds) await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => undefined);
    if (globalTypeId) await prisma.relationshipType.delete({ where: { id: globalTypeId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error('[integrity-constraints-db]', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
