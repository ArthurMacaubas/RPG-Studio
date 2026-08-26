import { describe, expect, it } from 'vitest';
import type { CampaignExportBoardView, CampaignExportDocument } from '@/types';
import { dryRunCampaignImport, validateCampaignExportDocument } from './campaignTransferService';

const timestamp = '2026-08-25T12:00:00.000Z';

function sampleDocument(): CampaignExportDocument {
  return {
    format: 'rpg-campaign-studio',
    version: 1,
    exportedAt: timestamp,
    campaign: { id: 'campaign-1', name: 'Campanha', description: null, system: 'CUSTOM', coverImage: null },
    customSystem: { attributes: [], skills: [], classes: [], races: [] },
    files: [{ id: 'file-1', type: 'CLUE', name: 'Pista', description: null, content: null, authorId: null, data: {}, isFavorite: false, isArchived: false, isTrashed: false, trashedAt: null, createdAt: timestamp, updatedAt: timestamp, tags: [], attachments: [], comments: [], history: [] }],
    tags: [],
    relationships: [],
    favoriteFolders: [],
    sessions: [],
    timelineEvents: [],
    board: { nodes: [{ fileId: 'file-1', x: 10, y: 20 }], edges: [] },
    playerMode: { isEnabled: false, visibility: [] }
  };
}

function validView(): CampaignExportBoardView {
  return {
    name: 'Caso inicial',
    kind: 'CASE' as const,
    description: 'Navegação da investigação',
    order: 0,
    snapshot: {
      pan: { x: 10, y: -4 },
      zoom: 1,
      filters: {
        search: '', fileType: 'ALL', tagIds: [], scope: 'active', favoritesOnly: false,
        relationshipImportance: 'ALL', relationshipVisibility: 'ALL', hypothesisStatus: 'ALL', evidenceStance: 'ALL',
        layers: { files: true, officialRelationships: true, visualEdges: true, evidence: true, hypotheses: true, annotations: true }
      },
      pinIndexes: [],
      groupIndexes: []
    }
  };
}

describe('transferência de vistas Q05', () => {
  it('aceita vista válida e contabiliza o bloco no resumo e dry-run', () => {
    const document = sampleDocument();
    document.board.views = [validView()];

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(true);
    expect(result.summary.boardViews).toBe(1);
    expect(dryRunCampaignImport(document).identityPlan.boardViews).toBe(1);
  });

  it('rejeita zoom inválido, camada ausente e índice de anotação inexistente', () => {
    const document = sampleDocument();
    const view = validView();
    view.snapshot.zoom = 2.5;
    view.snapshot.filters.layers.files = undefined as never;
    view.snapshot.pinIndexes = [0];
    document.board.views = [view];

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(false);
    expect(result.issues?.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'board.views[0].snapshot.zoom',
      'board.views[0].snapshot.filters.layers.files',
      'board.views[0].snapshot.pinIndexes'
    ]));
  });

  it('rejeita nomes duplicados independentemente de maiúsculas e espaços', () => {
    const document = sampleDocument();
    document.board.views = [validView(), { ...validView(), name: '  CASO INICIAL  ', order: 1 }];

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('board.views[1].name duplica outra vista.');
  });

  it('mantém documentos legados V1 sem vistas importáveis', () => {
    const result = validateCampaignExportDocument(sampleDocument());

    expect(result.valid).toBe(true);
    expect(result.summary.boardViews).toBe(0);
    expect(dryRunCampaignImport(sampleDocument()).identityPlan.boardViews).toBe(0);
  });
});
