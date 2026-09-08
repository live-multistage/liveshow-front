'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account';
import { useAcceptInvitation } from '../hooks/use-accept-invitation';
import { acceptErrorKey } from '../utils/invitation-errors';
import styles from './AcceptInvitationPage.module.scss';

interface Props {
  token: string;
}

export function AcceptInvitationPage({ token }: Props) {
  const t = useTranslations('organizations');
  const router = useRouter();
  const { isLoading, isLoggedIn } = useAuth();
  const acceptMutation = useAcceptInvitation();
  // The accept endpoint consumes the token, so it must fire exactly once —
  // React Strict Mode double-invokes effects in development.
  const firedRef = useRef(false);

  const { mutate } = acceptMutation;

  useEffect(() => {
    if (isLoading || !isLoggedIn || firedRef.current) return;
    firedRef.current = true;
    mutate(token);
  }, [isLoading, isLoggedIn, mutate, token]);

  useEffect(() => {
    if (isLoading || isLoggedIn) return;
    // Same redirect contract as OrganizationsGuard: come back here after login.
    router.replace(`/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`);
  }, [isLoading, isLoggedIn, router, token]);

  if (isLoading || !isLoggedIn) {
    return <p className={styles.state}>{t('acceptLoading')}</p>;
  }

  if (acceptMutation.isError) {
    return (
      <div className={styles.page} data-testid="accept-invitation-error">
        <h1 className={styles.title}>{t('acceptErrorTitle')}</h1>
        <p className={styles.body}>{t(acceptErrorKey(acceptMutation.error))}</p>
        <Link className={styles.link} href="/organizations">
          {t('acceptBackToOrganizations')}
        </Link>
      </div>
    );
  }

  if (acceptMutation.isSuccess) {
    const { member } = acceptMutation.data;
    return (
      <div className={styles.page} data-testid="accept-invitation-success">
        <h1 className={styles.title}>{t('acceptSuccessTitle')}</h1>
        <p className={styles.body}>{t('acceptSuccessBody')}</p>
        <Link className={styles.link} href={`/organizations/${member.organizationId}`}>
          {t('acceptGoToOrganization')}
        </Link>
      </div>
    );
  }

  return <p className={styles.state}>{t('acceptLoading')}</p>;
}
