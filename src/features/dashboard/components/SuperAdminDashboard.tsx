'use client';

import { useState } from 'react';
import { Building2, Users, Radio, CalendarDays, Ticket, DollarSign, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  usePlatformOverviewQuery,
  type OverviewRange,
} from '@/features/platform-admin/queries/get-platform-overview';
import { LiveViewersCard } from './LiveViewersCard';
import { RevenueCard } from './RevenueCard';
import { OrgBalancesCard } from './OrgBalancesCard';
import { StreamHealthCard } from './StreamHealthCard';
import { ApprovalQueueCard } from './ApprovalQueueCard';
import { PlatformSettingsCard } from './PlatformSettingsCard';
import { CatalogCards } from './CatalogCards';
import { AuditLogCard } from './AuditLogCard';
import { ImpersonationCard } from './ImpersonationCard';
import styles from './SuperAdminDashboard.module.scss';

// Global super-admin overview (design: Liveshow Super Admin Global.dc.html).
// F1 = shell + global KPIs. Metrics come from the dedicated aggregation
// endpoint — NOT the membership-scoped useMyEventsQuery the regular admin
// overview uses. Financial / operational / governance rows land with their
// own specs, plugging into this same shell.

const RANGES: { id: OverviewRange; label: string }[] = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
];

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k`;
  return `${(n / 1_000_000).toFixed(2).replace('.', ',')}M`;
}

export function SuperAdminDashboard() {
  const [range, setRange] = useState<OverviewRange>('30d');
  const { data, isLoading } = usePlatformOverviewQuery(range);

  const kpis = data
    ? [
        { label: 'ORGS', icon: Building2, color: '#ff5fb4', value: compact(data.orgs.total),
          delta: `${data.orgs.active} ativas · ${data.orgs.pending} pendentes`, deltaColor: '#8f8f97' },
        { label: 'USUÁRIOS', icon: Users, color: '#9b7bff', value: compact(data.users.total),
          delta: `+${compact(data.users.newInRange)} no período`, deltaColor: '#7fe0a0' },
        { label: 'AO VIVO', icon: Radio, color: '#EF4444', value: String(data.events.live), unit: 'agora',
          delta: 'transmitindo', deltaColor: '#8f8f97' },
        { label: 'EVENTOS', icon: CalendarDays, color: '#46d6d8', value: compact(data.events.total),
          delta: `${data.events.scheduled} agendados`, deltaColor: '#8f8f97' },
        { label: 'GMV', icon: Ticket, color: '#ffd166', value: compact(data.gmv), unit: 'R$',
          delta: `últimos ${data.rangeDays} dias`, deltaColor: '#8f8f97' },
        { label: 'RECEITA', icon: DollarSign, color: '#ff5fb4', value: compact(data.platformRevenue), unit: 'R$',
          delta: 'comissões da plataforma', deltaColor: '#8f8f97' },
      ]
    : [];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>PLATAFORMA · VISÃO GLOBAL</div>
          <h1 className={styles.heading}>Painel Super Admin</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.rangeSwitch}>
            {RANGES.map((r) => (
              <button
                key={r.id}
                className={`${styles.rangeBtn} ${range === r.id ? styles.rangeBtnActive : ''}`}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className={styles.globalTag}>
            <span className={styles.pulseDot} />
            GLOBAL
          </span>
        </div>
      </div>

      <div className={styles.banner}>
        <AlertTriangle size={17} className={styles.bannerIcon} />
        <span>
          <b>Escopo global.</b> Estas métricas agregam toda a plataforma via queries dedicadas —
          não os eventos escopados às suas organizações.
        </span>
      </div>

      <div className={styles.kpiGrid}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={styles.kpiSkeleton} />)
          : kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>
                    <Icon size={14} color={k.color} />
                    {k.label}
                  </div>
                  <div className={styles.kpiValueRow}>
                    <span className={styles.kpiValue}>{k.value}</span>
                    {k.unit && <span className={styles.kpiUnit}>{k.unit}</span>}
                  </div>
                  <div className={styles.kpiDelta} style={{ color: k.deltaColor }}>{k.delta}</div>
                </div>
              );
            })}
      </div>

      {/* Receita (idea 4) + fila de aprovação (idea 3). */}
      <div className={styles.row}>
        <RevenueCard range={range} />
        <ApprovalQueueCard />
      </div>

      {/* Saúde dos streams (idea 7) + espectadores agora (idea 8). */}
      <div className={styles.row}>
        <StreamHealthCard />
        <LiveViewersCard />
      </div>

      {/* Config (idea 1) + saldos das organizações (idea 5). */}
      <div className={styles.row}>
        <PlatformSettingsCard />
        <OrgBalancesCard />
      </div>

      {/* Catálogo global (ideas 9/10/11). */}
      <CatalogCards />

      {/* Trilha de auditoria (idea 12) + impersonação read-only (idea 13). */}
      <div className={styles.row}>
        <AuditLogCard />
        <ImpersonationCard />
      </div>
    </div>
  );
}
