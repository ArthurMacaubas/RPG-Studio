import { prisma } from '@/lib/prisma';
import { assertOwnedCampaignForWrite, assertFileAccess } from '@/lib/access';

export const fileAccessService = {
  async get(fileId: string) {
    const file = await assertFileAccess(fileId, { write: true });
    const [current, members] = await Promise.all([
      prisma.campaignFile.findUnique({ where: { id: fileId }, select: { id: true, campaignId: true, restrictToGrants: true } }),
      prisma.campaignMember.findMany({ where: { campaignId: file.campaignId, role: 'PLAYER' }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: 'asc' } } })
    ]);
    const grants = await prisma.campaignFileGrant.findMany({ where: { fileId }, select: { userId: true, canView: true } });
    return { file: current, members: members.map((member) => ({ id: member.user.id, name: member.user.name, email: member.user.email, role: member.role, canView: grants.find((grant) => grant.userId === member.user.id)?.canView ?? false })) };
  },

  async update(fileId: string, restrictToGrants: boolean, grants: Array<{ userId: string; canView: boolean }>) {
    const file = await assertFileAccess(fileId, { write: true });
    await assertOwnedCampaignForWrite(file.campaignId);
    const memberIds = new Set((await prisma.campaignMember.findMany({ where: { campaignId: file.campaignId, role: 'PLAYER' }, select: { userId: true } })).map((member) => member.userId));
    if (grants.some((grant) => !memberIds.has(grant.userId))) throw Object.assign(new Error('Todos os jogadores precisam pertencer à campanha.'), { status: 422 });
    await prisma.$transaction([
      prisma.campaignFile.update({ where: { id: fileId }, data: { restrictToGrants } }),
      ...grants.map((grant) => prisma.campaignFileGrant.upsert({ where: { fileId_userId: { fileId, userId: grant.userId } }, update: { canView: grant.canView }, create: { fileId, userId: grant.userId, canView: grant.canView } }))
    ]);
    return this.get(fileId);
  }
};
