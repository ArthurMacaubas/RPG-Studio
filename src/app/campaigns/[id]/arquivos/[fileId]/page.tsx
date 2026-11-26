'use client';
/* eslint-disable @next/next/no-img-element -- private media is served by an authenticated route. */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import {
  Star,
  Archive,
  RotateCcw,
  Trash2,
  Copy,
  Plus,
  Check,
  CloudOff,
  LoaderCircle,
  Eye,
  PenLine,
  Code2,
  List,
  PanelRight,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Clock3,
  BookOpen,
  X
} from 'lucide-react';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { TagChip } from '@/components/TagChip';
import { Breadcrumb } from '@/components/Breadcrumb';
import { MediaPicker } from '@/components/MediaPicker';
import { ImageLightbox } from '@/components/ImageLightbox';
import { MediaGallery } from '@/components/MediaGallery';
import { filesApi, tagsApi, campaignsApi, mediaApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { CampaignFile, Tag, SystemType, SheetData, ChecklistItem } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import { markdownOutline, markdownToHtml } from '@/lib/markdown';
import styles from './page.module.css';

const deferredPanelFallback = () => <div style={{ minHeight: 24 }} aria-hidden="true" />;
const CharacterSheet = dynamic(() => import('@/components/CharacterSheet').then((module) => module.CharacterSheet), { ssr: false, loading: deferredPanelFallback });
const ChecklistEditor = dynamic(() => import('@/components/ChecklistEditor').then((module) => module.ChecklistEditor), { ssr: false, loading: deferredPanelFallback });
const AttachmentsPanel = dynamic(() => import('@/components/AttachmentsPanel').then((module) => module.AttachmentsPanel), { ssr: false, loading: deferredPanelFallback });
const FileAccessPanel = dynamic(() => import('@/components/FileAccessPanel').then((module) => module.FileAccessPanel), { ssr: false, loading: deferredPanelFallback });
const RelationshipManager = dynamic(() => import('@/components/RelationshipManager').then((module) => module.RelationshipManager), { ssr: false, loading: deferredPanelFallback });
const HistoryTimeline = dynamic(() => import('@/components/HistoryTimeline').then((module) => module.HistoryTimeline), { ssr: false, loading: deferredPanelFallback });
const DocumentEditor = dynamic(() => import('@/components/DocumentEditor').then((module) => module.DocumentEditor), { ssr: false, loading: deferredPanelFallback });

type MediaLayout = {
  coverHeight?: number;
  coverPosition?: string;
  coverFit?: 'cover' | 'contain';
  layout?: 'STANDARD' | 'WIDE' | 'PRIMARY_SIDE';
};
export default function FileEditorPage() {
  const params = useParams<{ id: string; fileId: string }>();
  const router = useRouter();
  const campaignId = params?.id ?? '';
  const fileId = params?.fileId ?? '';

  const [file, setFile] = useState<CampaignFile | null>(null);
  const [campaignSystem, setCampaignSystem] = useState<SystemType | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [newComment, setNewComment] = useState('');
  const [mode, setMode] = useState<'read' | 'visual' | 'markdown'>('read');
  const [focusMode, setFocusMode] = useState(false);
  const [showOutline, setShowOutline] = useState(true);
  const [entityOptions, setEntityOptions] = useState<CampaignFile[]>([]);
  const [readerImage, setReaderImage] = useState<{ url: string; alt: string } | null>(null);
  const [draggedGalleryId, setDraggedGalleryId] = useState<string | null>(null);

  const hydrated = useRef(false);

  const load = useCallback(async () => {
    if (!campaignId || !fileId) return;
    const [f, tags, campaign, entities] = await Promise.all([
      filesApi.get(fileId),
      tagsApi.list(campaignId),
      campaignsApi.get(campaignId),
      filesApi.list(campaignId, { scope: 'active', sort: 'name', direction: 'asc' })
    ]);
    hydrated.current = false;
    setFile(f);
    setName(f.name);
    setDescription(f.description ?? '');
    setContent(f.content ?? '');
    setAllTags(tags);
    setCampaignSystem(campaign.system);
    setEntityOptions(entities.filter((entity) => entity.id !== f.id));
    setLastSavedAt(new Date(f.updatedAt));
    setSaveStatus('saved');
    hydrated.current = true;
  }, [fileId, campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  // Autosave — debounce the three text fields together so typing doesn't
  // spam PATCH requests, per "Salvar automaticamente (Auto Save)".
  const debouncedName = useDebounce(name, 700);
  const debouncedDescription = useDebounce(description, 700);
  const debouncedContent = useDebounce(content, 700);

  useEffect(() => {
    if (!hydrated.current || !file) return;
    if (
      debouncedName === file.name &&
      debouncedDescription === (file.description ?? '') &&
      debouncedContent === (file.content ?? '')
    ) {
      return;
    }
    if (!debouncedName.trim()) return;
    setSaveStatus('saving');
    filesApi
      .update(fileId, { name: debouncedName, description: debouncedDescription, content: debouncedContent })
      .then((updated) => {
        setFile(updated);
        setLastSavedAt(new Date(updated.updatedAt));
        setSaveStatus('saved');
      })
      .catch(() => {
        setSaveStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, debouncedDescription, debouncedContent]);

  if (!file) return null;

  const fileTagIds = (file.tags ?? []).map((t) => t.tag.id);

  async function toggleTag(tag: Tag) {
    const next = fileTagIds.includes(tag.id) ? fileTagIds.filter((id) => id !== tag.id) : [...fileTagIds, tag.id];
    await filesApi.setTags(fileId, next);
    load();
  }

  async function toggleFavorite() {
    await filesApi.setFavorite(fileId, !file!.isFavorite);
    load();
  }

  async function handleArchiveToggle() {
    if (file!.isArchived) await filesApi.restore(fileId);
    else await filesApi.archive(fileId);
    load();
  }

  async function handleTrash() {
    await filesApi.trash(fileId);
    router.push(`/campaigns/${campaignId}/arquivos` as never);
  }

  async function handleDuplicate() {
    const copy = await filesApi.duplicate(fileId);
    router.push(`/campaigns/${campaignId}/arquivos/${copy.id}` as never);
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    await filesApi.addComment(fileId, newComment.trim());
    setNewComment('');
    load();
  }

  async function updateSheetData(next: SheetData) {
    const merged = { ...(file!.data as Record<string, unknown>), ...next };
    setFile((prev) => (prev ? { ...prev, data: merged } : prev));
    await filesApi.update(fileId, { data: merged });
  }

  async function updateChecklist(items: ChecklistItem[]) {
    const merged = { ...(file!.data as Record<string, unknown>), checklist: items };
    setFile((prev) => (prev ? { ...prev, data: merged } : prev));
    await filesApi.update(fileId, { data: merged });
  }

  async function updateMediaLayout(patch: Partial<MediaLayout>) {
    const currentData = file!.data as Record<string, unknown>;
    const currentLayout = (currentData.mediaLayout && typeof currentData.mediaLayout === 'object'
      ? currentData.mediaLayout
      : {}) as MediaLayout;
    const merged = { ...currentData, mediaLayout: { ...currentLayout, ...patch } };
    setFile((current) => current ? { ...current, data: merged } : current);
    try {
      const updated = await filesApi.update(fileId, { data: merged });
      setFile((current) => current ? { ...current, ...updated } : updated);
    } catch {
      setSaveStatus('error');
      await load();
    }
  }

  const outline = markdownOutline(content);
  const coverReference = file.mediaReferences?.find((reference) => reference.purpose === 'COVER');
  const primaryReference = file.mediaReferences?.find((reference) => reference.purpose === 'PRIMARY');
  const coverAsset = coverReference?.asset;
  const primaryAsset = primaryReference?.asset;
  const galleryReferences = file.mediaReferences?.filter((reference) => reference.purpose === 'GALLERY') ?? [];
  const coverImage = coverAsset ? `/api/media/${coverAsset.id}` : file.attachments?.find((attachment) => attachment.mimeType?.startsWith('image/') || attachment.url.startsWith('data:image/'))?.url;
  const mediaLayout = ((file.data as Record<string, unknown>).mediaLayout && typeof (file.data as Record<string, unknown>).mediaLayout === 'object'
    ? (file.data as Record<string, unknown>).mediaLayout
    : {}) as MediaLayout;
  const coverHeight = Math.max(120, Math.min(480, mediaLayout.coverHeight ?? 190));
  const coverPosition = mediaLayout.coverPosition || 'center';

  async function detachMedia(reference: NonNullable<CampaignFile['mediaReferences']>[number]) {
    if (!reference.asset) return;
    try {
      await mediaApi.detach(campaignId, reference.asset.id, reference.id);
      await load();
    } catch {
      setSaveStatus('error');
    }
  }

  async function updateGalleryCaption(reference: NonNullable<CampaignFile['mediaReferences']>[number], caption: string) {
    if (!reference.asset) return;
    try {
      await mediaApi.updateReference(campaignId, reference.asset.id, reference.id, { caption });
      await load();
    } catch {
      setSaveStatus('error');
    }
  }

  async function moveGalleryReference(reference: NonNullable<CampaignFile['mediaReferences']>[number], direction: -1 | 1) {
    const ordered = [...galleryReferences].sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((item) => item.id === reference.id);
    if (index < 0 || !ordered[index + direction]) return;
    const next = [...ordered];
    [next[index], next[index + direction]] = [next[index + direction]!, next[index]!];
    try {
      await mediaApi.reorderGallery(campaignId, fileId, next.map((item) => item.id));
      await load();
    } catch {
      setSaveStatus('error');
    }
  }

  async function dropGalleryReference(targetReference: NonNullable<CampaignFile['mediaReferences']>[number]) {
    if (!draggedGalleryId || draggedGalleryId === targetReference.id) return;
    const ordered = [...galleryReferences].sort((a, b) => a.position - b.position);
    const sourceIndex = ordered.findIndex((reference) => reference.id === draggedGalleryId);
    const targetIndex = ordered.findIndex((reference) => reference.id === targetReference.id);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...ordered];
    const [moved] = next.splice(sourceIndex, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    setDraggedGalleryId(null);
    try {
      await mediaApi.reorderGallery(campaignId, fileId, next.map((reference) => reference.id));
      await load();
    } catch {
      setSaveStatus('error');
    }
  }
  const entityHref = (id: string) => `/campaigns/${campaignId}/arquivos/${id}`;
  const displayHtml = markdownToHtml(content || '*Este documento ainda não tem conteúdo.*', entityHref);

  return (
    <div className={`${styles.page} ${focusMode ? styles.focusMode : ''}`}>
      <Breadcrumb
        items={[
          { label: 'Arquivos', href: `/campaigns/${campaignId}/arquivos` },
          { label: FILE_TYPE_LABELS[file.type], href: `/campaigns/${campaignId}/arquivos` },
          { label: file.name }
        ]}
      />

      <div className={styles.headerRow}>
        <div className={styles.titleRow}>
          <span className={styles.typeBadge}>
            <FileTypeIcon type={file.type} size={12} />
            {FILE_TYPE_LABELS[file.type]}
          </span>
          <span className={styles.documentPath}>/ Enciclopédia da campanha</span>
          <span className={`${styles.saveStatus} ${saveStatus === 'error' ? styles.saveStatusError : ''}`} role="status" aria-live="polite">
            {saveStatus === 'saving' && <><LoaderCircle size={12} className={styles.saveSpinner} /> Salvando alterações...</>}
            {saveStatus === 'saved' && <><Check size={12} /> Salvo{lastSavedAt ? ` às ${lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</>}
            {saveStatus === 'error' && <><CloudOff size={12} /> Falha ao salvar — tente editar novamente</>}
          </span>
        </div>
        <div className={styles.toolbar}>
          <button className={`${styles.toolbarButton} ${file.isFavorite ? styles.toolbarButtonActive : ''}`} onClick={toggleFavorite} aria-label={file.isFavorite ? 'Remover dos favoritos' : 'Favoritar documento'}>
            {file.isFavorite ? <Star size={13} fill="currentColor" /> : <Star size={13} />}
            {file.isFavorite ? 'Favorito' : 'Favoritar'}
          </button>
          <button className={styles.toolbarIconButton} onClick={() => setFocusMode((current) => !current)} aria-label={focusMode ? 'Sair do modo foco' : 'Entrar no modo foco'} title={focusMode ? 'Sair do modo foco' : 'Modo foco'}>
            {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button className={styles.toolbarIconButton} onClick={handleDuplicate} aria-label="Duplicar documento" title="Duplicar"><Copy size={15} /></button>
          <button className={styles.toolbarIconButton} onClick={handleArchiveToggle} aria-label={file.isArchived ? 'Restaurar documento' : 'Arquivar documento'} title={file.isArchived ? 'Restaurar' : 'Arquivar'}>
            {file.isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
          </button>
          <button className={styles.toolbarIconButton} onClick={handleTrash} aria-label="Mover documento para a lixeira" title="Mover para a lixeira"><Trash2 size={15} /></button>
          <button className={styles.toolbarIconButton} aria-label="Mais ações" title="Mais ações"><MoreHorizontal size={16} /></button>
        </div>
      </div>

      <div className={styles.modeBar} role="tablist" aria-label="Modo de visualização do documento">
        <button type="button" role="tab" aria-selected={mode === 'read'} className={`${styles.modeTab} ${mode === 'read' ? styles.modeTabActive : ''}`} onClick={() => setMode('read')}><Eye size={15} /> Leitura</button>
        <button type="button" role="tab" aria-selected={mode === 'visual'} className={`${styles.modeTab} ${mode === 'visual' ? styles.modeTabActive : ''}`} onClick={() => setMode('visual')}><PenLine size={15} /> Edição visual</button>
        <button type="button" role="tab" aria-selected={mode === 'markdown'} className={`${styles.modeTab} ${mode === 'markdown' ? styles.modeTabActive : ''}`} onClick={() => setMode('markdown')}><Code2 size={15} /> Markdown</button>
        <span className={styles.modeSpacer} />
        <button type="button" className={styles.outlineToggle} onClick={() => setShowOutline((current) => !current)}><List size={15} /> {showOutline ? 'Ocultar sumário' : 'Mostrar sumário'}</button>
      </div>

      <div className={styles.grid}>
        <div className={styles.editorColumn}>
          {(file.type === 'CHARACTER' || file.type === 'NPC' || file.type === 'THREAT') && campaignSystem && (
            <CharacterSheet
              campaignId={campaignId}
              system={campaignSystem}
              data={(file.data ?? {}) as SheetData}
              onChange={updateSheetData}
              variant={file.type === 'THREAT' ? 'THREAT' : 'CHARACTER'}
            />
          )}

          {file.type === 'SESSION' && (
            <ChecklistEditor
              items={((file.data as { checklist?: ChecklistItem[] })?.checklist ?? []) as ChecklistItem[]}
              onChange={updateChecklist}
            />
          )}

          <article className={`${styles.document} ${mode === 'read' ? styles.readDocument : ''} ${mediaLayout.layout === 'WIDE' ? styles.wideDocument : ''} ${mediaLayout.layout === 'PRIMARY_SIDE' ? styles.primarySideDocument : ''}`} aria-label="Documento">
            {coverImage && <div className={styles.cover} style={{ backgroundImage: `url(${coverImage})`, height: `${coverHeight}px`, backgroundPosition: coverPosition, backgroundSize: mediaLayout.coverFit || 'cover' }} aria-label="Imagem de capa do documento" />}
            <div className={styles.documentBody}>
              {mediaLayout.layout === 'PRIMARY_SIDE' && primaryAsset && <button type="button" className={styles.inlinePrimaryImage} onClick={() => setReaderImage({ url: `/api/media/${primaryAsset.id}`, alt: primaryAsset.altText || primaryAsset.displayName })}><img src={`/api/media/${primaryAsset.id}`} alt={primaryAsset.altText || primaryAsset.displayName} /></button>}
              <div className={styles.documentContent}>
              <div className={styles.documentIdentity}>
                <span className={styles.documentIcon}><FileTypeIcon type={file.type} size={22} /></span>
                {mode === 'read' ? <h1>{file.name}</h1> : <input className={styles.nameInput} value={name} onChange={(e) => setName(e.target.value)} aria-label="Título do documento" />}
                {mode === 'read' ? <p className={styles.documentSummary}>{description || 'Documento da enciclopédia da campanha.'}</p> : <textarea className={styles.descriptionInput} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Resumo curto para orientar a leitura..." rows={2} aria-label="Resumo do documento" />}
                <div className={styles.documentMeta}><span><Clock3 size={13} /> Atualizado em {new Date(file.updatedAt).toLocaleDateString('pt-BR')}</span><span>·</span><span>{FILE_TYPE_LABELS[file.type]}</span></div>
              </div>
              {mode === 'read' ? <><div className={styles.reader} onClick={(event) => { const target = event.target; if (target instanceof HTMLImageElement) setReaderImage({ url: target.currentSrc || target.src, alt: target.alt }); }} dangerouslySetInnerHTML={{ __html: displayHtml }} /><MediaGallery references={galleryReferences} /></> : <DocumentEditor campaignId={campaignId} fileId={fileId} content={content} onChange={setContent} mode={mode} entityOptions={entityOptions.map((entity) => ({ id: entity.id, name: entity.name, type: FILE_TYPE_LABELS[entity.type] }))} entityHref={entityHref} />}
              </div>
            </div>
          </article>
        </div>

        <aside className={styles.sideRail} aria-label="Metadados e ferramentas da entidade">
          {showOutline && <div className={`${styles.panel} ${styles.outlinePanel}`}><div className={styles.panelTitle}><span>Sumário</span><BookOpen size={14} /></div>{outline.length === 0 ? <span className={styles.emptyHint}>Adicione títulos para gerar o sumário.</span> : <nav aria-label="Sumário do documento"><ol className={styles.outline}>{outline.map((item) => <li key={item.id} style={{ paddingLeft: `${Math.max(0, item.level - 1) * 10}px` }}><a href={`#${item.id}`}>{item.text}</a></li>)}</ol></nav>}</div>}
          <FileAccessPanel fileId={fileId} />
          <AttachmentsPanel fileId={fileId} attachments={file.attachments ?? []} onChanged={load} />

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Imagens da entidade</div>
            {primaryAsset && <div className={styles.mediaPreview}><img src={`/api/media/${primaryAsset.id}`} alt={primaryAsset.altText || primaryAsset.displayName} /><span>{primaryAsset.displayName}</span></div>}
            <div className={styles.mediaActions}>
              <MediaPicker campaignId={campaignId} fileId={fileId} purpose="COVER" replace triggerLabel={coverAsset ? 'Substituir capa' : 'Definir capa'} onSelect={() => load()} />
              <MediaPicker campaignId={campaignId} fileId={fileId} purpose="PRIMARY" replace triggerLabel={primaryAsset ? 'Substituir imagem' : 'Imagem principal'} onSelect={() => load()} />
              <MediaPicker campaignId={campaignId} fileId={fileId} purpose="GALLERY" triggerLabel="Adicionar à galeria" onSelect={() => load()} />
            </div>
            <div className={styles.mediaLayoutControls}>
              <label>Layout<select value={mediaLayout.layout ?? 'STANDARD'} onChange={(event) => void updateMediaLayout({ layout: event.target.value as MediaLayout['layout'] })}><option value="STANDARD">Padrão</option><option value="WIDE">Largura ampla</option><option value="PRIMARY_SIDE">Imagem lateral</option></select></label>
              {coverAsset && <><label>Altura da capa<input type="range" min="120" max="480" step="10" value={coverHeight} onChange={(event) => void updateMediaLayout({ coverHeight: Number(event.target.value) })} /></label><label>Posição<select value={coverPosition} onChange={(event) => void updateMediaLayout({ coverPosition: event.target.value })}><option value="left top">Esquerda superior</option><option value="center top">Centro superior</option><option value="center">Centro</option><option value="center bottom">Centro inferior</option><option value="right bottom">Direita inferior</option></select></label><label>Recorte<select value={mediaLayout.coverFit ?? 'cover'} onChange={(event) => void updateMediaLayout({ coverFit: event.target.value as MediaLayout['coverFit'] })}><option value="cover">Preencher</option><option value="contain">Mostrar inteira</option></select></label></>}
            </div>
            {(coverReference || primaryReference || galleryReferences.length > 0) && <div className={styles.mediaLinks}>{coverReference && <button type="button" onClick={() => void detachMedia(coverReference)}><X size={12} />Remover capa</button>}{primaryReference && <button type="button" onClick={() => void detachMedia(primaryReference)}><X size={12} />Remover imagem</button>}{galleryReferences.map((reference, index) => <button type="button" key={reference.id} onClick={() => void detachMedia(reference)}><X size={12} />Galeria {index + 1}</button>)}</div>}
            {galleryReferences.length > 0 && <div className={styles.galleryEditor}>{galleryReferences.map((reference, index) => <div key={reference.id} draggable onDragStart={() => setDraggedGalleryId(reference.id)} onDragEnd={() => setDraggedGalleryId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => void dropGalleryReference(reference)} className={draggedGalleryId === reference.id ? styles.galleryDragging : undefined}><span>{reference.asset?.displayName ?? `Imagem ${index + 1}`}</span><input defaultValue={reference.caption ?? ''} placeholder="Legenda" onBlur={(event) => { if (event.target.value !== (reference.caption ?? '')) void updateGalleryCaption(reference, event.target.value); }} /><button type="button" disabled={index === 0} onClick={() => void moveGalleryReference(reference, -1)} aria-label="Mover imagem para trás">↑</button><button type="button" disabled={index === galleryReferences.length - 1} onClick={() => void moveGalleryReference(reference, 1)} aria-label="Mover imagem para frente">↓</button></div>)}</div>}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Tags</div>
            <div className={styles.tagWrap}>
              {(file.tags ?? []).map(({ tag }) => (
                <TagChip key={tag.id} tag={tag} onRemove={() => toggleTag(tag)} />
              ))}
              {(file.tags ?? []).length === 0 && <span className={styles.emptyHint}>Nenhuma tag ainda</span>}
            </div>
            <div className={styles.tagWrap}>
              {allTags
                .filter((t) => !fileTagIds.includes(t.id))
                .map((tag) => (
                  <button key={tag.id} className={styles.tagOption} onClick={() => toggleTag(tag)}>
                    <Plus size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                    {tag.name}
                  </button>
                ))}
            </div>
          </div>

          <RelationshipManager campaignId={campaignId} fileId={fileId} />

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Comentários</div>
            <div className={styles.commentForm}>
              <input
                className={styles.commentInput}
                placeholder="Escrever um comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <button className={styles.addButton} onClick={submitComment} disabled={!newComment.trim()}>
                Enviar
              </button>
            </div>
            {(file.comments ?? []).length === 0 ? (
              <span className={styles.emptyHint}>Nenhum comentário ainda</span>
            ) : (
              (file.comments ?? []).map((c) => (
                <div key={c.id} className={styles.commentRow}>
                  {c.body}
                  <div className={styles.commentMeta}>{new Date(c.createdAt).toLocaleString('pt-BR')}</div>
                </div>
              ))
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Histórico</div>
            <HistoryTimeline entries={file.history ?? []} />
          </div>
        </aside>
      </div>
      <ImageLightbox image={readerImage} onClose={() => setReaderImage(null)} />
    </div>
  );
}
