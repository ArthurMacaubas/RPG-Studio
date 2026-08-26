import { describe, expect, it } from 'vitest';
import { computeAutoLayout } from './investigationBoardLayout';
import { findInvestigationPaths } from './investigationBoardPaths';

const nodes = [
  { id: 'node-c', fileId: 'file-c', x: 900, y: 900, fileName: 'Cais' },
  { id: 'node-a', fileId: 'file-a', x: 0, y: 0, fileName: 'Alarme' },
  { id: 'node-b', fileId: 'file-b', x: 400, y: 0, fileName: 'Bússola' }
];

const officialRelationships = [
  { id: 'rel-a-b', sourceId: 'file-a', targetId: 'file-b', type: { name: 'Leva a', directional: true } },
  { id: 'rel-b-c', sourceId: 'file-b', targetId: 'file-c', type: { name: 'Investiga', directional: true } }
];

describe('investigationBoardLayout', () => {
  it('retorna posições somente para nós existentes e de forma determinística', () => {
    const first = computeAutoLayout({ nodes, relationships: officialRelationships });
    const second = computeAutoLayout({ nodes: [...nodes].reverse(), relationships: [...officialRelationships].reverse() });
    expect(first).toEqual(second);
    expect(first.positions).toHaveLength(3);
    expect(first.positions.map((position) => position.nodeId)).toEqual(['node-a', 'node-b', 'node-c']);
    expect(first.positions.map((position) => position.x)).toEqual([40, 270, 500]);
  });

  it('coloca ciclos na camada final sem criar relações', () => {
    const result = computeAutoLayout({ nodes: nodes.filter((node) => node.fileId !== 'file-c'), relationships: [{ sourceId: 'file-a', targetId: 'file-b', directional: true }, { sourceId: 'file-b', targetId: 'file-a', directional: true }] });
    expect(result.positions).toHaveLength(2);
    expect(result.cycleNodeIds).toEqual(['node-a', 'node-b']);
  });

  it('orienta relação não direcional apenas para o layout sem marcar ciclo', () => {
    const result = computeAutoLayout({ nodes: nodes.filter((node) => node.fileId !== 'file-c'), relationships: [{ sourceId: 'file-b', targetId: 'file-a', directional: false }] });
    expect(result.cycleNodeIds).toEqual([]);
    expect(result.positions.find((position) => position.fileId === 'file-a')?.x).toBeLessThan(result.positions.find((position) => position.fileId === 'file-b')?.x ?? 0);
  });

  it('rejeita uma prévia acima do limite', () => {
    expect(() => computeAutoLayout({ nodes: Array.from({ length: 3 }, (_, index) => ({ id: `node-${index}`, fileId: `file-${index}`, x: 0, y: 0 }),), relationships: [], maxNodes: 2 })).toThrow('limitado a 2 nós');
  });
});

describe('investigationBoardPaths', () => {
  it('encontra um caminho oficial direcionado e rotula o segmento', () => {
    const result = findInvestigationPaths({ nodeFileIds: ['file-a', 'file-b', 'file-c'], sourceFileId: 'file-a', targetFileId: 'file-c', mode: 'OFFICIAL', relationships: officialRelationships });
    expect(result.paths[0]?.fileIds).toEqual(['file-a', 'file-b', 'file-c']);
    expect(result.paths[0]?.segments.every((segment) => segment.source === 'RELATIONSHIP')).toBe(true);
    expect(result.paths[0]?.segments[0]?.label).toBe('Leva a');
  });

  it('respeita a direção e informa quando não há caminho', () => {
    const result = findInvestigationPaths({ nodeFileIds: ['file-a', 'file-b'], sourceFileId: 'file-b', targetFileId: 'file-a', mode: 'OFFICIAL', relationships: [officialRelationships[0]!] });
    expect(result.paths).toEqual([]);
    expect(result.message).toContain('Nenhum caminho');
  });

  it('permite os dois sentidos para relação não direcional', () => {
    const result = findInvestigationPaths({ nodeFileIds: ['file-a', 'file-b'], sourceFileId: 'file-b', targetFileId: 'file-a', mode: 'OFFICIAL', relationships: [{ ...officialRelationships[0]!, type: { name: 'Ligação', directional: false } }] });
    expect(result.paths).toHaveLength(1);
  });

  it('constrói caminho evidencial bidirecional sem promovê-lo a relação oficial', () => {
    const result = findInvestigationPaths({ nodeFileIds: ['file-a', 'file-b', 'file-c'], sourceFileId: 'file-a', targetFileId: 'file-c', mode: 'EVIDENCE', relationships: [], hypothesis: { id: 'hypothesis-1', evidence: [{ id: 'evidence-1', fileId: 'file-a', order: 0, stance: 'SUPPORTS' }, { id: 'evidence-2', fileId: 'file-b', order: 1, stance: 'CONTEXT' }, { id: 'evidence-3', fileId: 'file-c', order: 2, stance: 'CONTRADICTS' }] } });
    expect(result.paths[0]?.fileIds).toEqual(['file-a', 'file-b', 'file-c']);
    expect(result.paths[0]?.segments.every((segment) => segment.source === 'HYPOTHESIS_EVIDENCE')).toBe(true);
    expect(result.paths[0]?.segments[0]?.label).toContain('não é relação oficial');
  });

  it('trata grafo vazio, nó único e ausência de destino de forma explicável', () => {
    const empty = findInvestigationPaths({ nodeFileIds: [], sourceFileId: 'file-a', targetFileId: 'file-b', mode: 'OFFICIAL', relationships: [] });
    expect(empty.paths).toEqual([]);
    expect(empty.message).toContain('quadro ativo');

    const single = findInvestigationPaths({ nodeFileIds: ['file-a'], sourceFileId: 'file-a', targetFileId: 'file-a', mode: 'OFFICIAL', relationships: [] });
    expect(single.paths).toEqual([{ fileIds: ['file-a'], segments: [] }]);
  });

  it('termina em grafo oficial cíclico e não repete nós', () => {
    const result = findInvestigationPaths({ nodeFileIds: ['file-a', 'file-b', 'file-c'], sourceFileId: 'file-a', targetFileId: 'file-c', mode: 'OFFICIAL', relationships: [{ id: 'cycle-a-b', sourceId: 'file-a', targetId: 'file-b', type: { directional: true } }, { id: 'cycle-b-a', sourceId: 'file-b', targetId: 'file-a', type: { directional: true } }] });
    expect(result.paths).toEqual([]);
    expect(result.message).toContain('Nenhum caminho');
  });

  it('retorna múltiplos caminhos empatados em ordem determinística', () => {
    const result = findInvestigationPaths({ nodeFileIds: ['file-a', 'file-b', 'file-c', 'file-d'], sourceFileId: 'file-a', targetFileId: 'file-d', mode: 'OFFICIAL', relationships: [{ id: 'rel-a-c', sourceId: 'file-a', targetId: 'file-c', type: { directional: true } }, { id: 'rel-c-d', sourceId: 'file-c', targetId: 'file-d', type: { directional: true } }, { id: 'rel-a-b', sourceId: 'file-a', targetId: 'file-b', type: { directional: true } }, { id: 'rel-b-d', sourceId: 'file-b', targetId: 'file-d', type: { directional: true } }] });
    expect(result.paths.map((path) => path.fileIds)).toEqual([['file-a', 'file-b', 'file-d'], ['file-a', 'file-c', 'file-d']]);
  });

  it('combina fontes com desempate determinístico e respeita endpoint ausente', () => {
    const result = findInvestigationPaths({ nodeFileIds: ['file-a', 'file-b', 'file-c'], sourceFileId: 'file-a', targetFileId: 'file-c', mode: 'COMBINED', relationships: officialRelationships, hypothesis: { id: 'hypothesis-1', evidence: [{ id: 'evidence-2', fileId: 'file-b', order: 0, stance: 'SUPPORTS' }, { id: 'evidence-3', fileId: 'file-c', order: 1, stance: 'CONTEXT' }] }, maxPaths: 1 });
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.segments[0]?.source).toBe('RELATIONSHIP');

    const absent = findInvestigationPaths({ nodeFileIds: ['file-a'], sourceFileId: 'file-a', targetFileId: 'file-missing', mode: 'OFFICIAL', relationships: [] });
    expect(absent.message).toContain('quadro ativo');
  });
});
