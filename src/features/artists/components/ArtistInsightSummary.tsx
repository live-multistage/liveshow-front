'use client';

import { useTranslations } from 'next-intl';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@live-show/design-system';
import type { ArtistInsight, ArtistTrend } from '@live-show/api-contracts';
import styles from './ArtistInsightSummary.module.scss';

interface Props {
  insight: ArtistInsight | undefined;
}

const TREND_ICON = { UP: TrendingUp, FLAT: Minus, DOWN: TrendingDown } as const;
const TREND_LABEL_KEY: Record<ArtistTrend, 'trendUp' | 'trendFlat' | 'trendDown'> = {
  UP: 'trendUp',
  FLAT: 'trendFlat',
  DOWN: 'trendDown',
};
const TREND_CLASS: Record<ArtistTrend, string> = { UP: styles.up, FLAT: styles.flat, DOWN: styles.down };

function formatCount(value: number | null): string {
  return value === null ? '—' : value.toLocaleString();
}

// Organizer-only (the endpoint is role-gated): compact score + trend, with the
// supporting numbers in a tooltip so the lineup rows stay one line tall.
export function ArtistInsightSummary({ insight }: Props) {
  const t = useTranslations('artists.dashboard.lineup.insight');
  if (!insight) return null;
  if (insight.updatedAt === null) return <span className={styles.noData}>{t('noData')}</span>;

  const score = Math.round(insight.score);
  const TrendIcon = TREND_ICON[insight.trend];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={styles.summary} aria-label={`${t('score', { score })} · ${t(TREND_LABEL_KEY[insight.trend])}`}>
          <Badge variant="outline" className={styles.score}>
            {score}
          </Badge>
          <TrendIcon size={14} aria-hidden className={TREND_CLASS[insight.trend]} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <dl className={styles.details}>
          <dt>{t('followers')}</dt>
          <dd>{formatCount(insight.followers)}</dd>
          <dt>{t('deezerFans')}</dt>
          <dd>{formatCount(insight.deezerFans)}</dd>
          <dt>{t('events')}</dt>
          <dd>{formatCount(insight.eventsCount)}</dd>
          <dt>{t('avgPurchases')}</dt>
          <dd>{insight.avgPurchasesPerEvent === null ? '—' : insight.avgPurchasesPerEvent.toFixed(1)}</dd>
          <dt>{t('updatedAt')}</dt>
          <dd>{new Date(insight.updatedAt).toLocaleDateString()}</dd>
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}
