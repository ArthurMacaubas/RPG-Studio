'use client';

import { useState } from 'react';
import { Layers3, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { BoardNodeItem, InvestigationBoardGroup, InvestigationBoardPinItem } from '@/types';
import styles from './page.module.css';

type PinInput = { text: string; x: number; y: number; color?: string };
type GroupInput = { name: string; color?: string; x: number; y: number; width?: number; height?: number; boardNodeIds?: string[] };

type BoardAnnotationsPanelProps = {
  pins: InvestigationBoardPinItem[];
  groups: InvestigationBoardGroup[];
  nodes: BoardNodeItem[];
  busy: boolean;
  onCreatePin: (input: PinInput) => Promise<void>;
  onUpdatePin: (id: string, input: Partial<PinInput>) => Promise<void>;
  onRemovePin: (id: string) => Promise<void>;
  onCreateGroup: (input: GroupInput) => Promise<void>;
  onUpdateGroup: (id: string, input: Partial<GroupInput>) => Promise<void>;
  onRemoveGroup: (id: string) => Promise<void>;
};

const PIN_COLORS = ['#E5AC68', '#DE7D78', '#86AAA2', '#83C69B', '#B9A7E0'];
const GROUP_COLORS = ['#86AAA2', '#C8A66A', '#9E8FD1', '#DE7D78', '#83C69B'];

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function BoardAnnotationsPanel({ pins, groups, nodes, busy, onCreatePin, onUpdatePin, onRemovePin, onCreateGroup, onUpdateGroup, onRemoveGroup }: BoardAnnotationsPanelProps) {
  const [pinText, setPinText] = useState('');
  const [pinX, setPinX] = useState('0');
  const [pinY, setPinY] = useState('0');
  const [pinColor, setPinColor] = useState(PIN_COLORS[0]);
  const [groupName, setGroupName] = useState('');
  const [groupX, setGroupX] = useState('0');
  const [groupY, setGroupY] = useState('0');
  const [groupWidth, setGroupWidth] = useState('320');
  const [groupHeight, setGroupHeight] = useState('180');
  const [groupColor, setGroupColor] = useState(GROUP_COLORS[0]);
  const [groupNodeIds, setGroupNodeIds] = useState<string[]>([]);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onCreatePin({ text: pinText, x: numberValue(pinX), y: numberValue(pinY), color: pinColor });
      setPinText('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Não foi possível criar o pin.');
    }
  }

  async function submitGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onCreateGroup({ name: groupName, x: numberValue(groupX), y: numberValue(groupY), width: numberValue(groupWidth, 320), height: numberValue(groupHeight, 180), color: groupColor, boardNodeIds: groupNodeIds });
      setGroupName('');
      setGroupNodeIds([]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Não foi possível criar o agrupamento.');
    }
  }

  async function savePin(pin: InvestigationBoardPinItem, form: HTMLFormElement) {
    setError(null);
    const data = new FormData(form);
    try {
      await onUpdatePin(pin.id, { text: String(data.get('text') ?? ''), x: numberValue(String(data.get('x') ?? pin.x), pin.x), y: numberValue(String(data.get('y') ?? pin.y), pin.y), color: String(data.get('color') ?? pin.color) });
      setEditingPinId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Não foi possível atualizar o pin.');
    }
  }

  async function saveGroup(group: InvestigationBoardGroup, form: HTMLFormElement) {
    setError(null);
    const data = new FormData(form);
    try {
      await onUpdateGroup(group.id, { name: String(data.get('name') ?? ''), x: numberValue(String(data.get('x') ?? group.x), group.x), y: numberValue(String(data.get('y') ?? group.y), group.y), width: numberValue(String(data.get('width') ?? group.width), group.width), height: numberValue(String(data.get('height') ?? group.height), group.height), color: String(data.get('color') ?? group.color), boardNodeIds: groupNodeIds });
      setEditingGroupId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Não foi possível atualizar o agrupamento.');
    }
  }

  function toggleNode(id: string) {
    setGroupNodeIds((current) => current.includes(id) ? current.filter((nodeId) => nodeId !== id) : [...current, id]);
  }

  return (
    <aside className={styles.annotationsPanel} aria-label="Pins e agrupamentos do Mestre">
      <div className={styles.annotationsHeader}>
        <div><p className={styles.annotationsEyebrow}><Layers3 size={13} /> Anotação administrativa</p><h2>Pins e grupos</h2></div>
        <span className={styles.annotationsCount}>{pins.length + groups.length}</span>
      </div>
      <p className={styles.annotationsIntro}>Organize o raciocínio visual. Esses elementos não são fichas, relações oficiais, fios ou evidências.</p>
      {error && <p className={styles.annotationsError} role="alert">{error}</p>}

      <form className={styles.annotationForm} onSubmit={submitPin}>
        <h3><MapPin size={13} /> Novo pin</h3>
        <label>Texto curto<input value={pinText} onChange={(event) => setPinText(event.target.value)} maxLength={280} required placeholder="Ex.: revisar a pista" /></label>
        <div className={styles.annotationGrid}><label>X<input type="number" value={pinX} onChange={(event) => setPinX(event.target.value)} /></label><label>Y<input type="number" value={pinY} onChange={(event) => setPinY(event.target.value)} /></label></div>
        <div className={styles.annotationColors} aria-label="Cor do pin">{PIN_COLORS.map((option) => <button key={option} type="button" className={`${styles.annotationSwatch} ${pinColor === option ? styles.annotationSwatchActive : ''}`} style={{ background: option }} onClick={() => setPinColor(option)} aria-label={`Selecionar cor ${option}`} aria-pressed={pinColor === option} />)}</div>
        <button className={styles.annotationPrimaryButton} type="submit" disabled={busy}><Plus size={13} /> Adicionar pin</button>
      </form>

      <form className={styles.annotationForm} onSubmit={submitGroup}>
        <h3><Layers3 size={13} /> Novo agrupamento</h3>
        <label>Nome<input value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={120} required placeholder="Ex.: suspeitas centrais" /></label>
        <div className={styles.annotationGrid}><label>X<input type="number" value={groupX} onChange={(event) => setGroupX(event.target.value)} /></label><label>Y<input type="number" value={groupY} onChange={(event) => setGroupY(event.target.value)} /></label></div>
        <div className={styles.annotationGrid}><label>Largura<input type="number" min={80} max={5000} value={groupWidth} onChange={(event) => setGroupWidth(event.target.value)} /></label><label>Altura<input type="number" min={80} max={5000} value={groupHeight} onChange={(event) => setGroupHeight(event.target.value)} /></label></div>
        <div className={styles.annotationColors} aria-label="Cor do agrupamento">{GROUP_COLORS.map((option) => <button key={option} type="button" className={`${styles.annotationSwatch} ${groupColor === option ? styles.annotationSwatchActive : ''}`} style={{ background: option }} onClick={() => setGroupColor(option)} aria-label={`Selecionar cor ${option}`} aria-pressed={groupColor === option} />)}</div>
        <fieldset className={styles.annotationNodes}><legend>Fichas no grupo</legend>{nodes.length === 0 ? <p>Nenhuma ficha disponível no quadro.</p> : nodes.map((node) => <label key={node.id}><input type="checkbox" checked={groupNodeIds.includes(node.id)} onChange={() => toggleNode(node.id)} /> <span>{node.file.name}</span></label>)}</fieldset>
        <button className={styles.annotationPrimaryButton} type="submit" disabled={busy}><Plus size={13} /> Adicionar grupo</button>
      </form>

      <section className={styles.annotationList} aria-labelledby="existing-annotations-heading">
        <h3 id="existing-annotations-heading">Existentes</h3>
        {pins.length === 0 && groups.length === 0 ? <p className={styles.annotationsEmpty}>Nenhuma anotação visual ainda.</p> : <>
          {pins.map((pin) => editingPinId === pin.id ? <form key={pin.id} className={styles.annotationCard} onSubmit={(event) => { event.preventDefault(); void savePin(pin, event.currentTarget); }}>
            <div className={styles.annotationCardTitle}><strong>Pin</strong><button type="button" onClick={() => setEditingPinId(null)} aria-label="Cancelar edição do pin"><X size={13} /></button></div>
            <label>Texto<input name="text" defaultValue={pin.text} maxLength={280} required /></label>
            <div className={styles.annotationGrid}><label>X<input name="x" type="number" defaultValue={pin.x} /></label><label>Y<input name="y" type="number" defaultValue={pin.y} /></label></div>
            <input name="color" type="hidden" value={pin.color} readOnly />
            <div className={styles.annotationActions}><button type="submit" disabled={busy}>Salvar</button><button type="button" onClick={() => void onRemovePin(pin.id)} disabled={busy}>Remover</button></div>
          </form> : <article key={pin.id} className={styles.annotationCard}><div className={styles.annotationCardTitle}><span className={styles.pinMark} style={{ background: pin.color }} /> <strong>{pin.text}</strong></div><small>Pin em ({pin.x}, {pin.y})</small><div className={styles.annotationActions}><button type="button" onClick={() => setEditingPinId(pin.id)} disabled={busy}><Pencil size={12} /> Editar</button><button type="button" onClick={() => void onRemovePin(pin.id)} disabled={busy} aria-label={`Remover pin ${pin.text}`}><Trash2 size={12} /> Remover</button></div></article>)}
          {groups.map((group) => editingGroupId === group.id ? <form key={group.id} className={styles.annotationCard} onSubmit={(event) => { event.preventDefault(); void saveGroup(group, event.currentTarget); }}>
            <div className={styles.annotationCardTitle}><strong>Grupo</strong><button type="button" onClick={() => setEditingGroupId(null)} aria-label="Cancelar edição do agrupamento"><X size={13} /></button></div>
            <label>Nome<input name="name" defaultValue={group.name} maxLength={120} required /></label>
            <div className={styles.annotationGrid}><label>X<input name="x" type="number" defaultValue={group.x} /></label><label>Y<input name="y" type="number" defaultValue={group.y} /></label></div>
            <div className={styles.annotationGrid}><label>Largura<input name="width" type="number" min={80} max={5000} defaultValue={group.width} /></label><label>Altura<input name="height" type="number" min={80} max={5000} defaultValue={group.height} /></label></div>
            <input name="color" type="hidden" value={group.color} readOnly />
            <fieldset className={styles.annotationNodes}><legend>Fichas no grupo</legend>{nodes.map((node) => <label key={node.id}><input type="checkbox" checked={groupNodeIds.includes(node.id)} onChange={() => toggleNode(node.id)} /> <span>{node.file.name}</span></label>)}</fieldset>
            <div className={styles.annotationActions}><button type="submit" disabled={busy}>Salvar</button><button type="button" onClick={() => void onRemoveGroup(group.id)} disabled={busy}>Remover</button></div>
          </form> : <article key={group.id} className={styles.annotationCard}><div className={styles.annotationCardTitle}><span className={styles.groupMark} style={{ borderColor: group.color }} /> <strong>{group.name}</strong></div><small>{group.items.length} ficha{group.items.length === 1 ? '' : 's'} · {group.width} × {group.height}</small><div className={styles.annotationActions}><button type="button" onClick={() => { setEditingGroupId(group.id); setGroupNodeIds(group.items.map((item) => item.boardNodeId)); }} disabled={busy}><Pencil size={12} /> Editar</button><button type="button" onClick={() => void onRemoveGroup(group.id)} disabled={busy} aria-label={`Remover agrupamento ${group.name}`}><Trash2 size={12} /> Remover</button></div></article>)}
        </>}
      </section>
    </aside>
  );
}
