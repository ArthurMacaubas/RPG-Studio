'use client';

import { X } from 'lucide-react';
import type { Tag } from '@/types';
import styles from './TagChip.module.css';

function withAlpha(hex: string, alpha: string) {
  return hex.length === 7 ? `${hex}${alpha}` : hex;
}

export function TagChip({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span
      className={styles.chip}
      style={{ background: withAlpha(tag.color, '22'), color: tag.color }}
    >
      <span className={styles.dot} style={{ background: tag.color }} />
      {tag.name}
      {onRemove && (
        <button className={styles.removeButton} onClick={onRemove} aria-label={`Remover tag ${tag.name}`}>
          <X size={11} />
        </button>
      )}
    </span>
  );
}
