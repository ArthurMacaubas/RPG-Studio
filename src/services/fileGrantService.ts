import { prisma } from '@/lib/prisma';
import { assertFileAccess } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import { recordAudit } from '@/services/auditService';

async function assertPlayerInCampaign(campaignId: string, userId: string) {
  const member = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId } }, select: { role: true } });
  if (!member || member.role !== 'PLAYER') throw Object.assign(new Error('O usuário precisa ser um jogador desta campanha.'), { status: 422 });
}

export const fileGrantService = {
  async listForFile(fileId: string) {
    const file = await assertFileAccess(fileId, { write: true });
    return prisma.campaignFileGrant.findMany({ where: { fileId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: 'asc' } } });
  },

  async grant(fileId: string, userId: string, canView = true) {
    const file = await assertFileAccess(fileId, { write: true });
    const actor = await requireUser();
    await assertPlayerInCampaign(file.campaignId, userId);
    const grant = await prisma.campaignFileGrant.upsert({ where: { fileId_userId: { fileId, userId } }, update: { canView }, create: { fileId, userId, canView }, include: { user: { select: { id: true, name: true, email: true } } } });
    void recordAudit({ campaignId: file.campaignId, actorId: actor.id, action: canView ? 'FILE_GRANT_GRANTED' : 'FILE_GRANT_DISABLED', entityType: 'CampaignFileGrant', entityId: grant.id, metadata: { fileId, userId, canView } }).catch(() => undefined);
    return grant;
  },

  async revoke(fileId: string, userId: string) {
    const file = await assertFileAccess(fileId, { write: true });
    const actor = await requireUser();
    const grant = await prisma.campaignFileGrant.findUnique({ where: { fileId_userId: { fileId, userId } } });
    if (!grant) return null;
    await prisma.campaignFileGrant.delete({ where: { fileId_userId: { fileId, userId } } });
    void recordAudit({ campaignId: file.campaignId, actorId: actor.id, action: 'FILE_GRANT_REVOKED', entityType: 'CampaignFileGrant', entityId: grant.id, metadata: { fileId, userId } }).catch(() => undefined);
    return grant;
  },

  async checkGrant(fileId: string, userId: string) {
    const grant = await prisma.campaignFileGrant.findUnique({ where: { fileId_userId: { fileId, userId } }, select: { canView: true } });
    return grant?.canView ?? false;
  }
};
