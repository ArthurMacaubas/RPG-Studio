import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCampaignAccess: vi.fn(),
  getCampaignAccess: vi.fn(),
  logHistory: vi.fn(),
  campaignFileFindUnique: vi.fn(),
  campaignFileFindMany: vi.fn(),
  campaignMemberFindUnique: vi.fn(),
  relationshipTypeFindFirst: vi.fn(),
  relationshipTypeFindUnique: vi.fn(),
  relationshipTypeFindMany: vi.fn(),
  relationshipTypeCreate: vi.fn(),
  relationshipFindFirst: vi.fn(),
  relationshipCreate: vi.fn(),
  relationshipFindUnique: vi.fn(),
  relationshipUpdate: vi.fn(),
  relationshipDelete: vi.fn(),
  relationshipFindMany: vi.fn(),
  getViewerContext: vi.fn(),
  getPublicViewerContext: vi.fn(),
  publishedFileWhere: vi.fn()
}));

vi.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {}
  }
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaignFile: { findUnique: mocks.campaignFileFindUnique, findMany: mocks.campaignFileFindMany },
    campaignMember: { findUnique: mocks.campaignMemberFindUnique },
    relationshipType: { findFirst: mocks.relationshipTypeFindFirst, findUnique: mocks.relationshipTypeFindUnique, findMany: mocks.relationshipTypeFindMany, create: mocks.relationshipTypeCreate },
    relationship: { findFirst: mocks.relationshipFindFirst, create: mocks.relationshipCreate, findUnique: mocks.relationshipFindUnique, update: mocks.relationshipUpdate, delete: mocks.relationshipDelete, findMany: mocks.relationshipFindMany }
  }
}));
vi.mock('@/lib/access', () => ({ assertCampaignAccess: mocks.assertCampaignAccess, getCampaignAccess: mocks.getCampaignAccess }));
vi.mock('./historyService', () => ({ logHistory: mocks.logHistory }));
vi.mock('@/lib/publicationPolicy', () => ({
  getViewerContext: mocks.getViewerContext,
  getPublicViewerContext: mocks.getPublicViewerContext,
  publishedFileWhere: mocks.publishedFileWhere
}));

import { relationshipService } from './relationshipService';

const source = { id: 'file-a', name: 'Pista A', campaignId: 'campaign-1' };
const target = { id: 'file-b', name: 'NPC B', campaignId: 'campaign-1' };
const type = { id: 'type-reveals', campaignId: null, key: 'REVEALS', name: 'Revela', directional: true };

describe('relationshipService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertCampaignAccess.mockResolvedValue(undefined);
    mocks.getCampaignAccess.mockResolvedValue({ role: 'OWNER', user: { id: 'gm-1' } });
    mocks.logHistory.mockResolvedValue(undefined);
    mocks.campaignFileFindUnique.mockResolvedValueOnce(source).mockResolvedValueOnce(target);
    mocks.campaignMemberFindUnique.mockResolvedValue({ audience: 'P1' });
    mocks.relationshipTypeFindFirst.mockResolvedValue(type);
    mocks.relationshipFindFirst.mockResolvedValue(null);
    mocks.relationshipCreate.mockResolvedValue({ id: 'rel-1', fromId: source.id, toId: target.id, campaignId: source.campaignId, typeId: type.id, kind: 'GENERIC', label: 'Pista decisiva', description: 'A pista revela a identidade.', importance: 'CRITICAL', visibility: 'ALL', from: source, to: target, type });
    mocks.getViewerContext.mockImplementation(async () => {
      const access = await mocks.getCampaignAccess();
      if (access.role === 'OWNER') return { kind: 'OWNER', campaignId: 'campaign-1', userId: access.user.id };
      const member = await mocks.campaignMemberFindUnique();
      return { kind: 'PLAYER', campaignId: 'campaign-1', userId: access.user.id, audience: member?.audience ?? null };
    });
    mocks.getPublicViewerContext.mockResolvedValue({ kind: 'PUBLIC', campaignId: 'campaign-1' });
    mocks.publishedFileWhere.mockImplementation((viewer) => viewer.kind === 'PLAYER'
      ? { campaignId: viewer.campaignId, isTrashed: false, isArchived: false, playerVisibility: { isVisible: true }, OR: [{ restrictToGrants: false }, { restrictToGrants: true, grants: { some: { userId: viewer.userId, canView: true } } }] }
      : { campaignId: viewer.campaignId, isTrashed: false, isArchived: false, playerVisibility: { isVisible: true }, restrictToGrants: false });
  });

  it('preserva direção, metadados e campanha ao criar A → B', async () => {
    await relationshipService.create({ fromId: 'file-a', toId: 'file-b', typeKey: 'REVEALS', label: 'Pista decisiva', description: 'A pista revela a identidade.', importance: 'CRITICAL', visibility: 'ALL' });
    expect(mocks.relationshipCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ campaignId: 'campaign-1', fromId: 'file-a', toId: 'file-b', typeId: 'type-reveals', kind: 'GENERIC', importance: 'CRITICAL', visibility: 'ALL' }) }));
    expect(mocks.relationshipCreate.mock.calls[0]?.[0].data).not.toMatchObject({ fromId: 'file-b', toId: 'file-a' });
  });

  it('rejeita entidades de campanhas diferentes antes de criar o relacionamento', async () => {
    mocks.campaignFileFindUnique.mockReset();
    mocks.campaignFileFindUnique.mockResolvedValueOnce(source).mockResolvedValueOnce({ ...target, campaignId: 'campaign-2' });
    await expect(relationshipService.create({ fromId: 'file-a', toId: 'file-b' })).rejects.toMatchObject({ status: 422 });
    expect(mocks.relationshipCreate).not.toHaveBeenCalled();
  });

  it('rejeita tipo inexistente sem criar relação', async () => {
    mocks.relationshipTypeFindFirst.mockResolvedValue(null);
    await expect(relationshipService.create({ fromId: 'file-a', toId: 'file-b', typeKey: 'INEXISTENTE' })).rejects.toMatchObject({ status: 422 });
    expect(mocks.relationshipCreate).not.toHaveBeenCalled();
  });

  it('normaliza a origem e destino de um tipo não direcional', async () => {
    const undirectedType = { ...type, id: 'type-knows', key: 'KNOWS', name: 'Conhece', directional: false };
    mocks.relationshipTypeFindFirst.mockResolvedValue(undirectedType);
    mocks.campaignFileFindUnique.mockReset();
    mocks.campaignFileFindUnique.mockResolvedValueOnce({ ...source, id: 'file-z' }).mockResolvedValueOnce({ ...target, id: 'file-a' });

    await relationshipService.create({ fromId: 'file-z', toId: 'file-a', typeKey: 'KNOWS' });

    expect(mocks.relationshipFindFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      campaignId: 'campaign-1',
      typeId: 'type-knows',
      OR: [{ fromId: 'file-a', toId: 'file-z' }, { fromId: 'file-z', toId: 'file-a' }]
    }) });
    expect(mocks.relationshipCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fromId: 'file-a', toId: 'file-z' }) }));
  });

  it('bloqueia o par invertido já existente para um tipo não direcional', async () => {
    const undirectedType = { ...type, id: 'type-knows', key: 'KNOWS', name: 'Conhece', directional: false };
    mocks.relationshipTypeFindFirst.mockResolvedValue(undirectedType);
    mocks.relationshipFindFirst.mockResolvedValue({ id: 'rel-invertida' });

    await expect(relationshipService.create({ fromId: 'file-a', toId: 'file-b', typeKey: 'KNOWS' })).rejects.toMatchObject({ status: 409 });
    expect(mocks.relationshipCreate).not.toHaveBeenCalled();
  });

  it('canonicaliza uma relação antiga ao trocar para um tipo não direcional', async () => {
    const undirectedType = { ...type, id: 'type-knows', key: 'KNOWS', name: 'Conhece', directional: false };
    mocks.relationshipFindUnique.mockResolvedValue({ id: 'rel-1', campaignId: 'campaign-1', fromId: 'file-z', toId: 'file-a', typeId: type.id, type, from: source, to: target });
    mocks.relationshipTypeFindUnique.mockResolvedValue(undirectedType);

    await relationshipService.update('rel-1', { typeId: undirectedType.id });

    expect(mocks.relationshipUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fromId: 'file-a', toId: 'file-z', typeId: 'type-knows' }) }));
  });

  it('retorna conflito compreensível antes de criar uma duplicata conhecida', async () => {
    mocks.relationshipFindFirst.mockResolvedValue({ id: 'rel-existente' });
    await expect(relationshipService.create({ fromId: 'file-a', toId: 'file-b', typeKey: 'REVEALS' })).rejects.toMatchObject({ status: 409 });
    expect(mocks.relationshipCreate).not.toHaveBeenCalled();
  });

  it('converte P2002 concorrente na criação em conflito 409', async () => {
    mocks.relationshipCreate.mockRejectedValue({ code: 'P2002' });

    await expect(relationshipService.create({ fromId: 'file-a', toId: 'file-b', typeKey: 'REVEALS' })).rejects.toMatchObject({ status: 409 });
  });

  it('converte P2002 concorrente na atualização em conflito 409', async () => {
    const replacementType = { ...type, id: 'type-knows', key: 'KNOWS', name: 'Conhece' };
    mocks.relationshipFindUnique.mockResolvedValue({ id: 'rel-1', campaignId: 'campaign-1', fromId: 'file-a', toId: 'file-b', typeId: type.id, type, from: source, to: target });
    mocks.relationshipTypeFindUnique.mockResolvedValue(replacementType);
    mocks.relationshipUpdate.mockRejectedValue({ code: 'P2002' });

    await expect(relationshipService.update('rel-1', { typeId: replacementType.id })).rejects.toMatchObject({ status: 409 });
  });

  it('exige acesso de escrita antes de atualizar metadados', async () => {
    mocks.relationshipFindUnique.mockResolvedValue({ id: 'rel-1', campaignId: 'campaign-1', fromId: 'file-a', toId: 'file-b', typeId: type.id, type, from: source, to: target });
    mocks.assertCampaignAccess.mockRejectedValueOnce(Object.assign(new Error('Sem acesso'), { status: 403 }));
    await expect(relationshipService.update('rel-1', { importance: 'IMPORTANT' })).rejects.toMatchObject({ status: 403 });
    expect(mocks.relationshipUpdate).not.toHaveBeenCalled();
  });

  it('remove somente a relação, sem remover arquivos de origem ou destino', async () => {
    mocks.relationshipFindUnique.mockResolvedValue({ id: 'rel-1', campaignId: 'campaign-1', fromId: 'file-a', toId: 'file-b', typeId: type.id, type, from: source, to: target });
    mocks.relationshipDelete.mockResolvedValue({ id: 'rel-1' });
    await relationshipService.remove('rel-1');
    expect(mocks.relationshipDelete).toHaveBeenCalledWith({ where: { id: 'rel-1' } });
    expect(mocks.campaignFileFindUnique).not.toHaveBeenCalled();
  });

  it('oculta get() de uma relação GM para o jogador P1', async () => {
    mocks.getCampaignAccess.mockResolvedValue({ role: 'PLAYER', user: { id: 'player-1' } });
    mocks.campaignMemberFindUnique.mockResolvedValue({ audience: 'P1' });
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-a' }, { id: 'file-b' }]);
    mocks.relationshipFindUnique.mockResolvedValue({ id: 'rel-gm', campaignId: 'campaign-1', fromId: 'file-a', toId: 'file-b', visibility: 'GM', type, from: source, to: target });
    await expect(relationshipService.get('rel-gm')).rejects.toMatchObject({ status: 404 });
  });

  it('usa a mesma audiência e as duas entidades acessíveis em getForEntity()', async () => {
    mocks.getCampaignAccess.mockResolvedValue({ role: 'PLAYER', user: { id: 'player-2' } });
    mocks.campaignMemberFindUnique.mockResolvedValue({ audience: 'P2' });
    mocks.campaignFileFindUnique.mockReset();
    mocks.campaignFileFindUnique.mockResolvedValue({ id: 'file-a', campaignId: 'campaign-1' });
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-a' }, { id: 'file-b' }]);
    mocks.relationshipFindMany.mockResolvedValue([]);
    await relationshipService.getForEntity('file-a');
    expect(mocks.relationshipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ campaignId: 'campaign-1', visibility: { in: ['ALL', 'P2'] }, fromId: 'file-a', toId: { in: ['file-a', 'file-b'] } }) }));
  });

  it('recalcula o acesso real em listForPlayer() antes de aplicar IDs recebidos', async () => {
    mocks.getCampaignAccess.mockResolvedValue({ role: 'PLAYER', user: { id: 'player-3' } });
    mocks.campaignMemberFindUnique.mockResolvedValue({ audience: 'P3' });
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-a' }]);
    mocks.relationshipFindMany.mockResolvedValue([]);
    await relationshipService.listForPlayer('campaign-1', ['file-a', 'file-privado']);
    expect(mocks.relationshipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1', visibility: { in: ['ALL', 'P3'] }, fromId: { in: ['file-a'] }, toId: { in: ['file-a'] } } }));
  });

  it('recalcula a visibilidade pública e mantém somente relações ALL entre arquivos públicos ativos', async () => {
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-a' }]);
    mocks.relationshipFindMany.mockResolvedValue([]);

    await relationshipService.listForPublic('campaign-1', ['file-a', 'file-privado']);

    expect(mocks.campaignFileFindMany).toHaveBeenCalledWith({
      where: {
        campaignId: 'campaign-1',
        id: { in: ['file-a', 'file-privado'] },
        isTrashed: false,
        isArchived: false,
        playerVisibility: { isVisible: true },
        restrictToGrants: false
      },
      select: { id: true }
    });
    expect(mocks.relationshipFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { campaignId: 'campaign-1', visibility: { in: ['ALL'] }, fromId: { in: ['file-a'] }, toId: { in: ['file-a'] } }
    }));
  });

  it.each([
    ['get', () => relationshipService.get('rel-1')],
    ['getForEntity', () => relationshipService.getForEntity('file-a')],
    ['getGraph', () => relationshipService.getGraph('campaign-1')],
    ['listForPlayer', () => relationshipService.listForPlayer('campaign-1', ['file-a'])]
  ])('bloqueia %s quando o Modo Jogador está desligado', async (_operation, action) => {
    mocks.getViewerContext.mockRejectedValueOnce(Object.assign(new Error('Modo Jogador indisponível.'), { status: 404 }));
    await expect(action()).rejects.toMatchObject({ status: 404 });
  });

  it('bloqueia a listagem pública de relações quando o Modo Jogador está desligado', async () => {
    mocks.getPublicViewerContext.mockRejectedValueOnce(Object.assign(new Error('Modo Jogador indisponível.'), { status: 404 }));
    await expect(relationshipService.listForPublic('campaign-1', ['file-a'])).rejects.toMatchObject({ status: 404 });
  });

  it('oculta get() quando uma ponta ALL aponta para entidade privada', async () => {
    mocks.getCampaignAccess.mockResolvedValue({ role: 'PLAYER', user: { id: 'player-4' } });
    mocks.campaignMemberFindUnique.mockResolvedValue({ audience: 'P4' });
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-a' }]);
    mocks.relationshipFindUnique.mockResolvedValue({ id: 'rel-all', campaignId: 'campaign-1', fromId: 'file-a', toId: 'file-b-privado', visibility: 'ALL', type, from: source, to: target });
    await expect(relationshipService.get('rel-all')).rejects.toMatchObject({ status: 404 });
  });

  it('faz getGraph() devolver ao jogador apenas nós e relações do subconjunto acessível', async () => {
    mocks.getCampaignAccess.mockResolvedValue({ role: 'PLAYER', user: { id: 'player-1' } });
    mocks.campaignMemberFindUnique.mockResolvedValue({ audience: 'P1' });
    mocks.campaignFileFindMany.mockResolvedValueOnce([{ id: 'file-a' }, { id: 'file-b' }]).mockResolvedValueOnce([{ id: 'file-a', name: 'Pista A', type: 'CLUE' }, { id: 'file-b', name: 'NPC B', type: 'NPC' }]);
    mocks.relationshipFindMany.mockResolvedValue([]);
    const graph = await relationshipService.getGraph('campaign-1');
    expect(mocks.relationshipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1', visibility: { in: ['ALL', 'P1'] }, fromId: { in: ['file-a', 'file-b'] }, toId: { in: ['file-a', 'file-b'] } } }));
    expect(graph.nodes).toHaveLength(2);
  });

  it('faz getGraph() do mestre excluir arquivos arquivados, lixeira e relações dependentes desses arquivos', async () => {
    mocks.campaignFileFindMany.mockReset();
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-a', name: 'Pista A', type: 'CLUE' }]);
    mocks.relationshipFindMany.mockResolvedValue([]);

    await relationshipService.getGraph('campaign-1');

    expect(mocks.campaignFileFindMany).toHaveBeenCalledWith({
      where: { campaignId: 'campaign-1', isArchived: false, isTrashed: false },
      select: { id: true, name: true, type: true }
    });
    expect(mocks.relationshipFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { campaignId: 'campaign-1', fromId: { in: ['file-a'] }, toId: { in: ['file-a'] } }
    }));
  });

  it('limita getGraph() do mestre aos IDs de fichas solicitados', async () => {
    mocks.campaignFileFindMany.mockResolvedValue([{ id: 'file-a', name: 'Pista A', type: 'CLUE' }]);
    mocks.relationshipFindMany.mockResolvedValue([]);

    await relationshipService.getGraph('campaign-1', ['file-a', 'file-a', 'file-b']);

    expect(mocks.campaignFileFindMany).toHaveBeenCalledWith({
      where: { campaignId: 'campaign-1', isArchived: false, isTrashed: false, id: { in: ['file-a', 'file-b'] } },
      select: { id: true, name: true, type: true }
    });
  });

  it('revalida o subconjunto solicitado para jogador antes de montar o grafo', async () => {
    mocks.getCampaignAccess.mockResolvedValue({ role: 'PLAYER', user: { id: 'player-1' } });
    mocks.campaignMemberFindUnique.mockResolvedValue({ audience: 'P1' });
    mocks.campaignFileFindMany.mockReset();
    mocks.campaignFileFindMany.mockResolvedValueOnce([{ id: 'file-a' }]).mockResolvedValueOnce([{ id: 'file-a', name: 'Pista A', type: 'CLUE' }]);
    mocks.relationshipFindMany.mockResolvedValue([]);

    await relationshipService.getGraph('campaign-1', ['file-a', 'file-private']);

    expect(mocks.campaignFileFindMany).toHaveBeenNthCalledWith(2, {
      where: { campaignId: 'campaign-1', isArchived: false, isTrashed: false, id: { in: ['file-a'] } },
      select: { id: true, name: true, type: true }
    });
  });
});
