'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Link2, Pencil, Plus, Search, Tags, Trash2, X } from 'lucide-react';
import { filesApi, relationshipsApi, relationshipTypesApi } from '@/lib/api';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastProvider';
import type { CampaignFile, Relationship, RelationshipImportance, RelationshipType, RelationshipVisibility } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './RelationshipManager.module.css';

const IMPORTANCE_LABELS: Record<RelationshipImportance, string> = { CRITICAL: 'Crítica', IMPORTANT: 'Importante', NORMAL: 'Normal', OPTIONAL: 'Opcional' };
const VISIBILITY_LABELS: Record<RelationshipVisibility, string> = { GM: 'Somente Mestre', ALL: 'Mestre e jogadores', P1: 'Somente P1', P2: 'Somente P2', P3: 'Somente P3', P4: 'Somente P4' };

type RelationshipForm = { typeId: string; label: string; description: string; importance: RelationshipImportance; visibility: RelationshipVisibility };

const emptyForm: RelationshipForm = { typeId: '', label: '', description: '', importance: 'NORMAL', visibility: 'GM' };

export function RelationshipManager({ campaignId, fileId }: { campaignId: string; fileId: string }) {
  const [types, setTypes] = useState<RelationshipType[]>([]);
  const [outgoing, setOutgoing] = useState<Relationship[]>([]);
  const [incoming, setIncoming] = useState<Relationship[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [targets, setTargets] = useState<CampaignFile[]>([]);
  const [target, setTarget] = useState<CampaignFile | null>(null);
  const [form, setForm] = useState<RelationshipForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const [nextTypes, relationships] = await Promise.all([relationshipTypesApi.list(campaignId), relationshipsApi.listForEntity(fileId)]);
      setTypes(nextTypes);
      setOutgoing(relationships.outgoing);
      setIncoming(relationships.incoming);
      setForm((current) => current.typeId ? current : { ...current, typeId: nextTypes.find((item) => item.key === 'GENERIC')?.id ?? nextTypes[0]?.id ?? '' });
    } catch (error) {
      toast({ tone: 'error', title: 'Relacionamentos indisponíveis', message: error instanceof Error ? error.message : 'Tente atualizar o editor.' });
    }
  }, [campaignId, fileId, toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (target || targetSearch.trim().length < 2) { setTargets([]); return; }
      filesApi.list(campaignId, { search: targetSearch, scope: 'active', sort: 'name', direction: 'asc' })
        .then((files) => setTargets(files.filter((file) => file.id !== fileId).slice(0, 7)))
        .catch(() => setTargets([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [campaignId, fileId, target, targetSearch]);

  const selectedType = useMemo(() => types.find((type) => type.id === form.typeId) ?? null, [form.typeId, types]);

  function patchForm(patch: Partial<RelationshipForm>) { setForm((current) => ({ ...current, ...patch })); }
  function resetForm() { setTarget(null); setTargetSearch(''); setEditingId(null); setForm({ ...emptyForm, typeId: types.find((item) => item.key === 'GENERIC')?.id ?? types[0]?.id ?? '' }); }

  async function submit() {
    if (!form.typeId || (!editingId && !target)) return;
    setBusy(true);
    try {
      const input = { typeId: form.typeId, label: form.label || undefined, description: form.description || undefined, importance: form.importance, visibility: form.visibility };
      if (editingId) await relationshipsApi.update(editingId, input);
      else await relationshipsApi.create({ fromId: fileId, toId: target!.id, ...input });
      toast({ tone: 'success', title: editingId ? 'Relacionamento atualizado' : 'Relacionamento criado', message: selectedType ? selectedType.name : undefined });
      resetForm();
      await load();
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível salvar', message: error instanceof Error ? error.message : 'Revise os dados informados.' });
    } finally { setBusy(false); }
  }

  function beginEdit(relationship: Relationship) {
    setEditingId(relationship.id);
    setTarget(null);
    setTargetSearch('');
    setForm({ typeId: relationship.typeId, label: relationship.label ?? '', description: relationship.description ?? '', importance: relationship.importance, visibility: relationship.visibility });
  }

  async function remove(id: string) {
    setBusy(true);
    try { await relationshipsApi.remove(id); await load(); toast({ tone: 'success', title: 'Relacionamento removido' }); }
    catch (error) { toast({ tone: 'error', title: 'Não foi possível remover', message: error instanceof Error ? error.message : undefined }); }
    finally { setBusy(false); }
  }

  async function createCustomType() {
    if (!customName.trim()) return;
    setBusy(true);
    try {
      const created = await relationshipTypesApi.create(campaignId, { key: customKey || customName, name: customName });
      setTypes((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      patchForm({ typeId: created.id });
      setCustomName(''); setCustomKey(''); setCustomOpen(false);
      toast({ tone: 'success', title: 'Tipo personalizado criado', message: created.name });
    } catch (error) { toast({ tone: 'error', title: 'Tipo não criado', message: error instanceof Error ? error.message : undefined }); }
    finally { setBusy(false); }
  }

  function renderRelationship(relationship: Relationship, direction: 'outgoing' | 'incoming') {
    const other = direction === 'outgoing' ? relationship.to : relationship.from;
    if (!other) return null;
    const arrow = relationship.type?.directional === false ? '↔' : direction === 'outgoing' ? '→' : '←';
    return <article className={styles.relationship} key={relationship.id}>
      <div className={styles.relationshipLead}><span className={styles.direction}>{arrow}</span><FileTypeIcon type={other.type} size={15} /><div><Link href={`/campaigns/${campaignId}/arquivos/${other.id}` as never}>{other.name}</Link><small>{FILE_TYPE_LABELS[other.type]} · {relationship.type?.name ?? relationship.kind}{relationship.type?.directional === false ? ' · não direcional' : ''}</small></div><Badge tone={relationship.importance === 'CRITICAL' ? 'danger' : relationship.importance === 'IMPORTANT' ? 'warning' : 'neutral'}>{IMPORTANCE_LABELS[relationship.importance]}</Badge></div>
      <div className={styles.relationshipDetail}>{relationship.label && <strong>{relationship.label}</strong>}{relationship.description && <p>{relationship.description}</p>}<span>{VISIBILITY_LABELS[relationship.visibility]}</span></div>
      <div className={styles.relationshipActions}><button type="button" onClick={() => beginEdit(relationship)} aria-label={`Editar relação com ${other.name}`}><Pencil size={13} /></button><button type="button" onClick={() => void remove(relationship.id)} aria-label={`Remover relação com ${other.name}`}><Trash2 size={13} /></button></div>
    </article>;
  }

  return <section className={styles.manager}>
    <header className={styles.header}><div><span className={styles.eyebrow}><Link2 size={13} /> Core investigativo</span><h2>{editingId ? 'Editar relacionamento' : 'Novo relacionamento'}</h2></div><Button variant="ghost" size="sm" icon={<Tags size={14} />} onClick={() => setCustomOpen((current) => !current)}>{customOpen ? 'Fechar tipos' : 'Novo tipo'}</Button></header>
    {customOpen && <div className={styles.customType}><input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Nome do tipo, ex.: Suspeita de" /><input value={customKey} onChange={(event) => setCustomKey(event.target.value)} placeholder="Chave opcional, ex.: SUSPECTS" /><Button size="sm" onClick={() => void createCustomType()} disabled={busy || !customName.trim()}>Criar tipo</Button></div>}
    <div className={styles.formGrid}>
      {!editingId && <div className={styles.targetPicker}><label>Entidade destino</label><div className={styles.searchInput}><Search size={14} /><input value={target ? target.name : targetSearch} onChange={(event) => { setTarget(null); setTargetSearch(event.target.value); }} placeholder="Pesquisar entidade da campanha" /></div>{!target && targets.length > 0 && <div className={styles.targetResults}>{targets.map((file) => <button type="button" key={file.id} onClick={() => { setTarget(file); setTargets([]); }}><FileTypeIcon type={file.type} size={14} /><span>{file.name}</span><small>{FILE_TYPE_LABELS[file.type]}</small></button>)}</div>}</div>}
      <label>Tipo<select value={form.typeId} onChange={(event) => patchForm({ typeId: event.target.value })}>{types.map((type) => <option key={type.id} value={type.id}>{type.name}{type.campaignId ? ' · personalizado' : ''}</option>)}</select></label>
      <label>Rótulo<input value={form.label} onChange={(event) => patchForm({ label: event.target.value })} placeholder="Ex.: Principal suspeito" /></label>
      <label>Importância<select value={form.importance} onChange={(event) => patchForm({ importance: event.target.value as RelationshipImportance })}>{(Object.keys(IMPORTANCE_LABELS) as RelationshipImportance[]).map((importance) => <option key={importance} value={importance}>{IMPORTANCE_LABELS[importance]}</option>)}</select></label>
      <label>Visibilidade<select value={form.visibility} onChange={(event) => patchForm({ visibility: event.target.value as RelationshipVisibility })}>{(Object.keys(VISIBILITY_LABELS) as RelationshipVisibility[]).map((visibility) => <option key={visibility} value={visibility}>{VISIBILITY_LABELS[visibility]}</option>)}</select></label>
      <label className={styles.description}>Descrição<textarea value={form.description} onChange={(event) => patchForm({ description: event.target.value })} placeholder="Contexto narrativo desta conexão" /></label>
    </div>
    <div className={styles.formActions}>{editingId && <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={resetForm}>Cancelar edição</Button>}<Button size="sm" icon={<Plus size={14} />} onClick={() => void submit()} disabled={busy || !form.typeId || (!editingId && !target)}>{busy ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar relacionamento'}</Button></div>
    <div className={styles.sections}><div><h3><ChevronRight size={14} /> Saindo desta entidade <Badge tone="neutral">{outgoing.length}</Badge></h3>{outgoing.length ? outgoing.map((relationship) => renderRelationship(relationship, 'outgoing')) : <p className={styles.empty}>Nenhuma relação saindo desta entidade.</p>}</div><div><h3><ChevronDown size={14} /> Apontando para esta entidade <Badge tone="neutral">{incoming.length}</Badge></h3>{incoming.length ? incoming.map((relationship) => renderRelationship(relationship, 'incoming')) : <p className={styles.empty}>Nenhuma relação apontando para esta entidade.</p>}</div></div>
  </section>;
}
