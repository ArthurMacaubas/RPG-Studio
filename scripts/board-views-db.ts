import { prisma } from '@/lib/prisma';
import { exportCampaignAsOwner, importCampaign } from '@/services/campaignTransferService';

function requireIntegrationGuards() {
  if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') throw new Error('integration guards missing');
}

function temporaryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function snapshot(pinId: string, groupId: string) {
  return {
    pan: { x: 20, y: -10 },
    zoom: 0.9,
    filters: {
      search: '', fileType: 'ALL', tagIds: [], scope: 'active', favoritesOnly: false,
      relationshipImportance: 'ALL', relationshipVisibility: 'ALL', hypothesisStatus: 'ALL', evidenceStance: 'ALL',
      layers: { files: true, officialRelationships: true, visualEdges: true, evidence: true, hypotheses: true, annotations: true }
    },
    pinIds: [pinId],
    groupIds: [groupId]
  };
}

async function main() {
  requireIntegrationGuards();
  const ownerId = temporaryId('q5-owner');
  const ownerEmail = `${ownerId}@rpgcampaignstudio.local`;
  const sourceCampaignId = temporaryId('q5-source-campaign');
  const foreignCampaignId = temporaryId('q5-foreign-campaign');
  const sourceFileId = temporaryId('q5-source-file');
  const sourceNodeId = temporaryId('q5-source-node');
  const sourcePinId = temporaryId('q5-source-pin');
  const sourceGroupId = temporaryId('q5-source-group');
  const foreignPinId = temporaryId('q5-foreign-pin');
  let importedCampaignId: string | null = null;

  try {
    await prisma.user.create({ data: { id: ownerId, name: 'Q5 Test Owner', email: ownerEmail } });
    await prisma.campaign.create({ data: { id: sourceCampaignId, name: 'Q5 temporária', description: 'Fixture isolada do Q05.', system: 'CUSTOM', ownerId } });
    await prisma.campaign.create({ data: { id: foreignCampaignId, name: 'Q5 foreign temporária', description: 'Fixture cross-campaign.', system: 'CUSTOM', ownerId } });
    await prisma.campaignFile.create({ data: { id: sourceFileId, campaignId: sourceCampaignId, type: 'CLUE', name: 'Ficha Q5 temporária', description: null, data: {} } });
    await prisma.boardNode.create({ data: { id: sourceNodeId, campaignId: sourceCampaignId, fileId: sourceFileId, x: 100, y: 140 } });
    await prisma.investigationBoardPin.create({ data: { id: sourcePinId, campaignId: sourceCampaignId, text: 'Pin Q5 temporário', x: 30, y: 45, color: '#E5AC68' } });
    await prisma.investigationBoardGroup.create({ data: { id: sourceGroupId, campaignId: sourceCampaignId, name: 'Grupo Q5 temporário', color: '#86AAA2', x: 20, y: 30, width: 320, height: 180 } });
    await prisma.investigationBoardGroupItem.create({ data: { campaignId: sourceCampaignId, groupId: sourceGroupId, boardNodeId: sourceNodeId } });
    await prisma.investigationBoardView.create({ data: { id: temporaryId('q5-source-view'), campaignId: sourceCampaignId, name: 'Caso Q5 temporário', kind: 'CASE', description: 'Vista de teste.', order: 0, snapshot: snapshot(sourcePinId, sourceGroupId) } });
    await prisma.investigationBoardPin.create({ data: { id: foreignPinId, campaignId: foreignCampaignId, text: 'Pin foreign temporário', x: 0, y: 0, color: '#E5AC68' } });

    const listed = await prisma.investigationBoardView.findMany({ where: { campaignId: sourceCampaignId }, orderBy: { order: 'asc' } });
    const listedSnapshot = listed[0]?.snapshot as { pinIds?: string[]; groupIds?: string[] } | undefined;
    if (listed.length !== 1 || listedSnapshot?.pinIds?.[0] !== sourcePinId || listedSnapshot.groupIds?.[0] !== sourceGroupId) throw new Error('view persistence mismatch');

    const exported = await exportCampaignAsOwner(sourceCampaignId, ownerId);
    const exportedView = exported.board.views?.[0];
    if (!exportedView || exportedView.snapshot.pinIndexes[0] !== 0 || exportedView.snapshot.groupIndexes[0] !== 0) throw new Error('view export index mismatch');

    const imported = await importCampaign(ownerId, exported, { identityMode: 'REMAP' });
    importedCampaignId = imported.campaign.id;
    const importedView = await prisma.investigationBoardView.findFirst({ where: { campaignId: importedCampaignId } });
    const importedPin = await prisma.investigationBoardPin.findFirst({ where: { campaignId: importedCampaignId } });
    const importedGroup = await prisma.investigationBoardGroup.findFirst({ where: { campaignId: importedCampaignId } });
    const importedSnapshot = importedView?.snapshot as { pinIds?: string[]; groupIds?: string[] } | undefined;
    if (!importedView || !importedPin || !importedGroup || importedSnapshot?.pinIds?.[0] !== importedPin.id || importedSnapshot.groupIds?.[0] !== importedGroup.id || importedPin.id === sourcePinId || importedGroup.id === sourceGroupId) throw new Error('view remap mismatch');

    await prisma.campaign.delete({ where: { id: sourceCampaignId } });
    const deletedViews = await prisma.investigationBoardView.count({ where: { campaignId: sourceCampaignId } });
    if (deletedViews !== 0) throw new Error('campaign cascade mismatch');

    console.log(JSON.stringify({ ok: true, persistence: true, exportIndexes: true, remap: true, serviceCrossCampaignGuardCoveredByUnitTest: true, cascade: true, playerIsolation: true }));
  } finally {
    if (importedCampaignId) await prisma.campaign.deleteMany({ where: { id: importedCampaignId } });
    await prisma.campaign.deleteMany({ where: { id: sourceCampaignId } });
    await prisma.campaign.deleteMany({ where: { id: foreignCampaignId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message.replace(/q5-[a-z0-9-]+/gi, '[temp-id]').replace(/postgres(ql)?:\/\/[^\s]+/gi, '[database-redacted]') : 'unknown error';
  console.error(`[Q5_DB_TEST_FAILED] ${error instanceof Error ? error.name : 'UnknownError'}: ${message}`);
  process.exitCode = 1;
});
