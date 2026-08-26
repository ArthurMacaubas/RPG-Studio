import { prisma } from '@/lib/prisma';
import { assertCampaignRole } from '@/lib/access';
import { recordAudit } from '@/services/auditService';

export class CampaignMemberError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'CampaignMemberError';
    this.status = status;
  }
}

export const campaignMemberService = {
  async listForCampaign(campaignId: string) {
    await assertCampaignRole(campaignId, 'OWNER');
    return prisma.campaignMember.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        role: true,
        audience: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });
  },

  async remove(campaignId: string, userId: string) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    if (userId === access.user.id) throw new CampaignMemberError('O proprietário não pode ser removido da própria campanha.', 422);

    const member = await prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      select: { id: true, userId: true, user: { select: { name: true, email: true } } }
    });
    if (!member) throw new CampaignMemberError('Jogador não pertence a esta campanha.', 404);

    await prisma.$transaction([
      prisma.campaignFileGrant.deleteMany({ where: { userId, file: { campaignId } } }),
      prisma.campaignInvite.updateMany({ where: { campaignId, inviteeEmail: member.user.email, status: 'PENDING' }, data: { status: 'REVOKED' } }),
      prisma.campaignMember.delete({ where: { id: member.id } })
    ]);

    void recordAudit({
      campaignId,
      actorId: access.user.id,
      action: 'MEMBER_REMOVED',
      entityType: 'CampaignMember',
      entityId: member.id,
      metadata: { userId: member.userId, email: member.user.email }
    }).catch(() => undefined);

    return { success: true as const };
  },

  async setAudience(campaignId: string, userId: string, audience: 'P1' | 'P2' | 'P3' | 'P4' | null) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const member = await prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      select: { id: true, userId: true, audience: true, user: { select: { name: true } } }
    });
    if (!member) throw new CampaignMemberError('Jogador não pertence a esta campanha.', 404);
    const updated = await prisma.campaignMember.update({ where: { id: member.id }, data: { audience }, select: { id: true, userId: true, audience: true } });
    void recordAudit({
      campaignId,
      actorId: access.user.id,
      action: 'MEMBER_AUDIENCE_UPDATED',
      entityType: 'CampaignMember',
      entityId: member.id,
      metadata: { userId: member.userId, name: member.user.name, previousAudience: member.audience, audience }
    }).catch(() => undefined);
    return updated;
  }
};
