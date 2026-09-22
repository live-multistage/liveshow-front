import { useTranslations } from 'next-intl';
import { Image as ImageIcon, Play } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './FormatsSection.module.scss';

interface FormatItem {
  title: string;
  spec: string;
  where: string;
}

// Shape glyphs are visual proportions of each format, not real creatives —
// same "illustrative mock" precedent as PositionMock.
const SHAPES: Array<'wide' | 'tall' | 'image' | 'video'> = ['wide', 'tall', 'image', 'video'];

function FormatGlyph({ shape }: { shape: (typeof SHAPES)[number] }) {
  if (shape === 'wide') return <span className={`${styles.glyph} ${styles.glyphWide}`} aria-hidden="true" />;
  if (shape === 'tall') return <span className={`${styles.glyph} ${styles.glyphTall}`} aria-hidden="true" />;
  if (shape === 'image')
    return (
      <span className={`${styles.glyph} ${styles.glyphImage}`} aria-hidden="true">
        <ImageIcon size={26} strokeWidth={1.8} />
      </span>
    );
  return (
    <span className={`${styles.glyph} ${styles.glyphImage}`} aria-hidden="true">
      <Play size={20} fill="currentColor" strokeWidth={0} />
    </span>
  );
}

export function FormatsSection() {
  const t = useTranslations('advertisersPage.formats');
  const items = t.raw('items') as FormatItem[];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHeader label={t('label')} title={t('title')} />
        <div className={styles.grid}>
          {items.map((item, i) => (
            <Reveal as="div" key={item.title} delay={i * 80} className={styles.card}>
              <div className={styles.glyphWrap}>
                <FormatGlyph shape={SHAPES[i] ?? 'wide'} />
              </div>
              <h3 className={styles.title}>{item.title}</h3>
              <div className={styles.spec}>{item.spec}</div>
              <div className={styles.where}>{item.where}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
