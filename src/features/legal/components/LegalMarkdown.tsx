import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './LegalMarkdown.module.scss';

const components: Components = {
  a: ({ href = '', children }) =>
    href.startsWith('/') && !href.startsWith('//') ? (
      <Link href={href} className={styles.link}>
        {children}
      </Link>
    ) : (
      <a href={href} className={styles.link} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    ),
};

// Admin-authored markdown. skipHtml drops raw HTML; react-markdown's default
// urlTransform already strips javascript:/data: hrefs.
export function LegalMarkdown({ source }: { source: string }) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
