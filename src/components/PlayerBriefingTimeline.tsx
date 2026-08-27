'use client';

import { CalendarDays, ScrollText } from 'lucide-react';
import type { PublicBriefing, PublicTimelineEvent } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './PlayerBriefingTimeline.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

export function PlayerBriefingTimeline({ briefing, timeline }: { briefing: PublicBriefing | null; timeline: PublicTimelineEvent[] }) {
  if (!briefing && timeline.length === 0) return null;

  return (
    <section className={styles.wrapper} aria-label="Briefing e timeline publicados">
      {briefing && (
        <article className={styles.briefing}>
          <div className={styles.heading}>
            <span className={styles.icon} aria-hidden="true"><ScrollText size={17} /></span>
            <div><span className={styles.eyebrow}>Mensagem do Mestre</span><h2>{briefing.title}</h2></div>
          </div>
          <p className={styles.body}>{briefing.body}</p>
        </article>
      )}

      {timeline.length > 0 && (
        <section className={styles.timeline} aria-labelledby="public-timeline-title">
          <div className={styles.timelineHeading}><div><span className={styles.eyebrow}>Contexto da campanha</span><h2 id="public-timeline-title">Timeline publicada</h2></div><span className={styles.timelineCount}>{timeline.length} marco{timeline.length === 1 ? '' : 's'}</span></div>
          <ol className={styles.events}>
            {timeline.map((event, index) => (
              <li key={`${event.happenedAt}-${event.title}-${index}`} className={styles.event}>
                <span className={styles.dot} aria-hidden="true"><CalendarDays size={12} /></span>
                <div className={styles.eventCard}><time dateTime={event.happenedAt}>{formatDate(event.happenedAt)}</time><strong>{event.title}</strong>{event.file && <span className={styles.reference}>Relacionado a {event.file.name} · {FILE_TYPE_LABELS[event.file.type]}</span>}</div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}
