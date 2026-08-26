import { prisma } from '@/lib/prisma';
import { computeCampaignHealth } from '@/services/campaignHealthService';
import { getCampaignAccess } from '@/lib/access';

export const campaignDashboardService = {
  async get(campaignId: string) {
    const access = await getCampaignAccess(campaignId);
    if (access.role !== 'OWNER') throw Object.assign(new Error('Dashboard administrativo indisponível para jogador.'), { status: 404 });
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return null;
    const [fileCount, sessionCount, favoriteCount, recentFiles, favoriteFiles, byType, currentSession, health] = await Promise.all([
      prisma.campaignFile.count({ where: { campaignId, isTrashed: false } }),
      prisma.session.count({ where: { campaignId } }),
      prisma.campaignFile.count({ where: { campaignId, isFavorite: true, isTrashed: false } }),
      prisma.campaignFile.findMany({ where: { campaignId, isTrashed: false }, orderBy: { updatedAt: 'desc' }, take: 6 }),
      prisma.campaignFile.findMany({ where: { campaignId, isFavorite: true, isTrashed: false }, orderBy: { updatedAt: 'desc' }, take: 6 }),
      prisma.campaignFile.groupBy({ by: ['type'], where: { campaignId, isTrashed: false, isArchived: false }, _count: { _all: true } }),
      prisma.session.findFirst({ where: { campaignId }, orderBy: { order: 'desc' } }),
      computeCampaignHealth(campaignId)
    ]);

    return { campaign, role: access.role, user: access.user, fileCount, sessionCount, favoriteCount, recentFiles, favoriteFiles, byType, currentSession, health };
  }
};
