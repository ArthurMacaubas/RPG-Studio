'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Crosshair, Filter, Link2, LocateFixed, Maximize2, Minimize2, Minus, Pencil, Plus, RotateCcw, Search, Sparkles, Trash2, X } from 'lucide-react';
import { relationshipsApi, relationshipTypesApi } from '@/lib/api';
import { autoLayoutRelationshipGraph, filterRelationshipGraph, relationshipGraphStorageKey, type RelationshipGraphPosition } from '@/lib/relationshipGraph';
import { FILE_TYPE_LABELS, type FileType, type RelationshipGraphData, type RelationshipGraphEdge, type RelationshipImportance, type RelationshipType, type RelationshipVisibility } from '@/types';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { Button } from '@/components/ui/Button';
import styles from './RelationshipGraphEditor.module.css';

const NODE_WIDTH = 184;
const NODE_HEIGHT = 68;
const DEFAULT_VIEWBOX = { x: 0, y: 0, width: 1500, height: 920 };
const IMPORTANCE_LABELS: Record<RelationshipImportance, string> = { CRITICAL: 'Crítica', IMPORTANT: 'Importante', NORMAL: 'Normal', OPTIONAL: 'Opcional' };
const VISIBILITY_LABELS: Record<RelationshipVisibility, string> = { GM: 'Somente Mestre', ALL: 'Mestre e jogadores', P1: 'Somente P1', P2: 'Somente P2', P3: 'Somente P3', P4: 'Somente P4' };
const IMPORTANCES: RelationshipImportance[] = ['CRITICAL', 'IMPORTANT', 'NORMAL', 'OPTIONAL'];
const VISIBILITIES: RelationshipVisibility[] = ['GM', 'ALL', 'P1', 'P2', 'P3', 'P4'];
const NODE_TYPE_COLORS: Record<FileType, string> = {
  CAMPAIGN: 'var(--color-accent)', NPC: 'var(--color-danger)', CHARACTER: 'var(--color-link)', THREAT: 'var(--color-danger)',
  PUZZLE: 'var(--color-warning)', DOCUMENT: 'var(--color-text-muted)', CLUE: 'var(--color-accent-secondary)', OBJECT: 'var(--color-warning)',
  EVENT: 'var(--color-success)', SESSION: 'var(--color-link)', MAP: 'var(--color-success)', IMAGE: 'var(--color-link)', AUDIO: 'var(--color-link)',
  VIDEO: 'var(--color-link)', NOTE: 'var(--color-text-muted)', LOCATION: 'var(--color-success)'
};

type ViewBox = typeof DEFAULT_VIEWBOX;
type RelationshipForm = { fromId: string; toId: string; typeId: string; label: string; description: string; importance: RelationshipImportance; visibility: RelationshipVisibility };
type DragState = { kind: 'node' | 'pan'; id?: string; lastX: number; lastY: number };

const emptyForm: RelationshipForm = { fromId: '', toId: '', typeId: '', label: '', description: '', importance: 'NORMAL', visibility: 'GM' };

function edgeColor(edge: RelationshipGraphEdge) {
  return edge.type.color && /^#[0-9a-f]{3,8}$/i.test(edge.type.color) ? edge.type.color : 'var(--color-accent-secondary)';
}

function readPositions(key: string): Record<string, RelationshipGraphPosition> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => {
      if (!value || typeof value !== 'object') return false;
      const position = value as { x?: unknown; y?: unknown };
      return typeof position.x === 'number' && Number.isFinite(position.x) && typeof position.y === 'number' && Number.isFinite(position.y);
    })) as Record<string, RelationshipGraphPosition>;
  } catch {
    return {};
  }
}

export default function RelationshipGraphEditor({ campaignId, userId }: { campaignId: string; userId: string }) {
  const [graph, setGraph] = useState<RelationshipGraphData | null>(null);
  const [types, setTypes] = useState<RelationshipType[]>([]);
  const [positions, setPositions] = useState<Record<string, RelationshipGraphPosition>>({});
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEWBOX);
  const [query, setQuery] = useState('');
  const [nodeType, setNodeType] = useState<FileType | 'ALL'>('ALL');
  const [relationshipTypeId, setRelationshipTypeId] = useState<string | 'ALL'>('ALL');
  const [focusMode, setFocusMode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [form, setForm] = useState<RelationshipForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const storageKey = relationshipGraphStorageKey(campaignId, userId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextGraph, nextTypes] = await Promise.all([relationshipsApi.graph(campaignId), relationshipTypesApi.list(campaignId)]);
      const generated = autoLayoutRelationshipGraph(nextGraph);
      const saved = readPositions(storageKey);
      setGraph(nextGraph);
      setTypes(nextTypes);
      setPositions((current) => nextGraph.nodes.reduce<Record<string, RelationshipGraphPosition>>((result, node) => {
        const position = current[node.id] ?? saved[node.id] ?? generated[node.id];
        if (position) result[node.id] = position;
        return result;
      }, {}));
      setSelectedEdgeId((current) => current && nextGraph.edges.some((edge) => edge.id === current) ? current : null);
      setSelectedNodeId((current) => current && nextGraph.nodes.some((node) => node.id === current) ? current : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o grafo oficial.');
    } finally {
      setLoading(false);
    }
  }, [campaignId, storageKey]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === canvasRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const visibleGraph = useMemo(() => filterRelationshipGraph(graph ?? { nodes: [], edges: [] }, {
    query,
    nodeType,
    relationshipTypeId,
    focusNodeId: focusMode ? selectedNodeId : null
  }), [focusMode, graph, nodeType, query, relationshipTypeId, selectedNodeId]);
  const fallbackPositions = useMemo(() => autoLayoutRelationshipGraph(visibleGraph), [visibleGraph]);
  const displayPositions = useMemo<Record<string, RelationshipGraphPosition>>(() => Object.fromEntries(visibleGraph.nodes.map((node) => [node.id, positions[node.id] ?? fallbackPositions[node.id] ?? { x: 240, y: 180 }])), [fallbackPositions, positions, visibleGraph.nodes]);
  const selectedNode = graph?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = graph?.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const nodeTypes = useMemo(() => [...new Set((graph?.nodes ?? []).map((node) => node.type))].sort(), [graph]);
  const connectedEdges = useMemo(() => selectedNodeId ? (graph?.edges ?? []).filter((edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId) : [], [graph, selectedNodeId]);

  function positionFor(id: string) {
    return displayPositions[id] ?? { x: 240, y: 180 };
  }

  function persistPositions(next: Record<string, RelationshipGraphPosition>) {
    setPositions(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function selectNode(id: string) {
    if (connectionMode) {
      if (!connectionSourceId) {
        setConnectionSourceId(id);
        setSelectedNodeId(id);
        return;
      }
      if (connectionSourceId !== id) {
        openCreateForm(connectionSourceId, id);
        setConnectionMode(false);
        setConnectionSourceId(null);
        return;
      }
    }
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }

  function openCreateForm(fromId = selectedNodeId ?? '', toId = '') {
    setForm({ ...emptyForm, fromId, toId, typeId: types.find((type) => type.key === 'GENERIC')?.id ?? types[0]?.id ?? '' });
    setEditingEdgeId(null);
    setFormOpen(true);
    setError(null);
  }

  function openEditForm(edge: RelationshipGraphEdge) {
    setForm({ fromId: edge.sourceId, toId: edge.targetId, typeId: edge.type.id, label: edge.label ?? '', description: edge.description ?? '', importance: edge.importance, visibility: edge.visibility });
    setEditingEdgeId(edge.id);
    setFormOpen(true);
    setError(null);
  }

  function centerGraph(nextPositions = displayPositions) {
    if (visibleGraph.nodes.length === 0) return;
    const points = visibleGraph.nodes.map((node) => nextPositions[node.id] ?? positionFor(node.id));
    const minX = Math.min(...points.map((point) => point.x)) - NODE_WIDTH;
    const maxX = Math.max(...points.map((point) => point.x)) + NODE_WIDTH;
    const minY = Math.min(...points.map((point) => point.y)) - NODE_HEIGHT;
    const maxY = Math.max(...points.map((point) => point.y)) + NODE_HEIGHT;
    setViewBox({ x: minX, y: minY, width: Math.max(600, maxX - minX), height: Math.max(420, maxY - minY) });
  }

  function resetLayout() {
    if (!graph) return;
    const next = autoLayoutRelationshipGraph(graph);
    persistPositions(next);
    setNotice('Layout automático aplicado e salvo para esta campanha.');
    window.setTimeout(() => setNotice(null), 2600);
    window.requestAnimationFrame(() => centerGraph(next));
  }

  function zoom(factor: number) {
    setViewBox((current) => {
      const width = Math.min(5000, Math.max(420, current.width * factor));
      const height = Math.min(3200, Math.max(280, current.height * factor));
      return { ...current, x: current.x + (current.width - width) / 2, y: current.y + (current.height - height) / 2, width, height };
    });
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    zoom(event.deltaY > 0 ? 1.12 : 0.88);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) return;
    dragRef.current = { kind: 'pan', lastX: event.clientX, lastY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleNodePointerDown(event: ReactPointerEvent<SVGGElement>, id: string) {
    event.stopPropagation();
    selectNode(id);
    dragRef.current = { kind: 'node', id, lastX: event.clientX, lastY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.width / Math.max(1, rect.width);
    const scaleY = viewBox.height / Math.max(1, rect.height);
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    dragRef.current = { ...drag, lastX: event.clientX, lastY: event.clientY };
    if (drag.kind === 'node' && drag.id) {
      const current = positions[drag.id] ?? displayPositions[drag.id];
      if (!current) return;
      const next = { ...positions, [drag.id]: { x: current.x + dx * scaleX, y: current.y + dy * scaleY } };
      setPositions(next);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } else if (drag.kind === 'pan') {
      setViewBox((current) => ({ ...current, x: current.x - dx * scaleX, y: current.y - dy * scaleY }));
    }
  }

  function stopDragging(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function submitRelationship() {
    if (!form.fromId || !form.toId || !form.typeId || form.fromId === form.toId) return;
    setBusy(true);
    setError(null);
    try {
      const input = { typeId: form.typeId, label: form.label || undefined, description: form.description || undefined, importance: form.importance, visibility: form.visibility };
      if (editingEdgeId) await relationshipsApi.update(editingEdgeId, input);
      else await relationshipsApi.create({ fromId: form.fromId, toId: form.toId, ...input });
      setFormOpen(false);
      setSelectedEdgeId(null);
      setNotice(editingEdgeId ? 'Relacionamento atualizado.' : 'Relacionamento criado no grafo oficial.');
      window.setTimeout(() => setNotice(null), 2600);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o relacionamento.');
    } finally {
      setBusy(false);
    }
  }

  async function removeSelectedEdge() {
    if (!selectedEdge || !window.confirm('Excluir este relacionamento oficial?')) return;
    setBusy(true);
    try {
      await relationshipsApi.remove(selectedEdge.id);
      setSelectedEdgeId(null);
      setNotice('Relacionamento removido.');
      window.setTimeout(() => setNotice(null), 2600);
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover o relacionamento.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFullscreen() {
    if (!canvasRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await canvasRef.current.requestFullscreen();
  }

  function patchForm(patch: Partial<RelationshipForm>) { setForm((current) => ({ ...current, ...patch })); }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Relações oficiais da campanha</span><h1>Grafo de Relações</h1><p>Explore as conexões persistidas entre os arquivos. Este espaço é separado do Quadro de Investigação.</p></div>
        <div className={styles.headerActions}><Button size="sm" icon={<Link2 size={14} />} onClick={() => openCreateForm()}>Nova relação</Button><Link className={styles.backLink} href={`/campaigns/${campaignId}/investigacao` as never}>Abrir quadro</Link></div>
      </header>

      <section className={styles.toolbar} aria-label="Ferramentas do grafo">
        <label className={styles.search}><Search size={15} /><span className={styles.srOnly}>Pesquisar entidades</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar entidades" /></label>
        <label className={styles.selectField}><Filter size={14} /><span className={styles.srOnly}>Filtrar entidades</span><select value={nodeType} onChange={(event) => setNodeType(event.target.value as FileType | 'ALL')}><option value="ALL">Todos os tipos</option>{nodeTypes.map((type) => <option key={type} value={type}>{FILE_TYPE_LABELS[type]}</option>)}</select></label>
        <label className={styles.selectField}><Link2 size={14} /><span className={styles.srOnly}>Filtrar relações</span><select value={relationshipTypeId} onChange={(event) => setRelationshipTypeId(event.target.value)}><option value="ALL">Todos os relacionamentos</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <button type="button" className={`${styles.toolButton} ${focusMode ? styles.toolButtonActive : ''}`} onClick={() => setFocusMode((current) => !current)} aria-pressed={focusMode}><Crosshair size={14} />{focusMode ? 'Vizinhança ativa' : 'Foco por entidade'}</button>
        <button type="button" className={`${styles.toolButton} ${connectionMode ? styles.toolButtonActive : ''}`} onClick={() => { setConnectionMode((current) => !current); setConnectionSourceId(null); }} aria-pressed={connectionMode}><Link2 size={14} />{connectionMode ? 'Cancelar conexão' : 'Conectar nós'}</button>
      </section>

      <div className={styles.statusLine} aria-live="polite"><span>{visibleGraph.nodes.length} entidades · {visibleGraph.edges.length} relacionamentos visíveis</span>{connectionMode && <strong>{connectionSourceId ? 'Agora selecione o destino.' : 'Selecione a entidade de origem.'}</strong>}{notice && <em>{notice}</em>}</div>
      {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => setError(null)} aria-label="Fechar erro"><X size={14} /></button></div>}

      <div className={styles.graphShell} ref={canvasRef}>
        <svg ref={svgRef} className={styles.canvas} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} onPointerDown={handleCanvasPointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging} onWheel={handleWheel} role="application" aria-label="Canvas do grafo de relações">
          <defs><marker id="relationship-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent-secondary)" /></marker></defs>
          <g className={styles.edges}>
            {visibleGraph.edges.map((edge) => {
              const source = displayPositions[edge.sourceId];
              const target = displayPositions[edge.targetId];
              if (!source || !target) return null;
              const selected = selectedEdgeId === edge.id;
              return <g key={edge.id} className={selected ? styles.edgeSelected : styles.edge} onClick={(event) => { event.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}><line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={edgeColor(edge)} strokeWidth={selected ? 5 : 3} strokeOpacity={selected ? .95 : .62} markerEnd={edge.type.directional ? 'url(#relationship-arrow)' : undefined} /><text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 8} textAnchor="middle">{edge.label || edge.type.name}</text></g>;
            })}
          </g>
          <g className={styles.nodes}>
            {visibleGraph.nodes.map((node) => {
              const point = positionFor(node.id);
              const selected = selectedNodeId === node.id;
              const source = connectionSourceId === node.id;
              return <g key={node.id} transform={`translate(${point.x} ${point.y})`} className={`${styles.node} ${selected ? styles.nodeSelected : ''} ${source ? styles.nodeSource : ''}`} style={{ '--node-accent': NODE_TYPE_COLORS[node.type] } as CSSProperties} onPointerDown={(event) => handleNodePointerDown(event, node.id)} onClick={(event) => { event.stopPropagation(); selectNode(node.id); }} role="button" tabIndex={0} aria-label={`${node.name}, ${FILE_TYPE_LABELS[node.type]}`}><rect x={-NODE_WIDTH / 2} y={-NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT} rx="12" /><foreignObject x={-NODE_WIDTH / 2 + 14} y={-NODE_HEIGHT / 2 + 12} width={NODE_WIDTH - 28} height={NODE_HEIGHT - 24}><div className={styles.nodeContent}><FileTypeIcon type={node.type} size={16} /><span><strong>{node.name}</strong><small>{FILE_TYPE_LABELS[node.type]}</small></span></div></foreignObject></g>;
            })}
          </g>
        </svg>
        {loading && <div className={styles.canvasMessage}>Carregando entidades e relacionamentos…</div>}
        {!loading && !error && visibleGraph.nodes.length === 0 && <div className={styles.canvasMessage}>Nenhuma entidade corresponde aos filtros atuais.</div>}
        <div className={styles.canvasControls} aria-label="Controles do canvas"><button type="button" onClick={() => zoom(.82)} aria-label="Aumentar zoom"><Plus size={15} /></button><button type="button" onClick={() => zoom(1.22)} aria-label="Reduzir zoom"><Minus size={15} /></button><button type="button" onClick={() => centerGraph()} aria-label="Centralizar grafo"><LocateFixed size={15} /></button><button type="button" onClick={resetLayout} aria-label="Reorganizar grafo"><RotateCcw size={15} /></button><button type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Sair da tela cheia' : 'Abrir tela cheia'}>{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button></div>
        <div className={styles.legend}><Sparkles size={13} /> Arraste nós · use roda/pan para navegar · clique em conexões para detalhes</div>
      </div>

      {(selectedNode || selectedEdge || formOpen) && <aside className={styles.details} aria-label="Detalhes do grafo">
        {formOpen ? <div className={styles.formPanel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>{editingEdgeId ? 'Editar conexão' : 'Persistir conexão'}</span><h2>{editingEdgeId ? 'Editar relacionamento' : 'Novo relacionamento'}</h2></div><button type="button" className={styles.iconButton} onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><X size={16} /></button></div><div className={styles.formGrid}><label>Origem<select value={form.fromId} onChange={(event) => patchForm({ fromId: event.target.value })} disabled={Boolean(editingEdgeId)}><option value="">Selecione</option>{graph?.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>Destino<select value={form.toId} onChange={(event) => patchForm({ toId: event.target.value })} disabled={Boolean(editingEdgeId)}><option value="">Selecione</option>{graph?.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>Tipo<select value={form.typeId} onChange={(event) => patchForm({ typeId: event.target.value })}><option value="">Selecione</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>Importância<select value={form.importance} onChange={(event) => patchForm({ importance: event.target.value as RelationshipImportance })}>{IMPORTANCES.map((importance) => <option key={importance} value={importance}>{IMPORTANCE_LABELS[importance]}</option>)}</select></label><label>Visibilidade<select value={form.visibility} onChange={(event) => patchForm({ visibility: event.target.value as RelationshipVisibility })}>{VISIBILITIES.map((visibility) => <option key={visibility} value={visibility}>{VISIBILITY_LABELS[visibility]}</option>)}</select></label><label>Rótulo<input value={form.label} onChange={(event) => patchForm({ label: event.target.value })} maxLength={120} placeholder="Ex.: suspeita principal" /></label><label className={styles.fullField}>Descrição<textarea value={form.description} onChange={(event) => patchForm({ description: event.target.value })} maxLength={2000} placeholder="Contexto da conexão" /></label></div><div className={styles.panelActions}><Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button><Button size="sm" onClick={() => void submitRelationship()} disabled={busy || !form.fromId || !form.toId || !form.typeId || form.fromId === form.toId}>{busy ? 'Salvando…' : editingEdgeId ? 'Salvar' : 'Criar relação'}</Button></div></div> : selectedNode ? <div className={styles.detailPanel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>Entidade selecionada</span><h2>{selectedNode.name}</h2><p>{FILE_TYPE_LABELS[selectedNode.type]}</p></div><button type="button" className={styles.iconButton} onClick={() => setSelectedNodeId(null)} aria-label="Fechar detalhes"><X size={16} /></button></div><Link className={styles.openFile} href={`/campaigns/${campaignId}/arquivos/${selectedNode.id}` as never}>Abrir arquivo original</Link><div className={styles.detailStats}><span><strong>{connectedEdges.length}</strong> conexões</span><span><strong>{connectedEdges.filter((edge) => edge.sourceId === selectedNode.id).length}</strong> saindo</span><span><strong>{connectedEdges.filter((edge) => edge.targetId === selectedNode.id).length}</strong> entrando</span></div><button type="button" className={styles.outlineButton} onClick={() => openCreateForm(selectedNode.id)}><Link2 size={14} />Criar relação a partir daqui</button><div className={styles.edgeList}>{connectedEdges.slice(0, 8).map((edge) => <button type="button" key={edge.id} onClick={() => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}><span>{edge.sourceId === selectedNode.id ? '→' : '←'}</span>{edge.type.name}<small>{edge.sourceId === selectedNode.id ? graph?.nodes.find((node) => node.id === edge.targetId)?.name : graph?.nodes.find((node) => node.id === edge.sourceId)?.name}</small></button>)}</div></div> : selectedEdge ? <div className={styles.detailPanel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>Conexão oficial</span><h2>{selectedEdge.type.name}</h2><p>{selectedEdge.label || 'Sem rótulo adicional'}</p></div><button type="button" className={styles.iconButton} onClick={() => setSelectedEdgeId(null)} aria-label="Fechar detalhes"><X size={16} /></button></div><div className={styles.connectionRoute}><strong>{graph?.nodes.find((node) => node.id === selectedEdge.sourceId)?.name}</strong><span>{selectedEdge.type.directional ? '→' : '↔'}</span><strong>{graph?.nodes.find((node) => node.id === selectedEdge.targetId)?.name}</strong></div>{selectedEdge.description && <p className={styles.description}>{selectedEdge.description}</p>}<div className={styles.metadata}><span>{IMPORTANCE_LABELS[selectedEdge.importance]}</span><span>{VISIBILITY_LABELS[selectedEdge.visibility]}</span>{selectedEdge.type.directional && <span>Direcional</span>}</div><div className={styles.panelActions}><Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEditForm(selectedEdge)}>Editar</Button><Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => void removeSelectedEdge()} disabled={busy}>Excluir</Button></div></div> : null}
      </aside>}
    </main>
  );
}
