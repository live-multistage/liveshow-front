'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Download, List, Plus, RotateCcw } from 'lucide-react';
import { Button, Skeleton } from '@live-show/design-system';
import styles from './ReplayChapters.module.scss';

export function ChaptersHeader({ children }: { children?: ReactNode }) {
  const t = useTranslations('replayChaptersEditor');
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </div>
      {children}
    </header>
  );
}

// "processing" = finished but no replay yet; "vod" = uploaded video, unsupported.
export function ChaptersUnavailable({ kind }: { kind: 'processing' | 'vod' }) {
  const t = useTranslations('replayChaptersEditor');
  return (
    <div className={styles.unavailable}>
      <span className={styles.unavailableIcon}><RotateCcw size={22} strokeWidth={1.8} aria-hidden /></span>
      <div className={styles.unavailableBody}>
        {kind === 'processing' ? (
          <>
            <p className={styles.unavailableTitle}>{t('unavailableTitle')}</p>
            <p className={styles.unavailableText}>{t('unavailableProcessing')}</p>
            <span className={styles.badge}>{t('unavailableBadge')}</span>
          </>
        ) : (
          <p className={styles.unavailableTextStrong}>{t('unavailableVod')}</p>
        )}
      </div>
    </div>
  );
}

export function ChaptersSkeleton() {
  return (
    <div className={styles.skeletons} data-testid="chapters-loading" aria-busy="true">
      <div className={styles.skeletonCard}>
        <Skeleton className={styles.skelLabel} />
        <Skeleton className={styles.skelBar} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.skeletonCard}>
          <Skeleton className={styles.skelLabel} />
          <div className={styles.skelGrid}>
            <Skeleton className={styles.skelField} />
            <Skeleton className={styles.skelField} />
            <Skeleton className={styles.skelField} />
          </div>
          <Skeleton className={styles.skelArea} />
        </div>
      ))}
    </div>
  );
}

interface EmptyProps {
  // Omitted = read-only: only the explanation, no way to add.
  onAdd?: () => void;
  onImport?: () => void;
  hasSchedule?: boolean;
  importing?: boolean;
}

export function ChaptersEmpty({ onAdd, onImport, hasSchedule = false, importing = false }: EmptyProps) {
  const t = useTranslations('replayChaptersEditor');
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}><List size={24} strokeWidth={1.8} aria-hidden /></span>
      <p className={styles.emptyTitle}>{t('emptyTitle')}</p>
      {onAdd && <p className={styles.emptyText}>{t(hasSchedule ? 'emptyWithSchedule' : 'emptyNoSchedule')}</p>}
      {onAdd && (
        <div className={styles.emptyActions}>
          {hasSchedule && (
            <Button type="button" size="lg" onClick={onImport} disabled={importing}>
              <Download aria-hidden />{t('import')}
            </Button>
          )}
          <Button type="button" size="lg" variant={hasSchedule ? 'outline' : 'default'} onClick={onAdd}>
            {!hasSchedule && <Plus aria-hidden />}{t('add')}
          </Button>
        </div>
      )}
    </div>
  );
}
