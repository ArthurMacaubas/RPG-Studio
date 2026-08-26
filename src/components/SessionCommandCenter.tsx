'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Circle, Clock3, ExternalLink, FileText, ListChecks, Pause, Play, RefreshCw, ShieldCheck } from 'lucide-react';
import { auditApi, filesApi, playerModeApi, type AuditEventItem } from '@/lib/api';
import type { CampaignFile, ChecklistItem } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/ToastProvider';
import { CombatEncounterPanel } from '@/components/CombatEncounterPanel';
import styles from './SessionCommandCenter.module.css';

type SessionCommandCenterProps = { campaignId: string };

function checklistOf(file: CampaignFile | null): ChecklistItem[] {
  if (!file || typeof file.data !== 'object' || file.data === null) return [];
  const checklist = (file.data as { checklist?: unknown }).checklist;
  if (!Array.isArray(checklist)) return [];
  return checklist.filter((item): item is ChecklistItem => typeof item === 'object' && item !== null && typeof (item as ChecklistItem).label === 'string' && typeof (item as ChecklistItem).done === 'boolean');
}

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${rest}`;
}

function describeAudit(event: AuditEventItem) {
  const labels: Record<string, string> = { PLAYER_MODE_ENABLED: 'Modo Jogador ativado', PLAYER_MODE_DISABLED: 'Modo Jogador pausado', FILE_PUBLISHED: 'Arquivo publicado', FILE_UNPUBLISHED: 'Arquivo ocultado', FILE_ATTACHMENT_UPLOADED: 'Anexo enviado', LOGIN: 'Login realizado', INVITE_ACCEPTED: 'Convite aceito' };
  return labels[event.action] ?? event.action.replaceAll('_', ' ').toLowerCase();
}

export function SessionCommandCenter({ campaignId }: SessionCommandCenterProps) {
  const [sessions, setSessions] = useState<CampaignFile[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [publishedCount, setPublishedCount] = useState(0);
  const [publishedTotal, setPublishedTotal] = useState(0);
  const [activity, setActivity] = useState<AuditEventItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionFiles, playerMode, audit] = await Promise.all([filesApi.list(campaignId, { scope: 'active', type: 'SESSION', sort: 'updatedAt', direction: 'desc' }), playerModeApi.get(campaignId), auditApi.list(campaignId, 24)]);
      setSessions(sessionFiles);
      setSelectedId((current) => current && sessionFiles.some((file) => file.id === current) ? current : sessionFiles[0]?.id ?? '');
      setPublishedCount(playerMode.files.filter((file) => file.isVisible).length);
      setPublishedTotal(playerMode.files.length);
      setActivity(audit);
    } catch (error) {
      toast({ tone: 'error', title: 'Sala de sessão indisponível', message: error instanceof Error ? error.message : 'Tente recarregar.' });
    } finally {
      setLoading(false);
    }
  }, [campaignId, toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const selected = useMemo(() => sessions.find((file) => file.id === selectedId) ?? null, [sessions, selectedId]);
  const checklist = checklistOf(selected);
  const completed = checklist.filter((item) => item.done).length;

  async function toggleChecklist(index: number) {
    if (!selected) return;
    const next = checklist.map((item, itemIndex) => itemIndex === index ? { ...item, done: !item.done } : item);
    const data = { ...(selected.data ?? {}), checklist: next };
    setSessions((current) => current.map((file) => file.id === selected.id ? { ...file, data } : file));
    try {
      await filesApi.update(selected.id, { data });
    } catch (error) {
      await load();
      toast({ tone: 'error', title: 'Checklist não salvo', message: error instanceof Error ? error.message : 'Tente novamente.' });
    }
  }

  function resetTimer() {
    setRunning(false);
    setElapsed(0);
  }

  if (loading) return <main className={styles.loading}><div className={styles.loadingBar} /><div className={styles.loadingGrid}><div /><div /></div></main>;

  return <main className={styles.page}>
    <header className={styles.header}><div><div className={styles.eyebrow}>Operação de mesa</div><h1>Sala de Sessão</h1><p>Conduza o ritmo da mesa, acompanhe pendências e mantenha a publicação sob controle.</p></div><div className={styles.headerActions}><Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => void load()}>Atualizar</Button><Link href={`/campaigns/${campaignId}/modo-jogador`} className={styles.linkButton}><ShieldCheck size={14} /> Curadoria</Link></div></header>
    <section className={styles.metrics}><div className={styles.metric}><span>Sessões ativas</span><strong>{sessions.length}</strong><small>arquivos de sessão no acervo</small></div><div className={styles.metric}><span>Publicação</span><strong>{publishedCount}<em>/{publishedTotal}</em></strong><small>arquivos visíveis ao jogador</small></div><div className={styles.metric}><span>Checklist</span><strong>{completed}<em>/{checklist.length}</em></strong><small>{selected ? selected.name : 'selecione uma sessão'}</small></div><div className={`${styles.metric} ${running ? styles.metricLive : ''}`}><span>Tempo da mesa</span><strong className={styles.timer}>{formatElapsed(elapsed)}</strong><small>{running ? 'cronômetro em andamento' : 'cronômetro pausado'}</small></div></section>
    <div className={styles.grid}><Panel eyebrow="Sessão em foco" title={selected ? selected.name : 'Nenhuma sessão selecionada'} action={selected ? <Link href={`/campaigns/${campaignId}/arquivos/${selected.id}`} className={styles.openLink}>Abrir editor <ExternalLink size={13} /></Link> : undefined}>{sessions.length === 0 ? <EmptyState icon={<FileText size={18} />} title="Crie a primeira sessão" description="Use um arquivo do tipo Sessão para registrar objetivos, cenas e pendências." /> : <div className={styles.sessionList}>{sessions.map((file) => <button type="button" key={file.id} className={`${styles.sessionItem} ${file.id === selectedId ? styles.sessionItemActive : ''}`} onClick={() => setSelectedId(file.id)}><span className={styles.sessionIcon}><FileText size={15} /></span><span><strong>{file.name}</strong><small>{FILE_TYPE_LABELS[file.type]} · atualizado em {new Date(file.updatedAt).toLocaleDateString('pt-BR')}</small></span><span className={styles.sessionArrow}>›</span></button>)}</div>}</Panel>
      <Panel eyebrow="Ritmo da mesa" title="Cronômetro de sessão" action={<Badge tone={running ? 'success' : 'neutral'}>{running ? 'Ao vivo' : 'Pausado'}</Badge>}><div className={styles.timerCard}><Clock3 size={18} /><strong>{formatElapsed(elapsed)}</strong><span>{running ? 'O tempo está correndo. Pause para registrar um intervalo.' : 'Inicie quando a mesa começar.'}</span><div className={styles.timerActions}><Button variant="primary" size="sm" icon={running ? <Pause size={14} /> : <Play size={14} />} onClick={() => setRunning((value) => !value)}>{running ? 'Pausar' : 'Iniciar'}</Button><Button variant="ghost" size="sm" onClick={resetTimer}>Zerar</Button></div></div><div className={styles.quickLinks}><Link href={`/campaigns/${campaignId}/investigacao`}><ListChecks size={14} /> Quadro de investigação</Link><Link href={`/campaigns/${campaignId}/mapa`}><ExternalLink size={14} /> Mapa da campanha</Link></div></Panel>
      <CombatEncounterPanel campaignId={campaignId} sessionId={selected?.id} />
      <Panel eyebrow="Pendências" title={selected ? `Checklist de ${selected.name}` : 'Checklist da sessão'} action={checklist.length > 0 ? <Badge tone={completed === checklist.length ? 'success' : 'warning'}>{completed}/{checklist.length}</Badge> : undefined}>{!selected || checklist.length === 0 ? <EmptyState icon={<ListChecks size={18} />} title="Nenhuma pendência registrada" description="Abra o editor da sessão e adicione itens ao checklist operacional." /> : <div className={styles.checklist}>{checklist.map((item, index) => <button type="button" className={`${styles.checkItem} ${item.done ? styles.checkItemDone : ''}`} key={`${item.label}-${index}`} onClick={() => void toggleChecklist(index)}><span>{item.done ? <Check size={14} /> : <Circle size={14} />}</span><span>{item.label}</span></button>)}</div>}</Panel>
      <Panel eyebrow="Observabilidade" title="Atividade recente" action={<Link href={`/campaigns/${campaignId}/configuracoes`} className={styles.openLink}>Auditoria completa <ExternalLink size={13} /></Link>}>{activity.length === 0 ? <p className={styles.muted}>Nenhum evento registrado ainda.</p> : <div className={styles.activity}>{activity.slice(0, 8).map((event) => <div className={styles.activityRow} key={event.id}><span className={styles.activityDot} /><div><strong>{describeAudit(event)}</strong><small>{event.actor?.name ?? 'Sistema'} · {new Date(event.createdAt).toLocaleString('pt-BR')}</small></div></div>)}</div>}</Panel>
    </div>
  </main>;
}
