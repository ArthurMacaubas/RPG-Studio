import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCampaignRole: vi.fn(),
  viewFindMany: vi.fn(),
  viewFindUnique: vi.fn(),
  viewCreate: vi.fn(),
  viewUpdate: vi.fn(),
  viewDelete: vi.fn(),
  viewCount: vi.fn(),
  pinFindMany: vi.fn(),
  groupFindMany: vi.fn(),
  transaction: vi.fn()
}));

vi.mock('@/lib/access', () => ({ assertCampaignRole: mocks.assertCampaignRole }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investigationBoardView: {
      findMany: mocks.viewFindMany,
      findUnique: mocks.viewFindUnique,
      create: mocks.viewCreate,
      update: mocks.viewUpdate,
      delete: mocks.viewDelete,
      count: mocks.viewCount
    },
    investigationBoardPin: { findMany: mocks.pinFindMany },
    investigationBoardGroup: { findMany: mocks.groupFindMany },
    $transaction: mocks.transaction
  }
}));

import { boardViewService, validateBoardViewSnapshot } from './boardViewService';

const date = new Date('2026-08-25T12:00:00.000Z');
const snapshot = {
  pan: { x: 12, y: -8 },
  zoom: 1,
  filters: {
    search: '', fileType: 'ALL', tagIds: [], scope: 'active', favoritesOnly: false,
    relationshipImportance: 'ALL', relationshipVisibility: 'ALL', hypothesisStatus: 'ALL', evidenceStance: 'ALL',
    layers: { files: true, officialRelationships: true, visualEdges: true, evidence: true, hypotheses: true, annotations: true }
  },
  pinIds: [],
  groupIds: []
} as const;
const view = { id: 'view-1', campaignId: 'campaign-1', name: 'Caso inicial', kind: 'CASE' as const, description: null, order: 0, snapshot, createdAt: date, updatedAt: date };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertCampaignRole.mockResolvedValue({ role: 'OWNER' });
  mocks.pinFindMany.mockResolvedValue([]);
  mocks.groupFindMany.mockResolvedValue([]);
  mocks.viewCount.mockResolvedValue(0);
  mocks.viewCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...view, ...data, snapshot: data.snapshot }));
  mocks.viewUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...view, ...data, snapshot: data.snapshot ?? view.snapshot }));
  mocks.transaction.mockResolvedValue([]);
});

describe('boardViewService', () => {
  it('bloqueia listagem antes de consultar dados quando o usuário não é OWNER', async () => {
    mocks.assertCampaignRole.mockRejectedValue({ status: 403 });

    await expect(boardViewService.list('campaign-1')).rejects.toMatchObject({ status: 403 });
    expect(mocks.viewFindMany).not.toHaveBeenCalled();
  });

  it('lista vistas em ordem e omite referências de anotações ausentes com aviso', async () => {
    mocks.viewFindMany.mockResolvedValue([{ ...view, snapshot: { ...snapshot, pinIds: ['missing-pin'], groupIds: ['missing-group'] } }]);

    const result = await boardViewService.list('campaign-1');

    expect(result.views[0]).toMatchObject({ id: 'view-1', name: 'Caso inicial', snapshot: { pinIds: [], groupIds: [] } });
    expect(result.warnings).toHaveLength(1);
    expect(mocks.viewFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1' } }));
  });

  it('valida o snapshot e referências antes de criar a vista', async () => {
    const result = await boardViewService.create('campaign-1', { name: '  Caso inicial  ', kind: 'CASE', snapshot });

    expect(mocks.assertCampaignRole).toHaveBeenCalledWith('campaign-1', 'OWNER');
    expect(mocks.viewCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ campaignId: 'campaign-1', name: 'Caso inicial', kind: 'CASE' }) }));
    expect(result.snapshot.pan).toEqual({ x: 12, y: -8 });
  });

  it('rejeita referência fora da campanha sem criar registro', async () => {
    mocks.pinFindMany.mockResolvedValue([]);
    await expect(boardViewService.create('campaign-1', { name: 'Inválida', kind: 'SESSION', snapshot: { ...snapshot, pinIds: ['other-pin'] } })).rejects.toMatchObject({ status: 404 });
    expect(mocks.viewCreate).not.toHaveBeenCalled();
  });

  it('rejeita zoom fora do limite e nomes vazios', () => {
    expect(() => validateBoardViewSnapshot({ ...snapshot, zoom: 2.5 })).toThrow(/zoom/i);
    expect(() => validateBoardViewSnapshot({ ...snapshot, filters: { ...snapshot.filters, layers: { ...snapshot.filters.layers, files: 'yes' } } })).toThrow(/camada/i);
  });

  it('reordena somente as vistas da campanha em uma transação', async () => {
    mocks.viewFindMany.mockResolvedValue([{ ...view, id: 'view-1' }, { ...view, id: 'view-2' }]);

    await boardViewService.reorder('campaign-1', ['view-2', 'view-1']);

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Array));
  });
});
