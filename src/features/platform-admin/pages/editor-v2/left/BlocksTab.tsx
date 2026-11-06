'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LayoutTemplate } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { ElementType, PageElement } from '@live-show/api-contracts';
import { SectionThumb } from '../../components/SectionThumb';
import { usePageBlocksQuery } from '../../queries/use-page-blocks';
import { READY_BLOCKS } from './ready-blocks';
import type { InsertionPoint } from './tree-ops';
import { canNest } from './tree-ops';
import styles from './left.module.scss';

interface Props {
  point: InsertionPoint;
  pageIsEmpty: boolean;
  /** Inserts a copy of the block (new ids) at the current insertion point. */
  onInsert(element: PageElement): void;
}

export function BlocksTab({ point, pageIsEmpty, onInsert }: Props) {
  const t = useTranslations('platformAdmin.pageEditorV2');
  const tv1 = useTranslations('platformAdmin.pageEditor');
  const mine = usePageBlocksQuery();
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const fits = (type: ElementType) => canNest(point.parentType, type);
  const reason = (type: ElementType) => (fits(type) ? undefined : point.parentType === null
    ? t('add.reasonRoot')
    : t('add.reasonParent', { parent: t(`types.${point.parentType}`), child: t(`types.${type}`) }));
  const opening = READY_BLOCKS.find((b) => b.type === 'hero')!;

  return (
    <div>
      {pageIsEmpty && (
        <div className={styles.empty} data-testid="empty-page">
          <LayoutTemplate aria-hidden="true" />
          <b>{t('blocks.emptyTitle')}</b>
          <p>{t('blocks.emptyText')}</p>
          <Button type="button" size="sm" onClick={() => onInsert(opening.element)}>{t('blocks.insertOpening')}</Button>
        </div>
      )}
      <div className={`${styles.groupTitle} ${styles.pad}`}>{t('blocks.ready')}</div>
      <ul className={styles.blockList}>
        {READY_BLOCKS.map(({ type, element }) => (
          <li key={type}>
            <button type="button" className={styles.blockCard} disabled={!fits(element.type)} title={reason(element.type)}
              aria-label={t('blocks.insert', { name: tv1(`sectionTypes.${type}`) })} onClick={() => onInsert(element)}>
              <SectionThumb type={type} />
              <b>{tv1(`sectionTypes.${type}`)}</b>
              <span>{tv1(`library.desc.${type}`)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={`${styles.groupTitle} ${styles.pad}`}>{t('blocks.mine')}</div>
      {mine.isPending && <p className={styles.none} role="status">{t('blocks.loading')}</p>}
      {mine.isError && (
        <p className={styles.none} role="alert">{t('blocks.error')} <Button type="button" variant="ghost" size="sm" onClick={() => mine.refetch()}>{t('blocks.retry')}</Button></p>
      )}
      {mine.data?.length === 0 && <p className={styles.none}>{t('blocks.mineEmpty')}</p>}
      <ul className={styles.blockList}>
        {mine.data?.map((block) => (
          <li key={block.id}>
            <button type="button" className={`${styles.blockCard} ${styles.myBlock}`} disabled={!fits(block.element.type)} title={reason(block.element.type)}
              aria-label={t('blocks.insert', { name: block.name })} onClick={() => onInsert(block.element)}>
              <b>{block.name}</b>
              <span>{date.format(new Date(block.createdAt))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
