'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { Button, Chip, Input } from '@live-show/design-system';
import { PAGE_LIMITS, PAGE_SECTION_TYPES, type PageSectionType } from '@live-show/api-contracts';
import { SectionThumb } from './SectionThumb';
import styles from './SectionLibrary.module.scss';

const CATEGORIES = ['all', 'open', 'content', 'events', 'conv'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_OF: Record<PageSectionType, Exclude<Category, 'all'>> = {
  hero: 'open', audience: 'open',
  text: 'content', features: 'content', how: 'content', media: 'content', stats: 'content',
  rail: 'events', featured: 'events',
  pricing: 'conv', faq: 'conv', final: 'conv',
};

interface Props {
  /** Zero-based index where the new section will be inserted. */
  position: number;
  count: number;
  onPick(type: PageSectionType): void;
  onClose(): void;
}

export function SectionLibrary({ position, count, onPick, onClose }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const full = count >= PAGE_LIMITS.maxSections;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const needle = query.trim().toLowerCase();
  const types = PAGE_SECTION_TYPES.filter((type) => {
    if (category !== 'all' && CATEGORY_OF[type] !== category) return false;
    return !needle || `${t(`sectionTypes.${type}`)} ${t(`library.desc.${type}`)}`.toLowerCase().includes(needle);
  });

  return (
    <div className={styles.library} role="dialog" aria-label={t('library.dialog')}>
      <div className={styles.header}>
        <span>{t('library.title')} <span className={styles.position}>· {t('library.position', { n: String(position + 1).padStart(2, '0') })}</span></span>
        <Button type="button" variant="ghost" size="icon" aria-label={t('library.close')} onClick={onClose}><X aria-hidden="true" /></Button>
      </div>
      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" />
          <Input type="search" aria-label={t('library.search')} placeholder={t('library.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className={styles.chips} role="group" aria-label={t('library.categories')}>
          {CATEGORIES.map((key) => (
            <Chip key={key} type="button" variant={category === key ? 'active' : 'default'} aria-pressed={category === key} onClick={() => setCategory(key)}>
              {t(`library.category.${key}`)}
            </Chip>
          ))}
        </div>
        {full && <p className={styles.full} role="status">{t('library.full', { max: PAGE_LIMITS.maxSections })}</p>}
      </div>
      <div className={styles.scroll}>
        {types.length === 0 ? <p className={styles.none}>{t('library.none')}</p> : (
          <div className={styles.grid}>
            {types.map((type) => (
              <button key={type} type="button" className={styles.card} disabled={full}
                aria-label={t('library.add', { name: t(`sectionTypes.${type}`) })} onClick={() => onPick(type)}>
                <SectionThumb type={type} />
                <b>{t(`sectionTypes.${type}`)}</b>
                <span>{t(`library.desc.${type}`)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
