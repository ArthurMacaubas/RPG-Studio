import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exportCampaignAsOwner, importCampaign } from '@/services/campaignTransferService';

function requireIntegrationGuards() {
  if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') {
    throw new Error('integration guards missing');
  }
}

function temporaryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isForeignKeyError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}

async function main() {
  requireIntegrationGuards();
  const ownerId = temporaryId('q4-owner');
  const ownerEmail = `${ownerId}@rpgcampaignstudio.local`;
  const sourceCampaignId = temporaryId('q4-source-campaign');
  const sourceFileId = temporaryId('q4-source-file');
  const sourceNodeId = temporaryId('q4-source-node');
  const sourceGroupId = temporaryId('q4-source-group');
  const sourcePinId = temporaryId('q4-source-pin');
  let importedCampaignId: string | null = null;

  try {
    await prisma.user.create({ data: { id: ownerId, name: 'Q4 Test Owner', email: ownerEmail } });
    await prisma.campaign.create({ data: { id: sourceCampaignId, name: 'Q4 temporária', description: 'Fixture isolada do Q04.', system: 'CUSTOM', ownerId } });
    await prisma.campaignFile.create({ data: { id: sourceFileId, campaignId: sourceCampaignId, type: 'CLUE', name: 'Ficha Q4 temporária', description: null, data: {} } });
    await prisma.boardNode.create({ data: { id: sourceNodeId, campaignId: sourceCampaignId, fileId: sourceFileId, x: 120, y: 180 } });
    await prisma.investigationBoardPin.create({ data: { id: sourcePinId, campaignId: sourceCampaignId, text: 'Pin Q4 temporário', x: 40, y: 60, color: '#E5AC68' } });
    await prisma.investigationBoardGroup.create({ data: { id: sourceGroupId, campaignId: sourceCampaignId, name: 'Grupo Q4 temporário', color: '#86AAA2', x: 20, y: 30, width: 320, height: 180 } });
    await prisma.investigationBoardGroupItem.create({ data: { campaignId: sourceCampaignId, groupId: sourceGroupId, boardNodeId: sourceNodeId } });

    const exported = await exportCampaignAsOwner(sourceCampaignId, ownerId);
    if (exported.board.pins?.length !== 1 || exported.board.groups?.length !== 1 || exported.board.groups[0]?.fileIds[0] !== sourceFileId) throw new Error('admin export mismatch');

    const imported = await importCampaign(ownerId, exported, { identityMode: 'REMAP' });
    importedCampaignId = imported.campaign.id;
    const importedPinCount = await prisma.investigationBoardPin.count({ where: { campaignId: importedCampaignId } });
    const importedGroup = await prisma.investigationBoardGroup.findFirst({ where: { campaignId: importedCampaignId }, include: { items: { include: { boardNode: { select: { fileId: true, campaignId: true } } } } } });
    if (importedPinCount !== 1 || !importedGroup || importedGroup.items.length !== 1 || importedGroup.items[0]?.boardNode.campaignId !== importedCampaignId || importedGroup.items[0]?.boardNode.fileId === sourceFileId) throw new Error('remapped persistence mismatch');

    try {
      await prisma.investigationBoardGroupItem.create({ data: { campaignId: sourceCampaignId, groupId: importedGroup.id, boardNodeId: sourceNodeId } });
      throw new Error('cross campaign group reference accepted');
    } catch (error) {
      if (!isForeignKeyError(error)) throw error;
    }

    try {
      await prisma.investigationBoardGroupItem.create({ data: { campaignId: sourceCampaignId, groupId: sourceGroupId, boardNodeId: temporaryId('q4-missing-node') } });
      throw new Error('missing node reference accepted');
    } catch (error) {
      if (!isForeignKeyError(error)) throw error;
    }

    await prisma.investigationBoardGroup.delete({ where: { id: sourceGroupId } });
    const sourceItemsAfterDelete = await prisma.investigationBoardGroupItem.count({ where: { groupId: sourceGroupId } });
    const sourceOfficialRelationships = await prisma.relationship.count({ where: { campaignId: sourceCampaignId } });
    const sourceEdges = await prisma.boardEdge.count({ where: { campaignId: sourceCampaignId } });
    if (sourceItemsAfterDelete !== 0 || sourceOfficialRelationships !== 0 || sourceEdges !== 0) throw new Error('q04 separation or cascade mismatch');

    console.log(JSON.stringify({ ok: true, export: true, remap: true, crossCampaignRejected: true, missingReferenceRejected: true, cascade: true, separation: true }));
  } finally {
    if (importedCampaignId) await prisma.campaign.deleteMany({ where: { id: importedCampaignId } });
    await prisma.campaign.deleteMany({ where: { id: sourceCampaignId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('[Q4_DB_TEST_FAILED] integration assertion failed');
  process.exitCode = 1;
});
