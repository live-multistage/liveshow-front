'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { SEO_PAGE_KEYS, type SeoPageKey, type SeoPageTemplate } from '@live-show/api-contracts';
import { Badge, Button, Skeleton } from '@live-show/design-system';
import { useSeoTemplatesQuery } from '../queries/use-seo-admin';
import { PAGE_ROUTES, isSeoCustomized, pageNameKey } from '../utils/seo-form';
import { formatSeoDate } from '../utils/seo-format';
import styles from './SeoLists.module.scss';

interface Props {
  onOpen: (pageKey: SeoPageKey) => void;
}

const EMPTY_TEMPLATE = (pageKey: SeoPageKey): SeoPageTemplate => ({
  pageKey,
  titleTemplate: null,
  descriptionTemplate: null,
  ogImageUrl: null,
  keywords: null,
  ogTitle: null,
  ogDescription: null,
  twitterTitle: null,
  twitterDescription: null,
  canonicalUrl: null,
  locale: null,
  jsonLdMode: null,
  robotsIndex: null,
  robotsFollow: null,
  disabledGeneratedJsonLd: [],
  extraJsonLd: [],
  updatedAt: null,
});

// The 16 indexable page types always show, even before any template row exists.
export function PagesTab({ onOpen }: Props) {
  const t = useTranslations('platformAdmin.seo');
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useSeoTemplatesQuery();

  const rows = SEO_PAGE_KEYS.map((key) => data?.find((x) => x.pageKey === key) ?? EMPTY_TEMPLATE(key));
  const customCount = rows.filter(isSeoCustomized).length;
  const noindexCount = rows.filter((r) => r.robotsIndex === false).length;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>{t('pages.eyebrow')}</div>
          <div className={styles.heading}>{t('pages.heading')}</div>
        </div>
        {data && (
          <div className={styles.counts}>
            <span>{t('pages.customCount', { n: customCount })}</span>·<span>{t('pages.noindexCount', { n: noindexCount })}</span>
          </div>
        )}
      </div>

      {isLoading && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className={styles.skeleton} />)}

      {isError && (
        <div className={styles.state} role="alert">
          <div className={styles.stateTitle}>{t('loadError')}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>{t('retry')}</Button>
        </div>
      )}

      {data && (
        <>
          <div className={styles.cols}>
            <span>{t('pages.cols.page')}</span>
            <span>{t('pages.cols.state')}</span>
            <span className={styles.hideNarrow}>{t('pages.cols.jsonld')}</span>
            <span className={styles.hideNarrow}>{t('pages.cols.updated')}</span>
            <span />
          </div>
          {rows.map((row) => {
            const name = t(`pageNames.${pageNameKey(row.pageKey)}`);
            return (
              <button key={row.pageKey} type="button" className={styles.row} aria-label={name} onClick={() => onOpen(row.pageKey)}>
                <div>
                  <div className={styles.name}>{name}</div>
                  <div className={styles.route}>{PAGE_ROUTES[row.pageKey]}</div>
                </div>
                <div className={styles.badges}>
                  <Badge variant={isSeoCustomized(row) ? 'default' : 'secondary'}>
                    {t(isSeoCustomized(row) ? 'status.custom' : 'status.default')}
                  </Badge>
                  {row.robotsIndex === false && <Badge variant="outline" className={styles.noindex}>{t('status.noindex')}</Badge>}
                </div>
                <span className={`${styles.cell} ${styles.hideNarrow}`}>{row.extraJsonLd.length}</span>
                <span className={`${styles.cell} ${styles.hideNarrow}`}>
                  {row.updatedAt ? formatSeoDate(row.updatedAt, locale) : '—'}
                </span>
                <ChevronRight size={15} className={styles.chevron} aria-hidden />
              </button>
            );
          })}
        </>
      )}
    </section>
  );
}
