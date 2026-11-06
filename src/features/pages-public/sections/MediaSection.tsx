import type { MediaProps } from '@live-show/api-contracts';
import styles from './sections.module.scss';

export function MediaSection({ props: p }: { props: MediaProps }) {
  return (
    <figure className={styles.figure}>
      {p.kind === 'video' ? (
        <video className={styles.media} src={p.url} controls preload="metadata" aria-label={p.alt} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs are not in next/image remotePatterns
        <img className={styles.media} src={p.url} alt={p.alt} loading="lazy" />
      )}
      {p.caption && <figcaption className={styles.caption}>{p.caption}</figcaption>}
    </figure>
  );
}
