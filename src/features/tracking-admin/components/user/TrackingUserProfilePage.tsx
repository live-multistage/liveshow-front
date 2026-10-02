'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { useTranslations, useFormatter } from 'next-intl';
import { AlertCircle, Copy, Inbox, Search, User } from 'lucide-react';
import { Button, Skeleton } from '@live-show/design-system';
import type { Json } from '@live-show/api-contracts';
import { TrackingShell } from '../TrackingShell';
import { TimelineRow } from './TimelineRow';
import { useTrackingUserQuery, useTrackingUserEventsInfiniteQuery } from '../../queries/get-user';
import styles from './TrackingUserProfilePage.module.scss';

interface Props {
  userId: string;
  trackingEnabled: boolean;
}

function copyToClipboard(text: string): void {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    // ponytail: clipboard access can throw in insecure contexts/older browsers; silently ignore.
  }
}

function TraitValue({ value }: { value: Json }) {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined) return <span className={styles.traitObject}>—</span>;
  if (typeof value === 'boolean') return <span className={styles.traitBoolean}>{String(value)}</span>;
  if (typeof value === 'number') return <span className={styles.traitNumber}>{value}</span>;
  if (typeof value === 'string') return <span className={styles.traitString} title={value}>{value}</span>;

  return (
    <div>
      <button type="button" className={styles.traitObject} onClick={() => setExpanded((e) => !e)}>
        {Array.isArray(value) ? `[${value.length}]` : '{…}'}
      </button>
      {expanded && <pre className={styles.jsonBlock}>{JSON.stringify(value, null, 2)}</pre>}
    </div>
  );
}

function ConsentPill({ consent, t }: { consent: boolean | null; t: ReturnType<typeof useTranslations> }) {
  if (consent === true) return <span className={`${styles.consentPill} ${styles.consentGranted}`}>{t('user.consentValues.granted')}</span>;
  if (consent === false) return <span className={`${styles.consentPill} ${styles.consentDenied}`}>{t('user.consentValues.denied')}</span>;
  return <span className={`${styles.consentPill} ${styles.consentUnknown}`}>{t('user.consentValues.unknown')}</span>;
}

export function TrackingUserProfilePage({ userId, trackingEnabled }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();
  const profile = useTrackingUserQuery(userId);
  const events = useTrackingUserEventsInfiniteQuery(userId);

  const backLink = (
    <Link href="/dashboard/platform/users" className={styles.backLink}>{t('user.back')}</Link>
  );

  if (profile.isLoading) {
    return (
      <TrackingShell active="user" title={userId} trackingEnabled={trackingEnabled}>
        <div className={styles.headerSkeleton}>
          <Skeleton className={styles.avatarSkeleton} />
          <Skeleton className={styles.lineSkeleton} />
        </div>
        <div className={styles.twoCol}>
          <div className={styles.card}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={styles.traitLineSkeleton} />)}
          </div>
          <div className={styles.card}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={styles.traitLineSkeleton} />)}
          </div>
        </div>
      </TrackingShell>
    );
  }

  if (profile.isError && isAxiosError(profile.error) && profile.error.response?.status === 404) {
    return (
      <TrackingShell active="user" title={userId} trackingEnabled={trackingEnabled}>
        <div className={styles.stateBox}>
          <div className={styles.emptyIcon}><Search size={28} /></div>
          <p className={styles.stateTitle}>{t('user.notFound')}</p>
          {backLink}
        </div>
      </TrackingShell>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <TrackingShell active="user" title={userId} trackingEnabled={trackingEnabled}>
        <div className={styles.stateBox}>
          <div className={styles.errorIcon}><AlertCircle size={28} /></div>
          <p className={styles.stateTitle}>{t('user.error')}</p>
          <Button variant="outline" onClick={() => profile.refetch()}>{t('user.retry')}</Button>
        </div>
      </TrackingShell>
    );
  }

  const { data: user } = profile;
  const items = events.data?.pages.flatMap((page) => page.items) ?? [];
  const nextCursor = events.data?.pages.at(-1)?.nextCursor ?? null;
  const lastEventTs = items[0]?.ts;
  const name = typeof user.traits.name === 'string' ? user.traits.name : undefined;

  return (
    <TrackingShell active="user" title={userId} trackingEnabled={trackingEnabled}>
      {backLink}

      <div className={styles.header}>
        <div className={styles.avatar}><User size={22} /></div>
        <div>
          <div className={styles.userIdRow}>
            <span className={styles.userId} title={userId}>{userId}</span>
            <ConsentPill consent={user.analyticsConsent} t={t} />
          </div>
          <div className={styles.subtitle}>
            {name && `${name} · `}
            {lastEventTs
              ? t('user.lastSeen', { when: format.relativeTime(new Date(lastEventTs), Date.now()) })
              : null}
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.sectionLabel}>{t('user.traits')}</div>
          {Object.entries(user.traits).map(([key, value]) => (
            <div key={key} className={styles.traitRow}>
              <span className={styles.traitKey}>{key}</span>
              <TraitValue value={value} />
            </div>
          ))}

          <div className={styles.sectionLabel}>{t('user.groups')}</div>
          <div className={styles.pills}>
            {user.groupIds.map((g) => <span key={g} className={styles.pill}>{g}</span>)}
          </div>

          <div className={styles.sectionLabel}>{t('user.linkedAnonymousIds', { count: user.anonymousIds.length })}</div>
          {user.anonymousIds.map((id) => (
            <div key={id} className={styles.anonymousRow}>
              <span className={styles.anonymousId} title={id}>{id}</span>
              <button
                type="button"
                className={styles.copyBtn}
                aria-label={id}
                onClick={() => copyToClipboard(id)}
              >
                <Copy size={12} />
              </button>
              <Link href={`/dashboard/platform/tracking/debugger?anonymousId=${encodeURIComponent(id)}`} className={styles.link}>
                {t('user.viewAsAnonymous')}
              </Link>
            </div>
          ))}

          <div className={styles.sectionLabel}>{t('user.consent')}</div>
          <ConsentPill consent={user.analyticsConsent} t={t} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitle}>{t('user.timeline.title')}</div>
            <div className={styles.mono}>{t('user.timeline.mostRecentFirst')}</div>
          </div>

          {events.isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={styles.traitLineSkeleton} />)}

          {!events.isLoading && items.length === 0 && (
            <div className={styles.stateBox}>
              <div className={styles.emptyIcon}><Inbox size={28} /></div>
              <p className={styles.stateTitle}>{t('user.empty')}</p>
              {backLink}
            </div>
          )}

          {items.map((item) => <TimelineRow key={item.messageId} item={item} />)}

          {nextCursor && (
            <div className={styles.loadMoreRow}>
              <Button variant="outline" onClick={() => events.fetchNextPage()} disabled={events.isFetchingNextPage}>
                {t('user.timeline.loadMore')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </TrackingShell>
  );
}
