'use client';

import { Star } from 'lucide-react';
import { FileTypeIcon } from './fileTypeIcon';
import type { CampaignFile } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './FileListRow.module.css';

interface FileListRowProps {
  file: CampaignFile;
  selected: boolean;
  onOpen: () => void;
  onSelectToggle: () => void;
  onToggleFavorite: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function FileListRow({ file, selected, onOpen, onSelectToggle, onToggleFavorite, onContextMenu }: FileListRowProps) {
  return (
    <div
      className={`${styles.row} ${selected ? styles.rowSelected : ''}`}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e);
      }}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/file-id', file.id)}
    >
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={selected}
        onClick={(e) => e.stopPropagation()}
        onChange={onSelectToggle}
      />
      <span className={styles.iconCell}>
        <FileTypeIcon type={file.type} size={15} />
      </span>
      <span className={styles.name}>{file.name}</span>
      <span className={styles.typeCell}>{FILE_TYPE_LABELS[file.type]}</span>
      <span className={styles.dateCell}>{formatDate(file.updatedAt)}</span>
      <button
        className={`${styles.starButton} ${file.isFavorite ? styles.starActive : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label="Favoritar"
      >
        <Star size={13} fill={file.isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
