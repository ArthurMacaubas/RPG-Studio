import { prisma } from '@/lib/prisma';
import { computeCampaignHealth } from '@/services/campaignHealthService';
import { getCampaignAccess, type CampaignAccess } from '@/lib/access';

export const campaignDashboardService = {
  async get(campaignId: string, access?: CampaignAccess, options: { includeHealth?: boolean } = {}) {
    const campaignAccess = access ?? await getCampaignAccess(campaignId);
    if (campaignAccess.role !== 'OWNER') throw Object.assign(new Error('Dashboard administrativo indisponível para jogador.'), { status: 404 });
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, system: true, coverImage: true, isArchived: true, ownerId: true, createdAt: true, updatedAt: true }
    });
    if (!campaign) return null;
    const [fileCount, sessionCount, favoriteCount, recentFiles, favoriteFiles, byType, currentSession] = await Promise.all([
      prisma.campaignFile.count({ where: { campaignId, isTrashed: false } }),
      prisma.session.count({ where: { campaignId } }),
      prisma.campaignFile.count({ where: { campaignId, isFavorite: true, isTrashed: false } }),
      prisma.campaignFile.findMany({ where: { campaignId, isTrashed: false }, orderBy: { updatedAt: 'desc' }, take: 6, select: { id: true, name: true, type: true } }),
      prisma.campaignFile.findMany({ where: { campaignId, isFavorite: true, isTrashed: false }, orderBy: { updatedAt: 'desc' }, take: 6, select: { id: true, name: true, type: true } }),
      prisma.campaignFile.groupBy({ by: ['type'], where: { campaignId, isTrashed: false, isArchived: false }, _count: { _all: true } }),
      prisma.session.findFirst({ where: { campaignId }, orderBy: { order: 'desc' }, select: { id: true, name: true, order: true } })
    ]);
    const health = options.includeHealth ? await computeCampaignHealth(campaignId, campaignAccess) : null;

    return { campaign, role: campaignAccess.role, user: campaignAccess.user, fileCount, sessionCount, favoriteCount, recentFiles, favoriteFiles, byType, currentSession, health };
  }
};
