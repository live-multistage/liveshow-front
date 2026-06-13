'use client';

import { useState } from 'react';
import { RotateCcw, Tv2, Ticket, Video } from 'lucide-react';
import { TicketCard } from './TicketCard';
import type { PurchasedTicket } from '../types/ticket.types';
import styles from './TicketList.module.scss';

interface TicketListProps {
  tickets: PurchasedTicket[];
  withReplay: PurchasedTicket[];
  withoutReplay: PurchasedTicket[];
  withCamera: PurchasedTicket[];
}

const TABS = [
  { id: 'all',       label: 'Todos',          icon: <Ticket size={14} /> },
  { id: 'replay',    label: 'Com Reprise',     icon: <RotateCcw size={14} /> },
  { id: 'camera',    label: 'Com Câmeras',     icon: <Video size={14} /> },
  { id: 'no-replay', label: 'Apenas Ao Vivo',  icon: <Tv2 size={14} /> },
] as const;

type TabId = typeof TABS[number]['id'];

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
  const [activeTab, setActiveTab] = useState<TabId>('all');

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
        <TicketGroup tickets={tickets} emptyMessage="Nenhum ingresso encontrado." />
      )}
      {activeTab === 'replay' && (
        <TicketGroup
          tickets={withReplay}
          emptyMessage="Nenhum ingresso com reprise. Ingressos Pro e Ultra incluem reprise."
        />
      )}
      {activeTab === 'camera' && (
        <TicketGroup
          tickets={withCamera}
          emptyMessage="Nenhum ingresso com acesso a câmeras."
        />
      )}
      {activeTab === 'no-replay' && (
        <TicketGroup
          tickets={withoutReplay}
          emptyMessage="Todos os seus ingressos incluem reprise!"
        />
      )}
    </div>
  );
}
