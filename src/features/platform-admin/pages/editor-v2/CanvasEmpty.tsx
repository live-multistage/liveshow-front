'use client';

import { useTranslations } from 'next-intl';
import { Box, LayoutTemplate, Plus } from 'lucide-react';
import { Button } from '@live-show/design-system';
import { EMPTY_SECTION, OPENING_BLOCK } from './left/ready-blocks';
import { useInsertBlock } from './left/use-insert-block';
import styles from './PageEditorV2.module.scss';

/**
 * Empty page, drawn over the (still mounted, still droppable) page root. Same actions as the Blocos tab of the left panel.
 * The wrapper ignores the pointer so a drop reaches the root zone beneath; only the buttons catch it.
 */
export function CanvasEmpty() {
  const t = useTranslations('platformAdmin.pageEditorV2');
  const insert = useInsertBlock();
  return (
    <div className={styles.emptyPage} data-testid="canvas-empty">
      <span className={styles.emptyIcon}><LayoutTemplate aria-hidden="true" /></span>
      <h2>{t('blocks.emptyTitle')}</h2>
      <p>{t('canvas.emptyText')}</p>
      <div className={styles.emptyDrop}><Plus aria-hidden="true" /><b>{t('canvas.dropHere')}</b></div>
      <div className={styles.emptyActions}>
        <Button type="button" variant="outline" size="sm" onClick={() => insert(EMPTY_SECTION)}><Box aria-hidden="true" />{t('blocks.emptySection')}</Button>
        <Button type="button" size="sm" onClick={() => insert(OPENING_BLOCK)}>{t('blocks.insertOpening')}</Button>
      </div>
    </div>
  );
}
