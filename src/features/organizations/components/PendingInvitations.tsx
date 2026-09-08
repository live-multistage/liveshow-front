'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MailPlus } from 'lucide-react';
import { useOrganizationInvitations, useRevokeInvitation } from '../hooks/use-organization-invitations';
import { revokeErrorKey } from '../utils/invitation-errors';
import { RemoveMemberDialog } from './RemoveMemberDialog';
import styles from './PendingInvitations.module.scss';

const ROLE_LABEL_KEYS = ['OWNER', 'ADMIN', 'EVENT_MANAGER', 'CONTENT_MANAGER', 'OPERATOR', 'STAFF', 'VIEWER'];

interface Props {
  organizationId: string;
  canManage: boolean;
}

export function PendingInvitations({ organizationId, canManage }: Props) {
  const t = useTranslations('organizations');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Only admins can read invitations (403 otherwise), so don't even ask.
  const { data: invitations = [], isLoading } = useOrganizationInvitations(organizationId, canManage);
  const revokeMutation = useRevokeInvitation(organizationId);

  if (!canManage) return null;

  const pending = invitations.filter((i) => i.status === 'PENDING');
  const revoking = pending.find((i) => i.id === revokingId) ?? null;

  const handleRevoke = () => {
    if (!revokingId) return;
    setRevokeError(null);
    revokeMutation.mutate(revokingId, {
      onSuccess: () => setRevokingId(null),
      onError: (e) => {
        setRevokeError(t(revokeErrorKey(e)));
        setRevokingId(null);
      },
    });
  };

  return (
    <section className={styles.section} data-testid="pending-invitations">
      <div className={styles.header}>
        <h2 className={styles.title}>
          <MailPlus size={13} /> {t('pendingInvitationsTitle')} ({pending.length})
        </h2>
      </div>

      {revokeError && <p className={styles.error}>{revokeError}</p>}

      {isLoading ? (
        <p className={styles.state}>{t('pendingInvitationsLoading')}</p>
      ) : pending.length === 0 ? (
        <p className={styles.state}>{t('pendingInvitationsEmpty')}</p>
      ) : (
        <ul className={styles.list}>
          {pending.map((invitation) => (
            <li key={invitation.id} className={styles.row}>
              <span className={styles.email}>{invitation.email}</span>
              <span className={styles.role} data-role={invitation.role}>
                {ROLE_LABEL_KEYS.includes(invitation.role)
                  ? t(`role${invitation.role}`)
                  : invitation.role}
              </span>
              <span className={styles.expiry}>
                {t('invitationExpiresAt', {
                  date: new Date(invitation.expiresAt).toLocaleDateString('pt-BR'),
                })}
              </span>
              <button
                className={styles.revokeBtn}
                onClick={() => setRevokingId(invitation.id)}
                disabled={revokeMutation.isPending}
              >
                {t('revokeBtn')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <RemoveMemberDialog
        isOpen={!!revoking}
        memberName={revoking?.email ?? ''}
        title={t('revokeDialogTitle')}
        body={t('revokeDialogBody', { email: revoking?.email ?? '' })}
        confirmLabel={t('revokeBtn')}
        pendingLabel={t('revoking')}
        onConfirm={handleRevoke}
        onCancel={() => setRevokingId(null)}
        isPending={revokeMutation.isPending}
      />
    </section>
  );
}
