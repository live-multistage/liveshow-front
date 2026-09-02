'use client';

import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Chip } from '@live-show/design-system';
import { FAQS, FAQ_FILTERS } from '../data/faqs';
import { filterFaqs, type SearchableFaq } from '../utils/filter-faqs';
import type { FaqFilter } from '../types/faq.types';
import styles from './HelpPageContent.module.scss';

const SUPPORT_EMAIL = 'privacidade@showon.io';

export function HelpPageContent() {
  const t = useTranslations('help');
  const panelIdBase = useId();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FaqFilter>('all');
  // Uma resposta aberta por vez, como no desenho. `null` = todas fechadas.
  const [openId, setOpenId] = useState<string | null>(FAQS[0]?.id ?? null);

  // O filtro busca no texto traduzido, então a tradução tem de acontecer antes
  // dele — não dentro do render de cada item.
  const results = useMemo<SearchableFaq[]>(() => {
    const translated = FAQS.map((faq) => ({
      ...faq,
      question: t(`faq.${faq.id}.q`),
      answer: t(`faq.${faq.id}.a`),
    }));
    return filterFaqs(translated, { query, filter });
  }, [t, query, filter]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </header>

      <div className={styles.search}>
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.filters} role="group" aria-label={t('filtersLabel')}>
        {FAQ_FILTERS.map((key) => (
          <Chip
            key={key}
            variant={filter === key ? 'active' : 'default'}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {t(`categories.${key}`)}
          </Chip>
        ))}
      </div>

      <div className={styles.list}>
        {results.map((faq) => {
          const open = openId === faq.id;
          const panelId = `${panelIdBase}-${faq.id}`;

          return (
            <article key={faq.id} className={styles.item}>
              {/* O desenho usa uma div clicável. Um <button> com aria-expanded
                  é o que torna o acordeão operável por teclado e legível por
                  leitor de tela — a aparência é a mesma. */}
              <button
                type="button"
                className={styles.question}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : faq.id)}
              >
                <span className={styles.questionText}>{faq.question}</span>
                <span className={styles.toggle} aria-hidden="true">
                  {open ? '−' : '+'}
                </span>
              </button>

              {open && (
                <div id={panelId} className={styles.answer} role="region">
                  {faq.answer}
                </div>
              )}
            </article>
          );
        })}

        {results.length === 0 && (
          <div className={styles.noResults}>
            <p className={styles.noResultsTitle}>{t('noResults')}</p>
            <p className={styles.noResultsHint}>{t('noResultsHint')}</p>
          </div>
        )}
      </div>

      <section className={styles.cta}>
        <div>
          <h2 className={styles.ctaTitle}>{t('ctaTitle')}</h2>
          <p className={styles.ctaSubtitle}>{t('ctaSubtitle')}</p>
        </div>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.ctaAction}>
          {t('ctaAction')}
        </a>
      </section>
    </main>
  );
}
