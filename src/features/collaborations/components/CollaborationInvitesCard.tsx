'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@live-show/design-system';
import { Button } from '@/shared/components/Button';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { canManageOrg } from '@/features/organizations/types/organization.types';
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

  // Only an OWNER/ADMIN of THIS org may accept/decline server-side — a plain
  // member would just get a 403. Members still see the list, just no buttons.
  const { data: myOrgs = [] } = useMyOrganizationsQuery();
  const canRespond = myOrgs.some((o) => o.id === organizationId && canManageOrg(o.role));

  if (!invites || invites.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.title}>{t('collaborationInvites')}</p>
        <Badge variant="secondary">{invites.length}</Badge>
      </div>
      <div className={styles.list}>
        {invites.map((invite) => (
          <div key={invite.id} className={styles.row}>
            <div className={styles.info}>
              <div className={styles.eventTitle}>{invite.event.title}</div>
              <div className={styles.orgName}>{invite.ownerOrganization.name}</div>
            </div>
            {canRespond && (
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
