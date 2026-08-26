'use client';

import { X } from 'lucide-react';
import { useId } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, description, size = 'md', onClose, children }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.dialog} ${styles[size]}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
        <div className={styles.header}>
          <div><h2 id={titleId} className={styles.title}>{title}</h2>{description && <p id={descriptionId} className={styles.description}>{description}</p>}</div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
