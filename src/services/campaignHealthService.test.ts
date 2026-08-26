import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/access', () => ({ assertCampaignRole: vi.fn() }));

import { simulateCampaignGraph } from './campaignHealthService';

const node = (id: string, name = id, data: Record<string, unknown> = {}) => ({ id, name, type: 'NOTE', data });

 describe('simulateCampaignGraph', () => {
  it('encontra um caminho completo do início ao final', () => {
    const result = simulateCampaignGraph(
      [node('start', 'Início', { isStart: true }), node('clue', 'Pista'), node('end', 'Final', { isFinal: true })],
      [{ fromId: 'start', toId: 'clue' }, { fromId: 'clue', toId: 'end' }]
    );

    expect(result.valid).toBe(true);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.fileNames).toEqual(['Início', 'Pista', 'Final']);
    expect(result.deadEnds).toEqual([]);
  });

  it('identifica um beco sem saída antes do final', () => {
    const result = simulateCampaignGraph(
      [node('start', 'Início', { isStart: true }), node('dead', 'Beco'), node('end', 'Final', { isFinal: true })],
      [{ fromId: 'start', toId: 'dead' }]
    );

    expect(result.valid).toBe(false);
    expect(result.deadEnds).toEqual(['dead']);
    expect(result.issues.some((issue) => issue.message.includes('sem final'))).toBe(true);
  });

  it('identifica um nó bloqueado no caminho', () => {
    const result = simulateCampaignGraph(
      [node('start', 'Início', { isStart: true }), node('blocked', 'Porta bloqueada', { blocked: true }), node('end', 'Final', { isFinal: true })],
      [{ fromId: 'start', toId: 'blocked' }, { fromId: 'blocked', toId: 'end' }]
    );

    expect(result.valid).toBe(false);
    expect(result.blockedNodes).toContain('blocked');
    expect(result.issues.some((issue) => issue.message.includes('bloqueado'))).toBe(true);
  });

  it('detecta ciclo sem final alcançável', () => {
    const result = simulateCampaignGraph(
      [node('a', 'A', { isStart: true }), node('b', 'B')],
      [{ fromId: 'a', toId: 'b' }, { fromId: 'b', toId: 'a' }]
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('ciclo'))).toBe(true);
  });
});
