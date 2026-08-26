import { prisma } from '@/lib/prisma';
import { requireUser, type PublicUser } from '@/lib/auth';

export type CampaignRole = 'OWNER' | 'PLAYER';

export class AccessDeniedError extends Error {
  status: number;

  constructor(message = 'Acesso não autorizado.', status = 403) {
    super(message);
    this.name = 'AccessDeniedError';
    this.status = status;
  }
}

export type CampaignAccess = {
  campaign: {
    id: string;
    ownerId: string;
    isArchived: boolean;
  };
  role: CampaignRole;
  user: PublicUser;
};

type AccessOptions = { write?: boolean };

export async function getCampaignAccess(campaignId: string, options: AccessOptions = {}): Promise<CampaignAccess> {
  const user = await requireUser();
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, ownerId: true, isArchived: true }
  });
  if (!campaign) throw new AccessDeniedError('Campanha não encontrada.', 404);

  if (campaign.ownerId === user.id) return { campaign, role: 'OWNER', user };

  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } },
    select: { role: true }
  });
  if (!membership) throw new AccessDeniedError();
  if (options.write) throw new AccessDeniedError('Jogadores têm acesso somente de leitura.', 403);
  return { campaign, role: 'PLAYER', user };
}

export async function assertCampaignAccess(campaignId: string, options: AccessOptions = {}) {
  return (await getCampaignAccess(campaignId, options)).campaign;
}

export async function assertCampaignRole(campaignId: string, role: CampaignRole) {
  const access = await getCampaignAccess(campaignId, { write: role === 'OWNER' });
  if (access.role !== role) throw new AccessDeniedError('A operação exige acesso de Mestre.', 403);
  return access;
}

export async function assertFileAccess(
  fileId: string,
  options: { campaignId?: string; includeTrashed?: boolean; write?: boolean } = {}
) {
  const file = await prisma.campaignFile.findUnique({
    where: { id: fileId },
        select: { id: true, campaignId: true, isTrashed: true, restrictToGrants: true }
  });
  if (!file) throw new AccessDeniedError('Arquivo não encontrado.', 404);
  if (options.campaignId && file.campaignId !== options.campaignId) {
    throw new AccessDeniedError('O arquivo não pertence à campanha informada.', 422);
  }
  const access = await getCampaignAccess(file.campaignId, { write: options.write });
  if (!options.includeTrashed && file.isTrashed) throw new AccessDeniedError('Arquivo indisponível.', 404);
  if (!options.write && access.role === 'PLAYER' && file.restrictToGrants) {
    const grant = await prisma.campaignFileGrant.findUnique({ where: { fileId_userId: { fileId: file.id, userId: access.user.id } }, select: { canView: true } });
    if (!grant?.canView) throw new AccessDeniedError('Arquivo não publicado para este jogador.', 404);
  }
  return file;
}

export async function assertOwnedCampaignForWrite(campaignId: string) {
  const access = await assertCampaignRole(campaignId, 'OWNER');
  if (access.campaign.isArchived) throw new AccessDeniedError('A campanha está arquivada.', 409);
  return access.campaign;
}
