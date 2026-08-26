import { vi, describe, it, expect } from 'vitest';

const state = vi.hoisted(() => {
  const importedEdges: Array<Record<string, unknown>> = [];
  const fileIds = new Map<string, string>();
  let fileSequence = 0;
  let nodeSequence = 0;

  const sourceCampaign = {
    id: 'campaign-source',
    name: 'Campanha com curva',
    description: null,
    system: 'CUSTOM',
    coverImage: null,
    attributes: [],
    skills: [],
    classes: [],
    races: [],
    files: [
      {
        id: 'file-source',
        type: 'NPC',
        name: 'Origem',
        description: null,
        content: null,
        data: {},
        authorId: 'owner-source',
        isFavorite: false,
        isArchived: false,
        isTrashed: false,
        trashedAt: null,
        createdAt: new Date('2026-08-24T12:00:00.000Z'),
        updatedAt: new Date('2026-08-24T12:00:00.000Z'),
        tags: [],
        attachments: [],
        comments: [],
        history: [],
        playerVisibility: null
      },
      {
        id: 'file-target',
        type: 'CLUE',
        name: 'Destino',
        description: null,
        content: null,
        data: {},
        authorId: 'owner-source',
        isFavorite: false,
        isArchived: false,
        isTrashed: false,
        trashedAt: null,
        createdAt: new Date('2026-08-24T12:01:00.000Z'),
        updatedAt: new Date('2026-08-24T12:01:00.000Z'),
        tags: [],
        attachments: [],
        comments: [],
        history: [],
        playerVisibility: null
      }
    ],
    tags: [],
    favoriteFolders: [],
    sessions: [],
    timelineEvents: [],
    boardNodes: [
      { id: 'node-source', fileId: 'file-source', x: 10, y: 20 },
      { id: 'node-target', fileId: 'file-target', x: 300, y: 160 }
    ],
    boardEdges: [
      { id: 'edge-source', fromNodeId: 'node-source', toNodeId: 'node-target', label: 'Curva preservada', color: '#c8a66a', description: 'Aresta de regressão', curve: 75 }
    ],
    investigationBoardPins: [],
    investigationBoardGroups: [],
    playerModeConfig: { isEnabled: false, shareSlug: null },
    hypotheses: []
  };

  const tx = {
    relationshipType: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    user: { upsert: vi.fn().mockResolvedValue({}) },
    campaign: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'campaign-imported' }) },
    campaignAttribute: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    campaignSkill: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    campaignClass: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    campaignRace: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    tag: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    campaignFile: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(({ data }: { data: { id?: string } }) => {
        fileSequence += 1;
        const id = `file-imported-${fileSequence}`;
        if (data.id) fileIds.set(data.id, id);
        return Promise.resolve({ id });
      })
    },
    relationship: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    favoriteFolder: { create: vi.fn() },
    favoriteEntry: { create: vi.fn() },
    session: { create: vi.fn() },
    sessionFile: { create: vi.fn() },
    timelineEvent: { create: vi.fn() },
    boardNode: {
      create: vi.fn().mockImplementation(() => {
        nodeSequence += 1;
        return Promise.resolve({ id: `node-imported-${nodeSequence}` });
      })
    },
    boardEdge: {
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        importedEdges.push(data);
        return Promise.resolve(data);
      })
    },
    investigationBoardPin: { create: vi.fn() },
    investigationBoardGroup: { create: vi.fn().mockResolvedValue({ id: 'group-imported' }) },
    investigationBoardGroupItem: { createMany: vi.fn() },
    playerVisibility: { create: vi.fn() },
    playerModeConfig: { create: vi.fn() }
  };

  const prisma = {
    campaign: { findFirst: vi.fn().mockResolvedValue(sourceCampaign) },
    relationship: { findMany: vi.fn().mockResolvedValue([]) },
    relationshipType: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn().mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
  };

  return { prisma, importedEdges };
});

vi.mock('@/lib/prisma', () => ({ prisma: state.prisma }));
vi.mock('@/lib/access', () => ({ assertCampaignRole: vi.fn().mockResolvedValue({ role: 'OWNER', user: { id: 'owner-source' } }) }));

import { exportCampaign, importCampaign } from './campaignTransferService';

describe('BoardEdge.curve no round-trip de transferência', () => {
  it('preserva curve da exportação até a criação do BoardEdge importado', async () => {
    const exported = await exportCampaign('campaign-source');
    expect(exported.board.edges[0]?.curve).toBe(75);

    await importCampaign('owner-import', exported);

    expect(state.importedEdges).toHaveLength(1);
    expect(state.importedEdges[0]?.curve).toBe(75);
  });
});
