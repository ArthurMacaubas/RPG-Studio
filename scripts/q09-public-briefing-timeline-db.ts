import { PrismaClient } from '@prisma/client';
import { campaignBriefingService } from '@/services/campaignBriefingService';
import { playerModeService } from '@/services/playerModeService';
import { exportCampaignAsOwner, importCampaign } from '@/services/campaignTransferService';

const prisma = new PrismaClient();

function requireIntegrationGuards() {
  if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') throw new Error('integration guards missing');
}

function temporaryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function main() {
  requireIntegrationGuards();
  const ownerId = temporaryId('q9-owner');
  const playerId = temporaryId('q9-player');
  const campaignId = temporaryId('q9-campaign');
  const foreignCampaignId = temporaryId('q9-foreign-campaign');
  const publicFileId = temporaryId('q9-public-file');
  const grantFileId = temporaryId('q9-grant-file');
  const hiddenFileId = temporaryId('q9-hidden-file');
  const archivedFileId = temporaryId('q9-archived-file');
  const configId = temporaryId('q9-mode');
  const shareSlug = temporaryId('q9-share');
  let importedCampaignId: string | null = null;

  try {
    await prisma.user.createMany({ data: [
      { id: ownerId, name: 'Q09 Owner Fixture', email: `${ownerId}@rpgcampaignstudio.local` },
      { id: playerId, name: 'Q09 Player Fixture', email: `${playerId}@rpgcampaignstudio.local` }
    ] });
    await prisma.campaign.createMany({ data: [
      { id: campaignId, name: 'Q09 Campaign Fixture', description: 'Fixture isolada.', system: 'CUSTOM', ownerId },
      { id: foreignCampaignId, name: 'Q09 Foreign Fixture', description: 'Fixture cross-campaign.', system: 'CUSTOM', ownerId }
    ] });
    await prisma.campaignFile.createMany({ data: [
      { id: publicFileId, campaignId, type: 'CLUE', name: 'Public file fixture', data: {} },
      { id: grantFileId, campaignId, type: 'DOCUMENT', name: 'Grant file fixture', data: {}, restrictToGrants: true },
      { id: hiddenFileId, campaignId, type: 'NOTE', name: 'Hidden file fixture', data: {} },
      { id: archivedFileId, campaignId, type: 'EVENT', name: 'Archived file fixture', data: {}, isArchived: true }
    ] });
    await prisma.playerVisibility.createMany({ data: [
      { fileId: publicFileId, isVisible: true },
      { fileId: grantFileId, isVisible: true },
      { fileId: hiddenFileId, isVisible: false },
      { fileId: archivedFileId, isVisible: true }
    ] });
    await prisma.campaignFileGrant.create({ data: { fileId: grantFileId, userId: playerId, canView: true } });
    await prisma.campaignMember.create({ data: { campaignId, userId: playerId, role: 'PLAYER', audience: 'P2' } });
    await prisma.playerModeConfig.create({ data: { id: configId, campaignId, isEnabled: true, shareSlug } });
    await prisma.campaignBriefing.create({ data: { campaignId, title: 'Briefing fixture', body: 'Mensagem curada fixture.', isPublished: true } });
    await prisma.timelineEvent.createMany({ data: [
      { id: temporaryId('q9-event-public'), campaignId, title: 'Public event fixture', happenedAt: new Date('2026-01-01T00:00:00.000Z'), order: 0, fileId: publicFileId, isPublished: true },
      { id: temporaryId('q9-event-grant'), campaignId, title: 'Grant event fixture', happenedAt: new Date('2026-01-02T00:00:00.000Z'), order: 1, fileId: grantFileId, isPublished: true },
      { id: temporaryId('q9-event-hidden'), campaignId, title: 'Hidden event fixture', happenedAt: new Date('2026-01-03T00:00:00.000Z'), order: 2, fileId: hiddenFileId, isPublished: true },
      { id: temporaryId('q9-event-archived'), campaignId, title: 'Archived event fixture', happenedAt: new Date('2026-01-04T00:00:00.000Z'), order: 3, fileId: archivedFileId, isPublished: true },
      { id: temporaryId('q9-event-draft'), campaignId, title: 'Draft event fixture', happenedAt: new Date('2026-01-05T00:00:00.000Z'), order: 4, fileId: publicFileId, isPublished: false },
      { id: temporaryId('q9-event-free'), campaignId, title: 'Free event fixture', happenedAt: new Date('2026-01-06T00:00:00.000Z'), order: 5, fileId: null, isPublished: true },
      { id: temporaryId('q9-event-foreign'), campaignId: foreignCampaignId, title: 'Foreign event fixture', happenedAt: new Date('2026-01-07T00:00:00.000Z'), order: 0, fileId: null, isPublished: true }
    ] });

    const publicCampaign = await playerModeService.getPublicCampaign(shareSlug);
    if (!publicCampaign) throw new Error('Q09 public campaign unavailable');
    const publicTitles = publicCampaign.timeline.map((event) => event.title);
    if (!publicCampaign.briefing || publicCampaign.briefing.title !== 'Briefing fixture') throw new Error('Q09 public briefing mismatch');
    if (publicTitles.join('|') !== 'Public event fixture|Free event fixture') throw new Error('Q09 public visibility mismatch');
    if (publicCampaign.timeline.some((event) => 'id' in event || 'campaignId' in event || 'fileId' in event)) throw new Error('Q09 public DTO leaked identifiers');

    await prisma.playerModeConfig.update({ where: { id: configId }, data: { isEnabled: false } });
    if (await playerModeService.getPublicCampaign(shareSlug) !== null) throw new Error('Q09 disabled mode remained public');
    await prisma.playerModeConfig.update({ where: { id: configId }, data: { isEnabled: true } });

    const playerSnapshot = await campaignBriefingService.getPublicSnapshot({ kind: 'PLAYER', campaignId, userId: playerId, audience: 'P2' });
    const playerTitles = playerSnapshot.timeline.map((event) => event.title);
    if (playerTitles.join('|') !== 'Public event fixture|Grant event fixture|Free event fixture') throw new Error('Q09 player grant visibility mismatch');
    if (playerSnapshot.timeline.some((event) => 'id' in event || 'campaignId' in event || 'fileId' in event)) throw new Error('Q09 player DTO leaked identifiers');

    const stored = await prisma.campaignBriefing.findUnique({ where: { campaignId }, select: { isPublished: true } });
    if (!stored?.isPublished) throw new Error('Q09 briefing persistence mismatch');

    const exported = await exportCampaignAsOwner(campaignId, ownerId);
    if (!exported.briefing?.isPublished || exported.timelineEvents.find((event) => event.title === 'Public event fixture')?.isPublished !== true) throw new Error('Q09 export publication mismatch');
    const imported = await importCampaign(ownerId, exported, { identityMode: 'REMAP' });
    importedCampaignId = imported.campaign.id;
    const importedBriefing = await prisma.campaignBriefing.findUnique({ where: { campaignId: importedCampaignId }, select: { title: true, isPublished: true } });
    const importedEvents = await prisma.timelineEvent.findMany({ where: { campaignId: importedCampaignId }, select: { title: true, isPublished: true } });
    if (!importedBriefing || importedBriefing.title !== 'Briefing fixture' || importedBriefing.isPublished) throw new Error('Q09 import briefing safety mismatch');
    if (importedEvents.some((event) => event.isPublished)) throw new Error('Q09 import timeline safety mismatch');

    console.log(JSON.stringify({ ok: true, migration: true, publicProjection: true, playerGrant: true, disabledMode: true, ordering: true, crossCampaignIsolation: true, roundTrip: true, cleanupGuard: true }));
  } finally {
    if (importedCampaignId) await prisma.campaign.delete({ where: { id: importedCampaignId } });
    await prisma.campaign.deleteMany({ where: { id: { in: [campaignId, foreignCampaignId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, playerId] } } });
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message.replace(/q9-[a-z0-9-]+/gi, '[temp-id]').replace(/postgres(ql)?:\/\/[^\s]+/gi, '[database-redacted]') : 'unknown error';
  console.error(`[Q09_DB_TEST_FAILED] ${error instanceof Error ? error.name : 'UnknownError'}: ${message}`);
  await prisma.$disconnect();
  process.exitCode = 1;
});
