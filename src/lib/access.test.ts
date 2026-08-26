import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireUserMock, campaignFindUniqueMock, membershipFindUniqueMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  campaignFindUniqueMock: vi.fn(),
  membershipFindUniqueMock: vi.fn()
}));

vi.mock('@/lib/auth', () => ({
  requireUser: requireUserMock
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findUnique: campaignFindUniqueMock },
    campaignMember: { findUnique: membershipFindUniqueMock }
  }
}));

import { AccessDeniedError, assertCampaignRole, getCampaignAccess } from '@/lib/access';

const owner = { id: 'user-owner', name: 'Mestre', email: 'mestre@example.com' };
const player = { id: 'user-player', name: 'Jogador', email: 'jogador@example.com' };
const campaign = { id: 'campaign-1', ownerId: owner.id, isArchived: false };

describe('campaign access guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignFindUniqueMock.mockResolvedValue(campaign);
    membershipFindUniqueMock.mockResolvedValue(null);
  });

  it('permite leitura completa ao Mestre proprietário', async () => {
    requireUserMock.mockResolvedValue(owner);

    await expect(getCampaignAccess(campaign.id)).resolves.toMatchObject({ role: 'OWNER', user: owner });
    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
  });

  it('permite leitura ao jogador membro e identifica o papel', async () => {
    requireUserMock.mockResolvedValue(player);
    membershipFindUniqueMock.mockResolvedValue({ role: 'PLAYER' });

    await expect(getCampaignAccess(campaign.id)).resolves.toMatchObject({ role: 'PLAYER', user: player });
  });

  it('bloqueia mutações para jogador mesmo com membership válido', async () => {
    requireUserMock.mockResolvedValue(player);
    membershipFindUniqueMock.mockResolvedValue({ role: 'PLAYER' });

    await expect(getCampaignAccess(campaign.id, { write: true })).rejects.toMatchObject({
      name: 'AccessDeniedError',
      status: 403,
      message: 'Jogadores têm acesso somente de leitura.'
    });
    await expect(assertCampaignRole(campaign.id, 'OWNER')).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it('nega acesso a usuário que não é proprietário nem membro', async () => {
    requireUserMock.mockResolvedValue({ id: 'outsider', name: 'Fora', email: 'fora@example.com' });

    await expect(getCampaignAccess(campaign.id)).rejects.toMatchObject({ status: 403 });
  });

  it('retorna 404 para campanha inexistente sem revelar detalhes', async () => {
    requireUserMock.mockResolvedValue(owner);
    campaignFindUniqueMock.mockResolvedValue(null);

    await expect(getCampaignAccess('missing')).rejects.toMatchObject({ status: 404, message: 'Campanha não encontrada.' });
  });
});
