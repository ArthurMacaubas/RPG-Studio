'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { FileTypeIcon } from './fileTypeIcon';
import { filesApi } from '@/lib/api';
import type { CampaignFile } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import fieldStyles from './formFields.module.css';
import styles from './CustomSystemBuilder.module.css';

interface AddToBoardModalProps {
  campaignId: string;
  excludeFileIds: string[];
  onClose: () => void;
  onPick: (file: CampaignFile) => void;
}

export function AddToBoardModal({ campaignId, excludeFileIds, onClose, onPick }: AddToBoardModalProps) {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<CampaignFile[]>([]);

  useEffect(() => {
    filesApi.list(campaignId, { search: search || undefined, sort: 'name', direction: 'asc' }).then(setFiles);
  }, [campaignId, search]);

  const visible = files.filter((f) => !excludeFileIds.includes(f.id));

  return (
    <Modal title="Adicionar ao quadro" onClose={onClose}>
      <input
        className={fieldStyles.input}
        placeholder="Buscar arquivo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        style={{ marginBottom: 10 }}
      />
      <div className={styles.list} style={{ maxHeight: 320, overflowY: 'auto' }}>
        {visible.length === 0 && <div className={styles.emptyRow}>Nenhum arquivo encontrado.</div>}
        {visible.map((file) => (
          <div key={file.id} className={styles.row} style={{ cursor: 'pointer' }} onClick={() => onPick(file)}>
            <FileTypeIcon type={file.type} size={14} />
            <span className={styles.rowName}>{file.name}</span>
            <span className={styles.rowSpacer} />
            <span className={styles.rowMeta}>{FILE_TYPE_LABELS[file.type]}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
