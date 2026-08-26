'use client';

import type { BoardNodeItem, CampaignFile, InvestigationHypothesis } from '@/types';
import type { AutoLayoutResult, BoardNodePosition } from '@/services/investigationBoardLayout';
import type { InvestigationPathsResult, PathMode } from '@/services/investigationBoardPaths';
import styles from './page.module.css';

type LayoutPreview = {
  original: BoardNodePosition[];
  proposed: AutoLayoutResult['positions'];
  cycleNodeIds: string[];
};

type BoardLayoutPathsPanelProps = {
  nodes: BoardNodeItem[];
  files: CampaignFile[];
  hypotheses: InvestigationHypothesis[];
  preview: LayoutPreview | null;
  layoutBusy: boolean;
  layoutError: string;
  pathMode: PathMode;
  sourceFileId: string;
  targetFileId: string;
  hypothesisId: string;
  pathResult: InvestigationPathsResult | null;
  selectedPathIndex: number;
  onPreviewLayout: () => void;
  onCancelLayout: () => void;
  onConfirmLayout: () => void;
  onPathModeChange: (mode: PathMode) => void;
  onSourceChange: (fileId: string) => void;
  onTargetChange: (fileId: string) => void;
  onHypothesisChange: (hypothesisId: string) => void;
  onFindPath: () => void;
  onSelectPath: (pathIndex: number) => void;
  onClose: () => void;
};

const PATH_MODE_LABELS: Record<PathMode, string> = {
  OFFICIAL: 'Relações oficiais',
  EVIDENCE: 'Evidência da hipótese',
  COMBINED: 'Oficial + evidência'
};

function sortNodes(nodes: BoardNodeItem[]) {
  return [...nodes].sort((a, b) => a.file.name.localeCompare(b.file.name, 'pt-BR', { sensitivity: 'base' }) || a.fileId.localeCompare(b.fileId));
}

export default function BoardLayoutPathsPanel({ nodes, files, hypotheses, preview, layoutBusy, layoutError, pathMode, sourceFileId, targetFileId, hypothesisId, pathResult, selectedPathIndex, onPreviewLayout, onCancelLayout, onConfirmLayout, onPathModeChange, onSourceChange, onTargetChange, onHypothesisChange, onFindPath, onSelectPath, onClose }: BoardLayoutPathsPanelProps) {
  const orderedNodes = sortNodes(nodes);
  const selectedHypothesis = hypotheses.find((hypothesis) => hypothesis.id === hypothesisId) ?? null;
  const nameByFileId = new Map([...files, ...orderedNodes.map((node) => node.file)].map((file) => [file.id, file.name]));

  return (
    <aside className={styles.layoutPathsPanel} aria-label="Auto-layout e caminhos de pistas" tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <header className={styles.layoutPathsHeading}>
        <div>
          <p className={styles.layoutPathsEyebrow}>Legibilidade investigativa</p>
          <h2>Layout e caminhos</h2>
        </div>
        <button type="button" className={styles.layoutPathsClose} onClick={onClose} aria-label="Fechar layout e caminhos">×</button>
      </header>

      <section className={styles.layoutSection} aria-labelledby="layout-preview-title">
        <div className={styles.layoutSectionTitle}>
          <div>
            <h3 id="layout-preview-title">Auto-layout</h3>
            <p>Prévia local para os nós existentes. Nada é salvo antes da confirmação.</p>
          </div>
          <span className={styles.layoutBadge}>{nodes.length} nós</span>
        </div>
        <button type="button" className={styles.layoutPrimaryButton} onClick={onPreviewLayout} disabled={layoutBusy || nodes.length === 0 || Boolean(preview)}>{preview ? 'Prévia ativa' : 'Pré-visualizar layout'}</button>
        {preview && (
          <div className={styles.layoutPreviewCard} role="status">
            <strong>{preview.proposed.length} posições calculadas localmente</strong>
            <span>{preview.cycleNodeIds.length ? `${preview.cycleNodeIds.length} nó(s) em ciclo foram agrupados na camada final.` : 'Nenhum ciclo exigiu tratamento especial.'}</span>
            <div className={styles.layoutActions}>
              <button type="button" onClick={onCancelLayout} disabled={layoutBusy}>Cancelar prévia</button>
              <button type="button" className={styles.layoutConfirmButton} onClick={onConfirmLayout} disabled={layoutBusy}>{layoutBusy ? 'Salvando…' : 'Confirmar posições'}</button>
            </div>
          </div>
        )}
        {layoutError && <p className={styles.layoutError} role="alert">{layoutError}</p>}
      </section>

      <section className={styles.layoutSection} aria-labelledby="path-title">
        <div className={styles.layoutSectionTitle}>
          <div>
            <h3 id="path-title">Caminhos de pistas</h3>
            <p>Somente relações oficiais e/ou evidências da hipótese selecionada.</p>
          </div>
        </div>
        <label className={styles.layoutField}>Origem
          <select value={sourceFileId} onChange={(event) => onSourceChange(event.target.value)} disabled={orderedNodes.length === 0}>
            <option value="">Selecione a origem</option>
            {orderedNodes.map((node) => <option key={node.fileId} value={node.fileId}>{node.file.name}</option>)}
          </select>
        </label>
        <label className={styles.layoutField}>Destino
          <select value={targetFileId} onChange={(event) => onTargetChange(event.target.value)} disabled={orderedNodes.length === 0}>
            <option value="">Selecione o destino</option>
            {orderedNodes.map((node) => <option key={node.fileId} value={node.fileId}>{node.file.name}</option>)}
          </select>
        </label>
        <label className={styles.layoutField}>Fonte do caminho
          <select value={pathMode} onChange={(event) => onPathModeChange(event.target.value as PathMode)}>
            {(Object.keys(PATH_MODE_LABELS) as PathMode[]).map((mode) => <option key={mode} value={mode}>{PATH_MODE_LABELS[mode]}</option>)}
          </select>
        </label>
        {pathMode !== 'OFFICIAL' && (
          <label className={styles.layoutField}>Hipótese
            <select value={hypothesisId} onChange={(event) => onHypothesisChange(event.target.value)} disabled={hypotheses.length === 0}>
              <option value="">Selecione a hipótese</option>
              {hypotheses.map((hypothesis) => <option key={hypothesis.id} value={hypothesis.id}>{hypothesis.title}</option>)}
            </select>
          </label>
        )}
        <button type="button" className={styles.layoutPrimaryButton} onClick={onFindPath} disabled={!sourceFileId || !targetFileId || sourceFileId === targetFileId || (pathMode !== 'OFFICIAL' && !selectedHypothesis)}>Encontrar caminhos</button>
        <div className={styles.pathLegend} aria-label="Legenda das fontes do caminho"><span className={styles.pathLegendOfficial}>Relação oficial</span><span className={styles.pathLegendEvidence}>Evidência — não é relação oficial</span></div>
        {pathResult && (
          <div className={styles.pathResult} role="status">
            {pathResult.paths.length > 0 ? <strong>{pathResult.paths.length} caminho(s) encontrado(s){pathResult.truncated ? ' · limite aplicado' : ''}</strong> : <strong>Nenhum caminho</strong>}
            {pathResult.paths.length > 1 && <p>Selecione um caminho para destacar somente essa alternativa no canvas.</p>}
            {pathResult.message && <p>{pathResult.message}</p>}
            {pathResult.paths.map((path, pathIndex) => <div className={`${styles.pathCard} ${selectedPathIndex === pathIndex ? styles.pathCardSelected : ''}`} key={`${path.fileIds.join('-')}-${pathIndex}`}><button type="button" className={styles.pathSelectButton} aria-pressed={selectedPathIndex === pathIndex} onClick={() => onSelectPath(pathIndex)}>Caminho {pathIndex + 1}</button><span>{path.fileIds.map((fileId) => nameByFileId.get(fileId) ?? 'Ficha fora do quadro').join(' → ')}</span><ul>{path.segments.map((segment, segmentIndex) => <li key={`${segment.fromFileId}-${segment.toFileId}-${segmentIndex}`} className={segment.source === 'RELATIONSHIP' ? styles.pathItemOfficial : styles.pathItemEvidence}>{segment.source === 'RELATIONSHIP' ? 'Relação oficial' : 'Evidência da hipótese'} · {segment.label}</li>)}</ul></div>)}
          </div>
        )}
      </section>
    </aside>
  );
}
