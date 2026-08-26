'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftRight, ExternalLink, Plus, Link2, ZoomIn, ZoomOut, Maximize, Lightbulb, SlidersHorizontal, Layers3, Bookmark, Wand2 } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { AddToBoardModal } from '@/components/AddToBoardModal';
import { useToast } from '@/components/ui/ToastProvider';
import { boardAnnotationsApi, boardApi, boardViewsApi, filesApi, hypothesesApi, relationshipsApi } from '@/lib/api';
import type { BoardEdgeItem, BoardNodeItem, CampaignFile, InvestigationBoardGroup, InvestigationBoardPinItem, InvestigationBoardViewItem, InvestigationBoardViewKind, InvestigationBoardViewSnapshot, RelationshipImportance, RelationshipVisibility } from '@/types';
import HypothesesPanel from './HypothesesPanel';
import InvestigationFiltersPanel, { DEFAULT_INVESTIGATION_FILTERS, type InvestigationFilterState } from './InvestigationFiltersPanel';
import BoardAnnotationsPanel from './BoardAnnotationsPanel';
import BoardViewsPanel from './BoardViewsPanel';
import BoardLayoutPathsPanel from './BoardLayoutPathsPanel';
import { filterBoardEdges, filterBoardNodes, filterOfficialRelationships } from './investigationBoardFilterLogic';
import { computeAutoLayout, type AutoLayoutResult, type BoardNodePosition } from '@/services/investigationBoardLayout';
import { findInvestigationPaths, type InvestigationPathsResult, type PathMode } from '@/services/investigationBoardPaths';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './page.module.css';

const EDGE_COLORS = ['#de7d78', '#e5ac68', '#88c799', '#c8a66a', '#86aaa2', '#edf3ee'];
const NODE_WIDTH = 150;
const NODE_HEIGHT = 54;
const OFFICIAL_IMPORTANCE_LABELS: Record<RelationshipImportance, string> = { CRITICAL: 'Crítica', IMPORTANT: 'Importante', NORMAL: 'Normal', OPTIONAL: 'Opcional' };
const OFFICIAL_VISIBILITY_LABELS: Record<RelationshipVisibility, string> = { GM: 'Somente Mestre', ALL: 'Mestre e jogadores', P1: 'Somente P1', P2: 'Somente P2', P3: 'Somente P3', P4: 'Somente P4' };

export default function InvestigationBoardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params?.id ?? '';
  const requestedViewId = searchParams?.get('viewId');
  const requestedHypothesisId = searchParams?.get('hypothesisId');

  const [nodes, setNodes] = useState<BoardNodeItem[]>([]);
  const [edges, setEdges] = useState<BoardEdgeItem[]>([]);
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<BoardEdgeItem | null>(null);
  const [showHypotheses, setShowHypotheses] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<InvestigationFilterState>(DEFAULT_INVESTIGATION_FILTERS);
  const [allFiles, setAllFiles] = useState<CampaignFile[]>([]);
  const [officialRelationships, setOfficialRelationships] = useState<Awaited<ReturnType<typeof relationshipsApi.graph>>['edges']>([]);
  const [selectedOfficialRelationshipId, setSelectedOfficialRelationshipId] = useState<string | null>(null);
  const [highlightedFileIds, setHighlightedFileIds] = useState<Set<string>>(new Set());
  const [pins, setPins] = useState<InvestigationBoardPinItem[]>([]);
  const [groups, setGroups] = useState<InvestigationBoardGroup[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationsBusy, setAnnotationsBusy] = useState(false);
  const [views, setViews] = useState<InvestigationBoardViewItem[]>([]);
  const [viewWarnings, setViewWarnings] = useState<string[]>([]);
  const [showViews, setShowViews] = useState(false);
  const [viewsBusy, setViewsBusy] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewAnnotationIds, setActiveViewAnnotationIds] = useState<{ pinIds: Set<string>; groupIds: Set<string> } | null>(null);
  const [hypotheses, setHypotheses] = useState<Awaited<ReturnType<typeof hypothesesApi.list>>>([]);
  const [showLayoutPaths, setShowLayoutPaths] = useState(false);
  const [layoutPreview, setLayoutPreview] = useState<{ original: BoardNodePosition[]; proposed: AutoLayoutResult['positions']; cycleNodeIds: string[] } | null>(null);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutError, setLayoutError] = useState('');
  const [pathMode, setPathMode] = useState<PathMode>('OFFICIAL');
  const [pathSourceId, setPathSourceId] = useState('');
  const [pathTargetId, setPathTargetId] = useState('');
  const [pathHypothesisId, setPathHypothesisId] = useState('');
  const [pathResult, setPathResult] = useState<InvestigationPathsResult | null>(null);
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  const { toast } = useToast();

  const wrapRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ panning: boolean; startX: number; startY: number; originX: number; originY: number }>({
    panning: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });
  const dragState = useRef<{ nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);

  async function load() {
    try {
      const data = await boardApi.get(campaignId);
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (error) {
      toast({ tone: 'error', title: 'Quadro indisponível', message: error instanceof Error ? error.message : 'Não foi possível carregar o quadro.' });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    Promise.all([
      filesApi.list(campaignId, { scope: filters.scope, sort: 'name', direction: 'asc' }),
      relationshipsApi.graph(campaignId)
    ]).then(([nextFiles, graph]) => {
      if (cancelled) return;
      setAllFiles(nextFiles);
      setOfficialRelationships(graph.edges);
    }).catch(() => {
      if (!cancelled) toast({ tone: 'error', title: 'Camadas indisponíveis', message: 'Não foi possível carregar todas as camadas do quadro.' });
    });
    return () => { cancelled = true; };
  }, [campaignId, filters.scope, toast]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    boardAnnotationsApi.list(campaignId).then((data) => {
      if (cancelled) return;
      setPins(data.pins);
      setGroups(data.groups);
    }).catch(() => {
      if (!cancelled) toast({ tone: 'error', title: 'Anotações indisponíveis', message: 'Não foi possível carregar pins e agrupamentos.' });
    });
    return () => { cancelled = true; };
  }, [campaignId, toast]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    boardViewsApi.list(campaignId).then((data) => {
      if (cancelled) return;
      setViews(data.views);
      setViewWarnings(data.warnings);
    }).catch(() => {
      if (!cancelled) toast({ tone: 'error', title: 'Vistas indisponíveis', message: 'Não foi possível carregar as vistas salvas.' });
    });
    return () => { cancelled = true; };
  }, [campaignId, toast]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    hypothesesApi.list(campaignId).then((data) => {
      if (!cancelled) setHypotheses(data);
    }).catch(() => {
      if (!cancelled) toast({ tone: 'error', title: 'Caminhos indisponíveis', message: 'Não foi possível carregar as hipóteses para o caminho.' });
    });
    return () => { cancelled = true; };
  }, [campaignId, toast]);

  // ---- pan & zoom ----
  function onWrapMouseDown(e: React.MouseEvent) {
    if (e.target !== wrapRef.current && !(e.target as HTMLElement).classList.contains(styles.world ?? '')) return;
    panState.current = { panning: true, startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y };
  }

  const onWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (panState.current.panning) {
        const dx = e.clientX - panState.current.startX;
        const dy = e.clientY - panState.current.startY;
        setPan({ x: panState.current.originX + dx, y: panState.current.originY + dy });
      }
      if (dragState.current) {
        const dx = (e.clientX - dragState.current.startX) / zoom;
        const dy = (e.clientY - dragState.current.startY) / zoom;
        const nodeId = dragState.current.nodeId;
        const nx = dragState.current.nodeX + dx;
        const ny = dragState.current.nodeY + dy;
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, x: nx, y: ny } : n)));
      }
    },
    [zoom]
  );

  const onWindowMouseUp = useCallback(() => {
    panState.current.panning = false;
    if (dragState.current) {
      const node = nodes.find((n) => n.id === dragState.current!.nodeId);
      if (node) boardApi.moveNode(node.fileId, node.x, node.y);
      dragState.current = null;
    }
  }, [nodes]);

  useEffect(() => {
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [onWindowMouseMove, onWindowMouseUp]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }

  function resetView() {
    setPan({ x: 60, y: 40 });
    setZoom(1);
  }

  // ---- nodes ----
  function onNodeMouseDown(node: BoardNodeItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (connectMode || layoutPreview) return;
    dragState.current = { nodeId: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
  }

  function onNodeClick(node: BoardNodeItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (!connectMode) return;
    if (!connectSourceId) {
      setConnectSourceId(node.id);
      return;
    }
    if (connectSourceId === node.id) {
      setConnectSourceId(null);
      return;
    }
    boardApi
      .createEdge({ campaignId, fromNodeId: connectSourceId, toNodeId: node.id, color: EDGE_COLORS[3] })
      .then((edge) => {
        setEdges((prev) => [...prev, edge]);
        toast({ tone: 'success', title: 'Conexão criada', message: 'O fio foi adicionado ao quadro.' });
      })
      .catch((error) => toast({ tone: 'error', title: 'Não foi possível conectar', message: error instanceof Error ? error.message : 'Tente novamente.' }));
    setConnectSourceId(null);
  }

  async function removeNode(nodeId: string) {
    await boardApi.removeNode(nodeId);
    load();
  }

  async function handlePickFile(file: CampaignFile) {
    const centerX = (-pan.x + (wrapRef.current?.clientWidth ?? 800) / 2) / zoom - NODE_WIDTH / 2;
    const centerY = (-pan.y + (wrapRef.current?.clientHeight ?? 500) / 2) / zoom - NODE_HEIGHT / 2;
    const node = await boardApi.dropFile(campaignId, file.id, centerX, centerY);
    setNodes((prev) => [...prev, node]);
    setShowAddModal(false);
  }

  const focusFile = useCallback((fileId: string) => {
    const node = nodes.find((item) => item.fileId === fileId);
    if (!node) {
      toast({ tone: 'info', title: 'Ficha fora do quadro', message: 'Adicione a evidência ao canvas para posicioná-la.' });
      return;
    }
    const width = wrapRef.current?.clientWidth ?? 800;
    const height = wrapRef.current?.clientHeight ?? 500;
    const focusZoom = zoom < 0.7 ? 0.8 : zoom > 1.2 ? 1.2 : zoom;
    setZoom(focusZoom);
    setPan({ x: width / 2 - (node.x + NODE_WIDTH / 2) * focusZoom, y: height / 2 - (node.y + NODE_HEIGHT / 2) * focusZoom });
    setHighlightedFileIds(new Set([fileId]));
    window.setTimeout(() => setHighlightedFileIds(new Set()), 1800);
  }, [nodes, toast, zoom]);

  const addEvidenceToBoard = useCallback(async (fileId: string) => {
    if (nodes.some((node) => node.fileId === fileId)) {
      focusFile(fileId);
      return;
    }
    try {
      const file = await filesApi.get(fileId);
      const centerX = (-pan.x + (wrapRef.current?.clientWidth ?? 800) / 2) / zoom - NODE_WIDTH / 2;
      const centerY = (-pan.y + (wrapRef.current?.clientHeight ?? 500) / 2) / zoom - NODE_HEIGHT / 2;
      const node = await boardApi.dropFile(campaignId, file.id, centerX, centerY);
      setNodes((prev) => [...prev, node]);
      setHighlightedFileIds(new Set([fileId]));
      window.setTimeout(() => setHighlightedFileIds(new Set()), 1800);
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível adicionar', message: 'A ficha não pôde ser adicionada ao quadro.' });
      throw error;
    }
  }, [campaignId, focusFile, nodes, pan.x, pan.y, toast, zoom]);

  const boardFileIds = useMemo(() => new Set(nodes.map((node) => node.fileId)), [nodes]);
  const filteredNodes = useMemo(() => filterBoardNodes(nodes, filters), [filters, nodes]);
  const visibleNodeFileIds = useMemo(() => filters.layers.files ? new Set(filteredNodes.map((node) => node.fileId)) : new Set<string>(), [filters.layers.files, filteredNodes]);
  const filteredEdges = useMemo(() => filterBoardEdges(edges, nodes, visibleNodeFileIds, filters.layers.visualEdges), [edges, filters.layers.visualEdges, nodes, visibleNodeFileIds]);
  const filteredOfficialRelationships = useMemo(() => filterOfficialRelationships(officialRelationships, visibleNodeFileIds, filters), [filters, officialRelationships, visibleNodeFileIds]);
  const selectedOfficialRelationship = useMemo(() => filteredOfficialRelationships.find((relationship) => relationship.id === selectedOfficialRelationshipId) ?? null, [filteredOfficialRelationships, selectedOfficialRelationshipId]);
  const availableTags = useMemo(() => {
    const byId = new Map<string, NonNullable<CampaignFile['tags']>[number]['tag']>();
    for (const file of allFiles) for (const entry of file.tags ?? []) byId.set(entry.tag.id, entry.tag);
    for (const node of nodes) for (const entry of node.file.tags ?? []) byId.set(entry.tag.id, entry.tag);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allFiles, nodes]);
  const updateFilters = useCallback((next: InvestigationFilterState) => {
    setFilters(next);
    setShowHypotheses(next.layers.hypotheses);
  }, []);
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_INVESTIGATION_FILTERS);
    setShowHypotheses(true);
  }, []);
  const highlightHypothesisFiles = useCallback((fileIds: string[]) => {
    setHighlightedFileIds(filters.layers.evidence ? new Set(fileIds.filter((fileId) => visibleNodeFileIds.has(fileId))) : new Set());
  }, [filters.layers.evidence, visibleNodeFileIds]);

  const currentViewSnapshot = useMemo<InvestigationBoardViewSnapshot>(() => ({
    pan,
    zoom,
    filters: { ...filters, tagIds: [...filters.tagIds], layers: { ...filters.layers } },
    pinIds: pins.map((pin) => pin.id),
    groupIds: groups.map((group) => group.id)
  }), [filters, groups, pan, pins, zoom]);

  const pathSegments = useMemo(() => {
    const selectedPath = pathResult?.paths[selectedPathIndex];
    return selectedPath?.segments.map((segment, segmentIndex) => ({ ...segment, key: `${selectedPathIndex}-${segmentIndex}-${segment.fromFileId}-${segment.toFileId}` })) ?? [];
  }, [pathResult, selectedPathIndex]);
  const visiblePathSegments = useMemo(() => pathSegments.filter((segment) => segment.source === 'RELATIONSHIP' ? filters.layers.officialRelationships : filters.layers.evidence), [filters.layers.evidence, filters.layers.officialRelationships, pathSegments]);

  function previewAutoLayout() {
    setLayoutError('');
    try {
      const result = computeAutoLayout({
        nodes: nodes.map((node) => ({ id: node.id, fileId: node.fileId, x: node.x, y: node.y, fileName: node.file.name })),
        relationships: officialRelationships.map((relationship) => ({ sourceId: relationship.sourceId, targetId: relationship.targetId, directional: relationship.type.directional }))
      });
      setLayoutPreview({ original: nodes.map((node) => ({ nodeId: node.id, fileId: node.fileId, x: node.x, y: node.y })), proposed: result.positions, cycleNodeIds: result.cycleNodeIds });
      const proposedById = new Map(result.positions.map((position) => [position.nodeId, position]));
      setNodes((current) => current.map((node) => { const position = proposedById.get(node.id); return position ? { ...node, x: position.x, y: position.y } : node; }));
    } catch (error) {
      setLayoutError(error instanceof Error ? error.message : 'Não foi possível calcular o layout.');
    }
  }

  function cancelAutoLayout() {
    if (!layoutPreview) return;
    const originalById = new Map(layoutPreview.original.map((position) => [position.nodeId, position]));
    setNodes((current) => current.map((node) => { const position = originalById.get(node.id); return position ? { ...node, x: position.x, y: position.y } : node; }));
    setLayoutPreview(null);
    setLayoutError('');
  }

  async function confirmAutoLayout() {
    if (!layoutPreview) return;
    setLayoutBusy(true);
    setLayoutError('');
    try {
      const result = await boardApi.updatePositions(campaignId, layoutPreview.proposed.map(({ fileId, x, y }) => ({ fileId, x, y })));
      const positionsByFileId = new Map(result.positions.map((position) => [position.fileId, position]));
      setNodes((current) => current.map((node) => { const position = positionsByFileId.get(node.fileId); return position ? { ...node, x: position.x, y: position.y } : node; }));
      setLayoutPreview(null);
      toast({ tone: 'success', title: 'Layout aplicado', message: 'As posições foram salvas explicitamente; relações, fichas e arestas permaneceram intactas.' });
    } catch (error) {
      setLayoutError(error instanceof Error ? error.message : 'Não foi possível salvar as posições.');
    } finally {
      setLayoutBusy(false);
    }
  }

  function findPath() {
    const hypothesis = hypotheses.find((item) => item.id === pathHypothesisId) ?? null;
    setSelectedPathIndex(0);
    setPathResult(findInvestigationPaths({
      nodeFileIds: nodes.map((node) => node.fileId),
      sourceFileId: pathSourceId,
      targetFileId: pathTargetId,
      mode: pathMode,
      relationships: officialRelationships,
      hypothesis
    }));
  }

  const visiblePins = useMemo(() => activeViewAnnotationIds ? pins.filter((pin) => activeViewAnnotationIds.pinIds.has(pin.id)) : pins, [activeViewAnnotationIds, pins]);
  const visibleGroups = useMemo(() => activeViewAnnotationIds ? groups.filter((group) => activeViewAnnotationIds.groupIds.has(group.id)) : groups, [activeViewAnnotationIds, groups]);

  async function createView(input: { name: string; kind: InvestigationBoardViewKind; description: string | null }) {
    setViewsBusy(true);
    try {
      const view = await boardViewsApi.create(campaignId, { ...input, snapshot: currentViewSnapshot });
      setViews((current) => [...current, view]);
      setActiveViewId(view.id);
      toast({ tone: 'success', title: 'Vista salva', message: 'A configuração atual foi salva sem alterar o quadro.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível salvar a vista', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setViewsBusy(false);
    }
  }

  async function updateView(view: InvestigationBoardViewItem) {
    setViewsBusy(true);
    try {
      const updated = await boardViewsApi.update(view.id, { snapshot: currentViewSnapshot });
      setViews((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast({ tone: 'success', title: 'Vista atualizada', message: 'O snapshot de navegação foi atualizado.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível atualizar a vista', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setViewsBusy(false);
    }
  }

  async function removeView(view: InvestigationBoardViewItem) {
    setViewsBusy(true);
    try {
      await boardViewsApi.remove(view.id);
      setViews((current) => current.filter((item) => item.id !== view.id));
      if (activeViewId === view.id) {
        setActiveViewId(null);
        setActiveViewAnnotationIds(null);
      }
      toast({ tone: 'success', title: 'Vista removida', message: 'A configuração foi removida; o quadro canônico permaneceu intacto.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível remover a vista', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setViewsBusy(false);
    }
  }

  async function reorderViews(viewIds: string[]) {
    setViewsBusy(true);
    try {
      const data = await boardViewsApi.reorder(campaignId, viewIds);
      setViews(data.views);
      setViewWarnings(data.warnings);
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível ordenar as vistas', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setViewsBusy(false);
    }
  }

  function restoreView(view: InvestigationBoardViewItem) {
    setPan(view.snapshot.pan);
    setZoom(view.snapshot.zoom);
    setFilters(view.snapshot.filters);
    setShowHypotheses(view.snapshot.filters.layers.hypotheses);
    setActiveViewId(view.id);
    setActiveViewAnnotationIds({ pinIds: new Set(view.snapshot.pinIds), groupIds: new Set(view.snapshot.groupIds) });
    setHighlightedFileIds(new Set());
    toast({ tone: 'info', title: `Vista restaurada: ${view.name}`, message: 'Somente a navegação local foi alterada; o quadro canônico não foi modificado.' });
  }

  useEffect(() => {
    if (!requestedViewId) return;
    const view = views.find((item) => item.id === requestedViewId);
    if (view) {
      restoreView(view);
      setShowViews(false);
    }
    // A função restaura apenas estado local e é deliberadamente estável para este pedido de abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedViewId, views]);

  useEffect(() => {
    if (!requestedHypothesisId) return;
    const hypothesis = hypotheses.find((item) => item.id === requestedHypothesisId);
    if (!hypothesis) return;
    setShowHypotheses(true);
    setFilters((current) => ({ ...current, layers: { ...current.layers, hypotheses: true, evidence: true } }));
    setHighlightedFileIds(new Set(hypothesis.evidence.map((item) => item.fileId)));
    toast({ tone: 'info', title: `Hipótese destacada: ${hypothesis.title}`, message: 'O destaque usa evidências locais e não altera a hipótese nem as relações oficiais.' });
  }, [requestedHypothesisId, hypotheses, toast]);

  useEffect(() => {
    if (selectedOfficialRelationshipId && !selectedOfficialRelationship) setSelectedOfficialRelationshipId(null);
  }, [selectedOfficialRelationship, selectedOfficialRelationshipId]);

  useEffect(() => {
    if (!selectedOfficialRelationship) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedOfficialRelationshipId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedOfficialRelationship]);

  // ---- edges ----
  function nodeCenter(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 };
  }

  function fileNodeCenter(fileId: string) {
    const node = nodes.find((item) => item.fileId === fileId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 };
  }

  function officialRelationshipGeometry(sourceId: string, targetId: string) {
    const from = fileNodeCenter(sourceId);
    const to = fileNodeCenter(targetId);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const curve = 18;
    const controlX = midX - (dy / length) * curve;
    const controlY = midY + (dx / length) * curve;
    return { labelX: (from.x + 2 * controlX + to.x) / 4, labelY: (from.y + 2 * controlY + to.y) / 4, path: `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}` };
  }

  function officialRelationshipLabel(relationship: typeof officialRelationships[number]) {
    const direction = relationship.type.directional ? '→' : '↔';
    return `${direction} ${relationship.type.name}`;
  }

  async function updateSelectedEdge(patch: Partial<Pick<BoardEdgeItem, 'label' | 'color' | 'description' | 'curve'>>) {
    if (!selectedEdge) return;
    const updated = { ...selectedEdge, ...patch };
    setSelectedEdge(updated);
    setEdges((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    await boardApi.updateEdge(updated.id, patch);
  }

  async function deleteSelectedEdge() {
    if (!selectedEdge) return;
    await boardApi.removeEdge(selectedEdge.id);
    setEdges((prev) => prev.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  }

  async function createPin(input: { text: string; x: number; y: number; color?: string }) {
    setAnnotationsBusy(true);
    try {
      const pin = await boardAnnotationsApi.createPin(campaignId, input);
      setPins((current) => [...current, pin]);
      toast({ tone: 'success', title: 'Pin criado', message: 'A anotação foi adicionada ao quadro.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível criar o pin', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setAnnotationsBusy(false);
    }
  }

  async function updatePin(id: string, input: Partial<{ text: string; x: number; y: number; color?: string }>) {
    setAnnotationsBusy(true);
    try {
      const pin = await boardAnnotationsApi.updatePin(id, input);
      setPins((current) => current.map((item) => item.id === id ? pin : item));
      toast({ tone: 'success', title: 'Pin atualizado', message: 'A anotação foi atualizada.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível atualizar o pin', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setAnnotationsBusy(false);
    }
  }

  async function removePin(id: string) {
    setAnnotationsBusy(true);
    try {
      await boardAnnotationsApi.removePin(id);
      setPins((current) => current.filter((item) => item.id !== id));
      toast({ tone: 'success', title: 'Pin removido', message: 'A anotação foi removida.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível remover o pin', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setAnnotationsBusy(false);
    }
  }

  async function createGroup(input: { name: string; color?: string; x: number; y: number; width?: number; height?: number; boardNodeIds?: string[] }) {
    setAnnotationsBusy(true);
    try {
      const group = await boardAnnotationsApi.createGroup(campaignId, input);
      setGroups((current) => [...current, group]);
      toast({ tone: 'success', title: 'Grupo criado', message: 'O agrupamento foi adicionado ao quadro.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível criar o grupo', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setAnnotationsBusy(false);
    }
  }

  async function updateGroup(id: string, input: Partial<{ name: string; color?: string; x: number; y: number; width?: number; height?: number; boardNodeIds?: string[] }>) {
    setAnnotationsBusy(true);
    try {
      const group = await boardAnnotationsApi.updateGroup(id, input);
      setGroups((current) => current.map((item) => item.id === id ? group : item));
      toast({ tone: 'success', title: 'Grupo atualizado', message: 'O agrupamento foi atualizado.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível atualizar o grupo', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setAnnotationsBusy(false);
    }
  }

  async function removeGroup(id: string) {
    setAnnotationsBusy(true);
    try {
      await boardAnnotationsApi.removeGroup(id);
      setGroups((current) => current.filter((item) => item.id !== id));
      toast({ tone: 'success', title: 'Grupo removido', message: 'O agrupamento foi removido.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível remover o grupo', message: error instanceof Error ? error.message : 'Tente novamente.' });
      throw error;
    } finally {
      setAnnotationsBusy(false);
    }
  }

  function edgeGeometry(edge: BoardEdgeItem) {
    const from = nodeCenter(edge.fromNodeId);
    const to = nodeCenter(edge.toNodeId);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const curve = edge.curve ?? 0;
    const controlX = midX - (dy / length) * curve;
    const controlY = midY + (dx / length) * curve;
    return { from, to, controlX, controlY, labelX: (from.x + 2 * controlX + to.x) / 4, labelY: (from.y + 2 * controlY + to.y) / 4, path: `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}` };
  }

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Campanha', href: `/campaigns/${campaignId}` }, { label: 'Quadro de Investigação' }]} />
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Quadro de Investigação</h1>
        <div className={styles.toolbarRight}>
          <button
            className={`${styles.toolButton} ${connectMode ? styles.toolButtonActive : ''}`}
            onClick={() => {
              if (layoutPreview) return;
              setConnectMode((v) => !v);
              setConnectSourceId(null);
            }}
            disabled={Boolean(layoutPreview)}
          >
            <Link2 size={13} />
            {connectMode ? 'Conectando...' : 'Conectar'}
          </button>
          <button className={styles.toolButton} onClick={() => setShowAddModal(true)} disabled={Boolean(layoutPreview)}>
            <Plus size={13} />
            Adicionar
          </button>
          <button className={`${styles.toolButton} ${showFilters ? styles.toolButtonActive : ''}`} onClick={() => setShowFilters((value) => !value)} aria-pressed={showFilters} aria-label="Mostrar filtros e camadas">
            <SlidersHorizontal size={13} />
            Filtros
          </button>
          <button className={`${styles.toolButton} ${showHypotheses ? styles.toolButtonActive : ''}`} onClick={() => setShowHypotheses((value) => { const next = !value; setFilters((current) => ({ ...current, layers: { ...current.layers, hypotheses: next } })); if (!next) setHighlightedFileIds(new Set()); return next; })} aria-pressed={showHypotheses}>
            <Lightbulb size={13} />
            Hipóteses
          </button>
          <button className={`${styles.toolButton} ${showAnnotations ? styles.toolButtonActive : ''}`} onClick={() => setShowAnnotations((value) => { const next = !value; if (next) { setShowViews(false); setShowLayoutPaths(false); } return next; })} aria-pressed={showAnnotations} aria-label="Mostrar pins e agrupamentos">
            <Layers3 size={13} />
            Anotações
          </button>
          <button className={`${styles.toolButton} ${showViews ? styles.toolButtonActive : ''}`} onClick={() => setShowViews((value) => { const next = !value; if (next) { setShowLayoutPaths(false); setShowAnnotations(false); } return next; })} aria-pressed={showViews} aria-label="Mostrar vistas salvas">
            <Bookmark size={13} />
            Vistas{activeViewId ? ' · ativa' : ''}
          </button>
          <button className={`${styles.toolButton} ${showLayoutPaths ? styles.toolButtonActive : ''}`} onClick={() => setShowLayoutPaths((value) => { const next = !value; if (next) { setShowViews(false); setShowAnnotations(false); } return next; })} aria-pressed={showLayoutPaths} aria-label="Mostrar auto-layout e caminhos">
            <Wand2 size={13} />
            Layout
          </button>
          <button className={styles.toolButton} onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} aria-label="Diminuir zoom">
            <ZoomOut size={13} />
          </button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button className={styles.toolButton} onClick={() => setZoom((z) => Math.min(2, z + 0.1))} aria-label="Aumentar zoom">
            <ZoomIn size={13} />
          </button>
          <button className={styles.toolButton} onClick={resetView} aria-label="Centralizar">
            <Maximize size={13} />
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className={`${styles.canvasWrap} ${panState.current.panning ? styles.canvasWrapPanning : ''} ${connectMode ? styles.canvasWrapConnecting : ''}`}
        onMouseDown={onWrapMouseDown}
        onWheel={onWheel}
      >
        {nodes.length === 0 ? (
          <div className={styles.emptyHint} role="status">
            Arraste arquivos para cá — clique em &quot;Adicionar&quot; para escolher o primeiro.
          </div>
        ) : !filters.layers.files ? (
          <div className={styles.emptyHint} role="status">
            A camada de fichas está desligada. Ative-a em &quot;Camadas visuais&quot; para voltar a ver os nós.
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className={styles.emptyHint} role="status">
            Nenhuma ficha corresponde aos filtros atuais. <button type="button" className={styles.emptyAction} onClick={resetFilters}>Limpar filtros</button>
          </div>
        ) : null}

        <div className={styles.world} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          {filters.layers.annotations && visibleGroups.map((group) => <div key={group.id} className={styles.boardGroup} style={{ left: group.x, top: group.y, width: group.width, height: group.height, color: group.color, borderColor: group.color, backgroundColor: `${group.color}18` }} role="note" aria-label={`Agrupamento ${group.name}, ${group.items.length} fichas`}><strong>{group.name}</strong><small>{group.items.length} ficha{group.items.length === 1 ? '' : 's'}</small></div>)}
          {filters.layers.annotations && visiblePins.map((pin) => <div key={pin.id} className={styles.boardPin} style={{ left: pin.x, top: pin.y, background: pin.color }} role="note" aria-label={`Pin: ${pin.text}`} title={pin.text}><span>•</span></div>)}
          <svg className={styles.svgLayer} viewBox="-4000 -4000 8000 8000" preserveAspectRatio="none" aria-label="Ligações do quadro de investigação">
            <defs>
              <marker id="board-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
              </marker>
              <marker id="official-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8" fill="none" stroke="context-stroke" strokeWidth="1.2" />
              </marker>
            </defs>
            {visiblePathSegments.map((segment) => {
              const geometry = officialRelationshipGeometry(segment.fromFileId, segment.toFileId);
              const isOfficial = segment.source === 'RELATIONSHIP';
              return <g key={`path-${segment.key}`} className={isOfficial ? styles.pathSegmentOfficial : styles.pathSegmentEvidence} aria-label={`${isOfficial ? 'Caminho por relação oficial' : 'Caminho por evidência de hipótese'}: ${segment.label}`}>
                <title>{isOfficial ? 'Relação oficial no caminho' : 'Evidência de hipótese no caminho — não é relação oficial'}</title>
                <path className={styles.pathHitArea} d={geometry.path} fill="none" stroke="transparent" strokeWidth={22} />
                <path className={styles.pathSegmentLine} d={geometry.path} fill="none" markerEnd={isOfficial ? 'url(#official-arrow)' : undefined} />
                <text className={styles.pathSegmentLabel} x={geometry.labelX} y={geometry.labelY - 12} textAnchor="middle">{isOfficial ? 'oficial' : 'evidência'}</text>
              </g>;
            })}
            {filteredEdges.map((edge) => {
              const geometry = edgeGeometry(edge);
              return (
                  <g key={edge.id}>
                    <title>{edge.label || 'Conexão do quadro de investigação'}</title>
                    <path
                    className={styles.edgeHitArea}
                    d={geometry.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(edge);
                    }}
                  />
                  <path
                    className={styles.edgeLine}
                    d={geometry.path}
                    fill="none"
                    stroke={edge.color || '#c8a66a'}
                          markerEnd="url(#board-arrow)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(edge);
                    }}
                  />
                  <text className={styles.edgeLabel} x={geometry.labelX} y={geometry.labelY - 7} textAnchor="middle">
                    {edge.label || 'Conexão'}
                  </text>
                </g>
              );
            })}
            {filters.layers.officialRelationships && filteredOfficialRelationships.map((relationship) => {
              const geometry = officialRelationshipGeometry(relationship.sourceId, relationship.targetId);
              const relationLabel = officialRelationshipLabel(relationship);
              const selected = selectedOfficialRelationshipId === relationship.id;
              const color = relationship.type.color ?? '#86aaa2';
              const sourceNode = nodes.find((node) => node.fileId === relationship.sourceId);
              const targetNode = nodes.find((node) => node.fileId === relationship.targetId);
              if (!sourceNode || !targetNode) return null;
              return (
                <g key={`official-${relationship.id}`} className={`${styles.officialRelationship} ${selected ? styles.officialRelationshipSelected : ''}`} role="button" tabIndex={0} aria-label={`Relação oficial ${relationLabel} entre ${sourceNode.file.name} e ${targetNode.file.name}`} onClick={(event) => { event.stopPropagation(); setSelectedOfficialRelationshipId(relationship.id); }} onKeyDown={(event) => { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); event.stopPropagation(); setSelectedOfficialRelationshipId(relationship.id); }}>
                  <title>Relação oficial: {relationLabel}. Importância {OFFICIAL_IMPORTANCE_LABELS[relationship.importance]}. Visibilidade {OFFICIAL_VISIBILITY_LABELS[relationship.visibility]}.</title>
                  <path className={styles.officialRelationshipHitArea} d={geometry.path} fill="none" stroke="transparent" strokeWidth={18} />
                  <path className={styles.officialRelationshipLine} d={geometry.path} fill="none" stroke={color} markerEnd={relationship.type.directional ? 'url(#official-arrow)' : undefined} strokeDasharray="8 5" />
                  <text className={styles.officialRelationshipLabel} x={geometry.labelX} y={geometry.labelY + 13} textAnchor="middle" fill={color}>{relationLabel}</text>
                </g>
              );
            })}

          </svg>

          {filters.layers.files && filteredNodes.map((node) => (
            <div
              key={node.id}
              className={`${styles.node} ${connectSourceId === node.id ? styles.nodeConnectSource : ''} ${highlightedFileIds.has(node.fileId) ? styles.nodeHighlighted : ''}`}
              style={{ left: node.x, top: node.y }}
              role="button"
              tabIndex={0}
              aria-label={`${node.file.name}. ${connectMode ? 'Selecione para criar uma conexão.' : 'Pressione Enter para abrir o arquivo.'}`}
              aria-pressed={connectSourceId === node.id}
              onMouseDown={(e) => onNodeMouseDown(node, e)}
              onClick={(e) => onNodeClick(node, e)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                if (!connectMode) {
                  router.push(`/campaigns/${campaignId}/arquivos/${node.fileId}` as never);
                  return;
                }
                if (!connectSourceId) {
                  setConnectSourceId(node.id);
                  return;
                }
                if (connectSourceId === node.id) {
                  setConnectSourceId(null);
                  return;
                }
                boardApi.createEdge({ campaignId, fromNodeId: connectSourceId, toNodeId: node.id, color: EDGE_COLORS[3] }).then((edge) => {
                  setEdges((prev) => [...prev, edge]);
                  setConnectSourceId(null);
                  toast({ tone: 'success', title: 'Conexão criada', message: 'O fio foi adicionado ao quadro.' });
                }).catch((error) => toast({ tone: 'error', title: 'Não foi possível conectar', message: error instanceof Error ? error.message : 'Tente novamente.' }));
              }}
              onDoubleClick={() => !connectMode && router.push(`/campaigns/${campaignId}/arquivos/${node.fileId}` as never)}
            >
              <div className={styles.nodeHeader}>
                <FileTypeIcon type={node.file.type} size={13} />
                <span className={styles.nodeType}>{FILE_TYPE_LABELS[node.file.type]}</span>
              </div>
              <div className={styles.nodeName}>{node.file.name}</div>
              <button
                className={styles.nodeRemove}
                onClick={(e) => {
                  e.stopPropagation();
                  void removeNode(node.id);
                }}
                disabled={Boolean(layoutPreview)}
                aria-label="Remover do quadro"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {showFilters && (
          <InvestigationFiltersPanel
            filters={filters}
            files={allFiles}
            tags={availableTags}
            visibleNodeCount={visibleNodeFileIds.size}
            officialRelationshipCount={officialRelationships.length}
            filteredOfficialRelationshipCount={filteredOfficialRelationships.length}
            onChange={updateFilters}
            onReset={resetFilters}
          />
        )}

        {showAnnotations && (
          <BoardAnnotationsPanel
            pins={pins}
            groups={groups}
            nodes={nodes}
            busy={annotationsBusy}
            onCreatePin={createPin}
            onUpdatePin={updatePin}
            onRemovePin={removePin}
            onCreateGroup={createGroup}
            onUpdateGroup={updateGroup}
            onRemoveGroup={removeGroup}
          />
        )}

        {showLayoutPaths && (
          <BoardLayoutPathsPanel
            nodes={nodes}
            files={allFiles}
            hypotheses={hypotheses}
            preview={layoutPreview}
            layoutBusy={layoutBusy}
            layoutError={layoutError}
            pathMode={pathMode}
            sourceFileId={pathSourceId}
            targetFileId={pathTargetId}
            hypothesisId={pathHypothesisId}
            pathResult={pathResult}
            selectedPathIndex={selectedPathIndex}
            onPreviewLayout={previewAutoLayout}
            onCancelLayout={cancelAutoLayout}
            onConfirmLayout={() => void confirmAutoLayout()}
            onPathModeChange={(mode) => { setPathMode(mode); setSelectedPathIndex(0); setPathResult(null); }}
            onSourceChange={(fileId) => { setPathSourceId(fileId); setSelectedPathIndex(0); setPathResult(null); }}
            onTargetChange={(fileId) => { setPathTargetId(fileId); setSelectedPathIndex(0); setPathResult(null); }}
            onHypothesisChange={(hypothesisId) => { setPathHypothesisId(hypothesisId); setSelectedPathIndex(0); setPathResult(null); }}
            onFindPath={findPath}
            onSelectPath={(pathIndex) => setSelectedPathIndex(pathIndex)}
            onClose={() => setShowLayoutPaths(false)}
          />
        )}

        {showViews && (
          <BoardViewsPanel
            views={views}
            warnings={viewWarnings}
            busy={viewsBusy}
            currentSnapshot={currentViewSnapshot}
            onCreate={createView}
            onUpdateCurrent={updateView}
            onRemove={removeView}
            onReorder={reorderViews}
            onRestore={restoreView}
          />
        )}

        {showHypotheses && (
          <HypothesesPanel
            campaignId={campaignId}
            boardFileIds={boardFileIds}
            statusFilter={filters.hypothesisStatus}
            evidenceStanceFilter={filters.evidenceStance}
            onStatusFilterChange={(value) => setFilters((current) => ({ ...current, hypothesisStatus: value }))}
            onEvidenceStanceFilterChange={(value) => setFilters((current) => ({ ...current, evidenceStance: value }))}
            onFocusFile={focusFile}
            onAddToBoard={addEvidenceToBoard}
            onHighlightFiles={highlightHypothesisFiles}
          />
        )}

        {selectedOfficialRelationship && (
          <aside className={styles.officialRelationshipPanel} tabIndex={-1} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') setSelectedOfficialRelationshipId(null); }} aria-label="Detalhes da relação oficial">
            <div className={styles.officialRelationshipPanelTitle}><div><span className={styles.officialRelationshipEyebrow}><ArrowLeftRight size={13} /> Relação oficial</span><strong>{officialRelationshipLabel(selectedOfficialRelationship)}</strong></div><button type="button" className={styles.officialRelationshipClose} onClick={() => setSelectedOfficialRelationshipId(null)} aria-label="Fechar detalhes da relação oficial">×</button></div>
            <dl className={styles.officialRelationshipDetails}>
              <div><dt>Origem</dt><dd>{nodes.find((node) => node.fileId === selectedOfficialRelationship.sourceId)?.file.name ?? 'Fora do canvas'}</dd></div>
              <div><dt>Destino</dt><dd>{nodes.find((node) => node.fileId === selectedOfficialRelationship.targetId)?.file.name ?? 'Fora do canvas'}</dd></div>
              <div><dt>Tipo</dt><dd>{selectedOfficialRelationship.type.name}</dd></div>
              <div><dt>Importância</dt><dd>{OFFICIAL_IMPORTANCE_LABELS[selectedOfficialRelationship.importance]}</dd></div>
              <div><dt>Visibilidade</dt><dd>{OFFICIAL_VISIBILITY_LABELS[selectedOfficialRelationship.visibility]}</dd></div>
              {selectedOfficialRelationship.label && <div><dt>Rótulo</dt><dd>{selectedOfficialRelationship.label}</dd></div>}
              {selectedOfficialRelationship.description && <div><dt>Descrição</dt><dd>{selectedOfficialRelationship.description}</dd></div>}
            </dl>
            <div className={styles.officialRelationshipActions}>
              <button type="button" onClick={() => router.push(`/campaigns/${campaignId}/arquivos/${selectedOfficialRelationship.sourceId}` as never)}><ExternalLink size={13} /> Abrir origem</button>
              <button type="button" onClick={() => router.push(`/campaigns/${campaignId}/arquivos/${selectedOfficialRelationship.targetId}` as never)}><ExternalLink size={13} /> Abrir destino</button>
            </div>
            <p className={styles.officialRelationshipReadonly}>Somente leitura nesta camada; a relação oficial não é editável pelo overlay.</p>
          </aside>
        )}

        {selectedEdge && (
          <div className={styles.edgePanel} tabIndex={-1} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') setSelectedEdge(null); if (event.key === 'Delete') void deleteSelectedEdge(); }}>
            <div className={styles.edgePanelTitle}>Conexão <span className={styles.edgeKeyboardHint}>Esc fecha · Delete exclui</span></div>
            <div className={styles.edgePanelField}>
              <label className={styles.edgePanelLabel}>Nome</label>
              <input
                className={styles.edgeInput}
                value={selectedEdge.label ?? ''}
                onChange={(e) => updateSelectedEdge({ label: e.target.value })}
              />
            </div>
            <div className={styles.edgePanelField}>
              <label className={styles.edgePanelLabel}>Cor</label>
              <div className={styles.edgeColorRow}>
                {EDGE_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`${styles.edgeColorSwatch} ${selectedEdge.color === color ? styles.edgeColorSwatchActive : ''}`}
                    style={{ background: color }}
                    onClick={() => updateSelectedEdge({ color })}
                    aria-label={`Cor ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className={styles.edgePanelField}>
              <label className={styles.edgePanelLabel}>Curvatura <output>{selectedEdge.curve ?? 0}</output></label>
              <input className={styles.edgeRange} type="range" min={-180} max={180} step={5} value={selectedEdge.curve ?? 0} onChange={(e) => updateSelectedEdge({ curve: Number(e.target.value) })} aria-label="Curvatura da conexão" />
            </div>
            <div className={styles.edgePanelField}>
              <label className={styles.edgePanelLabel}>Descrição</label>
              <textarea
                className={styles.edgeTextarea}
                value={selectedEdge.description ?? ''}
                onChange={(e) => updateSelectedEdge({ description: e.target.value })}
              />
            </div>
            <div className={styles.edgePanelActions}>
              <button className={styles.edgeDeleteButton} onClick={deleteSelectedEdge}>
                Excluir conexão
              </button>
              <button className={styles.edgeCloseButton} onClick={() => setSelectedEdge(null)}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddToBoardModal
          campaignId={campaignId}
          excludeFileIds={[...boardFileIds]}
          onClose={() => setShowAddModal(false)}
          onPick={handlePickFile}
        />
      )}
    </div>
  );
}
