'use client';

import { useState } from 'react';
import { RotateCcw, Tv2, Ticket, Video } from 'lucide-react';
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

  const TABS = [
    { id: 'all' as TabId,       label: t('all'),         icon: <Ticket size={14} /> },
    { id: 'replay' as TabId,    label: t('withReplay'),  icon: <RotateCcw size={14} /> },
    { id: 'camera' as TabId,    label: t('withCameras'), icon: <Video size={14} /> },
    { id: 'no-replay' as TabId, label: t('liveOnly'),    icon: <Tv2 size={14} /> },
  ];

  const counts: Record<TabId, number> = {
    all: tickets.length,
    replay: withReplay.length,
    camera: withCamera.length,
    'no-replay': withoutReplay.length,
  };

  return (
    <div className={styles.tabs}>
      <div className={styles.tabList}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
          >
            {tab.icon}
            {tab.label}
            <span className={styles.tabBadge}>{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      {activeTab === 'all' && (
        <TicketGroup tickets={tickets} emptyMessage={t('emptyAll')} />
      )}
      {activeTab === 'replay' && (
        <TicketGroup tickets={withReplay} emptyMessage={t('emptyReplay')} />
      )}
      {activeTab === 'camera' && (
        <TicketGroup tickets={withCamera} emptyMessage={t('emptyCamera')} />
      )}
      {activeTab === 'no-replay' && (
        <TicketGroup tickets={withoutReplay} emptyMessage={t('emptyNoReplay')} />
      )}
    </div>
  );
}
