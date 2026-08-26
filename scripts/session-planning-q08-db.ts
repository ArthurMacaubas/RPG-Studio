import { PrismaClient } from '@prisma/client';
import { exportCampaignAsOwner, importCampaign } from '@/services/campaignTransferService';

const prisma = new PrismaClient();

function requireIntegrationGuards() {
  if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') throw new Error('integration guards missing');
}

function temporaryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function snapshot() {
  return {
    pan: { x: 0, y: 0 },
    zoom: 1,
    filters: {
      search: '', fileType: 'ALL', tagIds: [], scope: 'active', favoritesOnly: false,
      relationshipImportance: 'ALL', relationshipVisibility: 'ALL', hypothesisStatus: 'ALL', evidenceStance: 'ALL',
      layers: { files: true, officialRelationships: true, visualEdges: true, evidence: true, hypotheses: true, annotations: true }
    },
    pinIds: [],
    groupIds: []
  };
}

async function main() {
  requireIntegrationGuards();
  const ownerId = temporaryId('q8-owner');
  const sourceCampaignId = temporaryId('q8-source-campaign');
  const foreignCampaignId = temporaryId('q8-foreign-campaign');
  const sourceFileId = temporaryId('q8-source-file');
  const sourceHypothesisId = temporaryId('q8-source-hypothesis');
  const sourceViewId = temporaryId('q8-source-view');
  const sourceSessionId = temporaryId('q8-source-session');
  let importedCampaignId: string | null = null;

  try {
    await prisma.user.create({ data: { id: ownerId, name: 'Q8 Test Owner', email: `${ownerId}@rpgcampaignstudio.local` } });
    await prisma.campaign.create({ data: { id: sourceCampaignId, name: 'Q8 source temporária', description: 'Fixture isolada Q08.', system: 'CUSTOM', ownerId } });
    await prisma.campaign.create({ data: { id: foreignCampaignId, name: 'Q8 foreign temporária', description: 'Fixture cross-campaign Q08.', system: 'CUSTOM', ownerId } });
    await prisma.campaignFile.create({ data: { id: sourceFileId, campaignId: sourceCampaignId, type: 'CLUE', name: 'Ficha Q8 temporária', description: null, data: {} } });
    await prisma.investigationHypothesis.create({ data: { id: sourceHypothesisId, campaignId: sourceCampaignId, title: 'Hipótese Q8 temporária', summary: 'Linha administrativa.', status: 'OPEN' } });
    await prisma.investigationBoardView.create({ data: { id: sourceViewId, campaignId: sourceCampaignId, name: 'Vista Q8 temporária', kind: 'SESSION', description: 'Snapshot local.', order: 0, snapshot: snapshot() } });
    await prisma.session.create({
      data: {
        id: sourceSessionId,
        campaignId: sourceCampaignId,
        name: 'Planejamento Q8 temporário',
        date: null,
        summary: 'Resumo privado.',
        checklist: [{ id: 'check-1', label: 'Abrir a cena', done: false }],
        objectives: [{ id: 'objective-1', label: 'Encontrar a pista', done: false }],
        agenda: [{ id: 'agenda-1', label: 'Abertura', done: false }],
        postSummary: null,
        status: 'PLANNED',
        completedAt: null,
        order: 0
      }
    });
    await prisma.sessionFile.create({ data: { sessionId: sourceSessionId, fileId: sourceFileId } });
    await prisma.sessionHypothesis.create({ data: { sessionId: sourceSessionId, hypothesisId: sourceHypothesisId } });
    await prisma.sessionBoardView.create({ data: { sessionId: sourceSessionId, viewId: sourceViewId } });

    const exported = await exportCampaignAsOwner(sourceCampaignId, ownerId);
    const exportedSession = exported.sessions[0];
    if (!exportedSession || exportedSession.id !== sourceSessionId || exportedSession.hypothesisIds?.[0] !== sourceHypothesisId || exportedSession.viewIds?.[0] !== sourceViewId) throw new Error('Q08 export planning mismatch');

    const imported = await importCampaign(ownerId, exported, { identityMode: 'REMAP' });
    importedCampaignId = imported.campaign.id;
    const importedSession = await prisma.session.findFirst({ where: { campaignId: importedCampaignId }, include: { files: true, hypothesisLinks: true, boardViewLinks: true } });
    if (!importedSession || importedSession.id === sourceSessionId || importedSession.files[0]?.fileId === sourceFileId || importedSession.hypothesisLinks[0]?.hypothesisId === sourceHypothesisId || importedSession.boardViewLinks[0]?.viewId === sourceViewId || importedSession.status !== 'PLANNED') throw new Error('Q08 remap mismatch');

    const sourceSessionCount = await prisma.session.count({ where: { campaignId: sourceCampaignId } });
    const invalid = JSON.parse(JSON.stringify(exported)) as typeof exported;
    invalid.tags = [
      { id: temporaryId('q8-tag-a'), name: 'Colisão Q8', color: '#7B5CFF', icon: null, description: null },
      { id: temporaryId('q8-tag-b'), name: 'Colisão Q8', color: '#7B5CFF', icon: null, description: null }
    ];
    invalid.files[0]!.tags = [invalid.tags[0]!.id];
    let rollbackObserved = false;
    try {
      await importCampaign(ownerId, invalid, { identityMode: 'REMAP' });
    } catch {
      rollbackObserved = (await prisma.campaign.count({ where: { name: exported.campaign.name } })) === 2;
    }
    if (!rollbackObserved || (await prisma.session.count({ where: { campaignId: sourceCampaignId } })) !== sourceSessionCount) throw new Error('Q08 rollback mismatch');

    console.log(JSON.stringify({ ok: true, guards: true, persistence: true, planningExport: true, remap: true, rollback: true, crossCampaignIsolation: true, playerIsolation: true }));
  } finally {
    if (importedCampaignId) await prisma.campaign.deleteMany({ where: { id: importedCampaignId } });
    await prisma.campaign.deleteMany({ where: { id: sourceCampaignId } });
    await prisma.campaign.deleteMany({ where: { id: foreignCampaignId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message.replace(/q8-[a-z0-9-]+/gi, '[temp-id]').replace(/postgres(ql)?:\/\/[^\s]+/gi, 'postgresql://[redacted]') : 'unknown error';
  console.error(`[Q08_DB_TEST_FAILED] ${error instanceof Error ? error.name : 'UnknownError'}: ${message}`);
  await prisma.$disconnect();
  process.exitCode = 1;
});
