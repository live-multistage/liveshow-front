'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Heart, User } from 'lucide-react';
import type { FollowItem } from '@live-show/api-contracts';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel/EmptyStatePanel';
import { useAuth } from '@/features/account';
import { useFollowListQuery } from '../queries/get-follows';
import styles from './FollowingList.module.scss';

function targetHref(item: FollowItem): string {
  return item.targetType === 'ARTIST' ? `/artists/${item.slug}` : `/o/${item.slug}`;
}

function FollowCard({ item }: { item: FollowItem }) {
  return (
    <Link href={targetHref(item)} className={styles.card}>
      <span className={styles.avatar}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className={styles.avatarImg} />
        ) : (
          <User size={28} aria-hidden="true" />
        )}
      </span>
      <span className={styles.name}>{item.name}</span>
    </Link>
  );
}

/**
 * "Seguindo" tab of Minha Lista: artists and organizations the user follows,
 * grouped by type. Empty state is shared with wishlist/my-list.
 */
export function FollowingList() {
  const t = useTranslations('follows');
  // ponytail: reuse myList's existing "explore events" copy instead of adding
  // a new follows.* key for a CTA label that already exists verbatim.
  const tMyList = useTranslations('myList');
  const { isLoggedIn } = useAuth();

  const { data: artists, isLoading: artistsLoading } = useFollowListQuery('ARTIST', { enabled: isLoggedIn });
  const { data: organizations, isLoading: organizationsLoading } = useFollowListQuery('ORGANIZATION', { enabled: isLoggedIn });

  const isLoading = isLoggedIn && (artistsLoading || organizationsLoading);
  const hasArtists = (artists?.length ?? 0) > 0;
  const hasOrganizations = (organizations?.length ?? 0) > 0;

  if (isLoading) return null;

  if (!isLoggedIn) {
    return (
      <EmptyStatePanel
        illustration={<Heart size={40} aria-hidden="true" />}
        badge={t('tab').toUpperCase()}
        title={t('loginToFollow')}
        text={t('emptyDescription')}
        primaryCta={{ href: '/login?next=/my-list', label: t('loginToFollow') }}
        kindsLabel={t('tab')}
        kinds={[]}
      />
    );
  }

  if (!hasArtists && !hasOrganizations) {
    return (
      <EmptyStatePanel
        illustration={<Heart size={40} aria-hidden="true" />}
        badge={t('tab').toUpperCase()}
        title={t('emptyTitle')}
        text={t('emptyDescription')}
        primaryCta={{ href: '/events', label: tMyList('exploreEvents') }}
        kindsLabel={t('tab')}
        kinds={[]}
      />
    );
  }

  return (
    <div>
      {hasArtists && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('artists')}</h2>
          <div className={styles.grid}>
            {artists?.map((item) => <FollowCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {hasOrganizations && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('organizations')}</h2>
          <div className={styles.grid}>
            {organizations?.map((item) => <FollowCard key={item.id} item={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
