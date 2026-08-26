import { describe, expect, it } from 'vitest';
import type { CampaignExportDocument } from '@/types';
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

describe('transferência de pins e grupos Q04', () => {
  it('aceita pins e grupos válidos e contabiliza as novas camadas', () => {
    const document = sampleDocument();
    document.board.pins = [{ text: 'Revisar pista', x: 30, y: 40, color: '#E5AC68' }];
    document.board.groups = [{ name: 'Suspeitas', color: '#86AAA2', x: 0, y: 0, width: 320, height: 180, fileIds: ['file-1'] }];

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(true);
    expect(result.summary).toMatchObject({ boardPins: 1, boardGroups: 1 });
    expect(dryRunCampaignImport(document).identityPlan).toMatchObject({ boardPins: 1, boardGroups: 1 });
  });

  it('rejeita pin fora do limite e grupo que referencia arquivo fora do quadro', () => {
    const document = sampleDocument();
    document.board.pins = [{ text: 'x'.repeat(281), x: 200000, y: 0, color: '#invalid' }];
    document.board.groups = [{ name: 'Grupo', color: '#86AAA2', x: 0, y: 0, width: 40, height: 180, fileIds: ['missing-file'] }];

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(false);
    expect(result.issues?.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'board.pins[0].text',
      'board.pins[0].x',
      'board.pins[0].color',
      'board.groups[0].width',
      'board.groups[0].fileIds[0]'
    ]));
  });

  it('mantém documento V1 sem pins/grupos importável', () => {
    const result = validateCampaignExportDocument(sampleDocument());

    expect(result.valid).toBe(true);
    expect(result.summary.boardPins).toBe(0);
    expect(result.summary.boardGroups).toBe(0);
  });
});
