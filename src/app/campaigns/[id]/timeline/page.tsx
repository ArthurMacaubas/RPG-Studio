'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { TimelineEventModal } from '@/components/TimelineEventModal';
import { timelineApi } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
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
  const { toast } = useToast();

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

  async function togglePublished(event: TimelineEventItem) {
    try {
      const updated = await timelineApi.update(event.id, { isPublished: !event.isPublished });
      setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast({ tone: updated.isPublished ? 'success' : 'info', title: updated.isPublished ? 'Evento publicado' : 'Evento retirado', message: updated.isPublished ? 'O evento agora pode aparecer na timeline do jogador.' : 'O evento voltou a ser um rascunho privado.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível alterar a publicação', message: error instanceof Error ? error.message : 'Tente novamente.' });
    }
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
                    <button type="button" className={`${styles.publishButton} ${event.isPublished ? styles.publishButtonActive : ''}`} onClick={() => void togglePublished(event)} aria-pressed={event.isPublished} aria-label={event.isPublished ? 'Retirar evento da publicação' : 'Publicar evento'} title={event.isPublished ? 'Retirar da publicação' : 'Publicar evento'}>
                      {event.isPublished ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{event.isPublished ? 'Publicado' : 'Rascunho'}</span>
                    </button>
                    <button type="button" className={styles.iconButton} onClick={() => setModalEvent(event)} aria-label="Editar evento">
                      <Pencil size={13} />
                    </button>
                    <button type="button" className={styles.iconButton} onClick={() => void removeEvent(event.id)} aria-label="Excluir evento">
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
