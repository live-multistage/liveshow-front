import { isPageHref, parsePageInlineText, type PageInlineRun } from '@live-show/api-contracts';
import { PageLink } from '../sections/PageLink';
import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

function Run({ run }: { run: PageInlineRun }) {
  let node = <>{run.text}</>;
  if (run.bold) node = <strong>{node}</strong>;
  if (run.italic) node = <em>{node}</em>;
  // Invalid href falls back to plain text.
  if (!run.href || !run.text || !isPageHref(run.href)) return node;
  return <PageLink href={run.href}>{node}</PageLink>;
}

// A blank line separates paragraphs; single line breaks stay inside one (white-space: pre-line).
const PARAGRAPHS = /\n\s*\n/;

export const Text: ElementView<'text'> = ({ props, common }) => (
  <div id={common.id} className={cx(styles.text, common.className)}>
    {props.text
      .split(PARAGRAPHS)
      .filter((p) => p.trim())
      .map((paragraph, i) => (
        <p key={i}>
          {parsePageInlineText(paragraph).map((run, j) => <Run key={j} run={run} />)}
        </p>
      ))}
  </div>
);
