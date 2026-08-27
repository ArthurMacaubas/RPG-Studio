import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { assertCampaignRole, assertFileAccess } from '@/lib/access';
import { recordAudit } from '@/services/auditService';

const timelineEventSelect = {
  id: true,
  campaignId: true,
  title: true,
  happenedAt: true,
  order: true,
  isPublished: true,
  fileId: true,
  file: { select: { id: true, name: true, type: true, isArchived: true, isTrashed: true } }
} satisfies Prisma.TimelineEventSelect;

export const timelineService = {
  async list(campaignId: string) {
    await assertCampaignRole(campaignId, 'OWNER');
    return prisma.timelineEvent.findMany({
      where: { campaignId },
      select: timelineEventSelect,
      orderBy: [{ happenedAt: 'asc' }, { order: 'asc' }]
    });
  },

  async create(input: { campaignId: string; title: string; happenedAt: Date; fileId?: string }) {
    await assertCampaignRole(input.campaignId, 'OWNER');
    if (input.fileId) await assertFileAccess(input.fileId, { campaignId: input.campaignId, write: true });
    const count = await prisma.timelineEvent.count({ where: { campaignId: input.campaignId } });
    return prisma.timelineEvent.create({
      data: {
        campaignId: input.campaignId,
        title: input.title,
        happenedAt: input.happenedAt,
        fileId: input.fileId,
        order: count
      },
      select: timelineEventSelect
    });
  },

  async update(id: string, input: Partial<{ title: string; happenedAt: Date; fileId: string | null; isPublished: boolean }>) {
    const event = await prisma.timelineEvent.findUnique({ where: { id }, select: { campaignId: true } });
    if (!event) throw Object.assign(new Error('Evento da timeline não encontrado.'), { status: 404 });
    const access = await assertCampaignRole(event.campaignId, 'OWNER');
    if (input.fileId) await assertFileAccess(input.fileId, { campaignId: event.campaignId, write: true });
    const updated = await prisma.timelineEvent.update({ where: { id }, data: input, select: timelineEventSelect });
    if (input.isPublished !== undefined) {
      void recordAudit({
        campaignId: event.campaignId,
        actorId: access.user.id,
        action: input.isPublished ? 'TIMELINE_EVENT_PUBLISHED' : 'TIMELINE_EVENT_UNPUBLISHED',
        entityType: 'TimelineEvent',
        entityId: id,
        metadata: { isPublished: input.isPublished }
      }).catch(() => undefined);
    }
    return updated;
  },

  async remove(id: string) {
    const event = await prisma.timelineEvent.findUnique({ where: { id }, select: { campaignId: true } });
    if (!event) throw Object.assign(new Error('Evento da timeline não encontrado.'), { status: 404 });
    await assertCampaignRole(event.campaignId, 'OWNER');
    return prisma.timelineEvent.delete({ where: { id } });
  }
};
