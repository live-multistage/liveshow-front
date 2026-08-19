'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ScanLine, ChevronRight } from 'lucide-react';
import { ticketingService } from '../services/ticketing.service';
import styles from './CheckInEventPicker.module.scss';

// The staff picks the event BEFORE scanning — the ticket never decides the
// event (see the physical-tickets spec design note). This is just navigation
// into /checkin/[eventId], where every scan validates against that event.
export function CheckInEventPicker() {
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['gateable-events'],
    queryFn: ticketingService.getGateableEvents,
    staleTime: 60_000,
  });

  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>PORTARIA</div>
      <h1 className={styles.title}>Escolha o evento</h1>
      <p className={styles.subtitle}>
        Os ingressos serão validados somente contra o evento selecionado.
      </p>

      {isLoading && <p className={styles.state}>Carregando eventos…</p>}
      {isError && <p className={styles.state}>Não foi possível carregar seus eventos.</p>}
      {!isLoading && !isError && events.length === 0 && (
        <p className={styles.state}>
          Nenhum evento disponível — peça ao organizador para te adicionar como STAFF.
        </p>
      )}

      <div className={styles.list}>
        {events.map((ev) => (
          <Link key={ev.id} href={`/checkin/${ev.id}`} className={styles.item}>
            <div className={styles.itemBody}>
              <span className={styles.itemTitle}>{ev.title}</span>
              <span className={styles.itemMeta}>
                {new Date(ev.startsAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {ev.venue ? ` · ${ev.venue}` : ''}
                {ev.city ? ` · ${ev.city}` : ''}
              </span>
            </div>
            <span className={styles.itemAction}>
              <ScanLine size={15} />
              <ChevronRight size={15} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
