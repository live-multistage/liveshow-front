import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './EmptyStatePanel.module.scss';

export interface EmptyStatePanelKind {
  icon: ReactNode;
  title: string;
  text: string;
}

export interface EmptyStatePanelProps {
  illustration: ReactNode;
  badge: string;
  title: string;
  text: string;
  primaryCta: { href: string; label: string; icon?: ReactNode };
  secondary?: ReactNode;
  kindsLabel: string;
  kinds: EmptyStatePanelKind[];
}

/**
 * Bordered "nothing here yet" panel shared by Favoritos and Minha Lista:
 * floating illustration, pulsing badge, CTA row, and a "how it works" grid.
 * Both features hand it their own copy/icons — this owns only the shell.
 */
export function EmptyStatePanel({
  illustration,
  badge,
  title,
  text,
  primaryCta,
  secondary,
  kindsLabel,
  kinds,
}: EmptyStatePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.blob} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.illustration}>{illustration}</div>

        <div className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden="true" />
          {badge}
        </div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.text}>{text}</p>

        <div className={styles.ctas}>
          <Link href={primaryCta.href} className={styles.primaryCta}>
            {primaryCta.icon}
            {primaryCta.label}
          </Link>
          {secondary}
        </div>

        <div className={styles.kinds}>
          <div className={styles.kindsLabel}>{kindsLabel}</div>
          <div className={styles.kindsGrid}>
            {kinds.map((kind) => (
              <div key={kind.title} className={styles.kindCard}>
                <span className={styles.kindIcon}>{kind.icon}</span>
                <div>
                  <p className={styles.kindTitle}>{kind.title}</p>
                  <p className={styles.kindText}>{kind.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
