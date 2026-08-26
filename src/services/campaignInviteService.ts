import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { assertCampaignRole } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import { recordAudit } from '@/services/auditService';

const DEFAULT_EXPIRY_DAYS = 14;

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function inviteError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

const inviteInclude = {
  campaign: { select: { id: true, name: true, description: true, coverImage: true, ownerId: true } },
  inviter: { select: { id: true, name: true, email: true } }
} as const;

async function findByToken(token: string) {
  return prisma.campaignInvite.findUnique({ where: { tokenHash: hashInviteToken(token) }, include: inviteInclude });
}

async function findForAcceptance(tokenOrId: string) {
  return prisma.campaignInvite.findFirst({
    where: { OR: [{ tokenHash: hashInviteToken(tokenOrId) }, { id: tokenOrId }] },
    include: inviteInclude
  });
}

export const campaignInviteService = {
  async create(campaignId: string, input: { inviteeEmail: string; expiresInDays?: number }) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const inviteeEmail = normalizeEmail(input.inviteeEmail);
    if (inviteeEmail === access.user.email.toLowerCase()) throw inviteError('O Mestre já é proprietário da campanha.', 422);
    const expiresInDays = Math.min(Math.max(input.expiresInDays ?? DEFAULT_EXPIRY_DAYS, 1), 30);
    const token = randomBytes(32).toString('base64url');
    const invite = await prisma.campaignInvite.create({
      data: {
        campaignId,
        inviterId: access.user.id,
        inviteeEmail,
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      },
      include: { campaign: { select: { id: true, name: true } } }
    });
    void recordAudit({ campaignId, actorId: access.user.id, action: 'INVITE_CREATED', entityType: 'CampaignInvite', entityId: invite.id, metadata: { inviteeEmail, expiresInDays } }).catch(() => undefined);
    return { invite, token };
  },

  async listForCurrentUser() {
    const user = await requireUser();
    const now = new Date();
    await prisma.campaignInvite.updateMany({
      where: { inviteeEmail: user.email.toLowerCase(), status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' }
    });
    return prisma.campaignInvite.findMany({
      where: { inviteeEmail: user.email.toLowerCase(), status: 'PENDING', expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { id: true, name: true, description: true, coverImage: true } },
        inviter: { select: { name: true, email: true } }
      }
    });
  },

  async preview(token: string) {
    const invite = await findByToken(token);
    if (!invite) throw inviteError('Convite não encontrado.', 404);
    if (invite.status !== 'PENDING' || invite.expiresAt <= new Date()) throw inviteError('Este convite expirou ou já foi utilizado.', 410);
    return {
      id: invite.id,
      inviteeEmail: invite.inviteeEmail,
      expiresAt: invite.expiresAt,
      campaign: invite.campaign,
      inviter: invite.inviter
    };
  },

  async accept(token: string) {
    const user = await requireUser();
    const invite = await findForAcceptance(token);
    if (!invite) throw inviteError('Convite não encontrado.', 404);
    if (invite.status !== 'PENDING' || invite.expiresAt <= new Date()) {
      if (invite.status === 'PENDING') await prisma.campaignInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
      throw inviteError('Este convite expirou ou já foi utilizado.', 410);
    }
    if (user.email.toLowerCase() !== invite.inviteeEmail) throw inviteError('Entre com o e-mail que recebeu o convite.', 403);
    if (invite.campaign.ownerId === user.id) throw inviteError('Você já é o Mestre desta campanha.', 409);

    const member = await prisma.$transaction(async (tx) => {
      const createdMember = await tx.campaignMember.upsert({
        where: { campaignId_userId: { campaignId: invite.campaignId, userId: user.id } },
        update: { role: 'PLAYER' },
        create: { campaignId: invite.campaignId, userId: user.id, role: 'PLAYER' }
      });
      await tx.campaignInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
      return createdMember;
    });
    void recordAudit({ campaignId: invite.campaignId, actorId: user.id, action: 'INVITE_ACCEPTED', entityType: 'CampaignInvite', entityId: invite.id }).catch(() => undefined);
    return { member, campaign: invite.campaign };
  },

  async listForCampaign(campaignId: string) {
    await assertCampaignRole(campaignId, 'OWNER');
    return prisma.campaignInvite.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        inviteeEmail: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true
      }
    });
  },

  async revoke(campaignId: string, inviteId: string) {
    await assertCampaignRole(campaignId, 'OWNER');
    const invite = await prisma.campaignInvite.findFirst({ where: { id: inviteId, campaignId } });
    if (!invite) throw inviteError('Convite não encontrado.', 404);
    const revoked = await prisma.campaignInvite.update({ where: { id: inviteId }, data: { status: 'REVOKED' } });
    const user = await requireUser();
    void recordAudit({ campaignId, actorId: user.id, action: 'INVITE_REVOKED', entityType: 'CampaignInvite', entityId: revoked.id }).catch(() => undefined);
    return revoked;
  }
};
