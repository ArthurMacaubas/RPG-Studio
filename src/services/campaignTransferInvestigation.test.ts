import { describe, expect, it, vi } from 'vitest';
import type { CampaignExportDocument } from '@/types';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  globalRelationshipTypes: vi.fn(),
  userUpsert: vi.fn(),
  campaignCreate: vi.fn(),
  fileCreate: vi.fn(),
  hypothesisCreate: vi.fn(),
  playerModeCreate: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: mocks.transaction }
}));
vi.mock('@/lib/access', () => ({ assertCampaignRole: vi.fn(), assertCampaignAccess: vi.fn() }));

import { importCampaign } from './campaignTransferService';

const timestamp = '2026-08-25T12:00:00.000Z';

function documentWithInvestigation(): CampaignExportDocument {
  return {
    format: 'rpg-campaign-studio',
    version: 1,
    exportedAt: timestamp,
    campaign: { id: 'source-campaign', name: 'Campanha de investigação', description: null, system: 'CUSTOM', coverImage: null },
    customSystem: { attributes: [], skills: [], classes: [], races: [] },
    files: [{
      id: 'source-file', type: 'CLUE', name: 'Pista sintética', description: null, content: 'Conteúdo de teste', authorId: null, data: {}, isFavorite: false, isArchived: false, isTrashed: false, trashedAt: null,
      createdAt: timestamp, updatedAt: timestamp, tags: [], attachments: [], comments: [], history: []
    }],
    tags: [],
    relationships: [],
    favoriteFolders: [],
    sessions: [],
    timelineEvents: [],
    board: { nodes: [], edges: [] },
    playerMode: { isEnabled: false, visibility: [] },
    investigation: {
      hypotheses: [{
        id: 'source-hypothesis', title: 'O zelador esconde a chave', summary: 'Linha de investigação.', status: 'OPEN', createdAt: timestamp, updatedAt: timestamp,
        evidence: [{ id: 'source-evidence', fileId: 'source-file', stance: 'SUPPORTS', note: 'A pista cita o armário.', order: 0, createdAt: timestamp, updatedAt: timestamp }]
      }]
    }
  };
}

function documentWithSessionPlanning(): CampaignExportDocument {
  const document = documentWithInvestigation();
  document.sessions = [{
    id: 'source-session',
    name: 'Sessão de teste',
    date: null,
    summary: 'Resumo anterior.',
    checklist: [{ id: 'check-1', label: 'Abrir a cena', done: false }],
    objectives: [{ id: 'objective-1', label: 'Encontrar a chave', done: false }],
    agenda: [{ id: 'agenda-1', label: 'Abertura', done: false }],
    postSummary: null,
    status: 'PLANNED',
    completedAt: null,
    order: 0,
    fileIds: ['source-file'],
    hypothesisIds: ['source-hypothesis'],
    viewIds: ['source-view']
  }];
  document.board.views = [{
    id: 'source-view',
    name: 'Vista da sessão',
    kind: 'SESSION',
    description: null,
    order: 0,
    snapshot: {
      pan: { x: 0, y: 0 },
      zoom: 1,
      filters: {
        search: '', fileType: 'ALL', tagIds: [], scope: 'active', favoritesOnly: false,
        relationshipImportance: 'ALL', relationshipVisibility: 'ALL', hypothesisStatus: 'ALL', evidenceStance: 'ALL',
        layers: { files: true, officialRelationships: true, visualEdges: true, evidence: true, hypotheses: true, annotations: true }
      },
      pinIndexes: [],
      groupIndexes: []
    }
  }];
  return document;
}

describe('importCampaign com investigação', () => {
  it('remapeia a ficha e persiste a hipótese com evidência no mesmo transaction', async () => {
    const tx = {
      relationshipType: { findMany: mocks.globalRelationshipTypes },
      user: { upsert: mocks.userUpsert },
      campaign: { create: mocks.campaignCreate },
      campaignAttribute: {},
      campaignSkill: {},
      campaignClass: {},
      campaignRace: {},
      tag: {},
      campaignFile: { create: mocks.fileCreate },
      relationship: {},
      investigationHypothesis: { create: mocks.hypothesisCreate },
      hypothesisEvidence: {},
      investigationBoardView: { create: vi.fn().mockResolvedValue({ id: 'imported-view' }) },
      favoriteFolder: {},
      favoriteEntry: {},
      session: { create: vi.fn().mockResolvedValue({ id: 'imported-session' }) },
      sessionFile: { create: vi.fn() },
      sessionHypothesis: { createMany: vi.fn() },
      sessionBoardView: { createMany: vi.fn() },
      timelineEvent: {},
      boardNode: {},
      boardEdge: {},
      playerVisibility: {},
      playerModeConfig: { create: mocks.playerModeCreate }
    };
    mocks.globalRelationshipTypes.mockResolvedValue([]);
    mocks.userUpsert.mockResolvedValue({ id: 'owner-1' });
    mocks.campaignCreate.mockResolvedValue({ id: 'imported-campaign' });
    mocks.fileCreate.mockResolvedValue({ id: 'imported-file' });
    mocks.hypothesisCreate.mockResolvedValue({ id: 'imported-hypothesis' });
    mocks.playerModeCreate.mockResolvedValue({ id: 'player-mode' });
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const result = await importCampaign('owner-1', documentWithInvestigation());

    expect(result.campaign).toEqual({ id: 'imported-campaign' });
    expect(mocks.hypothesisCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: 'imported-campaign',
        title: 'O zelador esconde a chave',
        evidence: {
          create: [expect.objectContaining({ fileId: 'imported-file', stance: 'SUPPORTS', note: 'A pista cita o armário.', order: 0 })]
        }
      })
    });
  });

  it('cria sessão antes dos joins e remapeia hipóteses e vistas importadas', async () => {
    const tx = {
      relationshipType: { findMany: mocks.globalRelationshipTypes },
      user: { upsert: mocks.userUpsert },
      campaign: { create: mocks.campaignCreate },
      campaignAttribute: {}, campaignSkill: {}, campaignClass: {}, campaignRace: {}, tag: {},
      campaignFile: { create: mocks.fileCreate }, relationship: {},
      investigationHypothesis: { create: mocks.hypothesisCreate }, hypothesisEvidence: {},
      investigationBoardView: { create: vi.fn().mockResolvedValue({ id: 'imported-view' }) },
      favoriteFolder: {}, favoriteEntry: {},
      session: { create: vi.fn().mockResolvedValue({ id: 'imported-session' }) },
      sessionFile: { create: vi.fn() },
      sessionHypothesis: { createMany: vi.fn() },
      sessionBoardView: { createMany: vi.fn() },
      timelineEvent: {}, boardNode: {}, boardEdge: {}, playerVisibility: {}, playerModeConfig: { create: mocks.playerModeCreate }
    };
    mocks.globalRelationshipTypes.mockResolvedValue([]);
    mocks.userUpsert.mockResolvedValue({ id: 'owner-1' });
    mocks.campaignCreate.mockResolvedValue({ id: 'imported-campaign' });
    mocks.fileCreate.mockResolvedValue({ id: 'imported-file' });
    mocks.hypothesisCreate.mockResolvedValue({ id: 'imported-hypothesis' });
    mocks.playerModeCreate.mockResolvedValue({ id: 'player-mode' });
    mocks.transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    await importCampaign('owner-1', documentWithSessionPlanning());

    expect(tx.session.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'Sessão de teste', objectives: [{ id: 'objective-1', label: 'Encontrar a chave', done: false }], status: 'PLANNED' }) });
    expect(tx.sessionFile.create).toHaveBeenCalledWith({ data: { sessionId: 'imported-session', fileId: 'imported-file' } });
    expect(tx.sessionHypothesis.createMany).toHaveBeenCalledWith({ data: [{ sessionId: 'imported-session', hypothesisId: 'imported-hypothesis' }] });
    expect(tx.sessionBoardView.createMany).toHaveBeenCalledWith({ data: [{ sessionId: 'imported-session', viewId: 'imported-view' }] });
  });
});
