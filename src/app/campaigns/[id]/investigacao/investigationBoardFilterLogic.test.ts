import { describe, expect, it } from 'vitest';
import type { BoardEdgeItem, BoardNodeItem, CampaignFile, RelationshipImportance, RelationshipVisibility } from '@/types';
import { filterBoardEdges, filterBoardNodes, filterOfficialRelationships, filterInvestigationFiles, normalizeSearch } from './investigationBoardFilterLogic';

function makeFile(id: string, overrides: Partial<CampaignFile> = {}): CampaignFile {
  return {
    id,
    campaignId: 'campaign-test',
    type: 'CLUE',
    name: `Ficha ${id}`,
    description: null,
    content: null,
    data: {},
    isFavorite: false,
    isArchived: false,
    isTrashed: false,
    restrictToGrants: false,
    trashedAt: null,
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
    ...overrides
  };
}

function makeNode(id: string, file: CampaignFile): BoardNodeItem {
  return { id: `node-${id}`, campaignId: file.campaignId, fileId: file.id, x: 0, y: 0, file };
}

const baseFilters = {
  search: '',
  fileType: 'ALL' as const,
  tagIds: [] as string[],
  scope: 'active' as const,
  favoritesOnly: false
};

describe('investigationBoardFilterLogic', () => {
  it('combina tipo, tag, favorito e busca em nome, conteúdo e identificação', () => {
    const clue = makeFile('clue-1', {
      name: 'Lanterna azul',
      content: 'A lanterna tem uma marca de sal.',
      data: { identification: 'evidencia-lanterna' },
      isFavorite: true,
      tags: [{ tag: { id: 'tag-clue', campaignId: 'campaign-test', name: 'Pista', color: '#c8a66a', icon: null, description: null } }]
    });
    const other = makeFile('clue-2', { name: 'Mapa antigo' });
    const nodes = [makeNode('1', clue), makeNode('2', other)];

    expect(filterBoardNodes(nodes, { ...baseFilters, fileType: 'CLUE', tagIds: ['tag-clue'], favoritesOnly: true, search: 'marca de sal' })).toHaveLength(1);
    expect(filterBoardNodes(nodes, { ...baseFilters, search: 'evidencia-lanterna' }).map((node) => node.fileId)).toEqual(['clue-1']);
    expect(filterBoardNodes(nodes, { ...baseFilters, search: 'mapa antigo' }).map((node) => node.fileId)).toEqual(['clue-2']);
  });

  it('normaliza acentos e busca também por tag e título de hipótese sem novas consultas', () => {
    const tagged = makeFile('tagged', {
      name: 'Pista do Coração',
      tags: [{ tag: { id: 'tag-ritual', campaignId: 'campaign-test', name: 'Ritual antigo', color: '#c8a66a', icon: null, description: 'marcas do ritual' } }]
    });
    const hypotheses = [{ id: 'h-1', status: 'OPEN' as const, title: 'A chave está no coração', summary: 'A hipótese do ritual.', evidence: [{ fileId: tagged.id }] as never }];
    expect(normalizeSearch('CORAÇÃO')).toBe('coracao');
    expect(filterInvestigationFiles([tagged], { ...baseFilters, search: 'coracao' }, { presence: 'ALL', usedAsEvidence: false, inOpenHypothesis: false, importantRelationship: false }, { hypotheses })).toHaveLength(1);
    expect(filterInvestigationFiles([tagged], { ...baseFilters, search: 'ritual antigo' }, { presence: 'ALL', usedAsEvidence: false, inOpenHypothesis: false, importantRelationship: false }, { hypotheses })).toHaveLength(1);
    expect(filterInvestigationFiles([tagged], { ...baseFilters, search: 'chave esta' }, { presence: 'ALL', usedAsEvidence: false, inOpenHypothesis: false, importantRelationship: false }, { hypotheses })).toHaveLength(1);
  });

  it('combina presença, evidência, hipótese aberta e relação importante localmente', () => {
    const onBoard = makeFile('on-board');
    const offBoard = makeFile('off-board');
    const hypotheses = [{ id: 'h-open', status: 'OPEN' as const, title: 'Hipótese', summary: null, evidence: [{ fileId: offBoard.id }] as never }];
    const filters = { ...baseFilters };
    const investigation = { presence: 'OFF_BOARD' as const, usedAsEvidence: true, inOpenHypothesis: true, importantRelationship: true };
    const result = filterInvestigationFiles([onBoard, offBoard], filters, investigation, { boardFileIds: new Set([onBoard.id]), hypotheses, importantRelationshipFileIds: new Set([offBoard.id]) });
    expect(result.map((file) => file.id)).toEqual([offBoard.id]);
    expect(onBoard.id).not.toBe(offBoard.id);
  });

  it('alterna entre ativo, arquivado e lixeira sem alterar os dados', () => {
    const nodes = [
      makeNode('active', makeFile('active')),
      makeNode('archived', makeFile('archived', { isArchived: true })),
      makeNode('trash', makeFile('trash', { isTrashed: true }))
    ];
    expect(filterBoardNodes(nodes, baseFilters).map((node) => node.fileId)).toEqual(['active']);
    expect(filterBoardNodes(nodes, { ...baseFilters, scope: 'archived' }).map((node) => node.fileId)).toEqual(['archived']);
    expect(filterBoardNodes(nodes, { ...baseFilters, scope: 'trash' }).map((node) => node.fileId)).toEqual(['trash']);
    expect(nodes).toHaveLength(3);
  });

  it('mantém arestas visuais separadas e só exibe arestas entre nós visíveis', () => {
    const nodes = [makeNode('1', makeFile('file-1')), makeNode('2', makeFile('file-2'))];
    const edge: BoardEdgeItem = { id: 'edge-1', campaignId: 'campaign-test', fromNodeId: 'node-1', toNodeId: 'node-2', label: 'fio', color: '#c8a66a', description: null, curve: 0 };
    expect(filterBoardEdges([edge], nodes, new Set(['file-1', 'file-2']), true)).toHaveLength(1);
    expect(filterBoardEdges([edge], nodes, new Set(['file-1']), true)).toHaveLength(0);
    expect(filterBoardEdges([edge], nodes, new Set(['file-1', 'file-2']), false)).toHaveLength(0);
  });

  it('filtra relações oficiais por importância, visibilidade e endpoints sem alterar a fonte', () => {
    const edges = [
      { id: 'official-1', sourceId: 'file-1', targetId: 'file-2', importance: 'IMPORTANT' as RelationshipImportance, visibility: 'GM' as RelationshipVisibility },
      { id: 'official-2', sourceId: 'file-1', targetId: 'file-2', importance: 'NORMAL' as RelationshipImportance, visibility: 'ALL' as RelationshipVisibility }
    ];
    const filters = { relationshipImportance: 'IMPORTANT' as RelationshipImportance, relationshipVisibility: 'ALL' as const, layers: { officialRelationships: true, files: true, visualEdges: true, evidence: true, hypotheses: true } };
    expect(filterOfficialRelationships(edges, new Set(['file-1', 'file-2']), filters).map((edge) => edge.id)).toEqual(['official-1']);
    expect(filterOfficialRelationships(edges, new Set(['file-1']), { ...filters, relationshipImportance: 'ALL' })).toHaveLength(0);
    expect(filterOfficialRelationships(edges, new Set(['file-1', 'file-2']), { ...filters, layers: { ...filters.layers, officialRelationships: false } })).toHaveLength(0);
  });
});
