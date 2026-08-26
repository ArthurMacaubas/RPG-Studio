import type { FileHistoryEntry } from '@/types';
import { HISTORY_ACTION_LABELS } from '@/types';
import styles from './HistoryTimeline.module.css';

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function HistoryTimeline({ entries }: { entries: FileHistoryEntry[] }) {
  if (entries.length === 0) {
    return <div className={styles.empty}>Nenhuma alteração registrada ainda.</div>;
  }

  return (
    <div className={styles.list}>
      {entries.map((entry) => (
        <div key={entry.id} className={styles.row}>
          <span className={styles.dot} />
          <div>
            <div>
              <span className={styles.action}>
                {HISTORY_ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              {entry.summary && <span className={styles.summary}> — {entry.summary}</span>}
            </div>
            <div className={styles.time}>{formatDateTime(entry.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
