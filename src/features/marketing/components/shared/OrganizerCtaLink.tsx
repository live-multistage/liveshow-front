'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/account/hooks/use-auth';
import { organizerCtaHref } from '../../constants';
import styles from './OrganizerCtaLink.module.scss';

export type OrganizerCtaSize = 'md' | 'lg' | 'xl';

interface OrganizerCtaLinkProps {
  children: ReactNode;
  size?: OrganizerCtaSize;
  withArrow?: boolean;
  className?: string;
}

export function OrganizerCtaLink({ children, size = 'md', withArrow = false, className }: OrganizerCtaLinkProps) {
  const { isLoggedIn } = useAuth();
  const href = organizerCtaHref(isLoggedIn);
  const cls = [styles.cta, styles[size], className ?? ''].join(' ').trim();

  return (
    <Link href={href} className={cls}>
      {children}
      {withArrow ? <ArrowRight size={17} strokeWidth={2.4} /> : null}
    </Link>
  );
}
