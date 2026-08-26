import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCampaignRole: vi.fn(),
  campaignFindUnique: vi.fn(),
  campaignFileFindMany: vi.fn(),
  sessionFindMany: vi.fn(),
  timelineEventFindMany: vi.fn(),
  boardNodeFindMany: vi.fn()
}));

vi.mock('@/lib/access', () => ({ assertCampaignRole: mocks.assertCampaignRole, assertFileAccess: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: { findUnique: mocks.campaignFindUnique },
    campaignFile: { findMany: mocks.campaignFileFindMany },
    session: { findMany: mocks.sessionFindMany },
    timelineEvent: { findMany: mocks.timelineEventFindMany },
    boardNode: { findMany: mocks.boardNodeFindMany }
  }
}));

import { computeCampaignHealth } from './campaignHealthService';
import { timelineService } from './timelineService';

describe('V20.2 administrative service boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['P1', 'P2', 'P3', 'P4'])('bloqueia PLAYER %s no compilador antes de consultar dados privados', async () => {
    mocks.assertCampaignRole.mockRejectedValue({ status: 403, message: 'A operação exige acesso de Mestre.' });
    await expect(computeCampaignHealth('campaign-1')).rejects.toMatchObject({ status: 403 });
    expect(mocks.campaignFileFindMany).not.toHaveBeenCalled();
    expect(mocks.boardNodeFindMany).not.toHaveBeenCalled();
  });

  it.each(['P1', 'P2', 'P3', 'P4'])('bloqueia PLAYER %s na timeline antes de consultar evento ou arquivo', async () => {
    mocks.assertCampaignRole.mockRejectedValue({ status: 403, message: 'A operação exige acesso de Mestre.' });
    await expect(timelineService.list('campaign-1')).rejects.toMatchObject({ status: 403 });
    expect(mocks.timelineEventFindMany).not.toHaveBeenCalled();
  });

  it('consulta timeline de OWNER com projeção explícita, sem include amplo de arquivo', async () => {
    mocks.assertCampaignRole.mockResolvedValue({ role: 'OWNER' });
    mocks.timelineEventFindMany.mockResolvedValue([]);
    await timelineService.list('campaign-1');
    expect(mocks.timelineEventFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { campaignId: 'campaign-1' },
      select: expect.objectContaining({ id: true, file: { select: { id: true, name: true, type: true, isArchived: true, isTrashed: true } } })
    }));
  });
});
