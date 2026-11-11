import type { ReactNode } from "react";
import type { PageSectionType } from '@live-show/api-contracts';
import styles from './SectionLibrary.module.scss';

// Miniature wireframes of each section type, drawn with markup only (no images).
const bar = (cls: string, key?: number) => <i key={key} className={cls.split(' ').map((c) => styles[c]).join(' ')} />;
const row = (...cells: string[]) => <div className={styles.row}>{cells.map((c, i) => bar(c, i))}</div>;

const THUMBS: Record<PageSectionType, ReactNode> = {
  hero: <>{bar('a w30 h5')}{bar('title w80 h12')}{bar('w55 h6')}<div className={styles.pills}>{bar('a pill')}{bar('pill')}</div></>,
  audience: row('h6', 'title h14 mw30', 'title h14 mw30'),
  text: <>{bar('title w50 h8')}{bar('h5')}{bar('h5')}{bar('w70 h5')}{bar('h5')}</>,
  features: <>{bar('title w40 h7')}{row('', '', '')}</>,
  how: <>{bar('a w25 h4')}{bar('title w45 h8')}{row('', '', '')}</>,
  media: <>{bar('media grow')}{bar('w40 h4')}</>,
  stats: row('tint', 'tint', 'tint'),
  rail: <>{bar('title w35 h7')}{row('art1', 'art2', 'art3', 'art1')}</>,
  featured: row('art1', 'side'),
  pricing: row('', 'hot', ''),
  faq: <>{bar('title w45 h7')}{bar('h9')}{bar('h9')}{bar('h9')}</>,
  final: <div className={styles.center}>{bar('title w70 h10')}{bar('a pill')}</div>,
};

export function SectionThumb({ type }: { type: PageSectionType }) {
  return <div className={styles.thumb} aria-hidden="true">{THUMBS[type]}</div>;
}
