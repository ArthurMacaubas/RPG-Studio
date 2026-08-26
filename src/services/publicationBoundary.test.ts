import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getViewerContext: vi.fn(),
  publishedFileWhere: vi.fn(),
  searchableFileWhere: vi.fn(),
  getCampaignAccess: vi.fn(),
  requireUser: vi.fn(),
  boardNodeFindMany: vi.fn(),
  boardEdgeFindMany: vi.fn(),
  campaignFindMany: vi.fn(),
  campaignFileFindMany: vi.fn(),
  computeCampaignHealth: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    boardNode: { findMany: mocks.boardNodeFindMany },
    boardEdge: { findMany: mocks.boardEdgeFindMany },
    campaign: { findMany: mocks.campaignFindMany },
    campaignFile: { findMany: mocks.campaignFileFindMany }
  }
}));
vi.mock('@/lib/access', () => ({ assertCampaignAccess: vi.fn(), getCampaignAccess: mocks.getCampaignAccess }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/publicationPolicy', () => ({ getViewerContext: mocks.getViewerContext, publishedFileWhere: mocks.publishedFileWhere, searchableFileWhere: mocks.searchableFileWhere, publicationSelect: { file: {} } }));
vi.mock('@/services/campaignHealthService', () => ({ computeCampaignHealth: mocks.computeCampaignHealth }));

import { boardService } from './boardService';
import { searchService } from './searchService';
import { campaignDashboardService } from './campaignDashboardService';

describe('publication boundary across indirect surfaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getViewerContext.mockResolvedValue({ kind: 'PLAYER', campaignId: 'campaign-1', userId: 'player-1', audience: 'P3' });
    mocks.publishedFileWhere.mockReturnValue({ campaignId: 'campaign-1', isTrashed: false, isArchived: false, playerVisibility: { isVisible: true } });
    mocks.boardNodeFindMany.mockResolvedValue([{ id: 'node-1', fileId: 'file-public', file: { id: 'file-public' } }]);
    mocks.boardEdgeFindMany.mockResolvedValue([]);
  });

  it('projeta o quadro de jogador somente com nós publicados após checar Modo Jogador', async () => {
    await boardService.get('campaign-1');
    expect(mocks.getViewerContext).toHaveBeenCalledWith('campaign-1', { requirePlayerMode: true });
    expect(mocks.boardNodeFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1', file: expect.objectContaining({ isArchived: false, isTrashed: false }) } }));
    expect(mocks.boardEdgeFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1', fromNodeId: { in: ['node-1'] }, toNodeId: { in: ['node-1'] } } }));
  });

  it('mantém o predicado central dentro de AND na busca, sem sobrescrever a política por um OR de conteúdo', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'player-1' });
    mocks.searchableFileWhere.mockReturnValue({ OR: [{ campaign: { ownerId: 'player-1' } }, { playerVisibility: { isVisible: true } }] });
    mocks.campaignFindMany.mockResolvedValue([]);
    mocks.campaignFileFindMany.mockResolvedValue([]);
    await searchService.search('pista');
    expect(mocks.campaignFileFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [expect.any(Object), { OR: expect.any(Array) }] } }));
  });

  it('nega dashboard administrativo quando um jogador chama o serviço diretamente', async () => {
    mocks.getCampaignAccess.mockResolvedValue({ role: 'PLAYER', user: { id: 'player-1' } });
    await expect(campaignDashboardService.get('campaign-1')).rejects.toMatchObject({ status: 404 });
  });
});
