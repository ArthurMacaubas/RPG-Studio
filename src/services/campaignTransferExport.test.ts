import { beforeEach, describe, expect, it, vi } from 'vitest';

type ExportHypothesisFixture = {
  id: string;
  title: string;
  summary: string | null;
  status: 'OPEN' | 'SUPPORTED' | 'REFUTED' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
  evidence: Array<{ id: string; stance: 'SUPPORTS' | 'CONTRADICTS' | 'CONTEXT'; note: string | null; order: number; createdAt: Date; updatedAt: Date; file: { id: string } }>;
};

const state = vi.hoisted(() => {
  const campaignFindFirst = vi.fn();
  const relationshipFindMany = vi.fn().mockResolvedValue([]);
  const relationshipTypeFindMany = vi.fn().mockResolvedValue([]);
  const assertCampaignRole = vi.fn().mockResolvedValue({ role: 'OWNER', user: { id: 'owner-1' } });
  const sourceDate = new Date('2026-08-25T12:00:00.000Z');
  const sourceCampaign = {
    id: 'campaign-1',
    ownerId: 'owner-1',
    name: 'Campanha administrativa',
    description: 'Conteúdo do Mestre',
    system: 'CUSTOM',
    coverImage: null,
    attributes: [],
    skills: [],
    classes: [],
    races: [],
    files: [{
      id: 'file-1',
      type: 'NPC',
      name: 'NPC privado',
      description: 'Detalhe administrativo',
      content: 'Conteúdo privado',
      authorId: 'owner-1',
      data: {},
      isFavorite: false,
      isArchived: false,
      isTrashed: false,
      trashedAt: null,
      createdAt: sourceDate,
      updatedAt: sourceDate,
      tags: [],
      attachments: [],
      comments: [],
      history: [],
      playerVisibility: null
    }],
    tags: [],
    favoriteFolders: [],
    sessions: [] as Array<{
      id: string;
      name: string;
      date: Date | null;
      summary: string | null;
      checklist: unknown;
      objectives: unknown;
      agenda: unknown;
      postSummary: string | null;
      status: 'PLANNED' | 'COMPLETED';
      completedAt: Date | null;
      order: number;
      files: Array<{ fileId: string }>;
      hypothesisLinks: Array<{ hypothesis: { id: string } }>;
      boardViewLinks: Array<{ view: { id: string } }>;
    }>,
    timelineEvents: [],
    boardNodes: [],
    boardEdges: [],
    investigationBoardPins: [] as Array<{ id: string; campaignId: string; text: string; x: number; y: number; color: string; createdAt: Date; updatedAt: Date }>,
    investigationBoardGroups: [] as Array<{ id: string; campaignId: string; name: string; color: string; x: number; y: number; width: number; height: number; createdAt: Date; updatedAt: Date; items: Array<{ boardNode: { fileId: string } }> }>,
    playerModeConfig: { isEnabled: false, shareSlug: null },
    hypotheses: [] as ExportHypothesisFixture[]
  };
  return {
    campaignFindFirst,
    relationshipFindMany,
    relationshipTypeFindMany,
    assertCampaignRole,
    sourceCampaign,
    sourceDate,
    prisma: {
      campaign: { findFirst: campaignFindFirst },
      relationship: { findMany: relationshipFindMany },
      relationshipType: { findMany: relationshipTypeFindMany }
    }
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: state.prisma }));
vi.mock('@/lib/access', () => ({ assertCampaignRole: state.assertCampaignRole }));

import { exportCampaign, exportCampaignAsOwner } from './campaignTransferService';

describe('exportação administrativa e harness OWNER', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.campaignFindFirst.mockResolvedValue(state.sourceCampaign);
    state.relationshipFindMany.mockResolvedValue([]);
    state.relationshipTypeFindMany.mockResolvedValue([]);
    state.assertCampaignRole.mockResolvedValue({ role: 'OWNER', user: { id: 'owner-1' } });
    state.sourceCampaign.hypotheses = [];
  });

  it('exportCampaign exige o papel OWNER pelo guard request-scoped', async () => {
    const document = await exportCampaign('campaign-1');

    expect(state.assertCampaignRole).toHaveBeenCalledWith('campaign-1', 'OWNER');
    expect(document.campaign.name).toBe('Campanha administrativa');
  });

  it('exportCampaign não retorna documento para PLAYER ou acesso negado', async () => {
    state.assertCampaignRole.mockRejectedValue(Object.assign(new Error('arquivo privado secreto'), { status: 403 }));

    await expect(exportCampaign('campaign-1')).rejects.toMatchObject({ status: 403 });
    expect(state.campaignFindFirst).not.toHaveBeenCalled();
  });

  it('exportCampaignAsOwner usa ownerId explícito e não chama o guard request-scoped', async () => {
    const document = await exportCampaignAsOwner('campaign-1', 'owner-1');

    expect(state.assertCampaignRole).not.toHaveBeenCalled();
    expect(state.campaignFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'campaign-1', ownerId: 'owner-1' }
    }));
    expect(document.files[0]?.content).toBe('Conteúdo privado');
  });

  it('exportCampaignAsOwner não retorna dados quando ownerId não corresponde', async () => {
    state.campaignFindFirst.mockResolvedValue(null);

    await expect(exportCampaignAsOwner('campaign-1', 'owner-diferente')).rejects.toThrow('Campanha não encontrada.');
    expect(state.campaignFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'campaign-1', ownerId: 'owner-diferente' }
    }));
  });

  it('exporta pins e grupos somente na projeção administrativa', async () => {
    state.sourceCampaign.investigationBoardPins = [{ id: 'pin-1', campaignId: 'campaign-1', text: 'Revisar pista', x: 20, y: 30, color: '#E5AC68', createdAt: state.sourceDate, updatedAt: state.sourceDate }];
    state.sourceCampaign.investigationBoardGroups = [{ id: 'group-1', campaignId: 'campaign-1', name: 'Suspeitas', color: '#86AAA2', x: 10, y: 20, width: 320, height: 180, createdAt: state.sourceDate, updatedAt: state.sourceDate, items: [{ boardNode: { fileId: 'file-1' } }] }];

    const document = await exportCampaignAsOwner('campaign-1', 'owner-1');

    expect(document.board.pins).toEqual([{ text: 'Revisar pista', x: 20, y: 30, color: '#E5AC68' }]);
    expect(document.board.groups).toEqual([{ name: 'Suspeitas', color: '#86AAA2', x: 10, y: 20, width: 320, height: 180, fileIds: ['file-1'] }]);
  });

  it('exporta planejamento, estado de conclusão e vínculos administrativos de sessão', async () => {
    state.sourceCampaign.sessions = [{
      id: 'session-1',
      name: 'Sessão planejada',
      date: state.sourceDate,
      summary: 'Resumo antes da mesa.',
      checklist: [{ id: 'check-1', label: 'Abrir a cena', done: true }],
      objectives: [{ id: 'objective-1', label: 'Encontrar a chave', done: false }],
      agenda: [{ id: 'agenda-1', label: 'Abertura', done: false }],
      postSummary: 'A chave foi encontrada.',
      status: 'COMPLETED',
      completedAt: state.sourceDate,
      order: 2,
      files: [{ fileId: 'file-1' }],
      hypothesisLinks: [{ hypothesis: { id: 'hypothesis-1' } }],
      boardViewLinks: [{ view: { id: 'view-1' } }]
    }];

    const document = await exportCampaignAsOwner('campaign-1', 'owner-1');

    expect(document.sessions).toEqual([expect.objectContaining({ id: 'session-1', status: 'COMPLETED', completedAt: state.sourceDate.toISOString(), hypothesisIds: ['hypothesis-1'], viewIds: ['view-1'] })]);
  });

  it('exporta hipóteses e evidências na projeção administrativa', async () => {
    state.sourceCampaign.hypotheses = [{
      id: 'hypothesis-1',
      title: 'O zelador esconde a chave',
      summary: 'Linha de investigação.',
      status: 'OPEN',
      createdAt: state.sourceDate,
      updatedAt: state.sourceDate,
      evidence: [{
        id: 'evidence-1',
        stance: 'SUPPORTS',
        note: 'A ficha aponta para o armário.',
        order: 0,
        createdAt: state.sourceDate,
        updatedAt: state.sourceDate,
        file: { id: 'file-1' }
      }]
    }];

    const document = await exportCampaignAsOwner('campaign-1', 'owner-1');

    expect(document.investigation?.hypotheses).toEqual([expect.objectContaining({
      id: 'hypothesis-1',
      evidence: [expect.objectContaining({ id: 'evidence-1', fileId: 'file-1', stance: 'SUPPORTS' })]
    })]);
  });
});
