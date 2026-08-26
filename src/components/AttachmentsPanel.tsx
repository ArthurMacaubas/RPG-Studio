'use client';
/* eslint-disable @next/next/no-img-element -- anexos aceitam URLs externas e data URLs de uploads locais. */

import { useState, type ChangeEvent } from 'react';
import { ImagePlus, Paperclip, Upload, X } from 'lucide-react';
import { filesApi } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import type { Attachment } from '@/types';
import styles from './AttachmentsPanel.module.css';

interface AttachmentsPanelProps {
  fileId: string;
  attachments: Attachment[];
  onChanged: () => void;
}

function isImage(attachment: Attachment) {
  return Boolean(attachment.mimeType?.startsWith('image/')) || /^(?:data:image\/|.*\.(png|jpe?g|gif|webp|svg)(?:\?|$))/i.test(attachment.url);
}

export function AttachmentsPanel({ fileId, attachments, onChanged }: AttachmentsPanelProps) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function addAttachment() {
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      await filesApi.addAttachment(fileId, { url: url.trim(), label: label.trim() || undefined, mimeType: isImage({ id: '', fileId, url: url.trim(), label: null, mimeType: null, createdAt: '' }) ? 'image/*' : undefined });
      setUrl('');
      setLabel('');
      onChanged();
      toast({ tone: 'success', title: 'Anexo adicionado' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível adicionar o anexo', message: error instanceof Error ? error.message : 'Verifique a URL.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await filesApi.uploadAttachment(fileId, file, label.trim() || file.name);
      setLabel('');
      onChanged();
      toast({ tone: 'success', title: 'Imagem enviada', message: 'A imagem já pode ser visualizada na ficha.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Falha no upload', message: error instanceof Error ? error.message : 'Use uma imagem de até 5 MB.' });
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(id: string) {
    try {
      await filesApi.removeAttachment(fileId, id);
      onChanged();
      toast({ tone: 'info', title: 'Anexo removido' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível remover o anexo', message: error instanceof Error ? error.message : 'Tente novamente.' });
    }
  }

  return <section className={styles.panel} aria-labelledby="attachments-title">
    <div className={styles.panelHeader}><div><div id="attachments-title" className={styles.panelTitle}>Imagens e anexos</div><div className={styles.panelHint}>Adicione retratos, mapas, handouts ou referências visuais.</div></div><ImagePlus size={17} className={styles.headerIcon} /></div>
    {attachments.length === 0 ? <div className={styles.empty}>Nenhum anexo ainda. Envie uma imagem ou cole uma URL abaixo.</div> : <div className={styles.list}>{attachments.map((attachment) => <article key={attachment.id} className={styles.row}>{isImage(attachment) ? <a href={attachment.url} target="_blank" rel="noreferrer" className={styles.previewLink} aria-label={`Abrir imagem ${attachment.label ?? 'anexo'}`}><img src={attachment.url} alt={attachment.label ?? 'Imagem anexada'} className={styles.thumbnail} /></a> : <Paperclip size={14} className={styles.fileIcon} />}<div className={styles.attachmentMeta}><a href={attachment.url} target="_blank" rel="noreferrer" className={styles.link}>{attachment.label || attachment.url}</a><small>{attachment.mimeType || 'Anexo externo'}</small></div><button className={styles.removeButton} onClick={() => void removeAttachment(attachment.id)} aria-label={`Remover ${attachment.label ?? 'anexo'}`}><X size={13} /></button></article>)}</div>}
    <div className={styles.form}><input className={styles.input} placeholder="URL de imagem, áudio ou documento" value={url} onChange={(event) => setUrl(event.target.value)} /><input className={styles.input} placeholder="Nome ou legenda (opcional)" value={label} onChange={(event) => setLabel(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void addAttachment()} /><div className={styles.formActions}><button className={styles.addButton} onClick={() => void addAttachment()} disabled={submitting || uploading || !url.trim()}><Paperclip size={13} />{submitting ? 'Adicionando...' : 'Adicionar URL'}</button><label className={styles.uploadButton}><Upload size={13} />{uploading ? 'Enviando...' : 'Enviar imagem'}<input className={styles.fileInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" onChange={uploadImage} disabled={submitting || uploading} /></label></div></div>
  </section>;
}
