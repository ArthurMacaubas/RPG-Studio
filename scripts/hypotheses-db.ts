import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exportCampaignAsOwner, importCampaign } from '@/services/campaignTransferService';

function requireIntegrationGuards() {
  if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') {
    throw new Error('Defina RUN_DB_TESTS=1 e INTEGRATION_TEST_DATABASE=1 para executar este teste de banco.');
  }
}

function temporaryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isP2002(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function main() {
  requireIntegrationGuards();
  const ownerId = temporaryId('q1-owner');
  const ownerEmail = `${ownerId}@rpgcampaignstudio.local`;
  const sourceCampaignId = temporaryId('q1-source-campaign');
  const sourceFileId = temporaryId('q1-source-file');
  const sourceHypothesisId = temporaryId('q1-source-hypothesis');
  const sourceEvidenceId = temporaryId('q1-source-evidence');
  let importedCampaignId: string | null = null;

  try {
    await prisma.user.create({ data: { id: ownerId, name: 'Q1 Test Owner', email: ownerEmail } });
    await prisma.campaign.create({ data: { id: sourceCampaignId, name: 'Q1 Hipóteses — temporária', description: 'Fixture isolada do Quadro 01.', system: 'CUSTOM', ownerId } });
    await prisma.campaignFile.create({ data: { id: sourceFileId, campaignId: sourceCampaignId, type: 'CLUE', name: 'Pista temporária', description: 'Arquivo sintético para evidência.', data: {} } });
    await prisma.investigationHypothesis.create({ data: { id: sourceHypothesisId, campaignId: sourceCampaignId, title: 'Hipótese temporária', summary: 'Conclusão provisória de teste.', status: 'OPEN' } });
    await prisma.hypothesisEvidence.create({ data: { id: sourceEvidenceId, hypothesisId: sourceHypothesisId, fileId: sourceFileId, stance: 'SUPPORTS', note: 'Evidência sintética.', order: 0 } });

    const exported = await exportCampaignAsOwner(sourceCampaignId, ownerId);
    const exportedHypotheses = exported.investigation?.hypotheses ?? [];
    if (exportedHypotheses.length !== 1 || exportedHypotheses[0]?.evidence.length !== 1 || exportedHypotheses[0].evidence[0]?.fileId !== sourceFileId) {
      throw new Error('A exportação administrativa não preservou a hipótese e a evidência esperadas.');
    }

    try {
      await prisma.hypothesisEvidence.create({ data: { id: temporaryId('q1-duplicate-evidence'), hypothesisId: sourceHypothesisId, fileId: sourceFileId, stance: 'CONTEXT', note: 'Duplicidade proibida.', order: 1 } });
      throw new Error('A unicidade [hypothesisId, fileId] não rejeitou uma evidência duplicada.');
    } catch (error) {
      if (!isP2002(error)) throw error;
    }

    const imported = await importCampaign(ownerId, exported, { identityMode: 'REMAP' });
    importedCampaignId = imported.campaign.id;
    const importedHypothesis = await prisma.investigationHypothesis.findFirst({
      where: { campaignId: importedCampaignId },
      include: { evidence: { include: { file: { select: { id: true, campaignId: true } } } } }
    });
    if (!importedHypothesis || importedHypothesis.evidence.length !== 1) throw new Error('O round-trip não criou a hipótese ou sua evidência importada.');
    const importedEvidence = importedHypothesis.evidence[0];
    if (importedEvidence?.file.campaignId !== importedCampaignId || importedEvidence.fileId === sourceFileId) {
      throw new Error('O round-trip não remapeou fileId para a campanha importada.');
    }

    console.log(JSON.stringify({ ok: true, roundTrip: true, uniqueness: true, hypotheses: 1, evidence: 1 }));
  } finally {
    if (importedCampaignId) await prisma.campaign.deleteMany({ where: { id: importedCampaignId } });
    await prisma.campaign.deleteMany({ where: { id: sourceCampaignId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[Q1_DB_TEST_FAILED]', error instanceof Error ? error.message : 'Falha não identificada.');
  process.exitCode = 1;
});
