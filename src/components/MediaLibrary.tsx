'use client';
/* eslint-disable @next/next/no-img-element -- media is delivered through the authenticated application route. */

import { useCallback, useEffect, useState } from 'react';
import { Grid2X2, List, LoaderCircle, Pencil, Search, Trash2, Upload, X } from 'lucide-react';
import { mediaApi } from '@/lib/api';
import { MEDIA_CATEGORIES } from '@/lib/media';
import { IMAGE_FILE_ACCEPT, supportedImageFiles } from '@/lib/mediaInput';
import type { MediaAsset } from '@/types';
import { ImageLightbox } from './ImageLightbox';
import styles from './MediaLibrary.module.css';

type ViewMode = 'grid' | 'list';

export function MediaLibrary({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [sort, setSort] = useState<'updatedAt' | 'createdAt' | 'displayName' | 'byteSize'>('updatedAt');
  const [view, setView] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [storageConfigured, setStorageConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [draft, setDraft] = useState({ displayName: '', description: '', altText: '', category: '', tags: '' });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await mediaApi.list(campaignId, { search: query || undefined, category: category || undefined, mimeType: mimeType || undefined, sort, pageSize: 30 });
      setItems(result.items); setStorageConfigured(result.storageConfigured); setHasMore(result.hasMore); setSelectedIds(new Set());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a biblioteca.'); }
    finally { setLoading(false); }
  }, [campaignId, query, category, mimeType, sort]);

  useEffect(() => { const id = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(id); }, [load]);

  async function upload(files: FileList | File[]) {
    const images = supportedImageFiles(files);
    if (!images.length) {
      setError('Use imagens PNG, JPEG, GIF ou WebP.');
      return;
    }
    setUploading(true); setProgress(0); setError(null);
    try {
      const result = await mediaApi.upload(campaignId, images, { category: category || undefined }, setProgress);
      setItems((current) => [...result.items, ...current]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a mídia.'); }
    finally { setUploading(false); }
  }

  async function remove(asset: MediaAsset) {
    const dependencies = asset.references.length ? `\n\nEla está vinculada a: ${asset.references.map((reference) => reference.file?.name ?? 'entidade removida').join(', ')}.` : '';
    if (!window.confirm(`Excluir “${asset.displayName}”?${dependencies}`)) return;
    try { await mediaApi.remove(campaignId, asset.id); setItems((current) => current.filter((item) => item.id !== asset.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a mídia.'); }
  }

  async function removeSelected() {
    const selected = items.filter((asset) => selectedIds.has(asset.id));
    if (!selected.length || !window.confirm(`Excluir ${selected.length} imagem(ns) selecionada(s)? Imagens vinculadas serão preservadas e reportadas.`)) return;
    setError(null);
    const failed: string[] = [];
    for (const asset of selected) {
      try { await mediaApi.remove(campaignId, asset.id); }
      catch { failed.push(asset.displayName); }
    }
    await load();
    if (failed.length) setError(`Não foi possível excluir: ${failed.join(', ')}. Remova os vínculos primeiro.`);
  }

  async function loadMore() {
    try {
      const result = await mediaApi.list(campaignId, { search: query || undefined, category: category || undefined, mimeType: mimeType || undefined, sort, page: Math.floor(items.length / 30), pageSize: 30 });
      setItems((current) => [...current, ...result.items]); setHasMore(result.hasMore);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais mídia.'); }
  }

  function toggleSelection(assetId: string) {
    setSelectedIds((current) => { const next = new Set(current); if (next.has(assetId)) next.delete(assetId); else next.add(assetId); return next; });
  }

  async function setVisibility(asset: MediaAsset, visibility: MediaAsset['visibility']) {
    try {
      const updated = await mediaApi.update(campaignId, asset.id, { visibility });
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a visibilidade.'); }
  }

  function openEditor(asset: MediaAsset) {
    setDraft({ displayName: asset.displayName, description: asset.description ?? '', altText: asset.altText ?? '', category: asset.category ?? '', tags: asset.tags.join(', ') });
    setEditing(asset);
  }

  async function saveMetadata() {
    if (!editing || !draft.displayName.trim()) return;
    try {
      const updated = await mediaApi.update(campaignId, editing.id, {
        displayName: draft.displayName.trim(),
        description: draft.description.trim() || null,
        altText: draft.altText.trim() || null,
        category: draft.category || null,
        tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      });
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a mídia.'); }
  }

  const categories = Array.from(new Set([...MEDIA_CATEGORIES, ...items.map((item) => item.category).filter((value): value is string => Boolean(value))])).sort();
  return <div className={styles.page}>
    <header className={styles.header}><div><p>Biblioteca de mídia</p><h1>Imagens da campanha</h1><span>Arquivos privados, reutilizáveis e vinculados sem duplicação.</span></div><label className={styles.uploadButton} aria-disabled={uploading || !storageConfigured}><Upload size={15} />{uploading ? `Enviando ${progress}%` : 'Enviar imagens'}<input className={styles.fileInput} type="file" accept={IMAGE_FILE_ACCEPT} multiple disabled={uploading || !storageConfigured} onChange={(event) => { if (event.target.files) void upload(event.target.files); event.target.value = ''; }} /></label></header>
    {!storageConfigured && <p className={styles.notice}>O Blob Store privado não está configurado. A biblioteca permanece acessível; defina <code>BLOB_READ_WRITE_TOKEN</code> para habilitar uploads.</p>}
    <div className={styles.toolbar} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files); }}><label className={styles.search}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou tag" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select><select value={mimeType} onChange={(event) => setMimeType(event.target.value)} aria-label="Filtrar por formato"><option value="">Todos os formatos</option><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/gif">GIF</option><option value="image/webp">WebP</option></select><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Ordenar mídia"><option value="updatedAt">Atualização</option><option value="createdAt">Envio</option><option value="displayName">Nome</option><option value="byteSize">Tamanho</option></select>{selectedIds.size > 0 && <button type="button" className={styles.bulkDelete} onClick={() => void removeSelected()}><Trash2 size={14} />Excluir {selectedIds.size}</button>}<div className={styles.view}><button type="button" className={view === 'grid' ? styles.active : ''} onClick={() => setView('grid')} aria-label="Visualização em grade"><Grid2X2 size={15} /></button><button type="button" className={view === 'list' ? styles.active : ''} onClick={() => setView('list')} aria-label="Visualização em lista"><List size={16} /></button></div></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={`${styles.assets} ${view === 'list' ? styles.assetsList : ''}`}>{loading ? <div className={styles.empty}><LoaderCircle size={19} className={styles.spinner} />Carregando mídia…</div> : items.length === 0 ? <div className={styles.empty}>Nenhuma imagem encontrada. Envie arquivos ou altere os filtros.</div> : items.map((asset) => <article key={asset.id} className={styles.asset}><label className={styles.selection}><input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleSelection(asset.id)} aria-label={`Selecionar ${asset.displayName}`} /></label><button type="button" className={styles.previewButton} onClick={() => setPreview(asset)}><img src={asset.url} alt={asset.altText || asset.displayName} loading="lazy" /></button><div className={styles.meta}><strong title={asset.displayName}>{asset.displayName}</strong><span>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'Dimensões indisponíveis'} · {(asset.byteSize / 1024 / 1024).toFixed(1)} MB</span><label className={styles.visibility}>Visibilidade<select value={asset.visibility} onChange={(event) => void setVisibility(asset, event.target.value as MediaAsset['visibility'])}><option value="PRIVATE">Privada</option><option value="PUBLISHED">Publicada</option></select></label><small>{asset.references.length ? `${asset.references.length} vínculo(s)` : 'Sem vínculos'}</small></div><button type="button" className={styles.edit} onClick={() => openEditor(asset)} aria-label={`Editar ${asset.displayName}`}><Pencil size={14} /></button><button type="button" className={styles.delete} onClick={() => void remove(asset)} aria-label={`Excluir ${asset.displayName}`}><Trash2 size={15} /></button></article>)}</div>
    {hasMore && <button type="button" className={styles.more} onClick={() => void loadMore()}>Carregar mais imagens</button>}
    {editing && <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={`Editar ${editing.displayName}`}><header><strong>Editar mídia</strong><button type="button" onClick={() => setEditing(null)} aria-label="Fechar"><X size={16} /></button></header><label>Nome<input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} /></label><label>Descrição<textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label><label>Texto alternativo<input value={draft.altText} onChange={(event) => setDraft((current) => ({ ...current, altText: event.target.value }))} /></label><label>Categoria<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}><option value="">Sem categoria</option>{Array.from(new Set([...MEDIA_CATEGORIES, draft.category].filter(Boolean))).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Tags <small>separadas por vírgula</small><input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} /></label><footer><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button type="button" className={styles.save} onClick={() => void saveMetadata()} disabled={!draft.displayName.trim()}>Salvar</button></footer></section></div>}
    <ImageLightbox image={preview ? { url: preview.url, alt: preview.altText || preview.displayName, caption: preview.description || undefined, width: preview.width, height: preview.height } : null} onClose={() => setPreview(null)} />
  </div>;
}
