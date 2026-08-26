'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardList, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { filesApi, hypothesesApi, sessionPlansApi, boardViewsApi } from '@/lib/api';
import type { CampaignFile, InvestigationBoardViewItem, InvestigationHypothesis, SessionPlanItem, SessionPlanning } from '@/types';
import styles from './sessionPlanning.module.css';

type ItemKey = 'checklist' | 'objectives' | 'agenda';
type Draft = Omit<SessionPlanning, 'id' | 'campaignId' | 'files' | 'hypotheses' | 'views' | 'completedAt'> & { id: string; completedAt: string | null };

function makeItem(label = ''): SessionPlanItem {
  return { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, label, done: false };
}

function toDraft(plan: SessionPlanning): Draft {
  return {
    id: plan.id,
    name: plan.name,
    date: plan.date,
    summary: plan.summary,
    checklist: plan.checklist.map((item) => ({ ...item })),
    objectives: plan.objectives.map((item) => ({ ...item })),
    agenda: plan.agenda.map((item) => ({ ...item })),
    postSummary: plan.postSummary,
    status: plan.status,
    completedAt: plan.completedAt,
    order: plan.order
  };
}

function localDateValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoDateValue(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function SessionPlanningPanel({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [plans, setPlans] = useState<SessionPlanning[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [files, setFiles] = useState<CampaignFile[]>([]);
  const [hypotheses, setHypotheses] = useState<InvestigationHypothesis[]>([]);
  const [views, setViews] = useState<InvestigationBoardViewItem[]>([]);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedId) ?? null, [plans, selectedId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [nextPlans, nextFiles, nextHypotheses, nextViews] = await Promise.all([
        sessionPlansApi.list(campaignId),
        filesApi.list(campaignId, { scope: 'active', sort: 'name', direction: 'asc' }),
        hypothesesApi.list(campaignId),
        boardViewsApi.list(campaignId)
      ]);
      setPlans(nextPlans);
      setFiles(nextFiles);
      setHypotheses(nextHypotheses);
      setViews(nextViews.views);
      const nextId = selectedId && nextPlans.some((plan) => plan.id === selectedId) ? selectedId : nextPlans[0]?.id ?? '';
      setSelectedId(nextId);
      setDraft(nextPlans.find((plan) => plan.id === nextId) ? toDraft(nextPlans.find((plan) => plan.id === nextId)!) : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os planejamentos administrativos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  function selectPlan(id: string) {
    setSelectedId(id);
    const plan = plans.find((item) => item.id === id);
    setDraft(plan ? toDraft(plan) : null);
    setMessage('');
    setError('');
  }

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const plan = await sessionPlansApi.create(campaignId, { name: newName.trim(), checklist: [], objectives: [], agenda: [], fileIds: [], hypothesisIds: [], viewIds: [] });
      setPlans((current) => [...current, plan]);
      setSelectedId(plan.id);
      setDraft(toDraft(plan));
      setNewName('');
      setMessage('Planejamento criado como rascunho privado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o planejamento.');
    } finally {
      setBusy(false);
    }
  }

  async function savePlan(status?: 'PLANNED' | 'COMPLETED') {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      const updated = await sessionPlansApi.update(draft.id, {
        name: draft.name,
        date: draft.date,
        summary: draft.summary,
        checklist: draft.checklist,
        objectives: draft.objectives,
        agenda: draft.agenda,
        postSummary: draft.postSummary,
        status: status ?? draft.status,
        order: draft.order,
        fileIds: draftFiles,
        hypothesisIds: draftHypotheses,
        viewIds: draftViews
      });
      setPlans((current) => current.map((plan) => plan.id === updated.id ? updated : plan));
      setDraft(toDraft(updated));
      setMessage(status === 'COMPLETED' ? 'Sessão concluída; o planejamento continua privado.' : 'Planejamento salvo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o planejamento.');
    } finally {
      setBusy(false);
    }
  }

  async function removePlan() {
    if (!draft || !window.confirm('Remover este planejamento administrativo? O arquivo canônico de sessão não será alterado.')) return;
    setBusy(true);
    setError('');
    try {
      await sessionPlansApi.remove(draft.id);
      const remaining = plans.filter((plan) => plan.id !== draft.id);
      setPlans(remaining);
      setSelectedId(remaining[0]?.id ?? '');
      setDraft(remaining[0] ? toDraft(remaining[0]) : null);
      setMessage('Planejamento removido; nenhum CampaignFile SESSION foi alterado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível remover o planejamento.');
    } finally {
      setBusy(false);
    }
  }

  function updateItems(key: ItemKey, updater: (items: SessionPlanItem[]) => SessionPlanItem[]) {
    setDraft((current) => current ? { ...current, [key]: updater(current[key]) } : current);
  }

  function addItem(key: ItemKey) {
    updateItems(key, (items) => [...items, makeItem()]);
  }

  function updateItem(key: ItemKey, id: string, patch: Partial<SessionPlanItem>) {
    updateItems(key, (items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function removeItem(key: ItemKey, id: string) {
    updateItems(key, (items) => items.filter((item) => item.id !== id));
  }

  const draftFiles = draft ? plans.find((plan) => plan.id === draft.id)?.files.map((file) => file.id) ?? [] : [];
  const draftHypotheses = draft ? plans.find((plan) => plan.id === draft.id)?.hypotheses.map((hypothesis) => hypothesis.id) ?? [] : [];
  const draftViews = draft ? plans.find((plan) => plan.id === draft.id)?.views.map((view) => view.id) ?? [] : [];
  const linkedFileIds = draftFiles;
  const linkedHypothesisIds = draftHypotheses;
  const linkedViewIds = draftViews;

  function setLinked(kind: 'files' | 'hypotheses' | 'views', values: string[]) {
    if (!draft) return;
    const nextPlan = kind === 'files' ? { ...selectedPlan!, files: files.filter((file) => values.includes(file.id)).map((file) => ({ id: file.id, name: file.name, type: file.type })) } : kind === 'hypotheses' ? { ...selectedPlan!, hypotheses: hypotheses.filter((item) => values.includes(item.id)).map((item) => ({ id: item.id, title: item.title, status: item.status })) } : { ...selectedPlan!, views: views.filter((view) => values.includes(view.id)).map((item) => ({ id: item.id, name: item.name, kind: item.kind })) };
    setPlans((current) => current.map((item) => item.id === draft.id ? nextPlan : item));
  }

  if (loading) return <section className={styles.panel} aria-busy="true"><div className={styles.heading}><div><span className={styles.eyebrow}><ClipboardList size={14} /> Planejamento privado</span><h2>Sessões administrativas</h2></div></div><p className={styles.muted}>Carregando rascunhos do Mestre…</p></section>;

  return (
    <section className={styles.panel} aria-label="Planejamento administrativo de sessões">
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}><ClipboardList size={14} /> OWNER · privado</span><h2>Planejamento de sessões</h2><p className={styles.intro}>Organize objetivos, roteiro, checklist, resumo pós-sessão e vínculos administrativos. Nada aqui publica ou converte CampaignFile SESSION.</p></div>
        <span className={styles.privateBadge}>Não publicado</span>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}
      <div className={styles.layout}>
        <aside className={styles.list} aria-label="Planejamentos existentes">
          <form className={styles.createForm} onSubmit={createPlan}><label htmlFor="new-session-plan">Novo planejamento</label><div className={styles.inline}><input id="new-session-plan" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={160} placeholder="Ex.: Sessão 01 — investigação" /><button type="submit" disabled={busy || !newName.trim()} aria-label="Criar planejamento"><Plus size={15} /></button></div></form>
          {plans.length === 0 ? <p className={styles.muted}>Nenhum planejamento administrativo ainda.</p> : <div className={styles.planList}>{plans.map((plan) => <button type="button" key={plan.id} className={`${styles.planButton} ${selectedId === plan.id ? styles.planButtonActive : ''}`} onClick={() => selectPlan(plan.id)}><strong>{plan.name}</strong><small>{plan.status === 'COMPLETED' ? 'Concluída' : 'Rascunho'} · {plan.objectives.length} objetivos</small></button>)}</div>}
        </aside>
        {draft && selectedPlan ? <div className={styles.editor}>
          <div className={styles.editorTop}><div><span className={styles.eyebrow}>Rascunho selecionado</span><h3>{draft.name || 'Sem título'}</h3></div><div className={styles.actions}><button type="button" className={styles.secondary} onClick={removePlan} disabled={busy}><Trash2 size={14} /> Remover</button><button type="button" className={styles.primary} onClick={() => void savePlan()} disabled={busy || !draft.name.trim()}><Save size={14} /> Salvar</button>{draft.status !== 'COMPLETED' && <button type="button" className={styles.complete} onClick={() => void savePlan('COMPLETED')} disabled={busy || !draft.name.trim()}><Check size={14} /> Concluir</button>}</div></div>
          <div className={styles.fields}><label>Título<input value={draft.name} onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)} maxLength={160} /></label><label>Data<input type="datetime-local" value={localDateValue(draft.date)} onChange={(event) => setDraft((current) => current ? { ...current, date: isoDateValue(event.target.value) } : current)} /></label><label className={styles.wide}>Resumo da sessão<textarea value={draft.summary ?? ''} onChange={(event) => setDraft((current) => current ? { ...current, summary: event.target.value } : current)} maxLength={4000} rows={3} /></label></div>
          <div className={styles.itemGrid}><ItemEditor title="Objetivos" items={draft.objectives} onAdd={() => addItem('objectives')} onChange={(id, patch) => updateItem('objectives', id, patch)} onRemove={(id) => removeItem('objectives', id)} /><ItemEditor title="Roteiro" items={draft.agenda} onAdd={() => addItem('agenda')} onChange={(id, patch) => updateItem('agenda', id, patch)} onRemove={(id) => removeItem('agenda', id)} /><ItemEditor title="Checklist" items={draft.checklist} onAdd={() => addItem('checklist')} onChange={(id, patch) => updateItem('checklist', id, patch)} onRemove={(id) => removeItem('checklist', id)} /></div>
          <label className={styles.postSummary}>Resumo pós-sessão<textarea value={draft.postSummary ?? ''} onChange={(event) => setDraft((current) => current ? { ...current, postSummary: event.target.value } : current)} maxLength={20000} rows={5} placeholder="Notas privadas após a mesa…" /></label>
          <div className={styles.linksGrid}><LinkSelect label="Fichas vinculadas" values={linkedFileIds} options={files.map((file) => ({ id: file.id, label: file.name }))} onChange={(values) => setLinked('files', values)} /><LinkSelect label="Hipóteses vinculadas" values={linkedHypothesisIds} options={hypotheses.map((item) => ({ id: item.id, label: item.title }))} onChange={(values) => setLinked('hypotheses', values)} /><LinkSelect label="Vistas vinculadas" values={linkedViewIds} options={views.map((view) => ({ id: view.id, label: `${view.name} · ${view.kind}` }))} onChange={(values) => setLinked('views', values)} /></div>
          <div className={styles.linkedSummary}><strong>Atalhos locais</strong><div className={styles.linkedRows}>{selectedPlan.files.map((file) => <a key={file.id} href={`/campaigns/${campaignId}/arquivos/${file.id}`}><ExternalLink size={13} /> {file.name}</a>)}{selectedPlan.hypotheses.map((hypothesis) => <button type="button" key={hypothesis.id} onClick={() => router.push(`/campaigns/${campaignId}/investigacao?hypothesisId=${encodeURIComponent(hypothesis.id)}`)}><ExternalLink size={13} /> Destacar hipótese: {hypothesis.title}</button>)}{selectedPlan.views.map((view) => <button type="button" key={view.id} onClick={() => router.push(`/campaigns/${campaignId}/investigacao?viewId=${encodeURIComponent(view.id)}`)}><ExternalLink size={13} /> Restaurar vista: {view.name}</button>)}</div><p className={styles.muted}>Abrir uma vista ou destacar uma hipótese altera somente o estado local do quadro; não cria relações, não move fichas e não publica rascunhos.</p></div>
        </div> : <div className={styles.empty}><h3>Crie um planejamento privado</h3><p>O planejamento usa o modelo administrativo Session e permanece separado da sala de sessão baseada em CampaignFile.</p></div>}
      </div>
    </section>
  );
}

function ItemEditor({ title, items, onAdd, onChange, onRemove }: { title: string; items: SessionPlanItem[]; onAdd: () => void; onChange: (id: string, patch: Partial<SessionPlanItem>) => void; onRemove: (id: string) => void }) {
  return <section className={styles.itemSection}><div className={styles.itemHeading}><h4>{title}</h4><button type="button" onClick={onAdd}><Plus size={13} /> Item</button></div>{items.length === 0 && <p className={styles.muted}>Nenhum item.</p>}{items.map((item) => <div className={styles.itemRow} key={item.id}><input type="checkbox" checked={item.done} onChange={(event) => onChange(item.id, { done: event.target.checked })} aria-label={`Concluir ${title.toLowerCase()}`} /><input value={item.label} onChange={(event) => onChange(item.id, { label: event.target.value })} maxLength={240} aria-label={`${title}: descrição`} /><button type="button" onClick={() => onRemove(item.id)} aria-label={`Remover item de ${title}`}><Trash2 size={13} /></button></div>)}</section>;
}

function LinkSelect({ label, values, options, onChange }: { label: string; values: string[]; options: Array<{ id: string; label: string }>; onChange: (values: string[]) => void }) {
  return <label className={styles.linkSelect}>{label}<select multiple value={values} onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))} size={Math.min(5, Math.max(3, options.length))}>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><small>Ctrl/Cmd + clique para selecionar múltiplos.</small></label>;
}
