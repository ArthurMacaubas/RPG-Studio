'use client';
/* eslint-disable @next/next/no-img-element -- private map media is served through the authenticated application route. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Crosshair, Edit3, Layers3, LoaderCircle, LocateFixed, Maximize2, Minus, Plus, RotateCcw, Save, X } from 'lucide-react';
import { filesApi } from '@/lib/api';
import type { CampaignFile } from '@/types';
import { MediaPicker } from './MediaPicker';
import styles from './MapStudio.module.css';

type MapLayer = { id: string; name: string; visible: boolean; opacity: number; access?: 'PRIVATE' | 'PUBLISHED' };
type MapMarker = { id: string; name: string; description?: string; category?: string; color?: string; icon?: string; x: number; y: number; layerId?: string; relatedFileId?: string; relatedMapId?: string; visibility?: 'PRIVATE' | 'PUBLISHED' };
type MapPoint = { x: number; y: number };
type MapGeometry = { id: string; type: 'LINE' | 'POLYGON' | 'CIRCLE'; name: string; description?: string; color?: string; opacity?: number; strokeWidth?: number; layerId?: string; visibility?: 'PRIVATE' | 'PUBLISHED'; points: MapPoint[] };
type MapData = { layers?: MapLayer[]; markers?: MapMarker[]; geometries?: MapGeometry[] };

function parseMapData(data: Record<string, unknown>): Required<MapData> {
  const map = (data.map && typeof data.map === 'object' ? data.map : {}) as MapData;
  return {
    layers: Array.isArray(map.layers) && map.layers.length ? map.layers.map((layer) => ({ ...layer, visible: layer.visible !== false, opacity: typeof layer.opacity === 'number' ? layer.opacity : 1, access: layer.access || 'PUBLISHED' })) : [{ id: 'base', name: 'Pontos de interesse', visible: true, opacity: 1, access: 'PUBLISHED' }],
    markers: Array.isArray(map.markers) ? map.markers.filter((marker): marker is MapMarker => Boolean(marker && typeof marker.x === 'number' && typeof marker.y === 'number')).map((marker) => ({ ...marker, color: marker.color || '#c8a66a', visibility: marker.visibility || 'PRIVATE' })) : [],
    geometries: Array.isArray(map.geometries) ? map.geometries.filter((geometry): geometry is MapGeometry => Boolean(geometry && ['LINE', 'POLYGON', 'CIRCLE'].includes(geometry.type) && Array.isArray(geometry.points) && geometry.points.every((point) => typeof point?.x === 'number' && typeof point?.y === 'number'))).map((geometry) => ({ ...geometry, color: geometry.color || '#c8a66a', opacity: typeof geometry.opacity === 'number' ? geometry.opacity : .65, strokeWidth: typeof geometry.strokeWidth === 'number' ? geometry.strokeWidth : 2, visibility: geometry.visibility || 'PRIVATE' })) : []
  };
}

function createId() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `map-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function MapStudio({ campaignId, fileId, editable }: { campaignId: string; fileId: string; editable: boolean }) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const markerDragRef = useRef<string | null>(null);
  const dataRef = useRef<Required<MapData> | null>(null);
  const saveChainRef = useRef(Promise.resolve());
  const [file, setFile] = useState<CampaignFile | null>(null);
  const [data, setData] = useState<Required<MapData> | null>(null);
  const [targets, setTargets] = useState<CampaignFile[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState<'MARKER' | MapGeometry['type']>('MARKER');
  const [draftGeometry, setDraftGeometry] = useState<{ type: MapGeometry['type']; points: MapPoint[] } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const viewportStorageKey = `rpg-studio:map-view:${campaignId}:${fileId}`;

  const load = useCallback(async () => {
    const [result, campaignFiles] = await Promise.all([filesApi.get(fileId), filesApi.list(campaignId, { scope: 'active', sort: 'name', direction: 'asc' })]);
    const mapData = parseMapData(result.data);
    setFile(result); setData(mapData); dataRef.current = mapData; setTargets(campaignFiles.filter((candidate) => candidate.id !== fileId));
  }, [campaignId, fileId]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    try {
      const value = JSON.parse(window.sessionStorage.getItem(viewportStorageKey) ?? 'null') as { zoom?: unknown; pan?: { x?: unknown; y?: unknown } } | null;
      if (value && typeof value.zoom === 'number' && value.pan && typeof value.pan.x === 'number' && typeof value.pan.y === 'number') {
        setZoom(Math.max(.5, Math.min(3, value.zoom)));
        setPan({ x: value.pan.x, y: value.pan.y });
      }
    } catch { /* session storage is optional for map navigation */ }
  }, [viewportStorageKey]);

  useEffect(() => {
    if (!file) return;
    try { window.sessionStorage.setItem(viewportStorageKey, JSON.stringify({ zoom, pan })); } catch { /* navigation remains functional without storage */ }
  }, [file, pan, viewportStorageKey, zoom]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setViewport({ width: stage.clientWidth, height: stage.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [file?.id]);

  const mapAsset = file?.mediaReferences?.find((reference) => reference.purpose === 'MAP')?.asset;
  const selected = data?.markers.find((marker) => marker.id === selectedId) ?? null;
  const selectedGeometry = data?.geometries.find((geometry) => geometry.id === selectedGeometryId) ?? null;
  const visibleLayers = useMemo(() => new Set((data?.layers ?? []).filter((layer) => layer.visible).map((layer) => layer.id)), [data]);
  const layerOpacities = useMemo(() => new Map((data?.layers ?? []).map((layer) => [layer.id, layer.opacity])), [data]);
  const imageBox = useMemo(() => {
    if (!imageRatio || !viewport.width || !viewport.height) return { left: 0, top: 0, width: 100, height: 100 };
    const viewportRatio = viewport.width / viewport.height;
    if (viewportRatio > imageRatio) {
      const width = (imageRatio / viewportRatio) * 100;
      return { left: (100 - width) / 2, top: 0, width, height: 100 };
    }
    const height = (viewportRatio / imageRatio) * 100;
    return { left: 0, top: (100 - height) / 2, width: 100, height };
  }, [imageRatio, viewport]);

  function persist(next: Required<MapData>) {
    if (!file) return;
    dataRef.current = next; setData(next); setSaving(true);
    const write = saveChainRef.current.catch(() => undefined).then(async () => {
      const updated = await filesApi.update(file.id, { data: { ...file.data, map: next } });
      setFile((current) => current ? { ...current, ...updated } : updated);
    });
    saveChainRef.current = write;
    void write.catch(() => undefined).finally(() => { if (saveChainRef.current === write) setSaving(false); });
  }

  function setMarkers(transform: (markers: MapMarker[]) => MapMarker[]) {
    const current = dataRef.current;
    if (!current) return;
    void persist({ ...current, markers: transform(current.markers) });
  }
  function setLayers(transform: (layers: MapLayer[]) => MapLayer[]) {
    if (!editable) return setLocalLayers(transform);
    const current = dataRef.current;
    if (!current) return;
    void persist({ ...current, layers: transform(current.layers) });
  }
  function setLocalLayers(transform: (layers: MapLayer[]) => MapLayer[]) {
    const current = dataRef.current;
    if (!current) return;
    const next = { ...current, layers: transform(current.layers) };
    dataRef.current = next; setData(next);
  }
  function setGeometries(transform: (geometries: MapGeometry[]) => MapGeometry[]) {
    const current = dataRef.current;
    if (!current) return;
    void persist({ ...current, geometries: transform(current.geometries) });
  }

  function pointFromEvent(event: { clientX: number; clientY: number }) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const localX = ((event.clientX - rect.left - pan.x - rect.width / 2) / zoom) + rect.width / 2;
    const localY = ((event.clientY - rect.top - pan.y - rect.height / 2) / zoom) + rect.height / 2;
    const canvasX = (localX / rect.width) * 100;
    const canvasY = (localY / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, (canvasX - imageBox.left) / imageBox.width * 100)), y: Math.max(0, Math.min(100, (canvasY - imageBox.top) / imageBox.height * 100)) };
  }

  function projectPoint(point: MapPoint) {
    return { x: imageBox.left + imageBox.width * point.x / 100, y: imageBox.top + imageBox.height * point.y / 100 };
  }

  function finishGeometry() {
    const current = dataRef.current;
    if (!current || !draftGeometry || draftGeometry.points.length < (draftGeometry.type === 'POLYGON' ? 3 : 2)) return;
    const geometry: MapGeometry = { id: createId(), type: draftGeometry.type, name: draftGeometry.type === 'LINE' ? 'Nova rota' : 'Nova região', points: draftGeometry.points, color: '#c8a66a', opacity: draftGeometry.type === 'POLYGON' ? .3 : .7, strokeWidth: 2, layerId: current.layers[0]?.id, visibility: 'PRIVATE' };
    void persist({ ...current, geometries: [...current.geometries, geometry] });
    setSelectedGeometryId(geometry.id); setDraftGeometry(null);
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (event.target instanceof SVGElement) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (markerDragRef.current && editable) {
      const point = pointFromEvent(event);
      const current = dataRef.current;
      if (!point || !current) return;
      const next = { ...current, markers: current.markers.map((marker) => marker.id === markerDragRef.current ? { ...marker, ...point } : marker) };
      dataRef.current = next; setData(next);
      return;
    }
    const drag = dragRef.current; if (!drag) return;
    const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    setPan({ x: drag.panX + dx, y: drag.panY + dy });
  }
  function pointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (markerDragRef.current) {
      markerDragRef.current = null;
      if (dataRef.current) void persist(dataRef.current);
      return;
    }
    const drag = dragRef.current; dragRef.current = null;
    if (!drag || drag.moved || !editing || !data || !stageRef.current) return;
    const point = pointFromEvent(event); if (!point) return;
    if (tool !== 'MARKER') {
      const draft = draftGeometry?.type === tool ? draftGeometry : { type: tool, points: [] };
      const points = [...draft.points, point];
      if (tool === 'CIRCLE' && points.length === 2) {
        const geometry: MapGeometry = { id: createId(), type: tool, name: 'Nova área circular', points, color: '#c8a66a', opacity: .3, strokeWidth: 2, layerId: data.layers[0]?.id, visibility: 'PRIVATE' };
        void persist({ ...dataRef.current!, geometries: [...dataRef.current!.geometries, geometry] });
        setSelectedGeometryId(geometry.id); setDraftGeometry(null);
      } else setDraftGeometry({ type: tool, points });
      return;
    }
    const marker: MapMarker = { id: createId(), name: 'Novo marcador', ...point, layerId: data.layers[0]?.id, color: '#c8a66a', visibility: 'PRIVATE' };
    void persist({ ...data, markers: [...data.markers, marker] }); setSelectedId(marker.id);
  }

  if (!file || !data) return <div className={styles.loading}><LoaderCircle size={20} />Carregando mapa…</div>;
  return <div className={styles.page}>
    <header className={styles.header}><div><span>Mapa da campanha</span><h1>{file.name}</h1>{file.description && <p>{file.description}</p>}</div><div className={styles.headerActions}><button type="button" onClick={() => router.back()}><ArrowLeft size={14} />Voltar</button>{editable && <button type="button" className={editing ? styles.activeAction : ''} onClick={() => { setEditing((value) => !value); setDraftGeometry(null); }}><Edit3 size={14} />{editing ? 'Encerrar edição' : 'Editar mapa'}</button>}{editable && editing && <select className={styles.toolSelect} value={tool} onChange={(event) => { setTool(event.target.value as typeof tool); setDraftGeometry(null); }} aria-label="Ferramenta de desenho"><option value="MARKER">Marcador</option><option value="LINE">Linha ou rota</option><option value="POLYGON">Região</option><option value="CIRCLE">Círculo</option></select>}{draftGeometry && <button type="button" onClick={finishGeometry} disabled={draftGeometry.points.length < (draftGeometry.type === 'POLYGON' ? 3 : 2)}>Concluir desenho</button>}<button type="button" onClick={() => stageRef.current?.requestFullscreen?.()}><Maximize2 size={14} />Tela cheia</button></div></header>
    {!mapAsset && <div className={styles.emptyMap}><strong>Este mapa ainda não possui imagem.</strong>{editable ? <MediaPicker campaignId={campaignId} fileId={fileId} purpose="MAP" replace triggerLabel="Selecionar imagem do mapa" onSelect={() => void load()} /> : <span>O mestre ainda não publicou uma imagem para este mapa.</span>}</div>}
    {mapAsset && <div className={styles.workspace}>
      <aside className={styles.panel}><div className={styles.panelTitle}><Layers3 size={15} />Camadas</div>{data.layers.map((layer, index) => <div className={styles.layer} key={layer.id}><label><input type="checkbox" checked={layer.visible} onChange={(event) => setLayers((layers) => layers.map((value) => value.id === layer.id ? { ...value, visible: event.target.checked } : value))} />{layer.name}</label>{editable && <><input className={styles.layerInput} aria-label={`Nome da camada ${index + 1}`} value={layer.name} onChange={(event) => setLayers((layers) => layers.map((value) => value.id === layer.id ? { ...value, name: event.target.value } : value))} /><label className={styles.layerSetting}>Opacidade<input type="range" min="0" max="1" step="0.05" value={layer.opacity} onChange={(event) => setLayers((layers) => layers.map((value) => value.id === layer.id ? { ...value, opacity: Number(event.target.value) } : value))} /></label><label className={styles.layerSetting}>Acesso<select value={layer.access} onChange={(event) => setLayers((layers) => layers.map((value) => value.id === layer.id ? { ...value, access: event.target.value as 'PRIVATE' | 'PUBLISHED' } : value))}><option value="PUBLISHED">Jogadores</option><option value="PRIVATE">Mestre</option></select></label><div className={styles.layerActions}><button type="button" disabled={!index} onClick={() => setLayers((layers) => { const copy = [...layers]; [copy[index - 1], copy[index]] = [copy[index]!, copy[index - 1]!]; return copy; })}><ChevronUp size={13} /></button><button type="button" disabled={index === data.layers.length - 1} onClick={() => setLayers((layers) => { const copy = [...layers]; [copy[index + 1], copy[index]] = [copy[index]!, copy[index + 1]!]; return copy; })}><ChevronDown size={13} /></button></div></>}</div>)}{editable && <button type="button" className={styles.newLayer} onClick={() => setLayers((layers) => [...layers, { id: createId(), name: `Camada ${layers.length + 1}`, visible: true, opacity: 1, access: 'PUBLISHED' }])}>Adicionar camada</button>}</aside>
      <main ref={stageRef} className={`${styles.stage} ${editing ? styles.editing : ''}`} onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.max(.5, Math.min(3, value + (event.deltaY < 0 ? .15 : -.15)))); }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
        <div className={styles.canvas} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><img src={`/api/media/${mapAsset.id}`} alt={mapAsset.altText || file.name} draggable={false} onLoad={(event) => { if (event.currentTarget.naturalWidth && event.currentTarget.naturalHeight) setImageRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight); }} /><svg className={styles.geometryLayer} viewBox="0 0 100 100" preserveAspectRatio="none">{data.geometries.filter((geometry) => (editable || geometry.visibility === 'PUBLISHED') && (!geometry.layerId || visibleLayers.has(geometry.layerId))).map((geometry) => { const points = geometry.points.map(projectPoint); const layerOpacity = geometry.layerId ? (layerOpacities.get(geometry.layerId) ?? 1) : 1; const opacity = (geometry.opacity ?? .65) * layerOpacity; const common = { stroke: geometry.color, strokeWidth: geometry.strokeWidth, strokeOpacity: opacity, fill: geometry.type === 'POLYGON' ? geometry.color : 'none', fillOpacity: geometry.type === 'POLYGON' ? opacity : 0 }; if (geometry.type === 'CIRCLE') { const center = points[0]; const edge = points[1]; if (!center || !edge) return null; return <ellipse key={geometry.id} className={styles.geometry} cx={center.x} cy={center.y} rx={Math.abs(edge.x - center.x)} ry={Math.abs(edge.y - center.y)} {...common} onClick={(event) => { event.stopPropagation(); setSelectedGeometryId(geometry.id); setSelectedId(null); }} />; } const pointString = points.map((point) => `${point.x},${point.y}`).join(' '); return geometry.type === 'POLYGON' ? <polygon key={geometry.id} className={styles.geometry} points={pointString} {...common} onClick={(event) => { event.stopPropagation(); setSelectedGeometryId(geometry.id); setSelectedId(null); }} /> : <polyline key={geometry.id} className={styles.geometry} points={pointString} {...common} onClick={(event) => { event.stopPropagation(); setSelectedGeometryId(geometry.id); setSelectedId(null); }} />; })}{draftGeometry && <polyline className={styles.geometryDraft} points={draftGeometry.points.map(projectPoint).map((point) => `${point.x},${point.y}`).join(' ')} fill="none" />}</svg>{data.markers.filter((marker) => (editable || marker.visibility === 'PUBLISHED') && (!marker.layerId || visibleLayers.has(marker.layerId))).map((marker) => <button type="button" key={marker.id} className={`${styles.marker} ${selectedId === marker.id ? styles.markerSelected : ''}`} style={{ left: `${imageBox.left + imageBox.width * marker.x / 100}%`, top: `${imageBox.top + imageBox.height * marker.y / 100}%`, opacity: marker.layerId ? (layerOpacities.get(marker.layerId) ?? 1) : 1, '--marker-color': marker.color } as React.CSSProperties} onPointerDown={(event) => { event.stopPropagation(); if (editable) { markerDragRef.current = marker.id; event.currentTarget.setPointerCapture(event.pointerId); } }} onClick={() => { setSelectedId(marker.id); setSelectedGeometryId(null); }} aria-label={`Abrir marcador ${marker.name}`}><Crosshair size={17} /></button>)}</div>
      </main>
      <aside className={styles.panel}>{selected ? <><div className={styles.panelTitle}><LocateFixed size={15} />Marcador</div>{editable ? <div className={styles.markerForm}><label>Nome<input value={selected.name} onChange={(event) => setMarkers((markers) => markers.map((marker) => marker.id === selected.id ? { ...marker, name: event.target.value } : marker))} /></label><label>Categoria<input value={selected.category ?? ''} onChange={(event) => setMarkers((markers) => markers.map((marker) => marker.id === selected.id ? { ...marker, category: event.target.value } : marker))} /></label><label>Cor<input type="color" value={selected.color ?? '#c8a66a'} onChange={(event) => setMarkers((markers) => markers.map((marker) => marker.id === selected.id ? { ...marker, color: event.target.value } : marker))} /></label><label>Camada<select value={selected.layerId ?? ''} onChange={(event) => setMarkers((markers) => markers.map((marker) => marker.id === selected.id ? { ...marker, layerId: event.target.value || undefined } : marker))}><option value="">Sem camada</option>{data.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label><label>Descrição<textarea value={selected.description ?? ''} onChange={(event) => setMarkers((markers) => markers.map((marker) => marker.id === selected.id ? { ...marker, description: event.target.value } : marker))} /></label><label>Entidade relacionada<select value={selected.relatedFileId ?? ''} onChange={(event) => setMarkers((markers) => markers.map((marker) => marker.id === selected.id ? { ...marker, relatedFileId: event.target.value || undefined } : marker))}><option value="">Nenhuma</option>{targets.filter((target) => target.type !== 'MAP').map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label><label>Mapa relacionado<select value={selected.relatedMapId ?? ''} onChange={(event) => setMarkers((markers) => markers.map((marker) => marker.id === selected.id ? { ...marker, relatedMapId: event.target.value || undefined } : marker))}><option value="">Nenhum</option>{targets.filter((target) => target.type === 'MAP').map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label><label>Visibilidade<select value={selected.visibility} onChange={(event) => setMarkers((markers) => markers.map((marker) => marker.id === selected.id ? { ...marker, visibility: event.target.value as 'PRIVATE' | 'PUBLISHED' } : marker))}><option value="PRIVATE">Somente mestre</option><option value="PUBLISHED">Publicada</option></select></label><button type="button" className={styles.danger} onClick={() => { setMarkers((markers) => markers.filter((marker) => marker.id !== selected.id)); setSelectedId(null); }}><X size={14} />Excluir marcador</button></div> : <><h2>{selected.name}</h2>{selected.category && <span className={styles.category}>{selected.category}</span>}{selected.description && <p>{selected.description}</p>}{selected.relatedMapId && <button type="button" className={styles.openLink} onClick={() => router.push(`/campaigns/${campaignId}/mapa/${selected.relatedMapId}` as never)}>Abrir mapa relacionado</button>}{selected.relatedFileId && <button type="button" className={styles.openLink} onClick={() => router.push(`/campaigns/${campaignId}/arquivos/${selected.relatedFileId}` as never)}>Abrir entidade</button>}</>}</> : <div className={styles.hint}>{editing ? 'Clique sobre o mapa para adicionar um marcador. Arraste para navegar.' : 'Selecione um marcador para consultar suas informações.'}</div>}</aside>
    </div>}
    {mapAsset && selectedGeometry && <section className={styles.geometryPanel} aria-label="Detalhes da geometria">{editable ? <><label>Nome<input value={selectedGeometry.name} onChange={(event) => setGeometries((geometries) => geometries.map((geometry) => geometry.id === selectedGeometry.id ? { ...geometry, name: event.target.value } : geometry))} /></label><label>Descrição<textarea value={selectedGeometry.description ?? ''} onChange={(event) => setGeometries((geometries) => geometries.map((geometry) => geometry.id === selectedGeometry.id ? { ...geometry, description: event.target.value } : geometry))} /></label><label>Camada<select value={selectedGeometry.layerId ?? ''} onChange={(event) => setGeometries((geometries) => geometries.map((geometry) => geometry.id === selectedGeometry.id ? { ...geometry, layerId: event.target.value || undefined } : geometry))}><option value="">Sem camada</option>{data.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label><label>Visibilidade<select value={selectedGeometry.visibility} onChange={(event) => setGeometries((geometries) => geometries.map((geometry) => geometry.id === selectedGeometry.id ? { ...geometry, visibility: event.target.value as 'PRIVATE' | 'PUBLISHED' } : geometry))}><option value="PRIVATE">Somente mestre</option><option value="PUBLISHED">Publicada</option></select></label><button type="button" className={styles.danger} onClick={() => { setGeometries((geometries) => geometries.filter((geometry) => geometry.id !== selectedGeometry.id)); setSelectedGeometryId(null); }}><X size={14} />Excluir geometria</button></> : <><strong>{selectedGeometry.name}</strong>{selectedGeometry.description && <p>{selectedGeometry.description}</p>}</>}</section>}
    {mapAsset && <div className={styles.controls}><button type="button" onClick={() => setZoom((value) => Math.max(.5, value - .15))}><Minus size={15} /></button><button type="button" onClick={() => setZoom((value) => Math.min(3, value + .15))}><Plus size={15} /></button><button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={15} />Ajustar</button>{saving && <span><Save size={14} />Salvando…</span>}</div>}
  </div>;
}
