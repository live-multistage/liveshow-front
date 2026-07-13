'use client';

import { useMemo, useState } from 'react';
import { Plus, PowerOff, Tag } from 'lucide-react';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { useMyEventsQuery } from '@/features/events';
import { useListCouponsQuery } from '../queries/use-coupons';
import { useCreateCouponMutation, useDeactivateCouponMutation } from '../mutations/coupon.mutations';
import { CreateCouponModal } from './CreateCouponModal';
import type { CreateCouponRequest, CouponResponse } from '../types/coupon.types';
import styles from './CouponsDashboard.module.scss';

function formatDiscount(coupon: CouponResponse): string {
  if (coupon.discountType === 'PERCENTAGE') return `${coupon.discountValue}%`;
  return coupon.discountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  return new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}>
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  );
}

export function CouponsDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: orgs = [], isLoading: orgsLoading } = useMyOrganizationsQuery();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const orgId = selectedOrgId ?? orgs[0]?.id;

  const { data: coupons = [], isLoading: couponsLoading } = useListCouponsQuery(orgId);
  const { data: myEvents } = useMyEventsQuery();
  const createMutation = useCreateCouponMutation(orgId);
  const deactivateMutation = useDeactivateCouponMutation(orgId);

  // Only upcoming/ongoing events of this org make sense as coupon targets
  const eventOptions = useMemo(
    () =>
      (myEvents ?? [])
        .filter((e) => e.organizationId === orgId)
        .filter((e) => new Date(e.endsAt ?? e.startsAt) >= new Date())
        .map((e) => ({ id: e.id, title: e.title })),
    [myEvents, orgId],
  );

  const scopeLabel = (coupon: CouponResponse) =>
    coupon.eventId
      ? (myEvents?.find((e) => e.id === coupon.eventId)?.title ?? coupon.eventId.slice(0, 8))
      : (coupon.orgIds?.length ?? 0) > 1 // stale cached payloads may predate orgIds
        ? 'Todas as orgs'
        : 'Org toda';

  const isLoading = orgsLoading || couponsLoading;

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

  const handleDeactivate = (id: string) => {
    deactivateMutation.mutate(id);
  };

  if (!orgsLoading && orgs.length === 0) {
    return (
      <div className={styles.empty}>
        <Tag size={32} className={styles.emptyIcon} />
        <p className={styles.emptyText}>Nenhuma organização encontrada.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <p className={styles.subtitle}>
          {!isLoading && `${coupons.length} cupom${coupons.length !== 1 ? 'ns' : ''}`}
        </p>
        {orgs.length > 1 && (
          <select
            className={styles.orgSelect}
            value={orgId ?? ''}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            aria-label="Organização"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
        <button
          className={styles.createBtn}
          onClick={() => { setCreateError(null); setModalOpen(true); }}
          disabled={!orgId}
        >
          <Plus size={15} />
          Criar Cupom
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loadingWrap}>
          <span className={styles.spinner} />
        </div>
      ) : coupons.length === 0 ? (
        <div className={styles.empty}>
          <Tag size={32} className={styles.emptyIcon} />
          <p className={styles.emptyText}>Nenhum cupom criado ainda.</p>
          <button className={styles.createBtn} onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Criar primeiro cupom
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Código</th>
                <th className={styles.th}>Escopo</th>
                <th className={styles.th}>Desconto</th>
                <th className={styles.th}>Usos</th>
                <th className={styles.th}>Pedido mín.</th>
                <th className={styles.th}>Validade</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.code}>{coupon.code}</span>
                  </td>
                  <td className={styles.td}>{scopeLabel(coupon)}</td>
                  <td className={styles.td}>{formatDiscount(coupon)}</td>
                  <td className={styles.td}>
                    {coupon.usesCount}
                    {coupon.maxUses != null && <span className={styles.muted}> / {coupon.maxUses}</span>}
                  </td>
                  <td className={styles.td}>
                    {coupon.minOrderAmount != null
                      ? coupon.minOrderAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '—'}
                  </td>
                  <td className={styles.td}>{formatExpiry(coupon.expiresAt)}</td>
                  <td className={styles.td}><StatusBadge isActive={coupon.isActive} /></td>
                  <td className={styles.td}>
                    {coupon.isActive && (
                      <button
                        className={styles.deactivateBtn}
                        onClick={() => handleDeactivate(coupon.id)}
                        disabled={deactivateMutation.isPending}
                        title="Desativar cupom"
                      >
                        <PowerOff size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
