'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, HeartPulse, Play, Plus, RotateCw, ShieldAlert, SkipForward, Square, Swords, X } from 'lucide-react';
import { combatApi, filesApi } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/ToastProvider';
import type { CampaignFile, CombatEncounter, CombatParticipantKind } from '@/types';
import styles from './CombatEncounterPanel.module.css';

type DraftParticipant = {
  sourceFileId: string;
  name: string;
  kind: CombatParticipantKind;
  initiative: number;
  initiativeBonus: number;
  currentHp: number | null;
  maxHp: number | null;
};

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function draftFromFile(file: CampaignFile): DraftParticipant {
  const data = file.data as { vitals?: { current?: unknown; max?: unknown }; attributes?: Record<string, unknown>; combat?: { initiative?: unknown } };
  const currentHp = asNumber(data.vitals?.current) ?? asNumber(data.attributes?.hp) ?? asNumber(data.attributes?.pv);
  const maxHp = asNumber(data.vitals?.max) ?? asNumber(data.attributes?.hp) ?? asNumber(data.attributes?.pv);
  return {
    sourceFileId: file.id,
    name: file.name,
    kind: file.type === 'THREAT' ? 'THREAT' : 'CHARACTER',
    initiative: asNumber(data.combat?.initiative) ?? 0,
    initiativeBonus: 0,
    currentHp,
    maxHp
  };
}

export function CombatEncounterPanel({ campaignId, sessionId }: { campaignId: string; sessionId?: string }) {
  const [encounters, setEncounters] = useState<CombatEncounter[]>([]);
  const [sources, setSources] = useState<CampaignFile[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [draft, setDraft] = useState<DraftParticipant[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conditionEdits, setConditionEdits] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [combatEncounters, characters, threats] = await Promise.all([
        combatApi.list(campaignId),
        filesApi.list(campaignId, { scope: 'active', type: 'CHARACTER', sort: 'name', direction: 'asc' }),
        filesApi.list(campaignId, { scope: 'active', type: 'THREAT', sort: 'name', direction: 'asc' })
      ]);
      setEncounters(combatEncounters);
      setSources([...characters, ...threats]);
      setSelectedSourceId((current) => current && [...characters, ...threats].some((file) => file.id === current) ? current : [...characters, ...threats][0]?.id ?? '');
    } catch (error) {
      toast({ tone: 'error', title: 'Combate indisponível', message: error instanceof Error ? error.message : 'Tente atualizar a Sala de Sessão.' });
    } finally {
      setLoading(false);
    }
  }, [campaignId, toast]);

  useEffect(() => { void load(); }, [load]);

  const activeEncounter = useMemo(() => encounters.find((encounter) => encounter.status === 'IN_PROGRESS') ?? encounters.find((encounter) => encounter.status === 'NOT_STARTED') ?? null, [encounters]);
  const selectedSource = useMemo(() => sources.find((file) => file.id === selectedSourceId) ?? null, [selectedSourceId, sources]);

  function addDraftParticipant() {
    if (!selectedSource) return;
    if (draft.some((participant) => participant.sourceFileId === selectedSource.id)) return;
    setDraft((current) => [...current, draftFromFile(selectedSource)]);
  }

  async function createEncounter() {
    if (!name.trim() || draft.length === 0) return;
    setSubmitting(true);
    try {
      const created = await combatApi.create(campaignId, { name: name.trim(), sessionId, participants: draft });
      setEncounters((current) => [created, ...current]);
      setDraft([]);
      setName('');
      toast({ tone: 'success', title: 'Encontro criado', message: `${created.participants.length} participante(s) entraram na iniciativa.` });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível criar o encontro', message: error instanceof Error ? error.message : 'Revise os participantes.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(action: 'START' | 'ADVANCE' | 'END') {
    if (!activeEncounter) return;
    setSubmitting(true);
    try {
      const updated = await combatApi.action(campaignId, activeEncounter.id, action);
      setEncounters((current) => current.map((encounter) => encounter.id === updated.id ? updated : encounter));
      toast({ tone: action === 'END' ? 'info' : 'success', title: action === 'START' ? 'Combate iniciado' : action === 'ADVANCE' ? 'Turno avançado' : 'Combate encerrado', message: action === 'ADVANCE' ? `Rodada ${updated.round}.` : undefined });
    } catch (error) {
      toast({ tone: 'error', title: 'Ação não concluída', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function patchParticipant(participantId: string, input: { hitPointDelta?: number; conditions?: string[]; isVisibleToPlayers?: boolean }) {
    if (!activeEncounter) return;
    try {
      const updated = await combatApi.updateParticipant(campaignId, activeEncounter.id, participantId, input);
      setEncounters((current) => current.map((encounter) => encounter.id === activeEncounter.id ? { ...encounter, participants: encounter.participants.map((participant) => participant.id === participantId ? { ...participant, ...updated } : participant) } : encounter));
    } catch (error) {
      toast({ tone: 'error', title: 'Participante não atualizado', message: error instanceof Error ? error.message : 'Tente novamente.' });
    }
  }

  if (loading) return <Panel eyebrow="Combate" title="Preparando encontro"><p className={styles.loading}>Carregando participantes e encontros…</p></Panel>;

  if (!activeEncounter) {
    return <Panel eyebrow="Combate" title="Preparar encontro" action={<Badge tone="warning"><Swords size={12} /> mestre</Badge>}>
      <div className={styles.createIntro}><ShieldAlert size={18} /><span>Monte a iniciativa com personagens e ameaças do acervo. Ameaças usam a ficha polimórfica e entram no encontro sem duplicar dados.</span></div>
      {sources.length === 0 ? <EmptyState icon={<Swords size={18} />} title="Crie personagens ou ameaças" description="Os arquivos disponíveis aparecerão aqui para formar o primeiro encontro." /> : <>
        <div className={styles.createRow}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Confronto no galpão" aria-label="Nome do encontro" /><select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)} aria-label="Adicionar participante">{sources.map((file) => <option key={file.id} value={file.id}>{file.type === 'THREAT' ? 'Ameaça' : 'Personagem'} · {file.name}</option>)}</select><Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addDraftParticipant} disabled={!selectedSource}>Adicionar</Button></div>
        {draft.length > 0 && <div className={styles.draftList}>{draft.map((participant) => <div className={styles.draftRow} key={participant.sourceFileId}><strong>{participant.name}</strong><Badge tone={participant.kind === 'THREAT' ? 'warning' : 'accent'}>{participant.kind === 'THREAT' ? 'Ameaça' : 'Personagem'}</Badge><label>Iniciativa <input type="number" value={participant.initiative} onChange={(event) => setDraft((current) => current.map((item) => item.sourceFileId === participant.sourceFileId ? { ...item, initiative: Number(event.target.value) } : item))} /></label><label>Bônus <input type="number" value={participant.initiativeBonus} onChange={(event) => setDraft((current) => current.map((item) => item.sourceFileId === participant.sourceFileId ? { ...item, initiativeBonus: Number(event.target.value) } : item))} /></label><button type="button" onClick={() => setDraft((current) => current.filter((item) => item.sourceFileId !== participant.sourceFileId))} aria-label={`Remover ${participant.name}`}><X size={14} /></button></div>)}</div>}
        <div className={styles.createFooter}><small>{draft.length} participante(s) selecionado(s)</small><Button size="sm" icon={<Swords size={14} />} onClick={() => void createEncounter()} disabled={submitting || !name.trim() || draft.length === 0}>{submitting ? 'Criando…' : 'Criar encontro'}</Button></div>
      </>}
    </Panel>;
  }

  const currentTurn = activeEncounter.participants.find((participant) => participant.turnOrder === activeEncounter.turnIndex && !participant.isDefeated);
  return <Panel eyebrow="Combate" title={activeEncounter.name} action={<Badge tone={activeEncounter.status === 'IN_PROGRESS' ? 'success' : activeEncounter.status === 'ENDED' ? 'neutral' : 'warning'}>{activeEncounter.status === 'IN_PROGRESS' ? `Rodada ${activeEncounter.round}` : activeEncounter.status === 'ENDED' ? 'Encerrado' : 'Pronto'}</Badge>}>
    <div className={styles.combatToolbar}><div><strong>{currentTurn ? `Turno de ${currentTurn.name}` : 'Aguardando início'}</strong><small>{activeEncounter.participants.filter((participant) => !participant.isDefeated).length} ativo(s) na iniciativa</small></div><div>{activeEncounter.status === 'NOT_STARTED' && <Button size="sm" icon={<Play size={14} />} onClick={() => void runAction('START')} disabled={submitting}>Iniciar</Button>}{activeEncounter.status === 'IN_PROGRESS' && <Button size="sm" icon={<SkipForward size={14} />} onClick={() => void runAction('ADVANCE')} disabled={submitting}>Avançar turno</Button>}{activeEncounter.status !== 'ENDED' && <Button variant="ghost" size="sm" icon={<Square size={14} />} onClick={() => void runAction('END')} disabled={submitting}>Encerrar</Button>}<Button variant="ghost" size="sm" icon={<RotateCw size={14} />} onClick={() => void load()} aria-label="Atualizar combate" /></div></div>
    <div className={styles.participants}>{activeEncounter.participants.map((participant) => <article key={participant.id} className={`${styles.participant} ${participant.turnOrder === activeEncounter.turnIndex && activeEncounter.status === 'IN_PROGRESS' ? styles.participantCurrent : ''} ${participant.isDefeated ? styles.participantDefeated : ''}`}><div className={styles.participantLead}><span className={styles.initiative}>{participant.initiative}</span><div><strong>{participant.name}</strong><small>{participant.kind === 'THREAT' ? 'Ameaça' : 'Personagem'} · ordem {participant.turnOrder + 1}</small></div><Badge tone={participant.isDefeated ? 'neutral' : participant.kind === 'THREAT' ? 'warning' : 'accent'}>{participant.isDefeated ? 'Derrotado' : participant.kind === 'THREAT' ? 'Ameaça' : 'Personagem'}</Badge></div><div className={styles.participantControls}>{participant.currentHp !== null ? <div className={styles.hpControl}><HeartPulse size={14} /><button type="button" onClick={() => void patchParticipant(participant.id, { hitPointDelta: -1 })} aria-label={`Aplicar 1 de dano em ${participant.name}`}>−</button><strong>{participant.currentHp}/{participant.maxHp ?? '—'}</strong><button type="button" onClick={() => void patchParticipant(participant.id, { hitPointDelta: 1 })} aria-label={`Curar 1 ponto de ${participant.name}`}>+</button></div> : <span className={styles.noHp}>HP não informado</span>}<label className={styles.visibilityToggle}><input type="checkbox" checked={participant.isVisibleToPlayers} onChange={(event) => void patchParticipant(participant.id, { isVisibleToPlayers: event.target.checked })} />{participant.isVisibleToPlayers ? <Eye size={13} /> : <EyeOff size={13} />} jogador</label></div><div className={styles.conditionRow}><input value={conditionEdits[participant.id] ?? participant.conditions.join(', ')} onChange={(event) => setConditionEdits((current) => ({ ...current, [participant.id]: event.target.value }))} placeholder="Condições: ex. ferido, atordoado" aria-label={`Condições de ${participant.name}`} /><button type="button" onClick={() => void patchParticipant(participant.id, { conditions: (conditionEdits[participant.id] ?? participant.conditions.join(', ')).split(',').map((item) => item.trim()).filter(Boolean) })}>Salvar status</button></div></article>)}</div>
  </Panel>;
}
