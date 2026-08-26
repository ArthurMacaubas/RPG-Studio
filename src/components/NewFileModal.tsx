'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { FileTypeIcon } from './fileTypeIcon';
import { filesApi } from '@/lib/api';
import type { CampaignFile, FileType } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import fieldStyles from './formFields.module.css';

const CREATABLE_TYPES: FileType[] = [
  'NPC',
  'CHARACTER',
  'THREAT',
  'PUZZLE',
  'DOCUMENT',
  'CLUE',
  'OBJECT',
  'EVENT',
  'MAP',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'NOTE',
  'LOCATION'
];

interface NewFileModalProps {
  campaignId: string;
  defaultType?: FileType;
  onClose: () => void;
  onCreated: (file: CampaignFile) => void;
}

export function NewFileModal({ campaignId, defaultType, onClose, onCreated }: NewFileModalProps) {
  const [type, setType] = useState<FileType>(defaultType ?? 'NOTE');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const file = await filesApi.create(campaignId, { type, name, description: description || undefined });
      onCreated(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar arquivo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Novo arquivo" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className={fieldStyles.error}>{error}</div>}

        {!defaultType && (
          <div className={fieldStyles.field}>
            <label className={fieldStyles.label}>Tipo</label>
            <div className={fieldStyles.typeGrid}>
              {CREATABLE_TYPES.map((t) => (
                <div
                  key={t}
                  className={`${fieldStyles.typeOption} ${type === t ? fieldStyles.typeOptionActive : ''}`}
                  onClick={() => setType(t)}
                >
                  <FileTypeIcon type={t} size={16} />
                  {FILE_TYPE_LABELS[t]}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={fieldStyles.field}>
          <label className={fieldStyles.label} htmlFor="file-name">
            Nome
          </label>
          <input
            id="file-name"
            className={fieldStyles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Nome ${defaultType ? FILE_TYPE_LABELS[defaultType].toLowerCase() : 'do arquivo'}`}
            autoFocus
            required
          />
        </div>

        <div className={fieldStyles.field}>
          <label className={fieldStyles.label} htmlFor="file-description">
            Descrição
          </label>
          <textarea
            id="file-description"
            className={fieldStyles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional — você pode detalhar tudo no editor depois"
          />
        </div>

        <div className={fieldStyles.actions}>
          <button type="button" className={fieldStyles.cancelButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={fieldStyles.submitButton} disabled={submitting || !name}>
            {submitting ? 'Criando...' : 'Criar arquivo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
