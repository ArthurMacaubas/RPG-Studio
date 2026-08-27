'use client';

import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { CampaignFile, EvidenceStance, FileType, HypothesisStatus, RelationshipImportance, RelationshipVisibility, Tag } from '@/types';
import type { BoardInvestigationFilters, BoardPresenceFilter } from './investigationBoardFilterLogic';
import styles from './investigationFilters.module.css';

export type InvestigationFileScope = 'active' | 'archived' | 'trash';
export type LayerKey = 'files' | 'officialRelationships' | 'visualEdges' | 'evidence' | 'hypotheses' | 'annotations';

export type InvestigationFilterState = {
  search: string;
  fileType: FileType | 'ALL';
  tagIds: string[];
  scope: InvestigationFileScope;
  favoritesOnly: boolean;
  relationshipImportance: RelationshipImportance | 'ALL';
  relationshipVisibility: RelationshipVisibility | 'ALL';
  hypothesisStatus: HypothesisStatus | 'ALL';
  evidenceStance: EvidenceStance | 'ALL';
  layers: Record<LayerKey, boolean>;
};

export const DEFAULT_INVESTIGATION_FILTERS: InvestigationFilterState = {
  search: '',
  fileType: 'ALL',
  tagIds: [],
  scope: 'active',
  favoritesOnly: false,
  relationshipImportance: 'ALL',
  relationshipVisibility: 'ALL',
  hypothesisStatus: 'ALL',
  evidenceStance: 'ALL',
  layers: { files: true, officialRelationships: true, visualEdges: true, evidence: true, hypotheses: true, annotations: true }
};

export const DEFAULT_BOARD_INVESTIGATION_FILTERS: BoardInvestigationFilters = {
  presence: 'ALL',
  usedAsEvidence: false,
  inOpenHypothesis: false,
  importantRelationship: false
};

const FILE_TYPES: Array<{ value: FileType; label: string }> = [
  { value: 'CHARACTER', label: 'Personagem' },
  { value: 'NPC', label: 'NPC' },
  { value: 'THREAT', label: 'Ameaça' },
  { value: 'LOCATION', label: 'Local' },
  { value: 'CLUE', label: 'Pista' },
  { value: 'PUZZLE', label: 'Puzzle' },
  { value: 'DOCUMENT', label: 'Documento' },
  { value: 'OBJECT', label: 'Objeto' },
  { value: 'EVENT', label: 'Evento' },
  { value: 'SESSION', label: 'Sessão' },
  { value: 'MAP', label: 'Mapa' },
  { value: 'IMAGE', label: 'Imagem' },
  { value: 'AUDIO', label: 'Áudio' },
  { value: 'VIDEO', label: 'Vídeo' },
  { value: 'NOTE', label: 'Nota' }
];
const IMPORTANCE_OPTIONS: Array<{ value: RelationshipImportance; label: string }> = [
  { value: 'CRITICAL', label: 'Crítica' },
  { value: 'IMPORTANT', label: 'Importante' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'OPTIONAL', label: 'Opcional' }
];
const VISIBILITY_OPTIONS: Array<{ value: RelationshipVisibility; label: string }> = [
  { value: 'GM', label: 'Mestre' },
  { value: 'ALL', label: 'Todos' },
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
  { value: 'P3', label: 'P3' },
  { value: 'P4', label: 'P4' }
];
const LAYER_OPTIONS: Array<{ key: LayerKey; label: string; note: string; swatch: string }> = [
  { key: 'files', label: 'Fichas', note: 'Nós persistidos', swatch: 'fileSwatch' },
  { key: 'officialRelationships', label: 'Relações oficiais', note: 'Fonte canônica', swatch: 'relationshipSwatch' },
  { key: 'visualEdges', label: 'Arestas visuais', note: 'Fios do quadro', swatch: 'edgeSwatch' },
  { key: 'evidence', label: 'Evidências', note: 'Destaque temporário', swatch: 'evidenceSwatch' },
  { key: 'hypotheses', label: 'Hipóteses', note: 'Raciocínio do Mestre', swatch: 'hypothesisSwatch' },
  { key: 'annotations', label: 'Anotações do Mestre', note: 'Pins e agrupamentos', swatch: 'annotationSwatch' }
];

function updateFilter<K extends keyof InvestigationFilterState>(filters: InvestigationFilterState, key: K, value: InvestigationFilterState[K]) {
  return { ...filters, [key]: value };
}

function updateInvestigationFilter<K extends keyof BoardInvestigationFilters>(filters: BoardInvestigationFilters, key: K, value: BoardInvestigationFilters[K]) {
  return { ...filters, [key]: value };
}

type InvestigationFiltersPanelProps = {
  filters: InvestigationFilterState;
  investigationFilters: BoardInvestigationFilters;
  files: CampaignFile[];
  visibleFiles: CampaignFile[];
  boardFileIds: ReadonlySet<string>;
  tags: Tag[];
  visibleNodeCount: number;
  officialRelationshipCount: number;
  filteredOfficialRelationshipCount: number;
  onChange: (filters: InvestigationFilterState) => void;
  onInvestigationChange: (filters: BoardInvestigationFilters) => void;
  onReset: () => void;
  onFocusFile: (fileId: string) => void;
  onAddToBoard: (fileId: string) => Promise<void>;
  onOpenFile: (fileId: string) => void;
};

function hasInvestigationFilter(filters: BoardInvestigationFilters) {
  return filters.presence !== 'ALL' || filters.usedAsEvidence || filters.inOpenHypothesis || filters.importantRelationship;
}

function presenceLabel(value: BoardPresenceFilter) {
  if (value === 'ON_BOARD') return 'No canvas';
  if (value === 'OFF_BOARD') return 'Fora do canvas';
  return 'Todas as fichas';
}

export default function InvestigationFiltersPanel({ filters, investigationFilters, files, visibleFiles, boardFileIds, tags, visibleNodeCount, officialRelationshipCount, filteredOfficialRelationshipCount, onChange, onInvestigationChange, onReset, onFocusFile, onAddToBoard, onOpenFile }: InvestigationFiltersPanelProps) {
  function toggleTag(tagId: string) {
    const nextTagIds = filters.tagIds.includes(tagId) ? filters.tagIds.filter((id) => id !== tagId) : [...filters.tagIds, tagId];
    onChange(updateFilter(filters, 'tagIds', nextTagIds));
  }

  function toggleLayer(key: LayerKey) {
    onChange(updateFilter(filters, 'layers', { ...filters.layers, [key]: !filters.layers[key] }));
  }

  const activeFilterCount = [
    filters.search,
    filters.fileType !== 'ALL' ? filters.fileType : '',
    filters.tagIds.length ? 'tags' : '',
    filters.scope !== 'active' ? filters.scope : '',
    filters.favoritesOnly ? 'favorites' : '',
    filters.relationshipImportance !== 'ALL' ? filters.relationshipImportance : '',
    filters.relationshipVisibility !== 'ALL' ? filters.relationshipVisibility : '',
    filters.hypothesisStatus !== 'ALL' ? filters.hypothesisStatus : '',
    filters.evidenceStance !== 'ALL' ? filters.evidenceStance : '',
    investigationFilters.presence !== 'ALL' ? investigationFilters.presence : '',
    investigationFilters.usedAsEvidence ? 'evidence' : '',
    investigationFilters.inOpenHypothesis ? 'open-hypothesis' : '',
    investigationFilters.importantRelationship ? 'important-relationship' : ''
  ].filter(Boolean).length;
  const showResults = activeFilterCount > 0;

  return (
    <aside className={styles.panel} aria-label="Filtros e camadas do quadro">
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}><SlidersHorizontal size={13} /> Navegação do quadro</p><h2>Filtros e camadas</h2></div>
        <button type="button" className={styles.resetButton} onClick={onReset} aria-label="Limpar filtros" title="Limpar filtros"><RotateCcw size={14} /></button>
      </div>
      <p className={styles.summary} aria-live="polite">{activeFilterCount ? `${activeFilterCount} filtro${activeFilterCount === 1 ? '' : 's'} ativo${activeFilterCount === 1 ? '' : 's'}` : 'Nenhum filtro ativo'} · {visibleNodeCount} nó{visibleNodeCount === 1 ? '' : 's'} visível{visibleNodeCount === 1 ? '' : 'is'} · {visibleFiles.length} resultado{visibleFiles.length === 1 ? '' : 's'} local{visibleFiles.length === 1 ? '' : 'is'}</p>

      <label className={styles.searchField}><Search size={14} /><span className={styles.srOnly}>Buscar no quadro</span><input value={filters.search} onChange={(event) => onChange(updateFilter(filters, 'search', event.target.value))} placeholder="Nome, tipo, tags ou hipótese..." /></label>

      <div className={styles.fieldsGrid}>
        <label>Tipo<select value={filters.fileType} onChange={(event) => onChange(updateFilter(filters, 'fileType', event.target.value as FileType | 'ALL'))}><option value="ALL">Todos os tipos</option>{FILE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Escopo<select value={filters.scope} onChange={(event) => onChange(updateFilter(filters, 'scope', event.target.value as InvestigationFileScope))}><option value="active">Ativas</option><option value="archived">Arquivadas</option><option value="trash">Lixeira</option></select></label>
      </div>
      <label className={styles.checkbox}><input type="checkbox" checked={filters.favoritesOnly} onChange={(event) => onChange(updateFilter(filters, 'favoritesOnly', event.target.checked))} /> Somente favoritas</label>

      <fieldset className={styles.fieldset}><legend>Tags</legend>{tags.length === 0 ? <p className={styles.muted}>Nenhuma tag no escopo carregado.</p> : <div className={styles.chips}>{tags.map((tag) => <label key={tag.id} className={`${styles.chip} ${filters.tagIds.includes(tag.id) ? styles.chipActive : ''}`}><input type="checkbox" checked={filters.tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} /><span style={{ borderColor: tag.color }}>{tag.name}</span></label>)}</div>}</fieldset>

      <fieldset className={styles.fieldset}><legend>Investigação</legend><div className={styles.fieldsGrid}>
        <label>Presença<select aria-label="Filtrar por presença no canvas" value={investigationFilters.presence} onChange={(event) => onInvestigationChange(updateInvestigationFilter(investigationFilters, 'presence', event.target.value as BoardPresenceFilter))}><option value="ALL">Todas as fichas</option><option value="ON_BOARD">No canvas</option><option value="OFF_BOARD">Fora do canvas</option></select></label>
      </div>
        <label className={styles.checkbox}><input type="checkbox" checked={investigationFilters.usedAsEvidence} onChange={(event) => onInvestigationChange(updateInvestigationFilter(investigationFilters, 'usedAsEvidence', event.target.checked))} /> Usada como evidência</label>
        <label className={styles.checkbox}><input type="checkbox" checked={investigationFilters.inOpenHypothesis} onChange={(event) => onInvestigationChange(updateInvestigationFilter(investigationFilters, 'inOpenHypothesis', event.target.checked))} /> Ligada a hipótese aberta</label>
        <label className={styles.checkbox}><input type="checkbox" checked={investigationFilters.importantRelationship} onChange={(event) => onInvestigationChange(updateInvestigationFilter(investigationFilters, 'importantRelationship', event.target.checked))} /> Em relação oficial importante</label>
      </fieldset>

      <details className={styles.details} open>
        <summary>Relações oficiais</summary>
        <p className={styles.layerCount}>Fonte canônica; o overlay é somente leitura e não edita dados nesta camada.</p>
        <div className={styles.fieldsGrid}>
          <label>Importância<select value={filters.relationshipImportance} onChange={(event) => onChange(updateFilter(filters, 'relationshipImportance', event.target.value as RelationshipImportance | 'ALL'))}><option value="ALL">Todas</option>{IMPORTANCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Visibilidade<select value={filters.relationshipVisibility} onChange={(event) => onChange(updateFilter(filters, 'relationshipVisibility', event.target.value as RelationshipVisibility | 'ALL'))}><option value="ALL">Todas</option>{VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <p className={styles.layerCount}>{filteredOfficialRelationshipCount} de {officialRelationshipCount} {officialRelationshipCount === 1 ? 'relação corresponde' : 'relações correspondem'} ao filtro.</p>
      </details>

      <details className={styles.details} open>
        <summary>Hipóteses e evidências</summary>
        <div className={styles.fieldsGrid}>
          <label>Estado<select value={filters.hypothesisStatus} onChange={(event) => onChange(updateFilter(filters, 'hypothesisStatus', event.target.value as HypothesisStatus | 'ALL'))}><option value="ALL">Todos</option><option value="OPEN">Aberta</option><option value="SUPPORTED">Sustentada</option><option value="REFUTED">Refutada</option><option value="RESOLVED">Resolvida</option></select></label>
          <label>Stance<select value={filters.evidenceStance} onChange={(event) => onChange(updateFilter(filters, 'evidenceStance', event.target.value as EvidenceStance | 'ALL'))}><option value="ALL">Todas</option><option value="SUPPORTS">Sustenta</option><option value="CONTRADICTS">Contradiz</option><option value="CONTEXT">Contextualiza</option></select></label>
        </div>
      </details>

      <fieldset className={styles.fieldset}><legend>Camadas visuais</legend><div className={styles.layers}>{LAYER_OPTIONS.map((layer) => <label key={layer.key} className={styles.layer}><input type="checkbox" checked={filters.layers[layer.key]} onChange={() => toggleLayer(layer.key)} /><span className={`${styles.swatch} ${styles[layer.swatch]}`} /><span><strong>{layer.label}</strong><small>{layer.note}</small></span></label>)}</div></fieldset>

      {showResults && (
        <section className={styles.results} aria-labelledby="board-search-results-title">
          <div className={styles.resultsHeading}><div><h3 id="board-search-results-title">Resultados locais</h3><span>{visibleFiles.length} ficha{visibleFiles.length === 1 ? '' : 's'} no escopo carregado</span></div><span className={styles.resultsScope}>{presenceLabel(investigationFilters.presence)}</span></div>
          {visibleFiles.length === 0 ? <div className={styles.emptyState}><strong>Nenhuma ficha corresponde.</strong><span>Os filtros atuais são locais e reversíveis.</span><button type="button" className={styles.emptyAction} onClick={onReset}>Remover filtros</button></div> : <ul className={styles.resultList}>{visibleFiles.slice(0, 18).map((file) => {
            const onBoard = boardFileIds.has(file.id);
            return <li key={file.id} className={styles.resultItem}><div><strong>{file.name}</strong><small>{FILE_TYPES.find((item) => item.value === file.type)?.label ?? file.type} · {onBoard ? 'No canvas' : 'Fora do canvas'}</small></div><div className={styles.resultActions}>{onBoard ? <button type="button" onClick={() => onFocusFile(file.id)}>Focar</button> : <><button type="button" onClick={() => onOpenFile(file.id)}>Abrir ficha</button><button type="button" onClick={() => void onAddToBoard(file.id)}>Adicionar</button></>}</div></li>;
          })}</ul>}
          {visibleFiles.length > 18 && <p className={styles.layerCount}>Mostrando as primeiras 18 fichas. Refine a busca para reduzir a lista.</p>}
        </section>
      )}

      {files.length > 0 && visibleNodeCount === 0 && <p className={styles.emptyState}>Há {files.length} ficha{files.length === 1 ? '' : 's'} no escopo selecionado, mas nenhuma está representada no canvas atual.</p>}
      <p className={styles.caption}>Filtros, resultados e camadas são locais e reversíveis; nenhuma alteração é persistida por esta navegação.</p>
    </aside>
  );
}
