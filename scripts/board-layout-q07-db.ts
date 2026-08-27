import { prisma } from '@/lib/prisma';

class RollbackProbe extends Error {}

function requireIntegrationGuards() {
  if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') throw new Error('integration guards missing');
}

function temporaryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function main() {
  requireIntegrationGuards();
  const ownerId = temporaryId('q7-owner');
  const campaignId = temporaryId('q7-campaign');
  const fileId = temporaryId('q7-file');
  const nodeId = temporaryId('q7-node');

  try {
    await prisma.user.create({ data: { id: ownerId, name: 'Q7 Test Owner', email: `${ownerId}@rpgcampaignstudio.local` } });
    await prisma.campaign.create({ data: { id: campaignId, name: 'Q7 temporária', description: 'Fixture isolada de rollback.', system: 'CUSTOM', ownerId } });
    await prisma.campaignFile.create({ data: { id: fileId, campaignId, type: 'CLUE', name: 'Ficha Q7 temporária', description: null, data: {} } });
    await prisma.boardNode.create({ data: { id: nodeId, campaignId, fileId, x: 100, y: 140 } });

    let rollbackObserved = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.boardNode.update({ where: { fileId }, data: { x: 420, y: 280 } });
        const inside = await tx.boardNode.findUnique({ where: { fileId }, select: { x: true, y: true } });
        if (inside?.x !== 420 || inside.y !== 280) throw new Error('transactional position mismatch');
        throw new RollbackProbe('q7 rollback probe');
      });
    } catch (error) {
      if (!(error instanceof RollbackProbe)) throw error;
      rollbackObserved = true;
    }

    const afterRollback = await prisma.boardNode.findUnique({ where: { fileId }, select: { x: true, y: true } });
    if (!rollbackObserved || afterRollback?.x !== 100 || afterRollback.y !== 140) throw new Error('position rollback mismatch');
    console.log(JSON.stringify({ ok: true, transactionRollback: true, campaignScopedFixture: true, serviceOwnerGuardCoveredByUnitTest: true, noMigration: true }));
  } finally {
    await prisma.campaign.deleteMany({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message.replace(/q7-[a-z0-9-]+/gi, '[temp-id]').replace(/postgres(ql)?:\/\/[^\s]+/gi, '[database-redacted]') : 'unknown error';
  console.error(`[Q7_DB_TEST_FAILED] ${error instanceof Error ? error.name : 'UnknownError'}: ${message}`);
  process.exitCode = 1;
});
