import { isPageHref, type PageTextRun, TextProps } from '@live-show/api-contracts';
import { PageLink } from './PageLink';
import styles from './sections.module.scss';

function Run({ run }: { run: PageTextRun }) {
  let node = <>{run.text}</>;
  if (run.bold) node = <strong>{node}</strong>;
  if (run.italic) node = <em>{node}</em>;
  // Invalid href falls back to plain text.
  if (!run.href || !isPageHref(run.href)) return node;
  return <PageLink href={run.href}>{node}</PageLink>;
}

export function TextSection({ props: p }: { props: TextProps }) {
  return (
    <>
      {p.title && <h2 className={styles.title}>{p.title}</h2>}
      {p.paragraphs.map((runs, i) => (
        <p key={i} className={styles.paragraph}>
          {runs.map((r, j) => <Run key={j} run={r} />)}
        </p>
      ))}
    </>
  );
}
