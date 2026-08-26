import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCampaignRole: vi.fn(),
  pinFindMany: vi.fn(),
  pinCreate: vi.fn(),
  pinFindUnique: vi.fn(),
  pinUpdate: vi.fn(),
  pinDelete: vi.fn(),
  groupFindMany: vi.fn(),
  groupCreate: vi.fn(),
  groupFindUnique: vi.fn(),
  groupUpdate: vi.fn(),
  groupDelete: vi.fn(),
  boardNodeFindMany: vi.fn(),
  transaction: vi.fn()
}));

vi.mock('@/lib/access', () => ({ assertCampaignRole: mocks.assertCampaignRole }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investigationBoardPin: { findMany: mocks.pinFindMany, create: mocks.pinCreate, findUnique: mocks.pinFindUnique, update: mocks.pinUpdate, delete: mocks.pinDelete },
    investigationBoardGroup: { findMany: mocks.groupFindMany, create: mocks.groupCreate, findUnique: mocks.groupFindUnique, update: mocks.groupUpdate, delete: mocks.groupDelete },
    boardNode: { findMany: mocks.boardNodeFindMany },
    $transaction: mocks.transaction
  }
}));

import { boardAnnotationService } from './boardAnnotationService';

const date = new Date('2026-08-25T12:00:00.000Z');
const pin = { id: 'pin-1', campaignId: 'campaign-1', text: 'Revisar pista', x: 40, y: 80, color: '#E5AC68', createdAt: date, updatedAt: date };
const group = { id: 'group-1', campaignId: 'campaign-1', name: 'Suspeitas', color: '#86AAA2', x: 10, y: 20, width: 320, height: 180, createdAt: date, updatedAt: date, items: [{ groupId: 'group-1', boardNodeId: 'node-1', boardNode: { fileId: 'file-1' } }] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertCampaignRole.mockResolvedValue({ role: 'OWNER' });
});

describe('boardAnnotationService', () => {
  it('bloqueia a listagem para PLAYER antes de consultar as anotações', async () => {
    mocks.assertCampaignRole.mockRejectedValue({ status: 403 });

    await expect(boardAnnotationService.list('campaign-1')).rejects.toMatchObject({ status: 403 });
    expect(mocks.pinFindMany).not.toHaveBeenCalled();
    expect(mocks.groupFindMany).not.toHaveBeenCalled();
  });

  it('lista pins e grupos somente no escopo da campanha e serializa datas', async () => {
    mocks.pinFindMany.mockResolvedValue([pin]);
    mocks.groupFindMany.mockResolvedValue([group]);

    const result = await boardAnnotationService.list('campaign-1');

    expect(mocks.assertCampaignRole).toHaveBeenCalledWith('campaign-1', 'OWNER');
    expect(mocks.pinFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1' } }));
    expect(mocks.groupFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1' } }));
    expect(result).toEqual({ pins: [{ ...pin, createdAt: date.toISOString(), updatedAt: date.toISOString() }], groups: [{ ...group, createdAt: date.toISOString(), updatedAt: date.toISOString(), items: [{ groupId: 'group-1', boardNodeId: 'node-1', fileId: 'file-1' }] }] });
  });

  it('rejeita pin vazio ou longo antes de gravar', async () => {
    await expect(boardAnnotationService.createPin('campaign-1', { text: '   ', x: 0, y: 0 })).rejects.toMatchObject({ status: 422 });
    await expect(boardAnnotationService.createPin('campaign-1', { text: 'x'.repeat(281), x: 0, y: 0 })).rejects.toMatchObject({ status: 422 });
    expect(mocks.pinCreate).not.toHaveBeenCalled();
  });

  it('cria pin somente após guard OWNER e normaliza texto/cor', async () => {
    mocks.pinCreate.mockResolvedValue(pin);

    const result = await boardAnnotationService.createPin('campaign-1', { text: '  Revisar pista  ', x: 40, y: 80, color: '#e5ac68' });

    expect(mocks.assertCampaignRole).toHaveBeenCalledWith('campaign-1', 'OWNER');
    expect(mocks.pinCreate).toHaveBeenCalledWith({ data: { campaignId: 'campaign-1', text: 'Revisar pista', x: 40, y: 80, color: '#E5AC68' } });
    expect(result.createdAt).toBe(date.toISOString());
  });

  it('rejeita grupo com nó de outra campanha antes da transação', async () => {
    mocks.boardNodeFindMany.mockResolvedValue([]);

    await expect(boardAnnotationService.createGroup('campaign-1', { name: 'Grupo', x: 0, y: 0, boardNodeIds: ['other-node'] })).rejects.toMatchObject({ status: 404 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('cria grupo e itens de forma transacional no mesmo escopo', async () => {
    mocks.boardNodeFindMany.mockResolvedValue([{ id: 'node-1' }]);
    const tx = {
      investigationBoardGroup: {
        create: vi.fn().mockResolvedValue({ id: 'group-1' }),
        findUnique: vi.fn().mockResolvedValue(group)
      },
      investigationBoardGroupItem: { createMany: vi.fn() }
    };
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const result = await boardAnnotationService.createGroup('campaign-1', { name: '  Suspeitas  ', x: 10, y: 20, boardNodeIds: ['node-1'] });

    expect(tx.investigationBoardGroup.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ campaignId: 'campaign-1', name: 'Suspeitas', width: 320, height: 180 }) }));
    expect(tx.investigationBoardGroupItem.createMany).toHaveBeenCalledWith({ data: [{ campaignId: 'campaign-1', groupId: 'group-1', boardNodeId: 'node-1' }] });
    expect(result.items).toEqual([{ groupId: 'group-1', boardNodeId: 'node-1', fileId: 'file-1' }]);
  });

  it('atualiza grupo e substitui composição somente após validar todos os nós', async () => {
    mocks.groupFindUnique.mockResolvedValue(group);
    mocks.boardNodeFindMany.mockResolvedValue([{ id: 'node-1' }]);
    const tx = {
      investigationBoardGroup: { update: vi.fn(), findUnique: vi.fn().mockResolvedValue({ ...group, name: 'Atualizado' }) },
      investigationBoardGroupItem: { deleteMany: vi.fn(), createMany: vi.fn() }
    };
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const result = await boardAnnotationService.updateGroup('group-1', { name: 'Atualizado', boardNodeIds: ['node-1'] });

    expect(tx.investigationBoardGroupItem.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
    expect(tx.investigationBoardGroupItem.createMany).toHaveBeenCalled();
    expect(result.name).toBe('Atualizado');
  });
});
