'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Star,
  StarOff,
  Archive,
  RotateCcw,
  Trash2,
  Copy,
  Plus,
  X,
  Check,
  CloudOff,
  LoaderCircle
} from 'lucide-react';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { TagChip } from '@/components/TagChip';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CharacterSheet } from '@/components/CharacterSheet';
import { ChecklistEditor } from '@/components/ChecklistEditor';
import { AttachmentsPanel } from '@/components/AttachmentsPanel';
import { FileAccessPanel } from '@/components/FileAccessPanel';
import { RelationshipManager } from '@/components/RelationshipManager';
import { filesApi, tagsApi, campaignsApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { CampaignFile, Tag, SystemType, SheetData, ChecklistItem } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './page.module.css';

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

  const hydrated = useRef(false);

  const load = useCallback(async () => {
    if (!campaignId || !fileId) return;
    const [f, tags, campaign] = await Promise.all([filesApi.get(fileId), tagsApi.list(campaignId), campaignsApi.get(campaignId)]);
    hydrated.current = false;
    setFile(f);
    setName(f.name);
    setDescription(f.description ?? '');
    setContent(f.content ?? '');
    setAllTags(tags);
    setCampaignSystem(campaign.system);
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

  return (
    <div className={styles.page}>
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
          <span className={`${styles.saveStatus} ${saveStatus === 'error' ? styles.saveStatusError : ''}`} role="status" aria-live="polite">
            {saveStatus === 'saving' && <><LoaderCircle size={12} className={styles.saveSpinner} /> Salvando alterações...</>}
            {saveStatus === 'saved' && <><Check size={12} /> Salvo{lastSavedAt ? ` às ${lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</>}
            {saveStatus === 'error' && <><CloudOff size={12} /> Falha ao salvar — tente editar novamente</>}
          </span>
        </div>
        <div className={styles.toolbar}>
          <button
            className={`${styles.toolbarButton} ${file.isFavorite ? styles.toolbarButtonActive : ''}`}
            onClick={toggleFavorite}
          >
            {file.isFavorite ? <Star size={13} fill="currentColor" /> : <Star size={13} />}
            {file.isFavorite ? 'Favorito' : 'Favoritar'}
          </button>
          <button className={styles.toolbarButton} onClick={handleDuplicate}>
            <Copy size={13} />
            Duplicar
          </button>
          <button className={styles.toolbarButton} onClick={handleArchiveToggle}>
            {file.isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
            {file.isArchived ? 'Restaurar' : 'Arquivar'}
          </button>
          <button className={`${styles.toolbarButton} ${styles.toolbarButtonDanger}`} onClick={handleTrash}>
            <Trash2 size={13} />
            Excluir
          </button>
        </div>
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

          <section className={styles.editorSurface} aria-label="Conteúdo principal da entidade">
            <div className={styles.fieldLabel}>Nome da entidade</div>
            <input className={styles.nameInput} value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da entidade" />
            <div className={styles.fieldLabel}>Resumo</div>
            <textarea
              className={styles.descriptionInput}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição curta..."
              rows={2}
              aria-label="Resumo da entidade"
            />
            <div className={styles.contentLabel}>Conteúdo</div>
            <textarea
              className={styles.contentInput}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Anotações, texto completo, ficha, o que for necessário para este arquivo..."
              aria-label="Conteúdo detalhado da entidade"
            />
          </section>
        </div>

        <aside className={styles.sideRail} aria-label="Metadados e ferramentas da entidade">
          <FileAccessPanel fileId={fileId} />
          <AttachmentsPanel fileId={fileId} attachments={file.attachments ?? []} onChanged={load} />

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
    </div>
  );
}
