'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Lightbulb, Plus, Search, Trash2 } from 'lucide-react';
import { hypothesesApi, filesApi } from '@/lib/api';
import type { CampaignFile, EvidenceStance, HypothesisEvidence, HypothesisStatus, InvestigationHypothesis } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './hypotheses.module.css';

const STATUS_OPTIONS: Array<{ value: HypothesisStatus; label: string }> = [
  { value: 'OPEN', label: 'Aberta' },
  { value: 'SUPPORTED', label: 'Sustentada' },
  { value: 'REFUTED', label: 'Refutada' },
  { value: 'RESOLVED', label: 'Resolvida' }
];
const STANCE_OPTIONS: Array<{ value: EvidenceStance; label: string }> = [
  { value: 'SUPPORTS', label: 'Sustenta' },
  { value: 'CONTRADICTS', label: 'Contradiz' },
  { value: 'CONTEXT', label: 'Contextualiza' }
];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option.label])) as Record<HypothesisStatus, string>;
const STANCE_LABELS = Object.fromEntries(STANCE_OPTIONS.map((option) => [option.value, option.label])) as Record<EvidenceStance, string>;

type HypothesesPanelProps = {
  campaignId: string;
  boardFileIds: ReadonlySet<string>;
  onFocusFile: (fileId: string) => void;
  onAddToBoard: (fileId: string) => Promise<void>;
  onHighlightFiles: (fileIds: string[]) => void;
  focusHypothesisId?: string | null;
  statusFilter?: 'ALL' | HypothesisStatus;
  evidenceStanceFilter?: 'ALL' | EvidenceStance;
  onStatusFilterChange?: (value: 'ALL' | HypothesisStatus) => void;
  onEvidenceStanceFilterChange?: (value: 'ALL' | EvidenceStance) => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function countByStance(hypothesis: InvestigationHypothesis, stance: EvidenceStance) {
  return hypothesis.evidence.filter((evidence) => evidence.stance === stance).length;
}

export default function HypothesesPanel({ campaignId, boardFileIds, onFocusFile, onAddToBoard, onHighlightFiles, focusHypothesisId, statusFilter: externalStatusFilter, evidenceStanceFilter: externalEvidenceStanceFilter, onStatusFilterChange, onEvidenceStanceFilterChange }: HypothesesPanelProps) {
  const [hypotheses, setHypotheses] = useState<InvestigationHypothesis[]>([]);
  const [files, setFiles] = useState<CampaignFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localStatusFilter, setLocalStatusFilter] = useState<'ALL' | HypothesisStatus>('ALL');
  const [search, setSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [createError, setCreateError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editStatus, setEditStatus] = useState<HypothesisStatus>('OPEN');
  const [evidenceFileId, setEvidenceFileId] = useState('');
  const [evidenceStance, setEvidenceStance] = useState<EvidenceStance>('SUPPORTS');
  const [evidenceNote, setEvidenceNote] = useState('');

  const selected = hypotheses.find((hypothesis) => hypothesis.id === selectedId) ?? null;
  const statusFilter = externalStatusFilter ?? localStatusFilter;
  const evidenceStanceFilter = externalEvidenceStanceFilter ?? 'ALL';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextHypotheses, nextFiles] = await Promise.all([
        hypothesesApi.list(campaignId),
        filesApi.list(campaignId, { scope: 'active', sort: 'name', direction: 'asc' })
      ]);
      setHypotheses(nextHypotheses);
      setFiles(nextFiles);
      setSelectedId((current) => current && nextHypotheses.some((hypothesis) => hypothesis.id === current) ? current : nextHypotheses[0]?.id ?? null);
      setError('');
    } catch {
      setError('Não foi possível carregar as hipóteses.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusHypothesisId || !hypotheses.some((hypothesis) => hypothesis.id === focusHypothesisId)) return;
    setSelectedId(focusHypothesisId);
  }, [focusHypothesisId, hypotheses]);

  useEffect(() => {
    setEditTitle(selected?.title ?? '');
    setEditSummary(selected?.summary ?? '');
    setEditStatus(selected?.status ?? 'OPEN');
    setEvidenceFileId('');
    setEvidenceNote('');
    setEvidenceStance('SUPPORTS');
    onHighlightFiles(selected?.evidence.map((evidence) => evidence.fileId) ?? []);
  }, [selectedId, selected?.title, selected?.summary, selected?.status, selected?.evidence, onHighlightFiles]);

  useEffect(() => () => onHighlightFiles([]), [onHighlightFiles]);

  const filteredHypotheses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return hypotheses.filter((hypothesis) => {
      const matchesStatus = statusFilter === 'ALL' || hypothesis.status === statusFilter;
      const matchesSearch = !normalizedSearch || `${hypothesis.title} ${hypothesis.summary ?? ''}`.toLocaleLowerCase().includes(normalizedSearch);
      const matchesStance = evidenceStanceFilter === 'ALL' || hypothesis.evidence.some((evidence) => evidence.stance === evidenceStanceFilter);
      return matchesStatus && matchesSearch && matchesStance;
    });
  }, [evidenceStanceFilter, hypotheses, search, statusFilter]);

  const availableFiles = useMemo(() => {
    const normalizedSearch = fileSearch.trim().toLocaleLowerCase();
    const evidenceIds = new Set(selected?.evidence.map((evidence) => evidence.fileId) ?? []);
    return files.filter((file) => !evidenceIds.has(file.id) && `${file.name} ${FILE_TYPE_LABELS[file.type]}`.toLocaleLowerCase().includes(normalizedSearch));
  }, [files, fileSearch, selected]);

  async function createHypothesis(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTitle.trim()) {
      setCreateError('Informe um título para a hipótese.');
      return;
    }
    setBusy(true);
    setCreateError('');
    try {
      const created = await hypothesesApi.create(campaignId, { title: newTitle.trim(), summary: newSummary.trim() || null });
      setHypotheses((current) => [created, ...current]);
      setSelectedId(created.id);
      setNewTitle('');
      setNewSummary('');
      setShowCreate(false);
    } catch {
      setCreateError('Não foi possível criar a hipótese.');
    } finally {
      setBusy(false);
    }
  }

  async function saveHypothesis() {
    if (!selected || !editTitle.trim()) return;
    setBusy(true);
    try {
      const updated = await hypothesesApi.update(campaignId, selected.id, { title: editTitle.trim(), summary: editSummary.trim() || null, status: editStatus });
      setHypotheses((current) => current.map((hypothesis) => hypothesis.id === updated.id ? updated : hypothesis));
    } catch {
      setError('Não foi possível salvar a hipótese.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteHypothesis() {
    if (!selected) return;
    setBusy(true);
    try {
      await hypothesesApi.remove(campaignId, selected.id);
      const remaining = hypotheses.filter((hypothesis) => hypothesis.id !== selected.id);
      setHypotheses(remaining);
      setSelectedId(remaining[0]?.id ?? null);
    } catch {
      setError('Não foi possível remover a hipótese.');
    } finally {
      setBusy(false);
    }
  }

  async function addEvidence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !evidenceFileId) return;
    setBusy(true);
    try {
      const created = await hypothesesApi.addEvidence(campaignId, selected.id, { fileId: evidenceFileId, stance: evidenceStance, note: evidenceNote.trim() || null });
      setHypotheses((current) => current.map((hypothesis) => hypothesis.id === selected.id ? { ...hypothesis, evidence: [...hypothesis.evidence, created], updatedAt: new Date().toISOString() } : hypothesis));
      setEvidenceFileId('');
      setEvidenceNote('');
      onHighlightFiles([...selected.evidence.map((evidence) => evidence.fileId), created.fileId]);
    } catch {
      setError('Não foi possível adicionar a evidência.');
    } finally {
      setBusy(false);
    }
  }

  async function updateEvidence(evidence: HypothesisEvidence, patch: { stance?: EvidenceStance; note?: string | null; order?: number }) {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await hypothesesApi.updateEvidence(campaignId, selected.id, evidence.id, patch);
      setHypotheses((current) => current.map((hypothesis) => hypothesis.id === selected.id ? { ...hypothesis, evidence: hypothesis.evidence.map((item) => item.id === updated.id ? updated : item), updatedAt: new Date().toISOString() } : hypothesis));
    } catch {
      setError('Não foi possível atualizar a evidência.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvidence(evidence: HypothesisEvidence) {
    if (!selected) return;
    setBusy(true);
    try {
      await hypothesesApi.removeEvidence(campaignId, selected.id, evidence.id);
      setHypotheses((current) => current.map((hypothesis) => hypothesis.id === selected.id ? { ...hypothesis, evidence: hypothesis.evidence.filter((item) => item.id !== evidence.id), updatedAt: new Date().toISOString() } : hypothesis));
    } catch {
      setError('Não foi possível remover a evidência.');
    } finally {
      setBusy(false);
    }
  }

  function chooseHypothesis(id: string) {
    setSelectedId(id);
    const next = hypotheses.find((hypothesis) => hypothesis.id === id);
    onHighlightFiles(next?.evidence.map((evidence) => evidence.fileId) ?? []);
  }

  return (
    <aside className={styles.panel} aria-label="Hipóteses e evidências">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}><Lightbulb size={13} /> Raciocínio do Mestre</p>
          <h2>Hipóteses</h2>
        </div>
        <button className={styles.iconButton} type="button" onClick={() => setShowCreate((value) => !value)} aria-label="Criar hipótese" aria-expanded={showCreate}><Plus size={17} /></button>
      </div>

      {showCreate && (
        <form className={styles.createForm} onSubmit={createHypothesis}>
          <label>Título<input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={200} autoFocus placeholder="Ex.: O zelador esconde a chave" /></label>
          <label>Resumo<textarea value={newSummary} onChange={(event) => setNewSummary(event.target.value)} maxLength={4000} placeholder="Conclusão provisória e contexto..." /></label>
          {createError && <p className={styles.formError}>{createError}</p>}
          <button className={styles.primaryButton} type="submit" disabled={busy}>Criar hipótese</button>
        </form>
      )}

      <div className={styles.filters}>
        <label className={styles.searchField}><Search size={14} /><span className={styles.srOnly}>Buscar hipóteses</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar hipóteses..." /></label>
        <select aria-label="Filtrar hipóteses por estado" value={statusFilter} onChange={(event) => { const value = event.target.value as 'ALL' | HypothesisStatus; setLocalStatusFilter(value); onStatusFilterChange?.(value); }}>
          <option value="ALL">Todos os estados</option>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select aria-label="Filtrar evidências por posição" value={evidenceStanceFilter} onChange={(event) => onEvidenceStanceFilterChange?.(event.target.value as 'ALL' | EvidenceStance)}>
          <option value="ALL">Todas as posições</option>
          {STANCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {error && <p className={styles.formError} role="alert">{error}</p>}
      {loading ? <p className={styles.emptyState}>Carregando hipóteses...</p> : filteredHypotheses.length === 0 ? (
        <div className={styles.emptyState}>
          <Lightbulb size={22} />
          <strong>{hypotheses.length ? 'Nenhuma hipótese encontrada' : 'Nenhuma hipótese aberta'}</strong>
          <span>{hypotheses.length ? 'Ajuste o filtro ou a busca local.' : 'Adicione fichas que sustentam ou contradizem esta linha de investigação.'}</span>
        </div>
      ) : (
        <div className={styles.list} aria-label="Lista de hipóteses">
          {filteredHypotheses.map((hypothesis) => (
            <button key={hypothesis.id} type="button" className={`${styles.hypothesisRow} ${selectedId === hypothesis.id ? styles.hypothesisRowSelected : ''}`} onClick={() => chooseHypothesis(hypothesis.id)}>
              <span className={`${styles.statusDot} ${styles[`status${hypothesis.status}`]}`} aria-hidden="true" />
              <span className={styles.rowContent}><strong>{hypothesis.title}</strong><small>{STATUS_LABELS[hypothesis.status]} · {formatDate(hypothesis.updatedAt)}</small></span>
              <span className={styles.counts} aria-label={`${countByStance(hypothesis, 'SUPPORTS')} favoráveis e ${countByStance(hypothesis, 'CONTRADICTS')} contrárias`}><span className={styles.supportCount}>+{countByStance(hypothesis, 'SUPPORTS')}</span><span className={styles.contradictCount}>−{countByStance(hypothesis, 'CONTRADICTS')}</span></span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <section className={styles.detail} aria-labelledby="hypothesis-detail-title">
          <div className={styles.detailHeading}><div><p className={styles.eyebrow}>Hipótese selecionada</p><h3 id="hypothesis-detail-title">{selected.title}</h3></div><span className={`${styles.statusBadge} ${styles[`status${selected.status}`]}`}>{STATUS_LABELS[selected.status]}</span></div>
          <div className={styles.detailFields}>
            <label>Título<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={200} /></label>
            <label>Resumo<textarea value={editSummary} onChange={(event) => setEditSummary(event.target.value)} maxLength={4000} /></label>
            <label>Estado<select value={editStatus} onChange={(event) => setEditStatus(event.target.value as HypothesisStatus)}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <button className={styles.primaryButton} type="button" disabled={busy} onClick={saveHypothesis}>Salvar alterações</button>
          </div>

          <div className={styles.evidenceHeader}><div><h4>Evidências</h4><span>{selected.evidence.length} vinculada{selected.evidence.length === 1 ? '' : 's'}</span></div><span className={styles.evidenceLegend}><span>+ {countByStance(selected, 'SUPPORTS')}</span><span>− {countByStance(selected, 'CONTRADICTS')}</span><span>• {countByStance(selected, 'CONTEXT')}</span></span></div>
          {(['SUPPORTS', 'CONTRADICTS', 'CONTEXT'] as EvidenceStance[]).map((stance) => {
            const evidence = selected.evidence.filter((item) => item.stance === stance).sort((a, b) => a.order - b.order);
            return <div className={styles.evidenceGroup} key={stance}><h5>{STANCE_LABELS[stance]} <span>{evidence.length}</span></h5>{evidence.length === 0 ? <p className={styles.groupEmpty}>Nenhuma evidência neste grupo.</p> : evidence.map((item, index) => <EvidenceRow key={item.id} evidence={item} index={index} total={evidence.length} isOnBoard={boardFileIds.has(item.fileId)} busy={busy} onFocus={() => onFocusFile(item.fileId)} onAddToBoard={() => onAddToBoard(item.fileId)} onUpdate={updateEvidence} onRemove={deleteEvidence} />)}</div>;
          })}

          <form className={styles.evidenceForm} onSubmit={addEvidence}>
            <h4>Adicionar evidência</h4>
            <label>Buscar ficha<input value={fileSearch} onChange={(event) => setFileSearch(event.target.value)} placeholder="Buscar por nome ou tipo..." /></label>
            <label>Ficha<select value={evidenceFileId} onChange={(event) => setEvidenceFileId(event.target.value)}><option value="">Selecione uma ficha</option>{availableFiles.map((file) => <option key={file.id} value={file.id}>{file.name} · {FILE_TYPE_LABELS[file.type]}</option>)}</select></label>
            <label>Posição<select value={evidenceStance} onChange={(event) => setEvidenceStance(event.target.value as EvidenceStance)}>{STANCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label>Nota curta<textarea value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} maxLength={1000} placeholder="Por que esta ficha importa?" /></label>
            <button className={styles.secondaryButton} type="submit" disabled={busy || !evidenceFileId}><Plus size={14} /> Vincular evidência</button>
          </form>

          <div className={styles.detailFooter}><span>Atualizada em {formatDate(selected.updatedAt)}</span><button type="button" className={styles.dangerButton} disabled={busy} onClick={deleteHypothesis}><Trash2 size={14} /> Remover hipótese</button></div>
        </section>
      )}
    </aside>
  );
}

type EvidenceRowProps = {
  evidence: HypothesisEvidence;
  index: number;
  total: number;
  isOnBoard: boolean;
  busy: boolean;
  onFocus: () => void;
  onAddToBoard: () => Promise<void>;
  onUpdate: (evidence: HypothesisEvidence, patch: { stance?: EvidenceStance; note?: string | null; order?: number }) => Promise<void>;
  onRemove: (evidence: HypothesisEvidence) => Promise<void>;
};

function EvidenceRow({ evidence, index, total, isOnBoard, busy, onFocus, onAddToBoard, onUpdate, onRemove }: EvidenceRowProps) {
  const [note, setNote] = useState(evidence.note ?? '');
  const [stance, setStance] = useState(evidence.stance);
  const [addError, setAddError] = useState('');

  async function addToBoard() {
    setAddError('');
    try {
      await onAddToBoard();
    } catch {
      setAddError('Não foi possível adicionar esta ficha ao quadro.');
    }
  }
  return (
    <article className={styles.evidenceCard}>
      <button type="button" className={styles.evidenceTitle} onClick={onFocus}><span className={styles.stanceMark}>{evidence.stance === 'SUPPORTS' ? '+' : evidence.stance === 'CONTRADICTS' ? '−' : '•'}</span><span><strong>{evidence.file.name}</strong><small>{FILE_TYPE_LABELS[evidence.file.type]} · {isOnBoard ? 'No quadro' : 'Fora do quadro'}</small></span><ExternalLink size={13} /></button>
      <label>Posição<select value={stance} onChange={(event) => setStance(event.target.value as EvidenceStance)}><option value="SUPPORTS">Sustenta</option><option value="CONTRADICTS">Contradiz</option><option value="CONTEXT">Contextualiza</option></select></label>
      <label>Nota<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} /></label>
      <div className={styles.evidenceActions}>
        <button type="button" className={styles.smallButton} disabled={busy || (stance === evidence.stance && note === (evidence.note ?? ''))} onClick={() => onUpdate(evidence, { stance, note: note.trim() || null })}>Salvar</button>
        <button type="button" className={styles.smallButton} disabled={busy || index === 0} onClick={() => onUpdate(evidence, { order: Math.max(0, evidence.order - 1) })} aria-label="Mover evidência para cima"><ChevronUp size={14} /></button>
        <button type="button" className={styles.smallButton} disabled={busy || index === total - 1} onClick={() => onUpdate(evidence, { order: evidence.order + 1 })} aria-label="Mover evidência para baixo"><ChevronDown size={14} /></button>
        {!isOnBoard && <button type="button" className={styles.smallButton} disabled={busy} onClick={() => void addToBoard()}>Adicionar ao quadro</button>}
        <button type="button" className={styles.smallDangerButton} disabled={busy} onClick={() => void onRemove(evidence)} aria-label={`Remover evidência ${evidence.file.name}`}><Trash2 size={14} /></button>
      </div>
      {addError && <p className={styles.formError} role="alert">{addError}</p>}
    </article>
  );
}
