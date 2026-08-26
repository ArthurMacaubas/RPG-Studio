import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const editorSource = readFileSync(join(root, 'src/app/campaigns/[id]/investigacao/InvestigationBoardEditor.tsx'), 'utf8');
const panelSource = readFileSync(join(root, 'src/app/campaigns/[id]/investigacao/HypothesesPanel.tsx'), 'utf8');
const playerPageSource = readFileSync(join(root, 'src/app/campaigns/[id]/jogador/investigacao/page.tsx'), 'utf8');

describe('integração do painel de hipóteses no Quadro administrativo', () => {
  it('importa e renderiza o painel administrativo com Set e callbacks estáveis', () => {
    expect(editorSource).toContain("import HypothesesPanel from './HypothesesPanel';");
    expect(editorSource).toContain('const boardFileIds = useMemo(() => new Set(nodes.map((node) => node.fileId)), [nodes]);');
    expect(editorSource).toContain('onFocusFile={focusFile}');
    expect(editorSource).toContain('onAddToBoard={addEvidenceToBoard}');
    expect(editorSource).toContain('onHighlightFiles={highlightHypothesisFiles}');
    expect(editorSource).toContain('const focusFile = useCallback(');
    expect(editorSource).toContain('const addEvidenceToBoard = useCallback(');
    expect(editorSource).toContain('const highlightHypothesisFiles = useCallback(');
  });

  it('possui toggle administrativo e limpa destaque quando fechado', () => {
    expect(editorSource).toContain('showHypotheses ? styles.toolButtonActive :');
    expect(editorSource).toContain('aria-pressed={showHypotheses}');
    expect(editorSource).toContain('setHighlightedFileIds(new Set());');
    expect(panelSource).toContain('useEffect(() => () => onHighlightFiles([]), [onHighlightFiles]);');
  });

  it('mantém o foco e a adição sem duplicação de BoardNode e sem Relationship', () => {
    expect(editorSource).toContain('if (nodes.some((node) => node.fileId === fileId))');
    expect(editorSource).toContain('boardApi.dropFile(campaignId, file.id, centerX, centerY)');
    expect(panelSource).toContain('onAddToBoard={() => onAddToBoard(item.fileId)}');
    expect(editorSource).toContain('relationshipsApi.graph(campaignId)');
    expect(editorSource).not.toContain('boardApi.createEdge({ campaignId, fromNodeId: fileId');
  });

  it('não importa o painel na rota de investigação do jogador', () => {
    expect(playerPageSource).not.toContain('HypothesesPanel');
    expect(playerPageSource).not.toContain('hypothesesApi');
  });
});
