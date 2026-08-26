'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ChecklistItem } from '@/types';
import styles from './ChecklistEditor.module.css';

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const [newLabel, setNewLabel] = useState('');
  const done = items.filter((i) => i.done).length;
  const pct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);

  function addItem() {
    if (!newLabel.trim()) return;
    onChange([...items, { id: crypto.randomUUID(), label: newLabel.trim(), done: false }]);
    setNewLabel('');
  }

  function toggleItem(id: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function relabelItem(id: string, label: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, label } : i)));
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Checklist de preparação</div>

      {items.length > 0 && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      )}

      {items.length === 0 ? (
        <div className={styles.empty}>Nada na checklist ainda — adicione o que precisa preparar para esta sessão.</div>
      ) : (
        items.map((item) => (
          <div key={item.id} className={styles.item}>
            <input
              type="checkbox"
              className={styles.itemCheckbox}
              checked={item.done}
              onChange={() => toggleItem(item.id)}
            />
            <input
              className={`${styles.itemLabel} ${item.done ? styles.itemLabelDone : ''}`}
              value={item.label}
              onChange={(e) => relabelItem(item.id, e.target.value)}
            />
            <button className={styles.removeButton} onClick={() => removeItem(item.id)} aria-label="Remover item">
              <X size={13} />
            </button>
          </div>
        ))
      )}

      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          placeholder="Novo item da checklist..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <button className={styles.addButton} onClick={addItem}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
