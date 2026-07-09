'use client';

import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, MapPin, Camera } from 'lucide-react';
import type { CreateEventFormValues } from '../../schemas/create-event.schema';
import type { OrganizationResponse } from '@/features/organizations/types/organization.types';
import type { AddedTicket } from './TicketSection';
import { formatDate, formatTime, formatDuration, formatPrice } from '../../utils/event-formatters';
import eventStyles from '../public/EventDetailPageContent.module.scss';
import styles from './EventPreviewPanel.module.scss';

interface Props {
  control: Control<CreateEventFormValues>;
  orgs: OrganizationResponse[];
  tickets: AddedTicket[];
}

function hasValidDate(value: string): boolean {
  return !!value && !isNaN(new Date(value).getTime());
}

export function EventPreviewPanel({ control, orgs, tickets }: Props) {
  const t = useTranslations('events.detail');
  const tInfo = useTranslations('createEvent.info');
  const tp = useTranslations('createEvent.preview');

  const title = useWatch({ control, name: 'title' });
  const description = useWatch({ control, name: 'description' });
  const venue = useWatch({ control, name: 'venue' });
  const city = useWatch({ control, name: 'city' });
  const country = useWatch({ control, name: 'country' });
  const startsAt = useWatch({ control, name: 'startsAt' });
  const endsAt = useWatch({ control, name: 'endsAt' });
  const camerasCountRaw = useWatch({ control, name: 'camerasCount' });
  const organizationId = useWatch({ control, name: 'organizationId' });

  const camerasCount = Number.isFinite(camerasCountRaw) && camerasCountRaw > 0 ? camerasCountRaw : 1;
  const org = orgs.find((o) => o.id === organizationId) ?? null;
  const datesValid = hasValidDate(startsAt) && hasValidDate(endsAt);
  const venueLine = [city, country].filter(Boolean).join(', ') || '—';

  const metaItems = [
    { icon: <Calendar size={12} />, label: t('date'), value: datesValid ? formatDate(startsAt) : '—' },
    { icon: <Clock size={12} />, label: t('time'), value: datesValid ? `${formatTime(startsAt)} · ${formatDuration(startsAt, endsAt)}` : '—' },
    { icon: <MapPin size={12} />, label: t('venue'), value: venueLine },
    { icon: <Camera size={12} />, label: t('cameras'), value: t('angles', { count: camerasCount }) },
  ];

  return (
    <div className={styles.wrap}>
      <p className={styles.wrapLabel}>{tp('heading')}</p>

      <div className={`${eventStyles.hero} ${styles.heroSm}`}>
        <div className={eventStyles.heroPlaceholder} />
        <div className={eventStyles.heroScrim} />
        <div className={`${eventStyles.heroContent} ${styles.heroContentSm}`}>
          <div className={eventStyles.heroBadges}>
            <span className={eventStyles.badgeStatus}>{tp('badge')}</span>
          </div>
          <h1 className={`${eventStyles.heroTitle} ${styles.heroTitleSm}`}>
            {title || tp('titlePlaceholder')}
          </h1>
          {venue && (
            <div className={`${eventStyles.heroVenue} ${styles.heroVenueSm}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              {venue}
            </div>
          )}
        </div>
      </div>

      <div className={`${eventStyles.metaGrid} ${styles.metaGridSm}`}>
        {metaItems.map((item) => (
          <div key={item.label} className={`${eventStyles.metaCard} ${styles.metaCardSm}`}>
            <div className={`${eventStyles.metaLabel} ${styles.metaLabelSm}`}>
              <span className={eventStyles.metaIcon}>{item.icon}</span>
              {item.label}
            </div>
            <p className={`${eventStyles.metaValue} ${styles.metaValueSm}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className={`${eventStyles.orgCard} ${styles.orgCardSm}`}>
        <div className={`${eventStyles.orgAvatar} ${styles.orgAvatarSm}`}>
          {org && org.logoUrl && (
            <img src={org.logoUrl} alt={org.name} className={eventStyles.orgAvatarImg} />
          )}
        </div>
        <div className={eventStyles.orgInfo}>
          <span className={eventStyles.orgLabel}>{t('organization')}</span>
          <span className={`${eventStyles.orgName} ${styles.orgNameSm}`}>
            {org?.name ?? tp('noOrg')}
          </span>
        </div>
      </div>

      <div className={`${eventStyles.section} ${styles.sectionSm}`}>
        <div className={eventStyles.sectionLabel}>SOBRE O SHOW</div>
        <p className={`${eventStyles.description} ${styles.descriptionSm}`}>
          {description || tInfo('descPlaceholder')}
        </p>
      </div>

      <div className={`${eventStyles.section} ${styles.sectionSm}`}>
        <div className={eventStyles.sectionLabel}>{tp('ticketsHeading')}</div>
        {tickets.length === 0 ? (
          <p className={styles.ticketsEmpty}>{tp('ticketsEmpty')}</p>
        ) : (
          <div className={styles.ticketList}>
            {tickets.map((ticket) => (
              <div key={ticket._key} className={styles.ticketItem}>
                <div className={styles.ticketItemHeader}>
                  <span className={styles.ticketName}>{ticket.name}</span>
                  <span className={styles.ticketPrice}>{formatPrice(ticket.price)}</span>
                </div>
                {ticket.description && (
                  <p className={styles.ticketDesc}>{ticket.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
