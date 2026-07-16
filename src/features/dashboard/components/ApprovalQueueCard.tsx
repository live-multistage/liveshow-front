'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useOrganizationDirectoryQuery } from '@/features/platform-admin/queries/get-organization-directory';
import { useApproveOrganizationMutation } from '@/features/platform-admin/mutations/approve-organization.mutation';
import { RejectOrgDialog } from '@/features/platform-admin/components/RejectOrgDialog';
import type { PlatformOrganization } from '@/features/platform-admin/types/platform-admin.types';
import styles from './SuperAdminDashboard.module.scss';

// Onboarding approval queue (design: "Fila de aprovação"). Reuses the existing
// pending directory query + approve/reject mutations — no new backend.
export function ApprovalQueueCard() {
  const { data, isLoading } = useOrganizationDirectoryQuery({ status: 'PENDING', page: 1, limit: 6 });
  const approve = useApproveOrganizationMutation();
  const [rejecting, setRejecting] = useState<PlatformOrganization | null>(null);

  const pending = data?.items ?? [];

  return (
    <div className={styles.finCard}>
      <div className={styles.finHeader}>
        <div>
          <div className={styles.finEyebrow}>ONBOARDING</div>
          <div className={styles.finTitle}>Fila de aprovação</div>
        </div>
        {pending.length > 0 && <span className={styles.queueBadge}>{data?.total ?? pending.length}</span>}
      </div>

      {isLoading && <div className={styles.balEmpty}>Carregando…</div>}
      {!isLoading && pending.length === 0 && (
        <div className={styles.balEmpty}>Nenhuma organização aguardando aprovação.</div>
      )}

      <div className={styles.queueList}>
        {pending.map((org) => (
          <div key={org.id} className={styles.queueItem}>
            <div className={styles.queueTop}>
              <div className={styles.queueArt} />
              <div className={styles.queueInfo}>
                <div className={styles.queueName}>{org.name}</div>
                <div className={styles.queueMeta}>
                  {new Date(org.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            <div className={styles.queueActions}>
              <button
                className={styles.queueApprove}
                disabled={approve.isPending}
                onClick={() => approve.mutate(org.id)}
              >
                <Check size={12} strokeWidth={3} />
                Aprovar
              </button>
              <button className={styles.queueReject} onClick={() => setRejecting(org)}>
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>

      {rejecting && (
        <RejectOrgDialog
          open={!!rejecting}
          onOpenChange={(o) => !o && setRejecting(null)}
          organization={rejecting}
          onRejected={() => setRejecting(null)}
        />
      )}
    </div>
  );
}
