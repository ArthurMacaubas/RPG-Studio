import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { searchableFileWhere } from '@/lib/publicationPolicy';

export const searchService = {
  async search(query: string) {
    const user = await requireUser();
    const normalized = query.trim().slice(0, 80);
    if (normalized.length < 2) return { query: normalized, results: [] };
    const campaignAccess = { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] };
    const fileMatch = [
      { name: { contains: normalized, mode: 'insensitive' as const } },
      { description: { contains: normalized, mode: 'insensitive' as const } },
      { content: { contains: normalized, mode: 'insensitive' as const } },
      { tags: { some: { tag: { name: { contains: normalized, mode: 'insensitive' as const } } } } },
      { comments: { some: { body: { contains: normalized, mode: 'insensitive' as const } } } },
      { relationshipsFrom: { some: { label: { contains: normalized, mode: 'insensitive' as const } } } },
      { relationshipsTo: { some: { label: { contains: normalized, mode: 'insensitive' as const } } } },
      { relationshipsFrom: { some: { description: { contains: normalized, mode: 'insensitive' as const } } } },
      { relationshipsTo: { some: { description: { contains: normalized, mode: 'insensitive' as const } } } },
      { relationshipsFrom: { some: { type: { name: { contains: normalized, mode: 'insensitive' as const } } } } },
      { relationshipsTo: { some: { type: { name: { contains: normalized, mode: 'insensitive' as const } } } } },
      { relationshipsFrom: { some: { to: { name: { contains: normalized, mode: 'insensitive' as const } } } } },
      { relationshipsTo: { some: { from: { name: { contains: normalized, mode: 'insensitive' as const } } } } }
    ];
    const [campaigns, files] = await Promise.all([
      prisma.campaign.findMany({ where: { ...campaignAccess, isArchived: false, name: { contains: normalized, mode: 'insensitive' } }, select: { id: true, name: true }, orderBy: { updatedAt: 'desc' }, take: 8 }),
      prisma.campaignFile.findMany({ where: { AND: [searchableFileWhere(user.id), { OR: fileMatch }] }, select: { id: true, name: true, type: true, campaignId: true, campaign: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 20 })
    ]);
    return {
      query: normalized,
      results: [
        ...campaigns.map((campaign) => ({ kind: 'campaign' as const, id: campaign.id, name: campaign.name, campaignId: campaign.id, campaignName: campaign.name })),
        ...files.map((file) => ({ kind: 'file' as const, id: file.id, name: file.name, type: file.type, campaignId: file.campaignId, campaignName: file.campaign.name }))
      ]
    };
  }
};
