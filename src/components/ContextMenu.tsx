'use client';

import { useRef } from 'react';
import { useOutsideClick } from '@/hooks/useOutsideClick';
import styles from './ContextMenu.module.css';

export interface ContextMenuAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

// Backs both right-click and the "..." action button — same component,
// same action list, so behavior never drifts between the two entry points.
export function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onClose);

  const clampedX = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 210 : x);
  const clampedY = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - actions.length * 34 - 20 : y);

  return (
    <div ref={ref} className={styles.menu} style={{ left: clampedX, top: clampedY }}>
      {actions.map((action, i) => (
        <div key={action.label}>
          {action.divider && <div className={styles.divider} />}
          <button
            className={`${styles.item} ${action.danger ? styles.itemDanger : ''}`}
            onClick={() => {
              action.onClick();
              onClose();
            }}
          >
            {action.icon}
            {action.label}
          </button>
        </div>
      ))}
    </div>
  );
}
