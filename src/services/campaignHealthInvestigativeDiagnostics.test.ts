import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
  const campaignFileFindMany = vi.fn();
  const boardNodeFindMany = vi.fn();
  const investigationHypothesisFindMany = vi.fn();
  const relationshipFindMany = vi.fn();
  const investigationBoardPinFindMany = vi.fn();
  const investigationBoardGroupFindMany = vi.fn();
  const investigationBoardViewFindMany = vi.fn();
  return {
    campaign: { findUnique: vi.fn() },
    campaignFile: { findMany: campaignFileFindMany },
    session: { findMany: vi.fn() },
    timelineEvent: { findMany: vi.fn() },
    boardNode: { findMany: boardNodeFindMany },
    investigationHypothesis: { findMany: investigationHypothesisFindMany },
    relationship: { findMany: relationshipFindMany },
    investigationBoardPin: { findMany: investigationBoardPinFindMany },
    investigationBoardGroup: { findMany: investigationBoardGroupFindMany },
    investigationBoardView: { findMany: investigationBoardViewFindMany },
    assertCampaignRole: vi.fn()
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: state }));
vi.mock('@/lib/access', () => ({ assertCampaignRole: state.assertCampaignRole }));

import { computeCampaignHealth } from './campaignHealthService';

describe('campaignHealthService — diagnósticos Q06', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.assertCampaignRole.mockResolvedValue(undefined);
    state.campaign.findUnique.mockResolvedValue({ id: 'campaign-1', system: 'CUSTOM' });
    state.campaignFile.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'critical', name: 'Pista crítica', type: 'CLUE', isArchived: false, isTrashed: false, data: { critical: true } }]);
    state.session.findMany.mockResolvedValue([]);
    state.timelineEvent.findMany.mockResolvedValue([]);
    state.boardNode.findMany.mockResolvedValue([]);
    state.investigationHypothesis.findMany.mockResolvedValue([{ id: 'h-open', title: 'Hipótese aberta', status: 'OPEN', evidence: [] }]);
    state.relationship.findMany.mockResolvedValue([]);
    state.investigationBoardPin.findMany.mockResolvedValue([]);
    state.investigationBoardGroup.findMany.mockResolvedValue([]);
    state.investigationBoardView.findMany.mockResolvedValue([]);
  });

  it('integra regra, severidade e ação no resultado OWNER-only', async () => {
    const health = await computeCampaignHealth('campaign-1');
    const diagnostics = [...health.errors, ...health.warnings, ...health.suggestions];
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'CRITICAL_CLUE_WITHOUT_HYPOTHESIS', severity: 'warning', action: expect.objectContaining({ href: '/campaigns/campaign-1/investigacao' }) }),
      expect.objectContaining({ code: 'HYPOTHESIS_WITHOUT_EVIDENCE', severity: 'warning', explanation: expect.any(String) })
    ]));
    expect(state.assertCampaignRole).toHaveBeenCalledWith('campaign-1', 'OWNER');
  });
});
