import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const editorPath = new URL('./InvestigationBoardEditor.tsx', import.meta.url);
const editorSource = readFileSync(editorPath, 'utf8');
const viewsPath = new URL('./BoardViewsPanel.tsx', import.meta.url);
const viewsSource = readFileSync(viewsPath, 'utf8');
const playerPath = new URL('../../modo-jogador/PlayerInvestigationBoard.tsx', import.meta.url);

function readOptional(path: URL) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

describe('contrato de vistas Q05', () => {
  it('integra listagem, criação, atualização, remoção, ordenação e restauração local no host administrativo', () => {
    expect(editorSource).toContain('boardViewsApi.list(campaignId)');
    expect(editorSource).toContain('boardViewsApi.create(campaignId');
    expect(editorSource).toContain('boardViewsApi.update(view.id');
    expect(editorSource).toContain('boardViewsApi.remove(view.id)');
    expect(editorSource).toContain('boardViewsApi.reorder(campaignId, viewIds)');
    expect(editorSource).toContain('setPan(view.snapshot.pan)');
    expect(editorSource).toContain('setZoom(view.snapshot.zoom)');
    expect(editorSource).toContain('setFilters(view.snapshot.filters)');
    expect(editorSource).toContain('setActiveViewAnnotationIds');
  });

  it('mantém restauração sem chamadas de escrita do quadro canônico', () => {
    const restoreBlock = editorSource.slice(editorSource.indexOf('function restoreView'), editorSource.indexOf('useEffect(() => {', editorSource.indexOf('function restoreView')));
    expect(restoreBlock).not.toContain('boardApi.');
    expect(restoreBlock).not.toContain('boardAnnotationsApi.');
    expect(restoreBlock).toContain('Somente a navegação local foi alterada');
  });

  it('expõe ações acessíveis e deixa claro que vistas não publicam conteúdo', () => {
    expect(viewsSource).toContain('aria-label="Vistas salvas do quadro"');
    expect(viewsSource).toContain('Restaurar');
    expect(viewsSource).toContain('Atualizar');
    expect(viewsSource).toContain('As vistas não publicam conteúdo');
    expect(viewsSource).toContain('currentSnapshot.pinIds.length');
  });

  it('não adiciona o contrato administrativo ao host do jogador', () => {
    const playerSource = readOptional(playerPath);
    expect(playerSource).not.toContain('boardViewsApi');
    expect(playerSource).not.toContain('BoardViewsPanel');
  });
});
