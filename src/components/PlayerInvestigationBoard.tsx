'use client';
/* eslint-disable @next/next/no-img-element -- anexos podem ser URLs externas ou data URLs de upload. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Maximize, X, ZoomIn, ZoomOut } from 'lucide-react';
import { boardApi } from '@/lib/api';
import type { BoardEdgeItem, BoardNodeItem } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './PlayerInvestigationBoard.module.css';

const NODE_WIDTH = 150;
const NODE_HEIGHT = 54;

type Props = { campaignId: string };

export function PlayerInvestigationBoard({ campaignId }: Props) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<BoardNodeItem['file'] | null>(null);
  const [nodes, setNodes] = useState<BoardNodeItem[]>([]);
  const [edges, setEdges] = useState<BoardEdgeItem[]>([]);
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const load = useCallback(async () => {
    try {
      const board = await boardApi.get(campaignId);
      setNodes(board.nodes);
      setEdges(board.edges);
    } catch (error) {
      toast({ tone: 'error', title: 'Quadro indisponível', message: error instanceof Error ? error.message : 'Não foi possível carregar o quadro.' });
    } finally {
      setLoading(false);
    }
  }, [campaignId, toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selectedFile) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') setSelectedFile(null); }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedFile]);

  const onMove = useCallback((event: MouseEvent) => {
    if (!panState.current.active) return;
    setPan({ x: panState.current.originX + event.clientX - panState.current.startX, y: panState.current.originY + event.clientY - panState.current.startY });
  }, []);
  const onUp = useCallback(() => { panState.current.active = false; }, []);
  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onMove, onUp]);

  function onMouseDown(event: React.MouseEvent) {
    if (event.button !== 0 || event.target !== wrapRef.current) return;
    panState.current = { active: true, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
  }

  function nodeCenter(nodeId: string) {
    const node = nodes.find((item) => item.id === nodeId);
    return node ? { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 } : { x: 0, y: 0 };
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

  function resetView() { setPan({ x: 60, y: 40 }); setZoom(1); }

  if (loading) return <main className={styles.page}><div className={styles.loading}>Carregando o quadro compartilhado...</div></main>;

  return <main className={styles.page}>
    <header className={styles.header}><div><div className={styles.eyebrow}>Área do jogador · leitura compartilhada</div><h1>Quadro de Investigação</h1><p>Conexões liberadas pelo Mestre para orientar sua investigação. Arraste o espaço para navegar e clique em um cartão para abrir o conteúdo.</p></div><div className={styles.headerBadge}><BookOpen size={14} /> Somente leitura</div></header>
    <div className={styles.toolbar}><span>{nodes.length} pistas visíveis · {edges.length} conexões</span><div className={styles.toolbarActions}><button type="button" onClick={() => setZoom((value) => Math.max(.3, value - .1))} aria-label="Diminuir zoom"><ZoomOut size={14} /></button><strong>{Math.round(zoom * 100)}%</strong><button type="button" onClick={() => setZoom((value) => Math.min(2, value + .1))} aria-label="Aumentar zoom"><ZoomIn size={14} /></button><button type="button" onClick={resetView} aria-label="Centralizar quadro"><Maximize size={14} /></button></div></div>
    <div ref={wrapRef} className={styles.canvas} onMouseDown={onMouseDown} onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.min(2, Math.max(.3, value - event.deltaY * .001))); }}>
      {nodes.length === 0 && <div className={styles.empty}>O Mestre ainda não publicou pistas no quadro.</div>}
      <div className={styles.world} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg className={styles.svg} viewBox="-4000 -4000 8000 8000" preserveAspectRatio="none" aria-label="Conexões publicadas do quadro">
          <defs><marker id="player-board-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke" /></marker></defs>
          {edges.map((edge) => { const geometry = edgeGeometry(edge); return <g key={edge.id}><title>{edge.label || 'Conexão publicada'}</title><path d={geometry.path} className={styles.edge} fill="none" stroke={edge.color || '#c8a66a'} markerEnd="url(#player-board-arrow)" /><text className={styles.edgeLabel} x={geometry.labelX} y={geometry.labelY - 7} textAnchor="middle">{edge.label || 'Conexão'}</text></g>; })}
        </svg>
        {nodes.map((node) => <button type="button" key={node.id} className={styles.node} style={{ left: node.x, top: node.y }} onClick={() => setSelectedFile(node.file)}><span className={styles.nodeHeader}><FileTypeIcon type={node.file.type} size={13} /><small>{FILE_TYPE_LABELS[node.file.type]}</small></span><strong>{node.file.name}</strong></button>)}
      </div>
    </div>
    {selectedFile && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedFile(null); }}><article className={styles.modal} role="dialog" aria-modal="true" aria-label={`Informações de ${selectedFile.name}`}><button type="button" className={styles.modalClose} onClick={() => setSelectedFile(null)} aria-label="Fechar informações"><X size={17} /></button><div className={styles.modalMeta}><FileTypeIcon type={selectedFile.type} size={14} /> {FILE_TYPE_LABELS[selectedFile.type]}</div><h2>{selectedFile.name}</h2>{selectedFile.description && <p className={styles.modalDescription}>{selectedFile.description}</p>}{(selectedFile.tags ?? []).length > 0 && <div className={styles.modalTags}>{selectedFile.tags?.map(({ tag }) => <span key={tag.id} style={{ borderColor: tag.color, color: tag.color }}>#{tag.name}</span>)}</div>}{(selectedFile.attachments ?? []).filter((attachment) => attachment.mimeType?.startsWith('image/') || /^(?:data:image\/|.*\.(png|jpe?g|gif|webp|svg)(?:\?|$))/i.test(attachment.url)).map((attachment) => <img key={attachment.id} className={styles.modalImage} src={attachment.url} alt={attachment.label ?? selectedFile.name} />)}<div className={styles.modalDivider} />{selectedFile.content ? <div className={styles.modalContent}>{selectedFile.content}</div> : <p className={styles.modalEmpty}>Este arquivo não possui texto adicional.</p>}</article></div>}
  </main>;
}
