import { describe, expect, it } from 'vitest';
import { findPreviousSession, orderSessionPlans, parseContextTargetId, pendingItems, selectContextRelationships, type SessionContextGraph } from './sessionContextSelectors';
import type { SessionPlanning } from '@/types';

function plan(id: string, order: number, overrides: Partial<SessionPlanning> = {}): SessionPlanning {
  return {
    id,
    campaignId: 'campaign-1',
    name: `Plano ${id}`,
    date: null,
    summary: null,
    checklist: [],
    objectives: [],
    agenda: [],
    postSummary: null,
    status: 'PLANNED',
    completedAt: null,
    order,
    files: [],
    hypotheses: [],
    views: [],
    ...overrides
  };
}

describe('sessionContextSelectors Q03', () => {
  it('aceita somente IDs efêmeros com formato limitado', () => {
    expect(parseContextTargetId(' file-1 ')).toBe('file-1');
    expect(parseContextTargetId('')).toBeNull();
    expect(parseContextTargetId('id com espaço')).toBeNull();
    expect(parseContextTargetId('id/fora')).toBeNull();
    expect(parseContextTargetId('a'.repeat(81))).toBeNull();
  });

  it('ordena planos por order e ID sem mutar a entrada e identifica a sessão anterior', () => {
    const plans = [plan('session-b', 1), plan('session-a', 1), plan('session-c', 2)];
    const before = JSON.stringify(plans);
    expect(orderSessionPlans(plans).map((item) => item.id)).toEqual(['session-a', 'session-b', 'session-c']);
    expect(findPreviousSession(plans, 'session-c')?.id).toBe('session-b');
    expect(findPreviousSession(plans, 'session-a')).toBeNull();
    expect(JSON.stringify(plans)).toBe(before);
  });

  it('seleciona objetivos e checklist pendentes sem alterar o plano', () => {
    const selected = plan('session-a', 0, {
      objectives: [{ id: 'objective-done', label: 'Concluído', done: true }, { id: 'objective-open', label: 'Pendente', done: false }],
      checklist: [{ id: 'check-open', label: 'Pendente', done: false }]
    });
    const before = JSON.stringify(selected);
    expect(pendingItems(selected)).toEqual({ objectives: [{ id: 'objective-open', label: 'Pendente', done: false }], checklist: [{ id: 'check-open', label: 'Pendente', done: false }] });
    expect(JSON.stringify(selected)).toBe(before);
  });

  it('filtra somente relações entre fichas vinculadas e ordena por ID', () => {
    const graph: SessionContextGraph = {
      nodes: [{ id: 'file-a', name: 'A', type: 'CLUE' }, { id: 'file-b', name: 'B', type: 'NPC' }, { id: 'file-c', name: 'C', type: 'NOTE' }],
      edges: [
        { id: 'rel-z', sourceId: 'file-a', targetId: 'file-b', type: { name: 'Conecta', directional: true, color: null }, label: null, description: null, importance: 'NORMAL', visibility: 'GM' },
        { id: 'rel-a', sourceId: 'file-b', targetId: 'file-c', type: { name: 'Aponta', directional: false, color: '#fff' }, label: 'Contexto', description: null, importance: 'IMPORTANT', visibility: 'GM' }
      ]
    };
    const result = selectContextRelationships(graph, new Set(['file-a', 'file-b']));
    expect(result).toEqual([{ id: 'rel-z', sourceId: 'file-a', targetId: 'file-b', sourceName: 'A', targetName: 'B', typeName: 'Conecta', directional: true, label: null, description: null, importance: 'NORMAL', visibility: 'GM' }]);
  });
});
