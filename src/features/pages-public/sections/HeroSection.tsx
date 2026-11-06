import type { HeroProps } from '@live-show/api-contracts';
import { PageLink } from './PageLink';
import styles from './sections.module.scss';

export function HeroSection({ props: p }: { props: HeroProps }) {
  return (
    <>
      {p.eyebrow && <p className={styles.eyebrow}>{p.eyebrow}</p>}
      <h2 className={styles.heroTitle}>{p.title}</h2>
      {p.subtitle && <p className={styles.lead}>{p.subtitle}</p>}
      {(p.primaryCta || p.secondaryCta) && (
        <div className={styles.ctas}>
          {p.primaryCta && (
            <PageLink href={p.primaryCta.href} className={`${styles.cta} ${styles.ctaPrimary}`}>{p.primaryCta.label}</PageLink>
          )}
          {p.secondaryCta && (
            <PageLink href={p.secondaryCta.href} className={`${styles.cta} ${styles.ctaSecondary}`}>{p.secondaryCta.label}</PageLink>
          )}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs are not in next/image remotePatterns */}
      {p.image && <img className={styles.heroImage} src={p.image.url} alt={p.image.alt} />}
    </>
  );
}
