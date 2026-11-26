'use client';
/* eslint-disable @next/next/no-img-element -- media URLs are signed-in application routes. */

import { useCallback, useEffect, useState } from 'react';
import { ImagePlus, LoaderCircle, Search, Upload, X } from 'lucide-react';
import { mediaApi } from '@/lib/api';
import { MEDIA_CATEGORIES } from '@/lib/media';
import { IMAGE_FILE_ACCEPT, supportedImageFiles } from '@/lib/mediaInput';
import type { MediaAsset } from '@/types';
import { ImageLightbox } from './ImageLightbox';
import styles from './MediaPicker.module.css';

export function MediaPicker({ campaignId, fileId, purpose = 'CONTENT', replace = false, triggerLabel = 'Selecionar imagem', onSelect }: {
  campaignId: string;
  fileId?: string;
  purpose?: 'COVER' | 'PRIMARY' | 'CONTENT' | 'GALLERY' | 'MAP' | 'MARKER';
  replace?: boolean;
  triggerLabel?: string;
  onSelect: (asset: MediaAsset) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaAsset | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const result = await mediaApi.list(campaignId, { search: query || undefined, category: category || undefined }); setItems(result.items); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as imagens.'); }
    finally { setLoading(false); }
  }, [campaignId, category, query]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  async function upload(files: FileList | File[]) {
    const images = supportedImageFiles(files);
    if (!images.length) {
      setError('Use imagens PNG, JPEG, GIF ou WebP.');
      return;
    }
    setUploading(true); setProgress(0); setError(null);
    try {
      const result = await mediaApi.upload(campaignId, images, {}, setProgress);
      setItems((current) => [...result.items, ...current]);
      setSelected(result.items[0] ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a imagem.'); }
    finally { setUploading(false); }
  }

  async function confirm() {
    if (!selected) return;
    try {
      if (fileId) await mediaApi.attach(campaignId, selected.id, { fileId, purpose, replace });
      onSelect(selected); setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível vincular a imagem.'); }
  }

  return <>
    <button type="button" className={styles.trigger} onClick={() => setOpen(true)}><ImagePlus size={14} />{triggerLabel}</button>
    {open && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Biblioteca de mídia">
        <header><div><span>Biblioteca de mídia</span><small>Reutilize uma imagem ou envie uma nova.</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={17} /></button></header>
        <div className={styles.controls}><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou tag" aria-label="Buscar mídia" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar categoria"><option value="">Categorias</option>{MEDIA_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select><label className={styles.uploadButton} aria-disabled={uploading}><Upload size={14} />{uploading ? `${progress}%` : 'Enviar'}<input className={styles.fileInput} type="file" accept={IMAGE_FILE_ACCEPT} multiple disabled={uploading} onChange={(event) => { if (event.target.files) void upload(event.target.files); event.target.value = ''; }} /></label></div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.dropzone} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files); }}>Arraste imagens aqui · PNG, JPEG, GIF ou WebP</div>
        <div className={styles.grid}>{loading ? <div className={styles.status}><LoaderCircle className={styles.spinner} size={19} />Carregando…</div> : items.length === 0 ? <div className={styles.status}>Nenhuma imagem disponível. Envie a primeira para esta campanha.</div> : items.map((asset) => <button type="button" key={asset.id} className={`${styles.asset} ${selected?.id === asset.id ? styles.assetSelected : ''}`} onClick={() => setSelected(asset)} onDoubleClick={() => setPreview(asset)}><img src={asset.url} alt={asset.altText || asset.displayName} loading="lazy" /><span>{asset.displayName}</span><small>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'Imagem'}</small></button>)}</div>
        <footer><span>{selected ? selected.displayName : 'Selecione uma imagem'}</span><button type="button" className={styles.confirm} onClick={() => void confirm()} disabled={!selected}>Usar imagem</button></footer>
      </section>
    </div>}
    <ImageLightbox image={preview ? { url: preview.url, alt: preview.altText || preview.displayName, caption: preview.description || undefined, width: preview.width, height: preview.height } : null} onClose={() => setPreview(null)} />
  </>;
}
