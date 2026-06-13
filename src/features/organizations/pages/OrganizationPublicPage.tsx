'use client';

import { useState } from 'react';
import { Building2, Users, Calendar, Radio } from 'lucide-react';
import { useOrganizationBySlug, useOrganizationEvents } from '../hooks/use-organizations';
import { useOrganizationMembers } from '../hooks/use-organization-members';
import { OrganizationPublicEventCard } from '../components/OrganizationPublicEventCard';
import styles from './OrganizationPublicPage.module.scss';

type Tab = 'upcoming' | 'past';

interface Props {
  slug: string;
}

export function OrganizationPublicPage({ slug }: Props) {
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data: org, isLoading: orgLoading, isError: orgError } = useOrganizationBySlug(slug);
  const { data: members = [] } = useOrganizationMembers(org?.id ?? '');
  const { data: upcomingEvents = [], isLoading: upcomingLoading } = useOrganizationEvents(
    org?.id ?? '',
    'upcoming',
  );
  const { data: pastEvents = [], isLoading: pastLoading } = useOrganizationEvents(
    org?.id ?? '',
    'past',
  );

  if (orgLoading) {
    return (
      <div className={styles.statePage}>
        <p className={styles.stateText}>Carregando organização...</p>
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className={styles.statePage}>
        <p className={`${styles.stateText} ${styles.stateError}`}>Organização não encontrada.</p>
      </div>
    );
  }

  const liveEvents = upcomingEvents.filter((e) => e.status === 'LIVE');
  const scheduledEvents = upcomingEvents.filter((e) => e.status !== 'LIVE');
  const activeEvents = tab === 'upcoming' ? upcomingEvents : pastEvents;
  const isLoading = tab === 'upcoming' ? upcomingLoading : pastLoading;

  return (
    <div className={styles.page}>
      <div className={styles.banner}>
        {org.bannerUrl ? (
          <img src={org.bannerUrl} alt={`${org.name} banner`} className={styles.bannerImg} />
        ) : (
          <div className={styles.bannerPlaceholder} />
        )}
      </div>

      <div className={styles.container}>
        <div className={styles.profileRow}>
          <div className={styles.avatar}>
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <Building2 size={32} />
              </div>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h1 className={styles.orgName}>{org.name}</h1>
            <p className={styles.orgSlug}>@{org.slug}</p>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.main}>
            {org.description && (
              <section className={styles.section}>
                <p className={styles.description}>{org.description}</p>
              </section>
            )}

            {liveEvents.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <Radio size={14} className={styles.liveIcon} />
                  Ao Vivo Agora
                </h2>
                <div className={styles.eventList}>
                  {liveEvents.map((event) => (
                    <OrganizationPublicEventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            <section className={styles.section}>
              <div className={styles.tabsRow}>
                <button
                  className={`${styles.tab} ${tab === 'upcoming' ? styles.tabActive : ''}`}
                  onClick={() => setTab('upcoming')}
                >
                  <Calendar size={13} />
                  Próximos ({scheduledEvents.length})
                </button>
                <button
                  className={`${styles.tab} ${tab === 'past' ? styles.tabActive : ''}`}
                  onClick={() => setTab('past')}
                >
                  Anteriores ({pastEvents.length})
                </button>
              </div>

              {isLoading && <p className={styles.loadingText}>Carregando eventos...</p>}

              {!isLoading && activeEvents.length === 0 && (
                <p className={styles.emptyText}>
                  {tab === 'upcoming'
                    ? 'Nenhum evento programado.'
                    : 'Nenhum evento anterior.'}
                </p>
              )}

              {!isLoading && activeEvents.length > 0 && (
                <div className={styles.eventList}>
                  {activeEvents.map((event) => (
                    <OrganizationPublicEventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Sobre</h3>
              <div className={styles.statRow}>
                <Users size={14} className={styles.statIcon} />
                <span className={styles.statText}>{members.length} membros</span>
              </div>
              <div className={styles.statRow}>
                <Calendar size={14} className={styles.statIcon} />
                <span className={styles.statText}>
                  {upcomingEvents.length} eventos programados
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
