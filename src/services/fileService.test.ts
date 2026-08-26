import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  campaignFileFindUnique: vi.fn(),
  campaignFileFindFirst: vi.fn(),
  commentCreate: vi.fn(),
  getViewerContext: vi.fn(),
  publishedFileWhere: vi.fn(),
  recordAudit: vi.fn(),
  assertCampaignAccess: vi.fn(),
  tagFindMany: vi.fn(),
  campaignFileCreate: vi.fn(),
  transaction: vi.fn(),
  logHistory: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaignFile: { findUnique: mocks.campaignFileFindUnique, findFirst: mocks.campaignFileFindFirst, create: mocks.campaignFileCreate },
    comment: { create: mocks.commentCreate },
    tag: { findMany: mocks.tagFindMany },
    $transaction: mocks.transaction,
    favoriteFolder: { findFirst: vi.fn(), create: vi.fn() },
    favoriteEntry: { deleteMany: vi.fn() }
  }
}));
vi.mock('@/lib/access', () => ({ assertCampaignAccess: mocks.assertCampaignAccess, assertFileAccess: vi.fn(), getCampaignAccess: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/services/auditService', () => ({ recordAudit: mocks.recordAudit }));
vi.mock('./historyService', () => ({ logHistory: mocks.logHistory }));
vi.mock('./favoriteFolderService', () => ({ favoriteFolderService: { create: vi.fn(), addFile: vi.fn() } }));
vi.mock('@/lib/publicationPolicy', () => ({
  getViewerContext: mocks.getViewerContext,
  publishedFileWhere: mocks.publishedFileWhere,
  publicationSelect: { file: {} }
}));

import { fileService } from './fileService';

describe('fileService publication boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.campaignFileFindUnique.mockResolvedValue({ campaignId: 'campaign-1' });
    mocks.getViewerContext.mockResolvedValue({ kind: 'PLAYER', campaignId: 'campaign-1', userId: 'player-1', audience: 'P1' });
    mocks.publishedFileWhere.mockReturnValue({ campaignId: 'campaign-1', isArchived: false, isTrashed: false, playerVisibility: { isVisible: true } });
    mocks.recordAudit.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation((callback) => callback({
      tag: { findMany: mocks.tagFindMany },
      campaignFile: { create: mocks.campaignFileCreate }
    }));
  });

  it('nega leitura direta de arquivo que não pertence à projeção publicada do jogador', async () => {
    mocks.campaignFileFindFirst.mockResolvedValue(null);
    await expect(fileService.get('file-private')).resolves.toBeNull();
    expect(mocks.publishedFileWhere).toHaveBeenCalledWith(expect.objectContaining({ kind: 'PLAYER', userId: 'player-1' }));
  });

  it('recusa comentário de arquivo sem sessão antes de qualquer escrita', async () => {
    mocks.getViewerContext.mockRejectedValue(Object.assign(new Error('Autenticação obrigatória.'), { status: 401 }));
    await expect(fileService.addComment('file-1', 'Tentativa anônima')).rejects.toMatchObject({ status: 401 });
    expect(mocks.commentCreate).not.toHaveBeenCalled();
  });

  it('recusa comentário em arquivo privado mesmo para membro autenticado', async () => {
    mocks.campaignFileFindFirst.mockResolvedValue(null);
    await expect(fileService.addComment('file-private', 'Não devo escrever aqui')).rejects.toMatchObject({ status: 404 });
    expect(mocks.commentCreate).not.toHaveBeenCalled();
  });

  it('persiste comentário com o autor autenticado somente após validar campanha e publicação', async () => {
    mocks.campaignFileFindFirst.mockResolvedValue({ id: 'file-public', campaignId: 'campaign-1' });
    mocks.commentCreate.mockResolvedValue({ id: 'comment-1', fileId: 'file-public', authorId: 'player-1', body: 'Comentário permitido' });
    await expect(fileService.addComment('file-public', 'Comentário permitido')).resolves.toMatchObject({ authorId: 'player-1' });
    expect(mocks.commentCreate).toHaveBeenCalledWith({ data: { fileId: 'file-public', body: 'Comentário permitido', authorId: 'player-1' } });
  });

  it('cria arquivo apenas quando todas as tags existem na mesma campanha', async () => {
    mocks.tagFindMany.mockResolvedValue([{ id: 'tag-1', campaignId: 'campaign-1' }]);
    mocks.campaignFileCreate.mockResolvedValue({ id: 'file-1', name: 'Documento', campaignId: 'campaign-1' });
    await expect(fileService.create({ campaignId: 'campaign-1', type: 'DOCUMENT', name: 'Documento', tagIds: ['tag-1'] })).resolves.toMatchObject({ id: 'file-1' });
    expect(mocks.campaignFileCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tags: { create: [{ tagId: 'tag-1' }] } }) }));
  });

  it('rejeita tag de outra campanha sem criar arquivo', async () => {
    mocks.tagFindMany.mockResolvedValue([{ id: 'tag-outra', campaignId: 'campaign-2' }]);
    await expect(fileService.create({ campaignId: 'campaign-1', type: 'DOCUMENT', name: 'Documento', tagIds: ['tag-outra'] })).rejects.toMatchObject({ status: 422 });
    expect(mocks.campaignFileCreate).not.toHaveBeenCalled();
  });

  it('rejeita tags duplicadas antes de iniciar transação', async () => {
    await expect(fileService.create({ campaignId: 'campaign-1', type: 'DOCUMENT', name: 'Documento', tagIds: ['tag-1', 'tag-1'] })).rejects.toMatchObject({ status: 422 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
