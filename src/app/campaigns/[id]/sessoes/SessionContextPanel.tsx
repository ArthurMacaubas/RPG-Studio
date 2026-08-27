'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, ChevronDown, ChevronUp, ExternalLink, FileQuestion, Lightbulb, ListChecks, Link2, RotateCcw, ShieldAlert } from 'lucide-react';
import { relationshipsApi } from '@/lib/api';
import type { SessionPlanning } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import { selectContextRelationships, type SessionContextGraph, type SessionContextRelation } from './sessionContextSelectors';
import styles from './sessionContext.module.css';

type SessionContextPanelProps = {
  campaignId: string;
  selectedPlan: SessionPlanning | null;
  previousPlan: SessionPlanning | null;
  onSelectPlan: (sessionId: string) => void;
  onResumePlanning: () => void;
};

const STATUS_LABELS = { PLANNED: 'Planejada', COMPLETED: 'Concluída' } as const;
const HYPOTHESIS_STATUS_LABELS = { OPEN: 'Aberta', SUPPORTED: 'Sustentada', REFUTED: 'Refutada', RESOLVED: 'Resolvida' } as const;
const IMPORTANCE_LABELS = { CRITICAL: 'Crítica', IMPORTANT: 'Importante', NORMAL: 'Normal', OPTIONAL: 'Opcional' } as const;

function formatDate(value: string | null) {
  if (!value) return 'Data não informada';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Data indisponível' : parsed.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
}

function summarize(value: string | null, empty: string) {
  const normalized = value?.trim();
  if (!normalized) return empty;
  return normalized.length > 220 ? `${normalized.slice(0, 217)}…` : normalized;
}

function statusForFile(file: SessionPlanning['files'][number]) {
  if (file.isTrashed) return { label: 'Indisponível · na lixeira', unavailable: true };
  if (file.isArchived) return { label: 'Indisponível · arquivada', unavailable: true };
  return { label: 'Disponível', unavailable: false };
}

export default function SessionContextPanel({ campaignId, selectedPlan, previousPlan, onSelectPlan, onResumePlanning }: SessionContextPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [graph, setGraph] = useState<SessionContextGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState(false);

  const linkedFileIds = useMemo(() => selectedPlan?.files.map((file) => file.id) ?? [], [selectedPlan]);
  const linkedFileKey = linkedFileIds.join(',');
  const linkedFileIdSet = useMemo(() => new Set(linkedFileIds), [linkedFileIds]);
  const relations = useMemo<SessionContextRelation[]>(() => graph ? selectContextRelationships(graph, linkedFileIdSet) : [], [graph, linkedFileIdSet]);
  const pending = useMemo(() => ({
    objectives: selectedPlan?.objectives.filter((item) => !item.done) ?? [],
    checklist: selectedPlan?.checklist.filter((item) => !item.done) ?? []
  }), [selectedPlan]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedPlan || linkedFileIds.length === 0) {
      setGraph(null);
      setGraphError(false);
      setGraphLoading(false);
      return;
    }
    setGraphLoading(true);
    setGraphError(false);
    relationshipsApi.graph(campaignId, linkedFileIds).then((nextGraph) => {
      if (!cancelled) setGraph(nextGraph);
    }).catch(() => {
      if (!cancelled) {
        setGraph(null);
        setGraphError(true);
      }
    }).finally(() => {
      if (!cancelled) setGraphLoading(false);
    });
    return () => { cancelled = true; };
  }, [campaignId, linkedFileKey, linkedFileIds, selectedPlan]);

  if (!selectedPlan) {
    return <section className={styles.panel} aria-label="Contexto investigativo da sessão"><div className={styles.heading}><div><span className={styles.eyebrow}><BookOpen size={14} /> Continuidade privada</span><h2>Contexto investigativo da sessão</h2></div></div><div className={styles.emptyState}><FileQuestion size={20} /><strong>Selecione um planejamento</strong><p>O contexto aparece quando o Mestre seleciona uma sessão no planejamento Q08.</p></div></section>;
  }

  return (
    <section className={styles.panel} aria-label="Contexto investigativo da sessão">
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}><BookOpen size={14} /> OWNER · privado</span><h2>Contexto investigativo da sessão</h2><p className={styles.intro}>Recupere vínculos existentes para preparar ou retomar a mesa. Este painel não copia conteúdo nem altera o quadro.</p></div>
        <button type="button" className={styles.collapseButton} onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen}><span>{isOpen ? 'Recolher' : 'Expandir'}</span>{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
      </div>
      {isOpen && <div className={styles.body}>
        <div className={styles.sessionMeta}><div><strong>{selectedPlan.name}</strong><span><CalendarDays size={13} /> {formatDate(selectedPlan.date)} · {STATUS_LABELS[selectedPlan.status]}</span></div><button type="button" className={styles.secondaryButton} onClick={onResumePlanning}><RotateCcw size={14} /> Retomar planejamento</button></div>

        <section className={styles.continuityGrid} aria-label="Continuidade da sessão">
          <article className={styles.continuityCard}><span className={styles.cardEyebrow}>Sessão anterior</span>{previousPlan ? <><strong>{previousPlan.name}</strong><span>{formatDate(previousPlan.date)} · {STATUS_LABELS[previousPlan.status]}</span><p>{summarize(previousPlan.postSummary, 'Nenhum resumo pós-sessão foi registrado.')}</p><button type="button" className={styles.textButton} onClick={() => onSelectPlan(previousPlan.id)}>Abrir planejamento anterior <ExternalLink size={13} /></button></> : <p className={styles.emptyCopy}>Não há sessão anterior identificável pela ordem administrativa.</p>}</article>
          <article className={styles.continuityCard}><span className={styles.cardEyebrow}>Preparar a próxima sessão</span><strong>{pending.objectives.length + pending.checklist.length} pendência{pending.objectives.length + pending.checklist.length === 1 ? '' : 's'}</strong><span>{pending.objectives.length} objetivo{pending.objectives.length === 1 ? '' : 's'} e {pending.checklist.length} item{pending.checklist.length === 1 ? '' : 'ns'} de checklist</span><p>{summarize(selectedPlan.summary, 'Nenhum resumo de preparação foi registrado.')}</p><span className={styles.contextCount}>{selectedPlan.files.length + selectedPlan.hypotheses.length + selectedPlan.views.length} contexto{selectedPlan.files.length + selectedPlan.hypotheses.length + selectedPlan.views.length === 1 ? '' : 's'} investigativo{selectedPlan.files.length + selectedPlan.hypotheses.length + selectedPlan.views.length === 1 ? '' : 's'} vinculado{selectedPlan.files.length + selectedPlan.hypotheses.length + selectedPlan.views.length === 1 ? '' : 's'}</span></article>
        </section>

        <section className={styles.section} aria-labelledby="session-context-plan-title"><div className={styles.sectionHeading}><div><span className={styles.sectionIcon}><ListChecks size={15} /></span><div><h3 id="session-context-plan-title">Planejamento existente</h3><p>Objetivos, roteiro, checklist e resumo pós-sessão continuam no Q08.</p></div></div></div><div className={styles.planSummary}><SummaryList title="Objetivos" items={selectedPlan.objectives} /><SummaryList title="Roteiro" items={selectedPlan.agenda} /><SummaryList title="Checklist" items={selectedPlan.checklist} /><div className={styles.summaryBlock}><span>Resumo pós-sessão</span><p>{summarize(selectedPlan.postSummary, 'Ainda não registrado.')}</p></div></div></section>

        <section className={styles.section} aria-labelledby="session-context-files-title"><div className={styles.sectionHeading}><div><span className={styles.sectionIcon}><FileQuestion size={15} /></span><div><h3 id="session-context-files-title">Fichas vinculadas</h3><p>Referências administrativas existentes, sem cópia de conteúdo.</p></div></div><strong>{selectedPlan.files.length}</strong></div>{selectedPlan.files.length === 0 ? <EmptyLinked label="Nenhuma ficha vinculada. Gerencie vínculos no planejamento Q08." /> : <div className={styles.resourceList}>{selectedPlan.files.map((file) => { const status = statusForFile(file); return <article className={styles.resourceRow} key={file.id}><div className={styles.resourceInfo}><strong>{file.name}</strong><span>{FILE_TYPE_LABELS[file.type]} · {status.label}</span></div><div className={styles.resourceActions}><a href={`/campaigns/${campaignId}/arquivos/${encodeURIComponent(file.id)}`}><ExternalLink size={13} /> Abrir ficha</a>{status.unavailable ? <span className={styles.unavailable}><ShieldAlert size={13} /> Sem foco no quadro</span> : <a href={`/campaigns/${campaignId}/investigacao?fileId=${encodeURIComponent(file.id)}`}><Link2 size={13} /> Focar no quadro</a>}</div></article>; })}</div>}</section>

        <section className={styles.section} aria-labelledby="session-context-hypotheses-title"><div className={styles.sectionHeading}><div><span className={styles.sectionIcon}><Lightbulb size={15} /></span><div><h3 id="session-context-hypotheses-title">Hipóteses vinculadas</h3><p>O quadro seleciona a hipótese e destaca suas evidências de modo transitório.</p></div></div><strong>{selectedPlan.hypotheses.length}</strong></div>{selectedPlan.hypotheses.length === 0 ? <EmptyLinked label="Nenhuma hipótese vinculada. Use o planejamento Q08 para gerenciar vínculos." /> : <div className={styles.resourceList}>{selectedPlan.hypotheses.map((hypothesis) => <article className={styles.resourceRow} key={hypothesis.id}><div className={styles.resourceInfo}><strong>{hypothesis.title}</strong><span>Estado atual · {HYPOTHESIS_STATUS_LABELS[hypothesis.status]}</span></div><div className={styles.resourceActions}><a href={`/campaigns/${campaignId}/investigacao?hypothesisId=${encodeURIComponent(hypothesis.id)}`}><Lightbulb size={13} /> Abrir hipótese no quadro</a></div></article>)}</div>}</section>

        <section className={styles.section} aria-labelledby="session-context-views-title"><div className={styles.sectionHeading}><div><span className={styles.sectionIcon}><RotateCcw size={15} /></span><div><h3 id="session-context-views-title">Vistas salvas vinculadas</h3><p>A restauração usa somente o snapshot administrativo já salvo.</p></div></div><strong>{selectedPlan.views.length}</strong></div>{selectedPlan.views.length === 0 ? <EmptyLinked label="Nenhuma vista vinculada. Use o planejamento Q08 para gerenciar vínculos." /> : <div className={styles.resourceList}>{selectedPlan.views.map((view) => <article className={styles.resourceRow} key={view.id}><div className={styles.resourceInfo}><strong>{view.name}</strong><span>Vista {view.kind}</span></div><div className={styles.resourceActions}><a href={`/campaigns/${campaignId}/investigacao?viewId=${encodeURIComponent(view.id)}`}><RotateCcw size={13} /> Abrir vista no quadro</a></div></article>)}</div>}</section>

        <section className={styles.section} aria-labelledby="session-context-relations-title"><div className={styles.sectionHeading}><div><span className={styles.sectionIcon}><Link2 size={15} /></span><div><h3 id="session-context-relations-title">Relações oficiais relevantes</h3><p>Somente relações entre fichas vinculadas; leitura sem edição.</p></div></div><strong>{graphLoading ? '…' : relations.length}</strong></div>{graphLoading ? <p className={styles.loadingCopy}>Carregando relações oficiais vinculadas…</p> : graphError ? <p className={styles.unavailableCopy} role="status">As relações vinculadas não puderam ser carregadas. Nenhum vínculo foi alterado.</p> : relations.length === 0 ? <EmptyLinked label="Nenhuma relação oficial relevante entre as fichas desta sessão." /> : <div className={styles.relationList}>{relations.map((relation) => <RelationRow key={relation.id} relation={relation} />)}</div>}</section>

        <p className={styles.footerNote}>As ações acima usam navegação administrativa efêmera. O painel não cria BoardNode, BoardEdge, Relationship, hipótese, evidência, pin, grupo, vista, sessão ou vínculo.</p>
      </div>}
    </section>
  );
}

function SummaryList({ title, items }: { title: string; items: Array<{ id: string; label: string; done: boolean }> }) {
  return <div className={styles.summaryBlock}><span>{title}</span>{items.length === 0 ? <p>Nenhum item.</p> : <ul>{items.slice(0, 6).map((item) => <li key={item.id} className={item.done ? styles.done : undefined}>{item.label}</li>)}{items.length > 6 && <li>+ {items.length - 6} item(ns) no planejamento</li>}</ul>}</div>;
}

function EmptyLinked({ label }: { label: string }) {
  return <p className={styles.emptyCopy}>{label}</p>;
}

function RelationRow({ relation }: { relation: SessionContextRelation }) {
  return <article className={styles.relationRow}><div><strong>{relation.sourceName} {relation.directional ? '→' : '↔'} {relation.targetName}</strong><span>{relation.typeName} · {IMPORTANCE_LABELS[relation.importance]} · leitura</span></div>{relation.label && <p>{relation.label}</p>}</article>;
}
