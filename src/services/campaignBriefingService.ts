import { Prisma, type FileType } from '@prisma/client';
import { AccessDeniedError, assertCampaignRole } from '@/lib/access';
import { publishedFileWhere, type ViewerContext } from '@/lib/publicationPolicy';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/services/auditService';

const MAX_PUBLIC_TIMELINE_EVENTS = 100;

const adminSelect = {
  id: true,
  campaignId: true,
  title: true,
  body: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.CampaignBriefingSelect;

const publicBriefingSelect = {
  title: true,
  body: true
} satisfies Prisma.CampaignBriefingSelect;

const publicTimelineSelect = {
  title: true,
  happenedAt: true,
  file: { select: { name: true, type: true } }
} satisfies Prisma.TimelineEventSelect;

export type CampaignBriefingAdmin = Prisma.CampaignBriefingGetPayload<{ select: typeof adminSelect }>;

export type PublicBriefing = Prisma.CampaignBriefingGetPayload<{ select: typeof publicBriefingSelect }>;

export type PublicTimelineEvent = {
  title: string;
  happenedAt: string;
  file: { name: string; type: FileType } | null;
};

export type PublicBriefingTimeline = {
  briefing: PublicBriefing | null;
  timeline: PublicTimelineEvent[];
};

export const campaignBriefingService = {
  async getAdmin(campaignId: string) {
    await assertCampaignRole(campaignId, 'OWNER');
    return prisma.campaignBriefing.findUnique({ where: { campaignId }, select: adminSelect });
  },

  async save(campaignId: string, input: { title: string; body: string }) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const briefing = await prisma.campaignBriefing.upsert({
      where: { campaignId },
      update: { title: input.title, body: input.body },
      create: { campaignId, title: input.title, body: input.body },
      select: adminSelect
    });
    void recordAudit({
      campaignId,
      actorId: access.user.id,
      action: 'BRIEFING_SAVED',
      entityType: 'CampaignBriefing',
      entityId: briefing.id,
      metadata: { isPublished: briefing.isPublished }
    }).catch(() => undefined);
    return briefing;
  },

  async setPublished(campaignId: string, isPublished: boolean) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const existing = await prisma.campaignBriefing.findUnique({ where: { campaignId }, select: { id: true } });
    if (!existing) throw new AccessDeniedError('Briefing não encontrado.', 404);
    const briefing = await prisma.campaignBriefing.update({
      where: { campaignId },
      data: { isPublished },
      select: adminSelect
    });
    void recordAudit({
      campaignId,
      actorId: access.user.id,
      action: isPublished ? 'BRIEFING_PUBLISHED' : 'BRIEFING_UNPUBLISHED',
      entityType: 'CampaignBriefing',
      entityId: briefing.id,
      metadata: { isPublished }
    }).catch(() => undefined);
    return briefing;
  },

  async getPublicSnapshot(viewer: Extract<ViewerContext, { kind: 'PLAYER' | 'PUBLIC' }>): Promise<PublicBriefingTimeline> {
    const fileVisibility = publishedFileWhere(viewer);
    const [briefing, events] = await Promise.all([
      prisma.campaignBriefing.findFirst({
        where: { campaignId: viewer.campaignId, isPublished: true },
        select: publicBriefingSelect
      }),
      prisma.timelineEvent.findMany({
        where: {
          campaignId: viewer.campaignId,
          isPublished: true,
          OR: [
            { fileId: null },
            { file: { is: fileVisibility } }
          ]
        },
        select: publicTimelineSelect,
        orderBy: [{ happenedAt: 'asc' }, { order: 'asc' }, { id: 'asc' }],
        take: MAX_PUBLIC_TIMELINE_EVENTS
      })
    ]);

    return {
      briefing,
      timeline: events.map((event) => ({
        title: event.title,
        happenedAt: event.happenedAt.toISOString(),
        file: event.file
      }))
    };
  }
};

export { MAX_PUBLIC_TIMELINE_EVENTS };
