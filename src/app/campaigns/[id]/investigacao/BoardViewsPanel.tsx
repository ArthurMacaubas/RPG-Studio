'use client';

import { ArrowDown, ArrowUp, Bookmark, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { InvestigationBoardViewItem, InvestigationBoardViewKind, InvestigationBoardViewSnapshot } from '@/types';
import styles from './page.module.css';

type BoardViewsPanelProps = {
  views: InvestigationBoardViewItem[];
  warnings: string[];
  busy: boolean;
  currentSnapshot: InvestigationBoardViewSnapshot;
  onCreate: (input: { name: string; kind: InvestigationBoardViewKind; description: string | null }) => Promise<void>;
  onUpdateCurrent: (view: InvestigationBoardViewItem) => Promise<void>;
  onRemove: (view: InvestigationBoardViewItem) => Promise<void>;
  onReorder: (viewIds: string[]) => Promise<void>;
  onRestore: (view: InvestigationBoardViewItem) => void;
};

const KIND_LABELS: Record<InvestigationBoardViewKind, string> = { SESSION: 'Sessão', CASE: 'Caso', ARC: 'Arco' };

export default function BoardViewsPanel({ views, warnings, busy, currentSnapshot, onCreate, onUpdateCurrent, onRemove, onReorder, onRestore }: BoardViewsPanelProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<InvestigationBoardViewKind>('SESSION');
  const [description, setDescription] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function createView(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setPendingId('new');
    try {
      await onCreate({ name: name.trim(), kind, description: description.trim() || null });
      setName('');
      setDescription('');
    } finally {
      setPendingId(null);
    }
  }

  async function run(action: () => Promise<void>, id: string) {
    setPendingId(id);
    try {
      await action();
    } finally {
      setPendingId(null);
    }
  }

  const currentAnnotationCount = currentSnapshot.pinIds.length + currentSnapshot.groupIds.length;

  async function move(index: number, direction: -1 | 1) {
    const next = [...views];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const current = next[index];
    const other = next[target];
    if (!current || !other) return;
    next[index] = other;
    next[target] = current;
    await run(() => onReorder(next.map((view) => view.id)), `move-${current.id}`);
  }

  return (
    <aside className={styles.viewsPanel} aria-label="Vistas salvas do quadro">
      <div className={styles.viewsHeading}>
        <div><p className={styles.eyebrow}><Bookmark size={13} /> Navegação administrativa</p><h2>Vistas salvas</h2></div>
        <span className={styles.viewsCount}>{views.length}</span>
      </div>
      <p className={styles.viewsIntro}>Salve uma configuração de navegação por sessão, caso ou arco. Restaurar aplica somente o estado local do quadro. O snapshot atual referencia {currentAnnotationCount === 1 ? '1 anotação' : `${currentAnnotationCount} anotações`}.</p>
      {warnings.map((warning) => <p key={warning} className={styles.viewsWarning} role="status">{warning}</p>)}

      <form className={styles.viewForm} onSubmit={createView}>
        <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ex.: Caso da estação" required /></label>
        <div className={styles.viewFormGrid}>
          <label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value as InvestigationBoardViewKind)}><option value="SESSION">Sessão</option><option value="CASE">Caso</option><option value="ARC">Arco</option></select></label>
          <label>Descrição<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="Opcional" /></label>
        </div>
        <button type="submit" className={styles.viewPrimaryButton} disabled={busy || pendingId !== null}><Save size={14} /> Salvar estado atual</button>
      </form>

      <div className={styles.viewsList} aria-live="polite">
        {views.length === 0 ? <p className={styles.viewsEmpty}>Nenhuma vista salva ainda. O snapshot atual inclui filtros, camadas, pan, zoom e referências válidas de anotações.</p> : views.map((view, index) => (
          <article className={styles.viewCard} key={view.id}>
            <div className={styles.viewCardHeading}><div><strong>{view.name}</strong><small>{KIND_LABELS[view.kind]}{view.description ? ` · ${view.description}` : ''}</small></div><span>{view.snapshot.pinIds.length + view.snapshot.groupIds.length} ref.</span></div>
            <div className={styles.viewCardMeta}>{Math.round(view.snapshot.zoom * 100)}% · {view.snapshot.filters.search ? 'busca ativa' : 'sem busca'} · {view.snapshot.filters.layers.annotations ? 'anotações visíveis' : 'anotações ocultas'}</div>
            <div className={styles.viewCardActions}>
              <button type="button" onClick={() => onRestore(view)} disabled={busy || pendingId !== null}><RotateCcw size={13} /> Restaurar</button>
              <button type="button" onClick={() => void run(() => onUpdateCurrent(view), view.id)} disabled={busy || pendingId !== null}><Save size={13} /> Atualizar</button>
              <button type="button" onClick={() => void run(() => onRemove(view), view.id)} disabled={busy || pendingId !== null} aria-label={`Remover vista ${view.name}`}><Trash2 size={13} /></button>
              <button type="button" onClick={() => void move(index, -1)} disabled={index === 0 || busy || pendingId !== null} aria-label={`Mover ${view.name} para cima`}><ArrowUp size={13} /></button>
              <button type="button" onClick={() => void move(index, 1)} disabled={index === views.length - 1 || busy || pendingId !== null} aria-label={`Mover ${view.name} para baixo`}><ArrowDown size={13} /></button>
            </div>
          </article>
        ))}
      </div>
      <p className={styles.viewsCaption}>As vistas não publicam conteúdo e não movem nem alteram fichas, fios, relações, pins ou grupos ao restaurar.</p>
    </aside>
  );
}
