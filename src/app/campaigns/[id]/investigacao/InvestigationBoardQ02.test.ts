import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const editor = readFileSync(new URL('./InvestigationBoardEditor.tsx', import.meta.url), 'utf8');
const playerBoard = readFileSync(new URL('../../../../components/PlayerInvestigationBoard.tsx', import.meta.url), 'utf8');
const filtersPanel = readFileSync(new URL('./InvestigationFiltersPanel.tsx', import.meta.url), 'utf8');

describe('Q02 — filtros, busca e camadas do quadro', () => {
  it('integra todas as camadas no editor administrativo com callbacks e estado local', () => {
    expect(editor).toContain('InvestigationFiltersPanel');
    expect(editor).toContain('filters.layers.files');
    expect(editor).toContain('filters.layers.visualEdges');
    expect(editor).toContain('filterOfficialRelationships(officialRelationships, visibleNodeFileIds, filters)');
    expect(editor).toContain('filters.layers.evidence');
    expect(editor).toContain('onReset={resetFilters}');
  });

  it('carrega arquivos e relações uma vez por campanha/escopo, sem depender de busca local', () => {
    expect(editor).toContain('filesApi.list(campaignId, { scope: filters.scope');
    expect(editor).toContain('relationshipsApi.graph(campaignId)');
    expect(editor).toContain('[campaignId, filters.scope, toast]');
    expect(editor).not.toContain('[campaignId, filters.search');
  });

  it('mantém o jogador separado do painel administrativo', () => {
    expect(playerBoard).not.toContain('HypothesesPanel');
    expect(playerBoard).not.toContain('InvestigationFiltersPanel');
    expect(editor).toContain("aria-label=\"Mostrar filtros e camadas\"");
  });

  it('expõe busca, filtros combináveis, estado vazio e camadas com legenda textual', () => {
    expect(filtersPanel).toContain('Nome, tipo, tags ou hipótese...');
    expect(filtersPanel).toContain('Somente favoritas');
    expect(filtersPanel).toContain('Relações oficiais');
    expect(filtersPanel).toContain('Fonte canônica');
    expect(filtersPanel).toContain('Arestas visuais');
    expect(filtersPanel).toContain('Evidências');
    expect(filtersPanel).toContain('Hipóteses');
    expect(filtersPanel).toContain('Resultados locais');
    expect(filtersPanel).toContain('Filtros, resultados e camadas são locais e reversíveis; nenhuma alteração é persistida por esta navegação.');
  });

  it('integra diagnósticos acionáveis sem importar a superfície para o jogador', () => {
    expect(editor).toContain('computeInvestigativeDiagnostics');
    expect(editor).toContain('InvestigationDiagnosticsPanel');
    expect(editor).toContain('handleDiagnosticAction');
    expect(editor).toContain('setShowDiagnostics(false)');
    expect(playerBoard).not.toContain('InvestigationDiagnosticsPanel');
  });
});
