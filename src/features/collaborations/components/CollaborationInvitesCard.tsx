'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/Button';
import { useOrgCollaborationInvitesQuery } from '../queries/collaborations.queries';
import { useRespondToInviteMutation } from '../mutations/collaborations.mutations';
import styles from './CollaborationInvitesCard.module.scss';

interface Props {
  organizationId: string;
}

export function CollaborationInvitesCard({ organizationId }: Props) {
  const t = useTranslations('collaborations');
  const { data: invites } = useOrgCollaborationInvitesQuery(organizationId);
  const { mutate, isPending } = useRespondToInviteMutation(organizationId);

  if (!invites || invites.length === 0) return null;

  return (
    <div className={styles.card}>
      <p className={styles.title}>{t('collaborationInvites')}</p>
      <div className={styles.list}>
        {invites.map((invite) => (
          <div key={invite.id} className={styles.row}>
            <div className={styles.info}>
              <div className={styles.eventTitle}>{invite.event.title}</div>
              <div className={styles.orgName}>{invite.ownerOrganization.name}</div>
            </div>
            <div className={styles.actions}>
              <Button
                size="sm"
                variant="primary"
                disabled={isPending}
                onClick={() => mutate({ id: invite.id, action: 'accept' })}
              >
                {t('acceptInvite')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => mutate({ id: invite.id, action: 'decline' })}
              >
                {t('declineInvite')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
