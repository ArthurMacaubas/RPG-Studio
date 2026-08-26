import { vi, describe, it, expect, beforeEach } from 'vitest';

const state = vi.hoisted(() => {
  const assertCampaignAccess = vi.fn();
  const campaignAttributeFindFirst = vi.fn();
  const campaignAttributeFindUnique = vi.fn();
  const campaignAttributeCount = vi.fn();
  const campaignAttributeCreate = vi.fn();
  const campaignAttributeUpdate = vi.fn();
  const campaignSkillFindFirst = vi.fn();
  const campaignSkillCount = vi.fn();
  const campaignSkillCreate = vi.fn();
  const campaignClassFindFirst = vi.fn();
  const campaignClassCreate = vi.fn();
  const campaignRaceFindFirst = vi.fn();
  const campaignRaceCreate = vi.fn();
  const prisma = {
    campaignAttribute: { findFirst: campaignAttributeFindFirst, findUnique: campaignAttributeFindUnique, count: campaignAttributeCount, create: campaignAttributeCreate, update: campaignAttributeUpdate },
    campaignSkill: { findFirst: campaignSkillFindFirst, count: campaignSkillCount, create: campaignSkillCreate },
    campaignClass: { findFirst: campaignClassFindFirst, create: campaignClassCreate },
    campaignRace: { findFirst: campaignRaceFindFirst, create: campaignRaceCreate }
  };
  return {
    prisma,
    assertCampaignAccess,
    campaignAttributeFindFirst,
    campaignAttributeFindUnique,
    campaignAttributeCount,
    campaignAttributeCreate,
    campaignAttributeUpdate,
    campaignSkillFindFirst,
    campaignSkillCount,
    campaignSkillCreate,
    campaignClassFindFirst,
    campaignClassCreate,
    campaignRaceFindFirst,
    campaignRaceCreate
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: state.prisma }));
vi.mock('@/lib/access', () => ({ assertCampaignAccess: state.assertCampaignAccess }));

import { customSystemService } from './customSystemService';

describe('customSystemService — invariantes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.assertCampaignAccess.mockResolvedValue(undefined);
    state.campaignAttributeCount.mockResolvedValue(0);
    state.campaignSkillCount.mockResolvedValue(0);
    state.campaignAttributeCreate.mockResolvedValue({ id: 'attr-new' });
    state.campaignSkillCreate.mockResolvedValue({ id: 'skill-new' });
    state.campaignClassCreate.mockResolvedValue({ id: 'class-new' });
    state.campaignRaceCreate.mockResolvedValue({ id: 'race-new' });
    state.campaignAttributeFindFirst.mockResolvedValue(null);
    state.campaignSkillFindFirst.mockResolvedValue(null);
    state.campaignClassFindFirst.mockResolvedValue(null);
    state.campaignRaceFindFirst.mockResolvedValue(null);
  });

  it('rejeita mínimo maior que máximo', async () => {
    await expect(customSystemService.createAttribute('campaign-1', { name: 'Sanidade', min: 10, max: 1, defaultVal: 5 })).rejects.toMatchObject({ status: 422 });
    expect(state.campaignAttributeCreate).not.toHaveBeenCalled();
  });

  it('rejeita default fora do intervalo', async () => {
    await expect(customSystemService.createAttribute('campaign-1', { name: 'Sanidade', min: 0, max: 10, defaultVal: 11 })).rejects.toMatchObject({ status: 422 });
    expect(state.campaignAttributeCreate).not.toHaveBeenCalled();
  });

  it('rejeita valores fracionários e nomes duplicados', async () => {
    await expect(customSystemService.createAttribute('campaign-1', { name: 'Sanidade', min: 0.5, max: 10, defaultVal: 1 })).rejects.toMatchObject({ status: 422 });

    state.campaignAttributeFindFirst.mockResolvedValue({ id: 'attr-existing' });
    await expect(customSystemService.createAttribute('campaign-1', { name: 'sanidade' })).rejects.toMatchObject({ status: 409 });
    expect(state.campaignAttributeCreate).not.toHaveBeenCalled();
  });

  it('rejeita linkedAttr inexistente ou pertencente a outra campanha', async () => {
    state.campaignAttributeFindFirst.mockResolvedValue(null);

    await expect(customSystemService.createSkill('campaign-1', { name: 'Vontade', linkedAttr: 'attr-other' })).rejects.toMatchObject({ status: 422 });
    expect(state.campaignSkillCreate).not.toHaveBeenCalled();
  });

  it('aceita linkedAttr da mesma campanha e grava a referência normalizada', async () => {
    state.campaignAttributeFindFirst.mockResolvedValue({ id: 'attr-1' });

    await customSystemService.createSkill('campaign-1', { name: 'Vontade', linkedAttr: ' attr-1 ' });

    expect(state.campaignSkillCreate).toHaveBeenCalledWith({ data: { campaignId: 'campaign-1', name: 'Vontade', linkedAttr: 'attr-1', order: 0 } });
  });
});
