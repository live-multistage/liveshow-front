import type { ReactNode } from 'react';
import { isPageHref } from '@live-show/api-contracts';

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
}

// Unsafe or malformed hrefs never become links: callers get null and skip the element.
export function PageLink({ href, className, children }: Props) {
  if (!isPageHref(href)) return null;
  const external = href.startsWith('https://');
  return (
    <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}
