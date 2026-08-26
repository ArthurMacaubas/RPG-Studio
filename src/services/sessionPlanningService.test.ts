import { describe, expect, it, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCampaignRole: vi.fn(),
  assertOwnedCampaignForWrite: vi.fn(),
  requireUser: vi.fn(),
  sessionFindMany: vi.fn(),
  sessionFindFirst: vi.fn(),
  sessionFindUnique: vi.fn(),
  sessionCreate: vi.fn(),
  sessionUpdate: vi.fn(),
  sessionDelete: vi.fn(),
  transaction: vi.fn()
}));

vi.mock('@/lib/access', () => ({
  assertCampaignRole: mocks.assertCampaignRole,
  assertOwnedCampaignForWrite: mocks.assertOwnedCampaignForWrite
}));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findMany: mocks.sessionFindMany,
      findFirst: mocks.sessionFindFirst,
      findUnique: mocks.sessionFindUnique,
      create: mocks.sessionCreate,
      update: mocks.sessionUpdate,
      delete: mocks.sessionDelete
    },
    $transaction: mocks.transaction
  }
}));

import { sessionPlanningService } from './sessionPlanningService';

const date = new Date('2026-08-25T12:00:00.000Z');
const baseSession = {
  id: 'session-1',
  campaignId: 'campaign-1',
  name: 'Sessão inicial',
  date,
  summary: 'Resumo',
  checklist: [{ id: 'check-1', label: 'Abrir a cena', done: false }],
  objectives: [{ id: 'objective-1', label: 'Descobrir a pista', done: false }],
  agenda: [{ id: 'agenda-1', label: 'Abertura', done: false }],
  postSummary: null,
  status: 'PLANNED' as const,
  completedAt: null,
  order: 0,
  files: [],
  hypothesisLinks: [],
  boardViewLinks: []
};

function makeTx(session = baseSession) {
  return {
    campaignFile: { findMany: vi.fn().mockResolvedValue([{ id: 'file-1' }]) },
    investigationHypothesis: { findMany: vi.fn().mockResolvedValue([{ id: 'hypothesis-1' }]) },
    investigationBoardView: { findMany: vi.fn().mockResolvedValue([{ id: 'view-1' }]) },
    session: {
      findFirst: vi.fn().mockResolvedValue({ order: 0 }),
      create: vi.fn().mockResolvedValue(session),
      update: vi.fn().mockResolvedValue({ ...session, status: 'COMPLETED', completedAt: date }),
      findUnique: vi.fn().mockResolvedValue(session)
    },
    sessionFile: { deleteMany: vi.fn(), createMany: vi.fn() },
    sessionHypothesis: { deleteMany: vi.fn(), createMany: vi.fn() },
    sessionBoardView: { deleteMany: vi.fn(), createMany: vi.fn() }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertCampaignRole.mockResolvedValue({ role: 'OWNER', campaign: { id: 'campaign-1', isArchived: false } });
  mocks.assertOwnedCampaignForWrite.mockResolvedValue({ id: 'campaign-1', isArchived: false });
  mocks.requireUser.mockResolvedValue({ id: 'owner-1' });
  mocks.sessionFindFirst.mockResolvedValue(baseSession);
  mocks.sessionFindUnique.mockResolvedValue({ campaignId: 'campaign-1' });
});

describe('sessionPlanningService', () => {
  it('bloqueia listagem antes da query quando o usuário não é OWNER', async () => {
    mocks.assertCampaignRole.mockRejectedValue({ status: 403 });

    await expect(sessionPlanningService.list('campaign-1')).rejects.toMatchObject({ status: 403 });
    expect(mocks.sessionFindMany).not.toHaveBeenCalled();
  });

  it('normaliza itens e cria links dentro da mesma transação após o guard de escrita', async () => {
    const tx = makeTx();
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const result = await sessionPlanningService.create('campaign-1', {
      name: '  Sessão com plano  ',
      checklist: [{ id: 'check-1', label: '  Validar pista  ', done: true }],
      objectives: [{ id: 'objective-1', label: '  Encontrar a chave  ' }],
      agenda: [{ id: 'agenda-1', label: ' Cena inicial ' }],
      fileIds: ['file-1'],
      hypothesisIds: ['hypothesis-1'],
      viewIds: ['view-1']
    });

    expect(mocks.assertOwnedCampaignForWrite).toHaveBeenCalledWith('campaign-1');
    expect(tx.session.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Sessão com plano', status: 'PLANNED', checklist: [{ id: 'check-1', label: 'Validar pista', done: true }], objectives: [{ id: 'objective-1', label: 'Encontrar a chave', done: false }], agenda: [{ id: 'agenda-1', label: 'Cena inicial', done: false }], completedAt: null }) }));
    expect(tx.sessionFile.createMany).toHaveBeenCalledWith({ data: [{ sessionId: 'session-1', fileId: 'file-1' }] });
    expect(tx.sessionHypothesis.createMany).toHaveBeenCalledWith({ data: [{ sessionId: 'session-1', hypothesisId: 'hypothesis-1' }] });
    expect(tx.sessionBoardView.createMany).toHaveBeenCalledWith({ data: [{ sessionId: 'session-1', viewId: 'view-1' }] });
    expect(result.name).toBe('Sessão inicial');
  });

  it('rejeita referência fora da campanha antes de criar a sessão', async () => {
    const tx = makeTx();
    tx.campaignFile.findMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    await expect(sessionPlanningService.create('campaign-1', { name: 'Plano', fileIds: ['other-file'] })).rejects.toMatchObject({ status: 422 });
    expect(tx.session.create).not.toHaveBeenCalled();
  });

  it('marca conclusão de forma idempotente e substitui links transacionalmente', async () => {
    const tx = makeTx();
    tx.session.findFirst.mockResolvedValue({ status: 'PLANNED', completedAt: null });
    tx.investigationHypothesis.findMany.mockResolvedValue([]);
    tx.investigationBoardView.findMany.mockResolvedValue([]);
    tx.session.update.mockResolvedValue({ ...baseSession, status: 'COMPLETED', completedAt: date });
    tx.session.findUnique.mockResolvedValue({ ...baseSession, status: 'COMPLETED', completedAt: date });
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const result = await sessionPlanningService.update('campaign-1', 'session-1', { status: 'COMPLETED', hypothesisIds: [], viewIds: [] });

    expect(tx.session.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }) }));
    expect(tx.sessionHypothesis.deleteMany).toHaveBeenCalledWith({ where: { sessionId: 'session-1' } });
    expect(tx.sessionBoardView.deleteMany).toHaveBeenCalledWith({ where: { sessionId: 'session-1' } });
    expect(result.status).toBe('COMPLETED');
  });

  it('removes somente o planejamento depois do guard de escrita', async () => {
    await sessionPlanningService.remove('campaign-1', 'session-1');

    expect(mocks.assertOwnedCampaignForWrite).toHaveBeenCalledWith('campaign-1');
    expect(mocks.sessionDelete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
  });

  it('não expõe sessão de outra campanha no acesso por ID', async () => {
    mocks.sessionFindFirst.mockResolvedValue(null);

    await expect(sessionPlanningService.getById('session-1')).rejects.toMatchObject({ status: 404 });
    expect(mocks.sessionFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session-1', campaign: { ownerId: 'owner-1' } } }));
  });
});
