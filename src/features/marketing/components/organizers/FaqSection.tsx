'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './FaqSection.module.scss';

interface FaqItem {
  q: string;
  a: string;
}

function FaqRow({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  const baseId = useId();
  const btnId = `${baseId}-btn`;
  const panelId = `${baseId}-panel`;

  return (
    <div className={styles.item}>
      <button
        type="button"
        id={btnId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={[styles.trigger, isOpen ? styles.open : ''].join(' ').trim()}
        onClick={onToggle}
      >
        {item.q}
        <span className={[styles.icon, isOpen ? styles.open : ''].join(' ').trim()}>
          <Plus size={14} strokeWidth={2.4} />
        </span>
      </button>
      <div id={panelId} role="region" aria-labelledby={btnId} aria-hidden={!isOpen} className={[styles.panel, isOpen ? styles.open : ''].join(' ').trim()}>
        <p className={styles.answer}>{item.a}</p>
      </div>
    </div>
  );
}

export function FaqSection() {
  const t = useTranslations('organizersPage');
  const items = t.raw('faq.items') as FaqItem[];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <Reveal as="div" className={styles.left}>
          <SectionHeader label={t('faq.label')} title={t('faq.title')} />
          <Link href="/help" className={styles.helpLink}>
            {t('faq.helpLink')} <span>→</span>
          </Link>
        </Reveal>

        <Reveal as="div" delay={120} className={styles.right}>
          {items.map((item, index) => (
            <FaqRow
              key={item.q}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
          <div className={styles.closingLine} />
        </Reveal>
      </div>
    </section>
  );
}
