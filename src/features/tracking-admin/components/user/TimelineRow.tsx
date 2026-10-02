'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { Bolt, FileText, Link2, User, Users } from 'lucide-react';
import type { Json, TrackingMessage, TrackingMessageType, Violation } from '@live-show/api-contracts';
import styles from './TrackingUserProfilePage.module.scss';

export type TimelineItem = TrackingMessage & { ts: string; violations: Violation[] | null };

function timelineIcon(type: TrackingMessageType) {
  switch (type) {
    case 'track': return <Bolt size={13} />;
    case 'page': return <FileText size={13} />;
    case 'identify': return <User size={13} />;
    case 'group': return <Users size={13} />;
    case 'alias': return <Link2 size={13} />;
  }
}

function timelineName(item: TimelineItem): string {
  if (item.type === 'track') return item.event;
  if (item.type === 'page') return item.name ?? item.context.page?.path ?? '—';
  if (item.type === 'identify') return item.userId ?? item.anonymousId;
  if (item.type === 'group') return item.groupId;
  return `${item.previousId} → ${item.userId ?? item.anonymousId}`;
}

function timelineProperties(item: TimelineItem): Record<string, Json> | undefined {
  if (item.type === 'track' || item.type === 'page') return item.properties;
  if (item.type === 'identify' || item.type === 'group') return item.traits;
  return undefined;
}

function timelineSummary(item: TimelineItem): string {
  const props = timelineProperties(item);
  if (!props) return '';
  return Object.entries(props)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

function ViolationBadge({ violations }: { violations: Violation[] | null }) {
  const t = useTranslations('platformAdmin.tracking');
  if (!violations || violations.length === 0) return null;
  return (
    <span className={styles.violationBadge}>
      {violations.length === 1 ? t('user.badges.violation') : t('user.badges.violations', { count: violations.length })}
    </span>
  );
}


interface TimelineRowProps {
  item: TimelineItem;
  /** Rendered before the row button (e.g. the journey step label). */
  lead?: ReactNode;
  /** Normalized route shown under the name. */
  norm?: string;
  /** Rendered after the row button, outside the expand toggle (badge/link). */
  extra?: ReactNode;
  timeOnly?: boolean;
}

export function TimelineRow({ item, lead, norm, extra, timeOnly }: TimelineRowProps) {
  const format = useFormatter();
  const [expanded, setExpanded] = useState(false);
  const stamp = new Date(item.ts);
  return (
    <div className={styles.timelineRowWrap}>
      <div className={styles.timelineLine}>
        {lead}
        <button type="button" className={styles.timelineRow} onClick={() => setExpanded((e) => !e)}>
          <span className={styles.iconWrap}>{timelineIcon(item.type)}</span>
          <span className={styles.timelineNameCol}>
            <span className={styles.timelineName}>{timelineName(item)}</span>
            {norm && <span className={styles.timelineNorm}>{norm}</span>}
          </span>
          <span className={styles.timelineSummary}>{timelineSummary(item)}</span>
          <ViolationBadge violations={item.violations} />
          <span className={styles.timelineTs}>
            {timeOnly
              ? format.dateTime(stamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : format.dateTime(stamp, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </button>
        {extra}
      </div>
      {expanded && <pre className={styles.jsonBlock}>{JSON.stringify(item, null, 2)}</pre>}
    </div>
  );
}
