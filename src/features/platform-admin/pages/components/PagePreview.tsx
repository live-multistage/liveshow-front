'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Plus } from 'lucide-react';
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
  onMove(id: string, delta: -1 | 1): void;
  onToggleHidden(id: string): void;
}

// The desktop preview always lays the page out at this width and is scaled to fit the column.
const DESKTOP_WIDTH = 1280;

const hasNothingToShow = (section: PageSection, resolved: PublicPage['resolved']) =>
  (section.type === 'rail' && !resolved.rails[section.id]?.length) || (section.type === 'featured' && !resolved.featured[section.id]);

/** The editor's local document rendered with the public renderers; clicks select instead of navigating. */
export function PagePreview({ document, resolved, selectedId, device, locked, onSelect, onInsert, onMove, onToggleHidden }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const selectedRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState(DESKTOP_WIDTH);
  const [pageHeight, setPageHeight] = useState(0);
  const scale = Math.min(1, columnWidth / DESKTOP_WIDTH);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const { target, contentRect } of entries) {
        if (target === root) setColumnWidth(contentRect.width);
        else setPageHeight(contentRect.height);
      }
    });
    observer.observe(root);
    if (pageRef.current) observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, [device]);

  // Rendered sections are inert here: keep their links and controls out of the Tab order (the wrapper is the focus target).
  useEffect(() => {
    rootRef.current?.querySelectorAll('[data-section-content] :is(a, button, input, select, textarea, [tabindex])')
      .forEach((el) => el.setAttribute('tabindex', '-1'));
  }, [document, resolved, device]);

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
          <div key={section.id} className={styles.slot}>
            {insert(index, t('preview.insertBefore', { name }))}
            <div
              ref={selected ? selectedRef : undefined}
              role="button"
              tabIndex={0}
              aria-label={t('preview.select', { name })}
              aria-current={selected ? 'true' : undefined}
              className={`${styles.section} ${selected ? styles.selected : ''} ${section.hidden ? styles.hidden : ''}`}
              onClickCapture={select}
              onAuxClickCapture={select}
              onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && select(event)}
            >
              <div className={styles.content} data-section-content>
                {hasNothingToShow(section, resolved)
                  ? <p className={styles.placeholder}>{t(section.type === 'rail' ? 'preview.noRail' : 'preview.noFeatured')}</p>
                  : <PageSections document={{ ...document, sections: [{ ...section, hidden: false } as PageSection] }} resolved={resolved} />}
              </div>
              {section.hidden && <span className={styles.badge}>{t('preview.hiddenBadge')}</span>}
            </div>
            {selected && (
              <div className={styles.toolbar} role="toolbar" aria-label={t('preview.toolbar.label')}>
                <span>{name}</span>
                <button type="button" disabled={locked || index === 0} aria-label={t('preview.toolbar.up')} onClick={() => onMove(section.id, -1)}>
                  <ArrowUp aria-hidden="true" />
                </button>
                <button type="button" disabled={locked || index === sections.length - 1} aria-label={t('preview.toolbar.down')} onClick={() => onMove(section.id, 1)}>
                  <ArrowDown aria-hidden="true" />
                </button>
                <button type="button" disabled={locked} aria-label={t(section.hidden ? 'preview.toolbar.show' : 'preview.toolbar.hide')} onClick={() => onToggleHidden(section.id)}>
                  {section.hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            )}
          </div>
        );
      })}
      {sections.length > 0 && insert(sections.length, t('preview.insertEnd'), true)}
      <div className={styles.siteBar}><b>showon.io</b><span className={styles.lock}><Lock aria-hidden="true" />{t('preview.globalFooter')}</span></div>
    </>
  );

  return (
    <div ref={rootRef} className={styles.preview} data-testid="preview-slot" data-selected-id={selectedId ?? undefined} data-device={device} aria-label={t('preview.frame')}>
      {device === 'mobile' ? <div className={styles.phone}>{page}</div> : (
        // The frame takes the scaled size in layout; transforms alone would leave the unscaled box behind.
        <div className={styles.frame} style={{ width: DESKTOP_WIDTH * scale, height: pageHeight ? pageHeight * scale : undefined }}>
          <div
            ref={pageRef}
            data-testid="preview-scaler"
            className={styles.page}
            style={{ width: DESKTOP_WIDTH, transform: `scale(${scale})`, ['--preview-inverse-scale' as string]: 1 / scale }}
          >
            {page}
          </div>
        </div>
      )}
    </div>
  );
}
