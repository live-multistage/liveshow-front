'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Video, Ticket, Pencil, Pause, Play, Square, RefreshCw, Repeat } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import { formatPrice } from '@/features/events/utils/event-formatters';
import { SeriesForm } from './SeriesForm';
import { EpisodesTable } from './EpisodesTable';
import { SeasonPassProducts } from './SeasonPassProducts';
import { getRecurrenceParts, formatStartTime } from '../../utils/recurrence';
import { formatEpisodeWhen } from '../../utils/countdown';
import {
  useSeriesQuery,
  useOrgSeriesQuery,
  useSeriesEpisodesQuery,
  useSeriesTicketProductsQuery,
} from '../../queries/series.queries';
import {
  usePauseSeriesMutation,
  useResumeSeriesMutation,
  useEndSeriesMutation,
  useMaterializeSeriesMutation,
} from '../../mutations/series.mutations';
import styles from './SeriesDetailContent.module.scss';

interface Props {
  slug: string;
}

export function SeriesDetailContent({ slug }: Props) {
  const t = useTranslations('series');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { data: series, isLoading } = useSeriesQuery(slug);
  // templateEventId is org-only now (dropped from the public GET /series/:slug
  // this page otherwise reads from) — fetch it from the org list instead.
  const { data: orgSeries } = useOrgSeriesQuery(series?.organizationId ?? '', {
    enabled: !!series?.organizationId,
  });
  const templateEventId = orgSeries?.find((s) => s.slug === slug)?.templateEventId;

  // Both queries are already fetched by the table / pass editor below — reused
  // from cache here to drive the summary strip.
  const { data: episodes = [] } = useSeriesEpisodesQuery(series?.id ?? '', {
    enabled: !!series?.id,
  });
  const { data: products = [] } = useSeriesTicketProductsQuery(series?.id ?? '', {
    enabled: !!series?.id,
  });

  const pause = usePauseSeriesMutation();
  const resume = useResumeSeriesMutation();
  const end = useEndSeriesMutation();
  const materialize = useMaterializeSeriesMutation();
  const [editing, setEditing] = useState(false);
  // Encerrar é irreversível (EndSeriesUseCase é terminal) — confirma antes,
  // igual ao delete de programa do canal (ProgramGridEditor).
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const summary = useMemo(() => {
    const scheduled = episodes.filter((e) => e.status === 'SCHEDULED').length;
    const sold = products.reduce((acc, p) => acc + p.sold, 0);
    const currency = products[0]?.currency ?? 'BRL';
    // Only same-currency products contribute to the headline revenue figure.
    const revenue = products
      .filter((p) => p.currency === currency)
      .reduce((acc, p) => acc + p.sold * p.price, 0);
    const minPrice = products.length
      ? Math.min(...products.map((p) => p.price))
      : null;
    return { scheduled, sold, currency, revenue, minPrice };
  }, [episodes, products]);

  if (!series)
    return <p className={styles.state}>{tCommon(isLoading ? 'loading' : 'notFound')}</p>;

  const recurrenceParts = getRecurrenceParts(
    series.rrule,
    formatStartTime(series.dtstart, series.timezone),
    locale,
  );
  const recurrence =
    recurrenceParts.type === 'daily'
      ? t('recurrence.badgeDaily')
      : t('recurrence.badgeWeekly', { day: recurrenceParts.day });
  const startTime = formatStartTime(series.dtstart, series.timezone, locale);
  const ended = series.status === 'ENDED';

  // The three lifecycle mutations invalidate by organizationId + slug, same
  // as the channels dashboard's target object.
  const target = { id: series.id, organizationId: series.organizationId, slug: series.slug };

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="breadcrumb">
        <Link href="/dashboard/series" className={styles.breadcrumbLink}>
          {t('dashboard.title')}
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{series.name}</span>
      </nav>

      <header className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{series.name}</h1>
            <span
              className={clsx(styles.statusPill, ended ? styles.statusEnded : styles.statusActive)}
            >
              {!ended && <span className={styles.statusDot} />}
              {t(`dashboard.status.${series.status}`)}
            </span>
          </div>
          <div className={styles.meta}>
            <span className={styles.metaRecurrence}>
              <Repeat size={13} strokeWidth={2.4} aria-hidden="true" />
              {recurrence}
            </span>
            <span className={styles.metaDot}>·</span>
            <span>{t('episodesShort', { count: episodes.length })}</span>
            <span className={styles.metaDot}>·</span>
            <span>{startTime}</span>
          </div>
        </div>

        <div className={styles.actionsColumn}>
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => setEditing(true)}>
              <Pencil size={15} />
              {t('dashboard.edit')}
            </button>
            {series.status === 'ACTIVE' && (
              <button
                type="button"
                className={styles.btnGhost}
                disabled={pause.isPending}
                onClick={() => pause.mutate(target)}
              >
                <Pause size={14} />
                {t('dashboard.pause')}
              </button>
            )}
            {series.status === 'PAUSED' && (
              <button
                type="button"
                className={styles.btnGhost}
                disabled={resume.isPending}
                onClick={() => resume.mutate(target)}
              >
                <Play size={14} />
                {t('dashboard.resume')}
              </button>
            )}
            {!ended && (
              <button
                type="button"
                className={styles.btnDanger}
                disabled={end.isPending}
                onClick={() => setConfirmingEnd(true)}
              >
                <Square size={14} />
                {t('dashboard.end')}
              </button>
            )}
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={materialize.isPending}
              onClick={() => materialize.mutate(target)}
            >
              <RefreshCw size={15} />
              {t('dashboard.materialize')}
            </button>
          </div>

          {templateEventId && (
            <div className={styles.links}>
              <Link
                className={styles.link}
                href={`/dashboard/streams?eventId=${templateEventId}&title=${encodeURIComponent(series.name)}`}
              >
                <Video size={15} />
                {t('dashboard.configureCameras')}
              </Link>
              <Link className={styles.link} href={`/dashboard/events/${templateEventId}`}>
                <Ticket size={15} />
                {t('dashboard.templateTickets')}
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className={styles.summary}>
        <div className={clsx(styles.stat, styles.statLive)}>
          <span className={clsx(styles.statLabel, styles.statLabelLive)}>
            {t('nextEpisodeLabel')}
          </span>
          <span className={styles.statValueSm}>
            {series.nextEpisode
              ? formatEpisodeWhen(series.nextEpisode.startsAt, series.timezone, locale)
              : t('noUpcoming')}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('dashboard.summaryScheduled')}</span>
          <span className={styles.statValue}>{summary.scheduled}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('dashboard.summarySold')}</span>
          <span className={styles.statValue}>{summary.sold}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('dashboard.summaryRevenue')}</span>
          <span className={clsx(styles.statValue, styles.statValueMoney)}>
            {formatPrice(summary.revenue, summary.currency, locale)}
          </span>
        </div>
      </div>

      {products.length > 0 && (
        <div className={styles.modelCard}>
          <span className={styles.modelLabel}>{t('dashboard.templateModel')}</span>
          <div className={styles.modelItem}>
            <Ticket size={16} className={styles.modelIcon} />
            <span>
              {t('dashboard.templatePricing', {
                count: products.length,
                from: formatPrice(summary.minPrice ?? 0, summary.currency, locale),
              })}
            </span>
          </div>
          <span className={styles.modelNote}>{t('dashboard.templateApplied')}</span>
        </div>
      )}

      <EpisodesTable seriesId={series.id} />
      {templateEventId && (
        <SeasonPassProducts seriesId={series.id} templateEventId={templateEventId} />
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.edit')}</DialogTitle>
          </DialogHeader>
          <SeriesForm mode="edit" initial={series} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingEnd} onOpenChange={setConfirmingEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.endTitle')}</DialogTitle>
            <DialogDescription>{t('dashboard.endBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingEnd(false)}>
              {t('dashboard.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={end.isPending}
              onClick={() => {
                end.mutate(target);
                setConfirmingEnd(false);
              }}
            >
              {t('dashboard.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
