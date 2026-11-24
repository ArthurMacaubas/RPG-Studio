import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CAMPAIGN_THEME, MEDIEVAL_FANTASY_THEME } from '@/lib/campaignTheme';

const mocks = vi.hoisted(() => ({
  assertCampaignRole: vi.fn(),
  assertOwnedCampaignForWrite: vi.fn(),
  campaignFindUnique: vi.fn(),
  campaignUpdate: vi.fn(),
  themeFindFirst: vi.fn(),
  themeFindMany: vi.fn(),
  themeCreate: vi.fn(),
  themeUpdate: vi.fn(),
  presetFindMany: vi.fn(),
  presetFindFirst: vi.fn(),
  presetCreate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock('@/lib/access', () => ({
  AccessDeniedError: class AccessDeniedError extends Error { constructor(message: string, public status: number) { super(message); } },
  assertCampaignRole: mocks.assertCampaignRole,
  assertOwnedCampaignForWrite: mocks.assertOwnedCampaignForWrite
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findUnique: mocks.campaignFindUnique, update: mocks.campaignUpdate },
    campaignTheme: { findFirst: mocks.themeFindFirst, findMany: mocks.themeFindMany, create: mocks.themeCreate, update: mocks.themeUpdate },
    themePreset: { findMany: mocks.presetFindMany, findFirst: mocks.presetFindFirst, create: mocks.presetCreate },
    auditEvent: { create: mocks.auditCreate },
    $transaction: mocks.transaction
  }
}));

import { campaignThemeService } from './campaignThemeService';

describe('campaignThemeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertCampaignRole.mockResolvedValue({ role: 'OWNER', user: { id: 'owner-1' } });
    mocks.assertOwnedCampaignForWrite.mockResolvedValue({ id: 'campaign-a', ownerId: 'owner-1' });
    mocks.auditCreate.mockResolvedValue({ id: 'audit-1' });
  });

  it('entrega ao layout apenas o snapshot publicado, nunca o rascunho', async () => {
    mocks.campaignFindUnique.mockResolvedValue({ activeTheme: { id: 'theme-1', name: 'Medieval Fantasy', draftConfig: DEFAULT_CAMPAIGN_THEME, publishedConfig: MEDIEVAL_FANTASY_THEME, publishedAt: new Date() } });
    const result = await campaignThemeService.publishedForCampaign('campaign-a');
    expect(result?.config).toEqual(MEDIEVAL_FANTASY_THEME);
    expect(result?.config).not.toEqual(DEFAULT_CAMPAIGN_THEME);
  });

  it('bloqueia listagem administrativa de PLAYER antes de consultar temas', async () => {
    mocks.assertCampaignRole.mockRejectedValue({ status: 403 });
    await expect(campaignThemeService.list('campaign-a')).rejects.toMatchObject({ status: 403 });
    expect(mocks.themeFindMany).not.toHaveBeenCalled();
    expect(mocks.presetFindMany).not.toHaveBeenCalled();
  });

  it('isola a busca do tema pelo identificador da campanha ao aplicar', async () => {
    mocks.themeFindFirst.mockResolvedValue({ id: 'theme-a', campaignId: 'campaign-a', publishedConfig: MEDIEVAL_FANTASY_THEME });
    mocks.campaignUpdate.mockReturnValue({ operation: 'update-campaign-a' });
    mocks.auditCreate.mockReturnValue({ operation: 'audit' });
    mocks.transaction.mockResolvedValue([]);
    await expect(campaignThemeService.apply('campaign-a', 'theme-a')).resolves.toEqual({ activeThemeId: 'theme-a' });
    expect(mocks.themeFindFirst).toHaveBeenCalledWith({ where: { id: 'theme-a', campaignId: 'campaign-a' } });
    expect(mocks.campaignUpdate).toHaveBeenCalledWith({ where: { id: 'campaign-a' }, data: { activeThemeId: 'theme-a' } });
  });

  it('não aplica um rascunho não publicado', async () => {
    mocks.themeFindFirst.mockResolvedValue({ id: 'theme-a', campaignId: 'campaign-a', publishedConfig: null });
    await expect(campaignThemeService.apply('campaign-a', 'theme-a')).rejects.toMatchObject({ status: 409 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
