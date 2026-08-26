'use client';

import { Star, MoreHorizontal } from 'lucide-react';
import { FileTypeIcon } from './fileTypeIcon';
import { TagChip } from './TagChip';
import type { CampaignFile } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './FileCard.module.css';

interface FileCardProps {
  file: CampaignFile;
  selected: boolean;
  onOpen: () => void;
  onSelectToggle: (e: React.MouseEvent) => void;
  onToggleFavorite: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function FileCard({ file, selected, onOpen, onSelectToggle, onToggleFavorite, onContextMenu }: FileCardProps) {
  return (
    <div
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e);
      }}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/file-id', file.id)}
    >
      <div className={styles.topRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onSelectToggle(e as unknown as React.MouseEvent)}
        />
        <div className={styles.iconBadge}>
          <FileTypeIcon type={file.type} size={15} />
        </div>
        <div className={styles.actions}>
          <button
            className={`${styles.iconButton} ${file.isFavorite ? styles.iconButtonActive : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-label="Favoritar"
          >
            <Star size={14} fill={file.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            className={styles.iconButton}
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e);
            }}
            aria-label="Mais ações"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <div>
        <div className={styles.name}>{file.name}</div>
        {file.description && <div className={styles.description}>{file.description}</div>}
      </div>

      <div className={styles.footer}>
        <span className={styles.typeLabel}>{FILE_TYPE_LABELS[file.type]}</span>
        {file.tags && file.tags.length > 0 && (
          <div className={styles.tags}>
            {file.tags.slice(0, 2).map(({ tag }) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
