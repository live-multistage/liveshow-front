import type { ReactNode } from 'react';
import { isPageHref } from '@live-show/api-contracts';

interface Props {
  href: string;
  className?: string;
  /** Internal links open in the same tab unless asked; external https links always open a new one. */
  newTab?: boolean;
  children: ReactNode;
}

// Unsafe or malformed hrefs never become links: callers get null and skip the element.
export function PageLink({ href, className, newTab, children }: Props) {
  if (!isPageHref(href)) return null;
  const blank = newTab || href.startsWith('https://');
  return (
    <a href={href} className={className} {...(blank ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}
