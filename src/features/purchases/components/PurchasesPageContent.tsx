'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Calendar, Ticket, Check, Download } from 'lucide-react';
import { useOrderHistoryQuery } from '../queries/get-order-history';
import type { OrderHistoryItem } from '../types/order-history.types';
import styles from './PurchasesPageContent.module.scss';

type FilterId = 'todos' | 'ativos' | 'passados' | 'reembolsados';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const GRADIENTS = [
  'linear-gradient(135deg,#ff2e9e,#7a1547)',
  'linear-gradient(135deg,#9b7bff,#2a1a5e)',
  'linear-gradient(135deg,#46d6d8,#123b47)',
  'linear-gradient(135deg,#ffb347,#7a3f10)',
  'linear-gradient(135deg,#ff6a52,#5e1a12)',
];

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const PAGE_SIZE = 5;

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function isUpcoming(iso: string | null): boolean {
  return iso ? new Date(iso).getTime() >= Date.now() : false;
}

function matchesFilter(o: OrderHistoryItem, f: FilterId): boolean {
  switch (f) {
    case 'ativos':
      return o.status === 'PAID' && isUpcoming(o.eventStartsAt);
    case 'passados':
      return o.status === 'PAID' && !isUpcoming(o.eventStartsAt);
    case 'reembolsados':
      return o.status === 'REFUNDED';
    default:
      return true;
  }
}

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pago', PENDING: 'Pendente', CANCELLED: 'Cancelado', REFUNDED: 'Reembolsado',
};

export function PurchasesPageContent() {
  const { data: orders, isLoading, isError } = useOrderHistoryQuery();
  const [filter, setFilter] = useState<FilterId>('todos');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const all = orders ?? [];

  const stats = useMemo(() => {
    const paid = all.filter((o) => o.status === 'PAID');
    return {
      pedidos: all.length,
      ingressos: paid.length,
      gasto: paid.reduce((sum, o) => sum + o.totalAmount, 0),
    };
  }, [all]);

  const filters: { id: FilterId; label: string; count: number }[] = useMemo(
    () => [
      { id: 'todos', label: 'Todos', count: all.length },
      { id: 'ativos', label: 'Ativos', count: all.filter((o) => matchesFilter(o, 'ativos')).length },
      { id: 'passados', label: 'Passados', count: all.filter((o) => matchesFilter(o, 'passados')).length },
      { id: 'reembolsados', label: 'Reembolsados', count: all.filter((o) => matchesFilter(o, 'reembolsados')).length },
    ],
    [all],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((o) => {
      if (!matchesFilter(o, filter)) return false;
      if (!q) return true;
      return o.eventTitle.toLowerCase().includes(q) || o.code.toLowerCase().includes(q);
    });
  }, [all, filter, search]);

  const shown = filtered.slice(0, visible);

  function pickFilter(id: FilterId) {
    setFilter(id);
    setVisible(PAGE_SIZE);
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/settings">Minha Conta</Link>
          <span className={styles.sep}>/</span>
          <span className={styles.current}>Compras</span>
        </nav>

        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>HISTÓRICO DE PEDIDOS</div>
            <h1 className={styles.title}>Compras</h1>
            <p className={styles.subtitle}>Todos os ingressos que você já adquiriu na Liveshow</p>
          </div>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>PEDIDOS</div>
              <div className={styles.statValue}>
                <span className={styles.statNumber}>{stats.pedidos}</span>
                <span className={styles.statUnit}>no total</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>INGRESSOS</div>
              <div className={styles.statValue}>
                <span className={styles.statNumber}>{stats.ingressos}</span>
                <span className={styles.statUnit}>comprados</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardAccent}`}>
              <div className={styles.statGlow} />
              <div className={`${styles.statLabel} ${styles.statLabelAccent}`}>GASTO TOTAL</div>
              <div className={styles.statValue}>
                <span className={styles.statNumber}>{brl.format(stats.gasto)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.filters}>
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => pickFilter(f.id)}
                className={`${styles.filterBtn} ${filter === f.id ? styles.filterActive : ''}`}
              >
                {f.label}
                <span className={styles.filterCount}>{f.count}</span>
              </button>
            ))}
          </div>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por evento ou pedido…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisible(PAGE_SIZE);
              }}
            />
          </div>
        </div>

        <div className={styles.columns}>
          <span>Evento</span>
          <span>Pedido / Data</span>
          <span>Itens</span>
          <span>Total</span>
          <span className={styles.colSpacer} />
        </div>

        {isLoading ? (
          <div className={styles.state}>Carregando suas compras…</div>
        ) : isError ? (
          <div className={styles.state}>Não foi possível carregar suas compras.</div>
        ) : filtered.length === 0 ? (
          <div className={styles.state}>
            {all.length === 0 ? 'Você ainda não fez nenhuma compra.' : 'Nenhum pedido para este filtro.'}
          </div>
        ) : (
          <div className={styles.list}>
            {shown.map((o) => (
              <div key={o.orderId} className={styles.row}>
                <div className={styles.event}>
                  <div className={styles.art} style={{ background: gradientFor(o.orderId) }}>
                    <div className={styles.artShade} />
                  </div>
                  <div className={styles.eventText}>
                    <div className={styles.eventName}>{o.eventTitle}</div>
                    <div className={styles.eventVenue}>{o.eventVenue ?? '—'}</div>
                  </div>
                </div>

                <div className={styles.orderCell}>
                  <div className={styles.orderCode}>{o.code}</div>
                  <div className={styles.orderDate}>
                    <Calendar size={13} className={styles.calIcon} />
                    {fmtDate(o.createdAt)}
                  </div>
                </div>

                <div className={styles.items}>
                  <Ticket size={15} className={styles.itemIcon} />
                  <span>{o.ticketProductName}</span>
                </div>

                <div className={styles.total}>{brl.format(o.totalAmount)}</div>

                <div className={styles.actions}>
                  {o.status === 'PAID' ? (
                    <span className={`${styles.badge} ${styles.badgePaid}`}>
                      <Check size={11} strokeWidth={3} />
                      PAGO
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>
                      {(STATUS_LABEL[o.status] ?? o.status).toUpperCase()}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.download}
                    disabled
                    title="Recibo em breve"
                    aria-label="Baixar recibo"
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.footerNote}>
              Mostrando {shown.length} de {filtered.length} pedidos
            </div>
            {visible < filtered.length && (
              <button
                type="button"
                className={styles.loadMore}
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Carregar mais
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
