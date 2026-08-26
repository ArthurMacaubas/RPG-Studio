import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCampaignAccess: vi.fn(),
  assertCampaignAccess: vi.fn(),
  assertFileAccess: vi.fn(),
  recordAudit: vi.fn(),
  campaignMemberFindUnique: vi.fn(),
  playerModeConfigFindUnique: vi.fn(),
  campaignFileFindMany: vi.fn(),
  listForPlayer: vi.fn(),
  listForPublic: vi.fn(),
  getViewerContext: vi.fn(),
  getPublicViewerContext: vi.fn(),
  publishedFileWhere: vi.fn(),
  publicationStateOf: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaignMember: { findUnique: mocks.campaignMemberFindUnique },
    playerModeConfig: { findUnique: mocks.playerModeConfigFindUnique },
    campaignFile: { findMany: mocks.campaignFileFindMany }
  }
}));
vi.mock('@/lib/access', () => ({ getCampaignAccess: mocks.getCampaignAccess, assertCampaignAccess: mocks.assertCampaignAccess, assertFileAccess: mocks.assertFileAccess }));
vi.mock('@/services/auditService', () => ({ recordAudit: mocks.recordAudit }));
vi.mock('./relationshipService', () => ({ relationshipService: { listForPlayer: mocks.listForPlayer, listForPublic: mocks.listForPublic } }));
vi.mock('@/lib/publicationPolicy', () => ({
  getViewerContext: mocks.getViewerContext,
  getPublicViewerContext: mocks.getPublicViewerContext,
  publishedFileWhere: mocks.publishedFileWhere,
  publicationStateOf: mocks.publicationStateOf,
  publicationSelect: { file: {}, campaign: {} }
}));

import { playerModeService } from './playerModeService';

describe('playerModeService.previewForMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCampaignAccess.mockResolvedValue({ role: 'OWNER', user: { id: 'gm-1' } });
    mocks.campaignMemberFindUnique.mockResolvedValue({ id: 'member-1', userId: 'player-1', audience: 'P1', user: { id: 'player-1', name: 'Ana', email: 'ana@example.com' } });
    mocks.recordAudit.mockResolvedValue(undefined);
    mocks.publishedFileWhere.mockReturnValue({ campaignId: 'campaign-1', isTrashed: false, isArchived: false, playerVisibility: { isVisible: true } });
  });

  it('não simula conteúdo quando o Modo Jogador está pausado', async () => {
    mocks.playerModeConfigFindUnique.mockResolvedValue({ isEnabled: false });
    const preview = await playerModeService.previewForMember('campaign-1', 'player-1');
    expect(mocks.campaignFileFindMany).not.toHaveBeenCalled();
    expect(preview).toMatchObject({ modeEnabled: false, files: [], publishedCount: 0, grantCount: 0 });
  });

  it('usa a mesma projeção central da leitura autenticada para P1', async () => {
    mocks.playerModeConfigFindUnique.mockResolvedValue({ isEnabled: true });
    mocks.campaignFileFindMany.mockResolvedValue([
      { id: 'file-public', name: 'Pista', type: 'CLUE', restrictToGrants: false, tags: [{ tag: { id: 'tag-1', name: 'Investigação', color: '#c8a66a' } }] },
      { id: 'file-grant', name: 'Dossiê', type: 'DOCUMENT', restrictToGrants: true, tags: [] }
    ]);
    const preview = await playerModeService.previewForMember('campaign-1', 'player-1');
    expect(mocks.publishedFileWhere).toHaveBeenCalledWith({ kind: 'PLAYER', campaignId: 'campaign-1', userId: 'player-1', audience: 'P1' });
    expect(preview).toMatchObject({ modeEnabled: true, publishedCount: 1, grantCount: 1, files: [{ id: 'file-public', access: 'PUBLISHED' }, { id: 'file-grant', access: 'GRANT' }] });
  });
});

describe('playerModeService.getAuthenticatedCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getViewerContext.mockResolvedValue({ kind: 'PLAYER', campaignId: 'campaign-1', userId: 'player-1', audience: 'P2' });
    mocks.playerModeConfigFindUnique.mockResolvedValue({ campaign: { id: 'campaign-1', name: 'Mesa' } });
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-public' }, { id: 'file-grant' }]);
    mocks.listForPlayer.mockResolvedValue([]);
  });

  it('entrega relações somente após a coleção segura de arquivos do jogador', async () => {
    await playerModeService.getAuthenticatedCampaign('campaign-1');
    expect(mocks.getViewerContext).toHaveBeenCalledWith('campaign-1', { requirePlayerMode: true });
    expect(mocks.listForPlayer).toHaveBeenCalledWith('campaign-1', ['file-public', 'file-grant']);
  });

  it('separa o OWNER PREVIEW e usa somente a projeção pública', async () => {
    mocks.getViewerContext.mockResolvedValue({ kind: 'OWNER', campaignId: 'campaign-1', userId: 'gm-1' });
    mocks.getPublicViewerContext.mockResolvedValue({ kind: 'PUBLIC', campaignId: 'campaign-1' });
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-public' }]);
    mocks.listForPublic.mockResolvedValue([]);

    await playerModeService.getAuthenticatedCampaign('campaign-1');

    expect(mocks.getPublicViewerContext).toHaveBeenCalledWith('campaign-1');
    expect(mocks.listForPublic).toHaveBeenCalledWith('campaign-1', ['file-public']);
    expect(mocks.listForPlayer).not.toHaveBeenCalled();
  });
});

describe('playerModeService.getPublicCampaign', () => {
  it('exige o contexto público habilitado antes de projetar arquivos públicos', async () => {
    mocks.playerModeConfigFindUnique.mockResolvedValue({ campaignId: 'campaign-1', isEnabled: true, campaign: { id: 'campaign-1', name: 'Mesa' } });
    mocks.getPublicViewerContext.mockResolvedValue({ kind: 'PUBLIC', campaignId: 'campaign-1' });
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-public' }]);
    mocks.listForPublic.mockResolvedValue([]);
    await playerModeService.getPublicCampaign('slug-publico');
    expect(mocks.getPublicViewerContext).toHaveBeenCalledWith('campaign-1');
    expect(mocks.listForPublic).toHaveBeenCalledWith('campaign-1', ['file-public']);
  });
});
