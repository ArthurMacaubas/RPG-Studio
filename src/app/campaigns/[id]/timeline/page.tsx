'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { TimelineEventModal } from '@/components/TimelineEventModal';
import { timelineApi } from '@/lib/api';
import type { TimelineEventItem } from '@/types';
import styles from './page.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function TimelinePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params?.id ?? '';
  const [events, setEvents] = useState<TimelineEventItem[]>([]);
  const [modalEvent, setModalEvent] = useState<TimelineEventItem | 'new' | null>(null);

  async function load() {
    setEvents(await timelineApi.list(campaignId));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function removeEvent(id: string) {
    await timelineApi.remove(id);
    load();
  }

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Campanha', href: `/campaigns/${campaignId}` }, { label: 'Timeline' }]} />
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Timeline</h1>
        <button className={styles.addButton} onClick={() => setModalEvent('new')}>
          <Plus size={15} />
          Novo evento
        </button>
      </div>

      {events.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>Nenhum evento ainda</h3>
          <p>Adicione marcos da história da campanha para montar a linha do tempo.</p>
        </div>
      ) : (
        <div className={styles.track}>
          <div className={styles.trackLine} />
          {events.map((event) => (
            <div key={event.id} className={styles.eventRow}>
              <span className={styles.eventDot} />
              <div className={styles.eventCard}>
                <div className={styles.eventDate}>{formatDate(event.happenedAt)}</div>
                <div className={styles.eventTitleRow}>
                  <span className={styles.eventTitle}>{event.title}</span>
                  <div className={styles.eventActions}>
                    <button className={styles.iconButton} onClick={() => setModalEvent(event)} aria-label="Editar evento">
                      <Pencil size={13} />
                    </button>
                    <button className={styles.iconButton} onClick={() => removeEvent(event.id)} aria-label="Excluir evento">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {event.file && (
                  <a
                    className={styles.eventFileLink}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/campaigns/${campaignId}/arquivos/${event.file!.id}` as never);
                    }}
                    href="#"
                  >
                    <ExternalLink size={11} />
                    {event.file.name}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalEvent && (
        <TimelineEventModal
          campaignId={campaignId}
          event={modalEvent === 'new' ? undefined : modalEvent}
          onClose={() => setModalEvent(null)}
          onSaved={() => {
            setModalEvent(null);
            load();
          }}
        />
      )}
    </div>
  );
}
