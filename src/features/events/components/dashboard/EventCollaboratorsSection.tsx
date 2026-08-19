'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useEventCollaboratorsQuery,
  useOrganizationSearchQuery,
  useInviteCollaboratorMutation,
  useCancelInviteMutation,
} from '@/features/collaborations';
import { Button } from '@/shared/components/Button';
import styles from './EventCollaboratorsSection.module.scss';

interface Props {
  eventId: string;
}

export function EventCollaboratorsSection({ eventId }: Props) {
  const t = useTranslations('collaborations');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: collaborators = [] } = useEventCollaboratorsQuery(eventId);
  const { data: searchResults = [] } = useOrganizationSearchQuery(debouncedQuery);
  const inviteMutation = useInviteCollaboratorMutation(eventId);
  const cancelMutation = useCancelInviteMutation(eventId);

  function handleInvite(organizationId: string) {
    inviteMutation.mutate(organizationId);
    setQuery('');
    setDebouncedQuery('');
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>{t('collaborators')}</h2>

      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          placeholder={t('searchOrgPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {debouncedQuery && searchResults.length > 0 && (
          <div className={styles.results}>
            {searchResults.map((org) => (
              <button
                key={org.id}
                type="button"
                className={styles.resultItem}
                onClick={() => handleInvite(org.id)}
              >
                {org.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.list}>
        {collaborators.map((collaborator) => (
          <div key={collaborator.id} className={styles.row}>
            <span className={styles.orgName}>{collaborator.organization.name}</span>
            <span className={`${styles.chip} ${collaborator.status === 'PENDING' ? styles.pending : styles.accepted}`}>
              {collaborator.status === 'PENDING' ? t('pending') : t('accepted')}
            </span>
            {collaborator.status === 'PENDING' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelMutation.mutate(collaborator.id)}
                disabled={cancelMutation.isPending}
              >
                {t('cancelInvite')}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
