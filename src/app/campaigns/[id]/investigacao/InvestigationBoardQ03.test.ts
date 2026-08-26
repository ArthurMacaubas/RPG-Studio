import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const editor = readFileSync(new URL('./InvestigationBoardEditor.tsx', import.meta.url), 'utf8');
const playerBoard = readFileSync(new URL('../../../../components/PlayerInvestigationBoard.tsx', import.meta.url), 'utf8');
const relationshipService = readFileSync(new URL('../../../../services/relationshipService.ts', import.meta.url), 'utf8');

describe('Q03 — overlay readonly do grafo oficial', () => {
  it('desenha somente relações filtradas pelo contrato oficial e usa direção/tipo próprios', () => {
    expect(editor).toContain('relationshipsApi.graph(campaignId)');
    expect(editor).toContain('filterOfficialRelationships(officialRelationships, visibleNodeFileIds, filters)');
    expect(editor).toContain('officialRelationshipGeometry(relationship.sourceId, relationship.targetId)');
    expect(editor).toContain('relationship.type.directional ? \'→\' : \'↔\'');
    expect(editor).toContain('markerEnd={relationship.type.directional ? \'url(#official-arrow)\' : undefined}');
    expect(editor).toContain('strokeDasharray="8 5"');
    expect(editor).not.toContain('filteredOfficialRelationships.map((edge)');
  });

  it('mantém a relação oficial readonly e não cria, edita ou remove dados ao selecionar', () => {
    expect(editor).toContain('Somente leitura nesta camada; a relação oficial não é editável pelo overlay.');
    expect(editor).toContain('setSelectedOfficialRelationshipId(relationship.id)');
    expect(editor).toContain('if (event.key === \'Escape\') setSelectedOfficialRelationshipId(null)');
    expect(editor).toContain('Abrir origem');
    expect(editor).toContain('Abrir destino');
    expect(editor).not.toContain('relationshipsApi.create');
    expect(editor).not.toContain('relationshipsApi.update');
    expect(editor).not.toContain('relationshipsApi.remove');
  });

  it('separa visualmente a camada oficial dos fios BoardEdge e preserva as ações editáveis somente no fio', () => {
    expect(editor).toContain('styles.officialRelationship');
    expect(editor).toContain('styles.edgeLine');
    expect(editor).toContain('setSelectedEdge(edge)');
    expect(editor).toContain('boardApi.updateEdge(updated.id, patch)');
    expect(editor).toContain('boardApi.removeEdge(selectedEdge.id)');
    expect(editor).toContain('officialRelationshipPanel');
  });

  it('mantém o jogador sem o overlay e conserva segurança server-side do grafo', () => {
    expect(playerBoard).not.toContain('relationshipsApi.graph');
    expect(playerBoard).not.toContain('officialRelationship');
    expect(relationshipService).toContain('visibleRelationshipWhere(campaignId, viewer, activeFileIds)');
    expect(relationshipService).toContain('isArchived: false');
    expect(relationshipService).toContain('isTrashed: false');
  });
});
