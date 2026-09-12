import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps {
  title: string;
  /** id of the <h2>, used by the wrapping <section aria-labelledby>. */
  titleId: string;
  eyebrow?: ReactNode;
  seeAllHref?: string;
}

// Shared header for every home section (rails + GenreGrid). No 'use client' —
// it renders on the server inside EditorialHome and on the client inside
// GenreGrid, so it must stay hook-free besides useTranslations.
export function SectionHeader({ title, titleId, eyebrow, seeAllHref }: SectionHeaderProps) {
  const t = useTranslations('carousel');

  return (
    <div className={styles.header}>
      <div>
        {eyebrow && (
          <div className={styles.eyebrow} data-testid="section-eyebrow">
            {eyebrow}
          </div>
        )}
        <h2 id={titleId} className={styles.title}>{title}</h2>
      </div>
      {seeAllHref && (
        <Link href={seeAllHref} className={styles.link}>
          {t('seeAll')}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
