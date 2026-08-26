import { vi, describe, it, expect } from 'vitest';

const state = vi.hoisted(() => {
  const campaignFileFindMany = vi.fn().mockResolvedValue([]);
  const boardNodeFindMany = vi.fn().mockResolvedValue([]);
  const prisma = {
    campaign: { findUnique: vi.fn().mockResolvedValue({ id: 'campaign-1', system: 'CUSTOM' }) },
    campaignFile: { findMany: campaignFileFindMany },
    session: { findMany: vi.fn().mockResolvedValue([]) },
    timelineEvent: { findMany: vi.fn().mockResolvedValue([]) },
    boardNode: { findMany: boardNodeFindMany },
    investigationHypothesis: { findMany: vi.fn().mockResolvedValue([]) },
    relationship: { findMany: vi.fn().mockResolvedValue([]) },
    investigationBoardPin: { findMany: vi.fn().mockResolvedValue([]) },
    investigationBoardGroup: { findMany: vi.fn().mockResolvedValue([]) },
    investigationBoardView: { findMany: vi.fn().mockResolvedValue([]) }
  };
  return { prisma, assertCampaignRole: vi.fn().mockResolvedValue(undefined), campaignFileFindMany, boardNodeFindMany };
});

vi.mock('@/lib/prisma', () => ({ prisma: state.prisma }));
vi.mock('@/lib/access', () => ({ assertCampaignRole: state.assertCampaignRole }));

import { computeCampaignHealth } from './campaignHealthService';

describe('campaignHealthService — escopo ativo', () => {
  it('exclui arquivos arquivados e na lixeira da análise oficial e do board', async () => {
    await computeCampaignHealth('campaign-1');

    expect(state.campaignFileFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { campaignId: 'campaign-1', isArchived: false, isTrashed: false }
    }));
    expect(state.boardNodeFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { campaignId: 'campaign-1', file: { isArchived: false, isTrashed: false } }
    }));
  });
});
