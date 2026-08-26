import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCampaignAccess: vi.fn(),
  boardNodeFindMany: vi.fn(),
  boardNodeUpdate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock('@/lib/access', () => ({ assertCampaignAccess: mocks.assertCampaignAccess, getCampaignAccess: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    boardNode: { findMany: mocks.boardNodeFindMany, update: mocks.boardNodeUpdate },
    $transaction: mocks.transaction
  }
}));

import { boardService } from './boardService';

describe('boardService.updatePositions — Q07', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertCampaignAccess.mockResolvedValue({ role: 'OWNER' });
    mocks.boardNodeFindMany.mockResolvedValue([{ fileId: 'file-a' }, { fileId: 'file-b' }]);
    mocks.boardNodeUpdate.mockImplementation(({ where, data }: { where: { fileId: string }; data: { x: number; y: number } }) => Promise.resolve({ id: `node-${where.fileId}`, fileId: where.fileId, ...data }));
    mocks.transaction.mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations));
  });

  it('exige escrita OWNER antes de consultar nós', async () => {
    mocks.assertCampaignAccess.mockRejectedValue({ status: 403 });

    await expect(boardService.updatePositions('campaign-1', [{ fileId: 'file-a', x: 10, y: 20 }])).rejects.toMatchObject({ status: 403 });
    expect(mocks.boardNodeFindMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('rejeita posições duplicadas sem abrir transação', async () => {
    await expect(boardService.updatePositions('campaign-1', [{ fileId: 'file-a', x: 10, y: 20 }, { fileId: 'file-a', x: 30, y: 40 }])).rejects.toMatchObject({ status: 422 });
    expect(mocks.boardNodeFindMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('rejeita nó fora do quadro campaign-scoped antes de gravar', async () => {
    mocks.boardNodeFindMany.mockResolvedValue([{ fileId: 'file-a' }]);

    await expect(boardService.updatePositions('campaign-1', [{ fileId: 'file-a', x: 10, y: 20 }, { fileId: 'file-b', x: 30, y: 40 }])).rejects.toMatchObject({ status: 422 });
    expect(mocks.boardNodeUpdate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('atualiza todas as posições em uma transação depois da confirmação', async () => {
    const result = await boardService.updatePositions('campaign-1', [{ fileId: 'file-b', x: 230, y: 40 }, { fileId: 'file-a', x: 40, y: 40 }]);

    expect(mocks.assertCampaignAccess).toHaveBeenCalledWith('campaign-1', { write: true });
    expect(mocks.boardNodeFindMany).toHaveBeenCalledWith({ where: { campaignId: 'campaign-1', fileId: { in: ['file-b', 'file-a'] } }, select: { fileId: true } });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(result.positions).toEqual([{ id: 'node-file-b', fileId: 'file-b', x: 230, y: 40 }, { id: 'node-file-a', fileId: 'file-a', x: 40, y: 40 }]);
  });
});
