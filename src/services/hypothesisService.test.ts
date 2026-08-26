import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCampaignRole: vi.fn(),
  assertOwnedCampaignForWrite: vi.fn(),
  hypothesisFindMany: vi.fn(),
  hypothesisFindFirst: vi.fn(),
  hypothesisCreate: vi.fn(),
  hypothesisUpdate: vi.fn(),
  hypothesisDelete: vi.fn(),
  fileFindFirst: vi.fn(),
  transaction: vi.fn()
}));

vi.mock('@/lib/access', () => ({
  assertCampaignRole: mocks.assertCampaignRole,
  assertOwnedCampaignForWrite: mocks.assertOwnedCampaignForWrite
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investigationHypothesis: {
      findMany: mocks.hypothesisFindMany,
      findFirst: mocks.hypothesisFindFirst,
      create: mocks.hypothesisCreate,
      update: mocks.hypothesisUpdate,
      delete: mocks.hypothesisDelete
    },
    campaignFile: { findFirst: mocks.fileFindFirst },
    $transaction: mocks.transaction
  }
}));

import { hypothesisService } from './hypothesisService';

const date = new Date('2026-08-25T12:00:00.000Z');
const file = { id: 'file-1', name: 'Pista do armário', type: 'CLUE' as const, isTrashed: false, isArchived: false };
const evidence = { id: 'evidence-1', hypothesisId: 'hypothesis-1', fileId: file.id, stance: 'SUPPORTS' as const, note: 'Indício sintético.', order: 0, createdAt: date, updatedAt: date, file };
const hypothesis = { id: 'hypothesis-1', campaignId: 'campaign-1', title: 'O zelador esconde a chave', summary: 'Linha de investigação.', status: 'OPEN' as const, createdAt: date, updatedAt: date, evidence: [evidence] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertCampaignRole.mockResolvedValue({ role: 'OWNER' });
  mocks.assertOwnedCampaignForWrite.mockResolvedValue({ id: 'campaign-1', isArchived: false });
});

describe('hypothesisService', () => {
  it('bloqueia a listagem antes de consultar hipóteses quando o usuário não é OWNER', async () => {
    mocks.assertCampaignRole.mockRejectedValue({ status: 403 });

    await expect(hypothesisService.list('campaign-1')).rejects.toMatchObject({ status: 403 });
    expect(mocks.hypothesisFindMany).not.toHaveBeenCalled();
  });

  it('lista somente hipóteses da campanha informada e serializa as datas', async () => {
    mocks.hypothesisFindMany.mockResolvedValue([hypothesis]);

    const result = await hypothesisService.list('campaign-1', 'OPEN');

    expect(mocks.hypothesisFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1', status: 'OPEN' } }));
    expect(result[0]).toMatchObject({ id: 'hypothesis-1', campaignId: 'campaign-1', createdAt: date.toISOString(), evidence: [{ file: { id: 'file-1', name: 'Pista do armário' } }] });
  });

  it('cria hipótese somente após guard de escrita OWNER', async () => {
    mocks.hypothesisCreate.mockResolvedValue({ ...hypothesis, evidence: [] });

    const result = await hypothesisService.create('campaign-1', { title: '  Nova linha  ', summary: '  Resumo  ' });

    expect(mocks.assertOwnedCampaignForWrite).toHaveBeenCalledWith('campaign-1');
    expect(mocks.hypothesisCreate).toHaveBeenCalledWith(expect.objectContaining({ data: { campaignId: 'campaign-1', title: 'Nova linha', summary: 'Resumo' } }));
    expect(result.title).toBe('O zelador esconde a chave');
  });

  it('adiciona evidência somente para arquivo da mesma campanha e evita duplicidade', async () => {
    mocks.hypothesisFindFirst.mockResolvedValue(hypothesis);
    mocks.fileFindFirst.mockResolvedValue(file);
    const tx = {
      hypothesisEvidence: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(evidence)
      }
    };
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const result = await hypothesisService.addEvidence('campaign-1', 'hypothesis-1', { fileId: 'file-1', stance: 'SUPPORTS', note: 'Indício.' });

    expect(mocks.fileFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'file-1', campaignId: 'campaign-1', isTrashed: false } }));
    expect(tx.hypothesisEvidence.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hypothesisId: 'hypothesis-1', fileId: 'file-1', stance: 'SUPPORTS', order: 0 }) }));
    expect(result).toMatchObject({ fileId: 'file-1', stance: 'SUPPORTS' });
  });

  it('rejeita arquivo fora da campanha antes de abrir transação', async () => {
    mocks.hypothesisFindFirst.mockResolvedValue(hypothesis);
    mocks.fileFindFirst.mockResolvedValue(null);

    await expect(hypothesisService.addEvidence('campaign-1', 'hypothesis-1', { fileId: 'other-file', stance: 'CONTEXT' })).rejects.toMatchObject({ status: 422 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('retorna conflito para arquivo já vinculado à hipótese', async () => {
    mocks.hypothesisFindFirst.mockResolvedValue(hypothesis);
    mocks.fileFindFirst.mockResolvedValue(file);
    const tx = {
      hypothesisEvidence: {
        findUnique: vi.fn().mockResolvedValue({ id: 'existing' }),
        findFirst: vi.fn(),
        create: vi.fn()
      }
    };
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    await expect(hypothesisService.addEvidence('campaign-1', 'hypothesis-1', { fileId: 'file-1', stance: 'CONTEXT' })).rejects.toMatchObject({ status: 409 });
    expect(tx.hypothesisEvidence.create).not.toHaveBeenCalled();
  });
});
