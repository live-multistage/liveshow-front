'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { useTranslations, useFormatter } from 'next-intl';
import { AlertCircle, Copy, Search } from 'lucide-react';
import { Badge, Button, Skeleton } from '@live-show/design-system';
import type { SessionJourney } from '@live-show/api-contracts';
import { TrackingShell } from '../TrackingShell';
import { TimelineRow } from '../user/TimelineRow';
import { useSessionJourneyQuery } from '../../queries/get-session-journey';
import { formatGap, stepLabels } from '../../utils/journey-utils';
import styles from './SessionJourneyPage.module.scss';

interface Props {
  sessionId: string;
  anonymousId: string;
  trackingEnabled: boolean;
}

const BACK_HREF = '/dashboard/platform/tracking/explore';

// A page node key is `page:/route`; show the normalized route only when it differs from the raw path.
function normalizedRoute(node: string | null, path: string | undefined): string | undefined {
  if (!node?.startsWith('page:')) return undefined;
  const route = node.slice(5);
  return route === path ? undefined : route;
}

function copyToClipboard(text: string): void {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    // ponytail: clipboard can throw in insecure contexts; ignore.
  }
}

function JourneyBody({ journey }: { journey: SessionJourney }) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();
  const [copied, setCopied] = useState(false);
  const { items } = journey;
  const steps = stepLabels(items);
  const stampOf = (iso: string) => format.dateTime(new Date(iso), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const meta = [
    { key: 'started', label: t('journey.started'), value: stampOf(journey.startedAt) },
    { key: 'ended', label: t('journey.ended'), value: stampOf(journey.endedAt) },
    { key: 'duration', label: t('journey.duration'), value: formatGap(Date.parse(journey.endedAt) - Date.parse(journey.startedAt)) },
    { key: 'steps', label: t('journey.steps'), value: String(steps.filter((s) => s !== null).length) },
  ];

  const copy = () => {
    copyToClipboard(journey.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <div className={styles.idRow}>
        <span className={styles.sessionId} title={journey.sessionId}>{journey.sessionId}</span>
        <button type="button" className={styles.copyBtn} onClick={copy}>
          <Copy size={12} />
          {copied ? t('journey.copied') : t('journey.copyId')}
        </button>
      </div>

      <div className={styles.metaBar}>
        {meta.map((m) => (
          <div key={m.key} className={styles.metaCell}>
            <span className={styles.metaKey}>{m.label}</span>
            <span className={styles.metaValue}>{m.value}</span>
          </div>
        ))}
        <div className={styles.metaCell}>
          <span className={styles.metaKey}>{t('journey.user')}</span>
          {journey.userId ? (
            <div className={styles.userCell}>
              <span className={styles.metaValue} title={journey.userId}>{journey.userId}</span>
              <Link href={`/dashboard/platform/tracking/users/${journey.userId}`} className={styles.link}>{t('journey.viewProfile')}</Link>
            </div>
          ) : (
            <div className={styles.userCell}>
              <span className={styles.anonymous}>{t('journey.anonymous')}</span>
              <span className={styles.anonymousId} title={journey.anonymousId}>{journey.anonymousId}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>{t('journey.timelineTitle')}</div>
          <span className={styles.order}>{t('journey.oldestFirst')}</span>
        </div>
        {items.map((item, i) => {
          const step = steps[i];
          const previous = items[i - 1];
          return (
            <Fragment key={item.messageId}>
              {previous && (
                <div className={styles.delta}>
                  {t('journey.sincePrevious', { duration: formatGap(Date.parse(item.ts) - Date.parse(previous.ts)) })}
                </div>
              )}
              <TimelineRow
                item={item}
                timeOnly
                lead={<span className={styles.step}>{step === null ? '' : t('journey.step', { n: step })}</span>}
                norm={normalizedRoute(item.node, item.type === 'page' ? item.context.page?.path : undefined)}
                extra={item.origin === 'server' ? <Badge variant="outline">{t('journey.serverBadge')}</Badge> : undefined}
              />
            </Fragment>
          );
        })}
        <div className={styles.endNote}>
          <span className={styles.endDot} />
          {t('journey.endNote', { when: stampOf(journey.endedAt) })}
        </div>
      </div>
    </>
  );
}

export function SessionJourneyPage({ sessionId, anonymousId, trackingEnabled }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const query = useSessionJourneyQuery(sessionId, anonymousId);
  const shell = (children: React.ReactNode) => (
    <TrackingShell active="reports" title={t('journey.title')} trackingEnabled={trackingEnabled}>
      <Link href={BACK_HREF} className={styles.backLink}>{t('journey.back')}</Link>
      {children}
    </TrackingShell>
  );

  if (query.isLoading) {
    return shell(
      <>
        <Skeleton className={styles.skeleton} />
        <Skeleton className={styles.skeletonCard} />
      </>,
    );
  }

  if (query.isError && isAxiosError(query.error) && query.error.response?.status === 404) {
    return shell(
      <div className={styles.stateBox}>
        <div className={styles.emptyIcon}><Search size={28} /></div>
        <p className={styles.stateTitle}>{t('journey.notFound')}</p>
        <span className={styles.anonymousId}>{sessionId}</span>
      </div>,
    );
  }

  if (query.isError || !query.data) {
    return shell(
      <div className={styles.stateBox}>
        <div className={styles.errorIcon}><AlertCircle size={28} /></div>
        <p className={styles.stateTitle}>{t('journey.error')}</p>
        <Button variant="outline" onClick={() => query.refetch()}>{t('journey.retry')}</Button>
      </div>,
    );
  }

  return shell(<JourneyBody journey={query.data} />);
}
