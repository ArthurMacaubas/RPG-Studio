import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.RUN_DB_TESTS !== '1') {
    throw new Error('Defina RUN_DB_TESTS=1 para executar a constraint de relacionamento contra um banco de teste.');
  }

  const ownerId = process.env.DEMO_OWNER_ID ?? 'relationship-constraint-test-owner';
  const testSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existingUser = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
  let campaignId: string | undefined;

  try {
    await prisma.user.upsert({
      where: { id: ownerId },
      update: {},
      create: { id: ownerId, name: 'Teste de integridade', email: `${ownerId}@rpgcampaignstudio.local` }
    });
    const globalType = await prisma.relationshipType.findFirst({
      where: { campaignId: null, key: 'GENERIC' },
      select: { id: true }
    });
    if (!globalType) throw new Error('O tipo global GENERIC não está disponível para o teste de constraint.');

    const campaign = await prisma.campaign.create({
      data: { name: `Constraint V18 ${testSuffix}`, system: 'CUSTOM', ownerId }
    });
    campaignId = campaign.id;
    const [from, to] = await Promise.all([
      prisma.campaignFile.create({ data: { campaignId, type: 'CLUE', name: `Origem ${testSuffix}`, authorId: ownerId } }),
      prisma.campaignFile.create({ data: { campaignId, type: 'NPC', name: `Destino ${testSuffix}`, authorId: ownerId } })
    ]);

    await prisma.relationship.create({
      data: { campaignId, fromId: from.id, toId: to.id, typeId: globalType.id, kind: 'GENERIC' }
    });

    try {
      await prisma.relationship.create({
        data: { campaignId, fromId: from.id, toId: to.id, typeId: globalType.id, kind: 'GENERIC' }
      });
      throw new Error('A segunda criação da mesma relação não acionou a constraint única.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('não acionou')) throw error;
      if (!(typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002')) {
        throw error;
      }
    }

    console.log(JSON.stringify({ ok: true, constraint: 'Relationship_campaignId_fromId_toId_typeId_key' }));
  } finally {
    if (campaignId) await prisma.campaign.delete({ where: { id: campaignId } });
    if (!existingUser) await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error('[relationship-constraint-db]', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
