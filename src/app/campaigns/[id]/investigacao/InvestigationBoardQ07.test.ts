import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const editorPath = new URL('./InvestigationBoardEditor.tsx', import.meta.url);
const editorSource = readFileSync(editorPath, 'utf8');
const panelPath = new URL('./BoardLayoutPathsPanel.tsx', import.meta.url);
const panelSource = readFileSync(panelPath, 'utf8');
const playerPath = new URL('../../modo-jogador/PlayerInvestigationBoard.tsx', import.meta.url);

function readOptional(path: URL) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

describe('contrato de Q07 — auto-layout e caminhos', () => {
  it('mantém auto-layout como preview local até confirmação explícita', () => {
    expect(editorSource).toContain('computeAutoLayout');
    expect(editorSource).toContain('setLayoutPreview');
    expect(editorSource).toContain('function cancelAutoLayout');
    expect(editorSource).toContain('function confirmAutoLayout');
    expect(editorSource).toContain('boardApi.updatePositions(campaignId');
    expect(editorSource).toContain('layoutPreview');
  });

  it('não cria BoardEdge ou Relationship ao calcular caminhos', () => {
    const pathBlock = editorSource.slice(editorSource.indexOf('function findPath'), editorSource.indexOf('const visiblePins'));
    expect(pathBlock).toContain('findInvestigationPaths');
    expect(pathBlock).not.toContain('createEdge');
    expect(pathBlock).not.toContain('relationshipsApi.create');
    expect(panelSource).toContain('não é relação oficial');
  });

  it('apresenta preview, cancelamento, confirmação e legenda acessíveis', () => {
    expect(panelSource).toContain('Pré-visualizar layout');
    expect(panelSource).toContain('Cancelar prévia');
    expect(panelSource).toContain('Confirmar posições');
    expect(panelSource).toContain('aria-label="Auto-layout e caminhos de pistas"');
    expect(panelSource).toContain('onKeyDown');
    expect(panelSource).toContain('Relações oficiais');
    expect(panelSource).toContain('Evidência da hipótese');
  });

  it('mantém o contrato administrativo fora do jogador', () => {
    const playerSource = readOptional(playerPath);
    expect(playerSource).not.toContain('BoardLayoutPathsPanel');
    expect(playerSource).not.toContain('computeAutoLayout');
    expect(playerSource).not.toContain('findInvestigationPaths');
  });
});
