'use client';

import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Plus } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { PageDocument, PageSection, PublicPage } from '@live-show/api-contracts';
import { PageSections } from '@/features/pages-public/sections';
import styles from './PagePreview.module.scss';

export type PreviewDevice = 'desktop' | 'mobile';

interface Props {
  document: PageDocument;
  resolved: PublicPage['resolved'];
  selectedId: string | null;
  device: PreviewDevice;
  locked: boolean;
  onSelect(id: string): void;
  /** Zero-based index where the new section goes. */
  onInsert(index: number): void;
}

const hasNothingToShow = (section: PageSection, resolved: PublicPage['resolved']) =>
  (section.type === 'rail' && !resolved.rails[section.id]?.length) || (section.type === 'featured' && !resolved.featured[section.id]);

/** The editor's local document rendered with the public renderers; clicks select instead of navigating. */
export function PagePreview({ document, resolved, selectedId, device, locked, onSelect, onInsert }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedId]);

  const { sections } = document;
  const insert = (index: number, label: string, always = false) => (
    <div className={`${styles.insert} ${always ? styles.insertAlways : ''}`}>
      <button type="button" aria-label={label} disabled={locked} onClick={() => onInsert(index)}><Plus aria-hidden="true" /></button>
    </div>
  );

  const page = (
    <>
      <div className={styles.siteBar}><b>showon.io</b><span className={styles.lock}><Lock aria-hidden="true" />{t('preview.globalHeader')}</span></div>
      {sections.length === 0 ? (
        <div className={styles.empty}>
          <b>{t('preview.emptyTitle')}</b>
          <p>{t('preview.emptyText')}</p>
          <Button type="button" disabled={locked} onClick={() => onInsert(0)}><Plus aria-hidden="true" />{t('preview.addFirst')}</Button>
        </div>
      ) : sections.map((section, index) => {
        const name = t(`sectionTypes.${section.type}`);
        const selected = section.id === selectedId;
        const select = (event: MouseEvent | KeyboardEvent) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect(section.id);
        };
        return (
          <div key={section.id}>
            {insert(index, t('preview.insertBefore', { name }))}
            <div
              ref={selected ? selectedRef : undefined}
              role="button"
              tabIndex={0}
              aria-label={t('preview.select', { name })}
              aria-current={selected ? 'true' : undefined}
              className={`${styles.section} ${selected ? styles.selected : ''} ${section.hidden ? styles.hidden : ''}`}
              onClickCapture={select}
              onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && select(event)}
            >
              <div className={styles.content}>
                {hasNothingToShow(section, resolved)
                  ? <p className={styles.placeholder}>{t(section.type === 'rail' ? 'preview.noRail' : 'preview.noFeatured')}</p>
                  : <PageSections document={{ ...document, sections: [{ ...section, hidden: false } as PageSection] }} resolved={resolved} />}
              </div>
              {section.hidden && <span className={styles.badge}>{t('preview.hiddenBadge')}</span>}
            </div>
          </div>
        );
      })}
      {sections.length > 0 && insert(sections.length, t('preview.insertEnd'), true)}
      <div className={styles.siteBar}><b>showon.io</b><span className={styles.lock}><Lock aria-hidden="true" />{t('preview.globalFooter')}</span></div>
    </>
  );

  return (
    <div className={styles.preview} data-testid="preview-slot" data-selected-id={selectedId ?? undefined} data-device={device} aria-label={t('preview.frame')}>
      <div className={device === 'mobile' ? styles.phone : styles.page}>{page}</div>
    </div>
  );
}
