'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TicketCard } from './TicketCard';
import type { PurchasedTicket } from '../types/ticket.types';
import styles from './TicketList.module.scss';

interface TicketListProps {
  tickets: PurchasedTicket[];
  withReplay: PurchasedTicket[];
  withoutReplay: PurchasedTicket[];
  withCamera: PurchasedTicket[];
}

type TabId = 'all' | 'replay' | 'camera' | 'no-replay';

function TicketGroup({ tickets, emptyMessage }: { tickets: PurchasedTicket[]; emptyMessage: string }) {
  if (tickets.length === 0) return <p className={styles.empty}>{emptyMessage}</p>;
  return (
    <div className={styles.ticketGroup}>
      {tickets.map((ticket) => (
        <TicketCard key={ticket.orderId} ticket={ticket} />
      ))}
    </div>
  );
}

export function TicketList({ tickets, withReplay, withoutReplay, withCamera }: TicketListProps) {
  const t = useTranslations('ticketList');
  const [activeTab, setActiveTab] = useState<TabId>('all');

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'all',
      label: t('all'),
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
        </svg>
      ),
    },
    {
      id: 'replay',
      label: t('withReplay'),
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 1 3 6.7M3 21v-5h5" />
        </svg>
      ),
    },
    {
      id: 'camera',
      label: t('withCameras'),
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 7l-7 5 7 5V7Z" /><rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      ),
    },
    {
      id: 'no-replay',
      label: t('liveOnly'),
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M12 19v3M8 22h8" />
        </svg>
      ),
    },
  ];

  const counts: Record<TabId, number> = {
    all: tickets.length,
    replay: withReplay.length,
    camera: withCamera.length,
    'no-replay': withoutReplay.length,
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabList}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tab} ${isActive ? styles.tabActive : styles.tabInactive}`}
            >
              {tab.icon}
              {tab.label}
              <span className={isActive ? styles.badgeActive : styles.badgeInactive}>
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'all' && <TicketGroup tickets={tickets} emptyMessage={t('emptyAll')} />}
      {activeTab === 'replay' && <TicketGroup tickets={withReplay} emptyMessage={t('emptyReplay')} />}
      {activeTab === 'camera' && <TicketGroup tickets={withCamera} emptyMessage={t('emptyCamera')} />}
      {activeTab === 'no-replay' && <TicketGroup tickets={withoutReplay} emptyMessage={t('emptyNoReplay')} />}
    </div>
  );
}
