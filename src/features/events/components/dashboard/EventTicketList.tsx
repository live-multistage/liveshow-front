'use client';

import { Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPrice } from '../../utils/event-formatters';
import type { TicketProductResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

interface Props {
  tickets: TicketProductResponse[];
}

export function EventTicketList({ tickets }: Props) {
  const t = useTranslations('eventDetail');

  if (tickets.length === 0) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('ticketsTitle')}</h2>
      <div className={styles.ticketList}>
        {tickets.map((ticket) => (
          <div key={ticket.id} className={styles.ticketRow}>
            <div>
              <p className={styles.ticketName}>{ticket.name}</p>
              <p className={styles.ticketDesc}>{ticket.description}</p>
              {ticket.capabilities.includes('CAMERA_VIEW') && (
                <span className={styles.ticketCameraBadge}>
                  <Video size={10} />
                  {ticket.camerasLimit === null
                    ? t('allCameras')
                    : t('cameraCount', { count: ticket.camerasLimit })}
                </span>
              )}
            </div>
            <p className={styles.ticketPrice}>{formatPrice(ticket.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
