import { describe, expect, it } from 'vitest';
import { autoLayoutRelationshipGraph, filterRelationshipGraph, relationshipGraphStorageKey } from './relationshipGraph';
import type { RelationshipGraphData } from '@/types';

const data: RelationshipGraphData = {
  nodes: [
    { id: 'alice', name: 'Alice', type: 'CHARACTER' },
    { id: 'cult', name: 'Culto', type: 'NPC' },
    { id: 'clue', name: 'Pista', type: 'CLUE' }
  ],
  edges: [
    { id: 'edge-1', sourceId: 'alice', targetId: 'cult', type: { id: 'knows', campaignId: null, key: 'KNOWS', name: 'Conhece', description: null, directional: true, color: null, icon: null, createdAt: '', updatedAt: '' }, label: null, description: null, importance: 'NORMAL', visibility: 'GM' },
    { id: 'edge-2', sourceId: 'clue', targetId: 'alice', type: { id: 'reveals', campaignId: null, key: 'REVEALS', name: 'Revela', description: null, directional: true, color: null, icon: null, createdAt: '', updatedAt: '' }, label: null, description: null, importance: 'IMPORTANT', visibility: 'GM' }
  ]
};

describe('relationshipGraph', () => {
  it('filtra por entidade e preserva somente arestas entre nós visíveis', () => {
    const result = filterRelationshipGraph(data, { query: 'ali' });
    expect(result.nodes.map((node) => node.id)).toEqual(['alice']);
    expect(result.edges).toHaveLength(0);
  });

  it('expande a vizinhança da entidade selecionada', () => {
    const result = filterRelationshipGraph(data, { focusNodeId: 'alice' });
    expect(result.nodes.map((node) => node.id)).toEqual(['alice', 'cult', 'clue']);
    expect(result.edges.map((edge) => edge.id)).toEqual(['edge-1', 'edge-2']);
  });

  it('mantém direção e filtra pelo tipo oficial', () => {
    const result = filterRelationshipGraph(data, { relationshipTypeId: 'reveals' });
    expect(result.edges[0]).toMatchObject({ sourceId: 'clue', targetId: 'alice' });
  });

  it('gera posições determinísticas e uma chave isolada por usuário/campanha', () => {
    expect(Object.keys(autoLayoutRelationshipGraph(data))).toHaveLength(3);
    expect(relationshipGraphStorageKey('campaign-1', 'user-2')).toBe('rpg-studio:relationship-graph:campaign-1:user-2');
  });
});
