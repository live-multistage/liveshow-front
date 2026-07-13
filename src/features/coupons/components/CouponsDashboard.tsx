'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Ticket, Building2, Calendar, CheckCheck, Gift, TimerOff, ChevronDown } from 'lucide-react';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { useMyEventsQuery } from '@/features/events';
import { useListCouponsQuery } from '../queries/use-coupons';
import {
  useCreateCouponMutation,
  useDeactivateCouponMutation,
  useActivateCouponMutation,
} from '../mutations/coupon.mutations';
import { CreateCouponModal } from './CreateCouponModal';
import type { CreateCouponRequest, CouponResponse } from '../types/coupon.types';
import styles from './CouponsDashboard.module.scss';

type TabId = 'all' | 'active' | 'inactive';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

const isExpired = (coupon: CouponResponse) => {
  const days = daysUntil(coupon.expiresAt);
  return days !== null && days < 0;
};

const isLive = (coupon: CouponResponse) => coupon.isActive && !isExpired(coupon);

function KpiCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={styles.kpiCard}>
      {accent && <div className={styles.kpiGlow} />}
      <div className={styles.kpiLabel}>{icon}{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiSub}>{sub}</div>
    </div>
  );
}

function StatusPill({ coupon }: { coupon: CouponResponse }) {
  if (isExpired(coupon)) {
    return <span className={`${styles.statusPill} ${styles.statusExpired}`}>EXPIRADO</span>;
  }
  if (coupon.isActive) {
    return (
      <span className={`${styles.statusPill} ${styles.statusActive}`}>
        <span className={styles.pulseDotGreen} />ATIVO
      </span>
    );
  }
  return <span className={`${styles.statusPill} ${styles.statusInactive}`}>INATIVO</span>;
}

export function CouponsDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');

  const { data: orgs = [], isLoading: orgsLoading } = useMyOrganizationsQuery();
  const orgId = selectedOrgId ?? orgs[0]?.id;
  const orgName = orgs.find((o) => o.id === orgId)?.name ?? '';

  const { data: coupons = [], isLoading: couponsLoading } = useListCouponsQuery(orgId);
  const { data: myEvents } = useMyEventsQuery();
  const createMutation = useCreateCouponMutation(orgId);
  const deactivateMutation = useDeactivateCouponMutation(orgId);
  const activateMutation = useActivateCouponMutation(orgId);

  const isLoading = orgsLoading || couponsLoading;

  // Only upcoming/ongoing events of this org make sense as coupon targets
  const eventOptions = useMemo(
    () =>
      (myEvents ?? [])
        .filter((e) => e.organizationId === orgId)
        .filter((e) => new Date(e.endsAt ?? e.startsAt) >= new Date())
        .map((e) => ({ id: e.id, title: e.title })),
    [myEvents, orgId],
  );

  const counts = useMemo(() => ({
    all: coupons.length,
    active: coupons.filter(isLive).length,
    inactive: coupons.filter((c) => !isLive(c)).length,
  }), [coupons]);

  const totalUses = useMemo(() => coupons.reduce((sum, c) => sum + c.usesCount, 0), [coupons]);
  const expiringSoon = useMemo(
    () => coupons.filter((c) => {
      const days = daysUntil(c.expiresAt);
      return isLive(c) && days !== null && days <= 30;
    }).length,
    [coupons],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return coupons.filter((c) => {
      if (tab === 'active' && !isLive(c)) return false;
      if (tab === 'inactive' && isLive(c)) return false;
      if (q && !c.code.includes(q)) return false;
      return true;
    });
  }, [coupons, tab, query]);

  const scopeOf = (coupon: CouponResponse): { label: string; kind: 'event' | 'org' } => {
    if (coupon.eventId) {
      return {
        label: myEvents?.find((e) => e.id === coupon.eventId)?.title ?? coupon.eventId.slice(0, 8),
        kind: 'event',
      };
    }
    return { label: (coupon.orgIds?.length ?? 0) > 1 ? 'Todas as orgs' : 'Org toda', kind: 'org' };
  };

  const toggle = (coupon: CouponResponse) => {
    if (coupon.isActive) deactivateMutation.mutate(coupon.id);
    else activateMutation.mutate(coupon.id);
  };
  const toggling = deactivateMutation.isPending || activateMutation.isPending;

  const handleCreate = (payload: CreateCouponRequest) => {
    setCreateError(null);
    createMutation.mutate(payload, {
      onSuccess: () => { setModalOpen(false); },
      onError: (err: unknown) => {
        const e = err as { message?: string };
        setCreateError(e?.message ?? 'Erro ao criar cupom');
      },
    });
  };

  if (!orgsLoading && orgs.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}><Ticket size={24} /></div>
        <div className={styles.emptyTitle}>Nenhuma organização encontrada</div>
        <div className={styles.emptyText}>Crie uma organização para gerenciar cupons.</div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'TODOS' },
    { id: 'active', label: 'ATIVOS' },
    { id: 'inactive', label: 'INATIVOS' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <span>PAINEL</span>
        <span className={styles.crumbSep}>/</span>
        <span className={styles.crumbCurrent}>CUPONS</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.headerMeta}>
            <span className={styles.activeBadge}>
              <span className={styles.pulseDot} />
              {counts.active} ATIVOS
            </span>
            <span className={styles.headerCount}>
              {counts.all} cupons{orgName ? ` · ${orgName}` : ''}
            </span>
          </div>
          <h1 className={styles.title}>Cupons</h1>
          <div className={styles.subtitle}>
            Códigos de desconto para toda a organização ou eventos específicos.
          </div>
        </div>

        <div className={styles.headerActions}>
          {orgs.length > 1 && (
            <div className={styles.orgSelectWrap}>
              <Building2 size={15} />
              <select
                value={orgId ?? ''}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                aria-label="Organização"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className={styles.chevron} />
            </div>
          )}
          <button
            className={styles.createBtn}
            onClick={() => { setCreateError(null); setModalOpen(true); }}
            disabled={!orgId}
          >
            <Plus size={15} strokeWidth={2.6} />
            Criar Cupom
          </button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard icon={<Ticket size={13} />} label="TOTAL DE CUPONS" value={String(counts.all)} sub="nesta organização" accent />
        <KpiCard icon={<CheckCheck size={13} />} label="CUPONS ATIVOS" value={String(counts.active)} sub={`${counts.inactive} inativos / expirados`} />
        <KpiCard icon={<Gift size={13} />} label="RESGATES" value={totalUses.toLocaleString('pt-BR')} sub="usos acumulados" />
        <KpiCard icon={<TimerOff size={13} />} label="EXPIRAM EM BREVE" value={String(expiringSoon)} sub="próximos 30 dias" />
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.tabs}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className={styles.tabCount}>{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código..."
            aria-label="Buscar cupom por código"
          />
        </div>
      </div>

      <div className={styles.list}>
        <div className={styles.listHeader}>
          <span>CÓDIGO</span>
          <span>ESCOPO</span>
          <span>DESCONTO</span>
          <span>USOS</span>
          <span>PEDIDO MÍN.</span>
          <span>VALIDADE</span>
          <span className={styles.thRight}>STATUS</span>
        </div>

        {isLoading ? (
          <div className={styles.loadingWrap}><span className={styles.spinner} /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><Ticket size={24} /></div>
            <div className={styles.emptyTitle}>Nenhum cupom encontrado</div>
            <div className={styles.emptyText}>
              {counts.all === 0 ? 'Crie seu primeiro cupom para começar.' : 'Ajuste os filtros ou crie um novo cupom.'}
            </div>
          </div>
        ) : (
          filtered.map((coupon) => {
            const expired = isExpired(coupon);
            const scope = scopeOf(coupon);
            const days = daysUntil(coupon.expiresAt);
            const usesPct = coupon.maxUses
              ? Math.min(100, Math.round((coupon.usesCount / coupon.maxUses) * 100))
              : 0;

            return (
              <div key={coupon.id} className={`${styles.row} ${expired ? styles.expired : ''}`}>
                <div className={styles.codeCell}>
                  <div className={styles.codeIcon}><Ticket size={16} /></div>
                  <span className={styles.codeChip}>{coupon.code}</span>
                </div>

                <div className={styles.scopeCell}>
                  {scope.kind === 'event' ? <Calendar size={13} /> : <Building2 size={13} />}
                  {scope.label}
                </div>

                <div>
                  <div className={styles.discountValue}>
                    {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : brl(coupon.discountValue)}
                  </div>
                  <div className={styles.discountKind}>
                    {coupon.discountType === 'PERCENTAGE' ? 'PERCENTUAL' : 'VALOR FIXO'}
                  </div>
                </div>

                <div>
                  <div className={styles.usesValue}>
                    {coupon.usesCount}
                    {coupon.maxUses != null && <span> / {coupon.maxUses}</span>}
                  </div>
                  {coupon.maxUses != null ? (
                    <div className={styles.usesBar}><div style={{ width: `${usesPct}%` }} /></div>
                  ) : (
                    <div className={styles.usesUnlimited}>ILIMITADO</div>
                  )}
                </div>

                <div className={`${styles.minOrder} ${coupon.minOrderAmount == null ? styles.minEmpty : ''}`}>
                  {coupon.minOrderAmount != null ? brl(coupon.minOrderAmount) : '—'}
                </div>

                <div>
                  <div className={styles.expiryDate}>
                    {coupon.expiresAt
                      ? new Date(coupon.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'}
                  </div>
                  {days !== null && (
                    <div
                      className={`${styles.expiryRemain} ${days < 0 ? styles.remainOver : days <= 30 ? styles.remainSoon : ''}`}
                    >
                      {days < 0 ? 'ENCERRADO' : days <= 30 ? `EXPIRA EM ${days}D` : `${days} DIAS REST.`}
                    </div>
                  )}
                </div>

                <div className={styles.statusCell}>
                  <StatusPill coupon={coupon} />
                  {expired ? (
                    <div className={styles.togglePlaceholder} />
                  ) : (
                    <button
                      className={`${styles.toggle} ${coupon.isActive ? styles.toggleOn : ''}`}
                      onClick={() => toggle(coupon)}
                      disabled={toggling}
                      role="switch"
                      aria-checked={coupon.isActive}
                      title={coupon.isActive ? 'Desativar cupom' : 'Reativar cupom'}
                      aria-label={coupon.isActive ? `Desativar cupom ${coupon.code}` : `Reativar cupom ${coupon.code}`}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {orgId && (
        <CreateCouponModal
          isOpen={modalOpen}
          orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}
          defaultOrgId={orgId}
          events={eventOptions}
          isPending={createMutation.isPending}
          error={createError}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
