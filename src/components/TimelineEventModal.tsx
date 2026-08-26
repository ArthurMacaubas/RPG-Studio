'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { filesApi, timelineApi } from '@/lib/api';
import type { CampaignFile, TimelineEventItem } from '@/types';
import fieldStyles from './formFields.module.css';

interface TimelineEventModalProps {
  campaignId: string;
  event?: TimelineEventItem;
  onClose: () => void;
  onSaved: () => void;
}

function toDateInputValue(iso?: string) {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(iso).toISOString().slice(0, 10);
}

export function TimelineEventModal({ campaignId, event, onClose, onSaved }: TimelineEventModalProps) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(toDateInputValue(event?.happenedAt));
  const [fileId, setFileId] = useState(event?.fileId ?? '');
  const [files, setFiles] = useState<CampaignFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    filesApi.list(campaignId, { sort: 'name', direction: 'asc' }).then(setFiles);
  }, [campaignId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { title, happenedAt: new Date(date).toISOString(), fileId: fileId || undefined };
      if (event) {
        await timelineApi.update(event.id, payload);
      } else {
        await timelineApi.create(campaignId, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar evento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={event ? 'Editar evento' : 'Novo evento na timeline'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className={fieldStyles.error}>{error}</div>}

        <div className={fieldStyles.field}>
          <label className={fieldStyles.label} htmlFor="event-title">
            Título
          </label>
          <input
            id="event-title"
            className={fieldStyles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className={fieldStyles.field}>
          <label className={fieldStyles.label} htmlFor="event-date">
            Data
          </label>
          <input
            id="event-date"
            type="date"
            className={fieldStyles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className={fieldStyles.field}>
          <label className={fieldStyles.label} htmlFor="event-file">
            Arquivo relacionado (opcional)
          </label>
          <select id="event-file" className={fieldStyles.select} value={fileId} onChange={(e) => setFileId(e.target.value)}>
            <option value="">Nenhum</option>
            {files.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className={fieldStyles.actions}>
          <button type="button" className={fieldStyles.cancelButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={fieldStyles.submitButton} disabled={submitting || !title}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
