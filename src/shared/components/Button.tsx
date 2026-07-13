'use client';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'info' | 'success' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  uppercase?: boolean;
  fullWidth?: boolean;
}

type Props = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'> & {
    /** When set (and not disabled/loading), renders a real link so new-tab/middle-click work. */
    href?: string;
  };

export function Button({
  variant = 'outline',
  size = 'md',
  isLoading = false,
  loadingLabel,
  icon,
  uppercase = false,
  fullWidth = false,
  children,
  disabled,
  className,
  href,
  target,
  rel,
  ...props
}: Props) {
  const cls = [
    styles.button,
    styles[variant],
    styles[size],
    uppercase ? styles.uppercase : '',
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ].join(' ');

  const content = isLoading ? (
    <>
      <span className={styles.spinner} />
      {loadingLabel ?? children}
    </>
  ) : (
    <>
      {icon}
      {children}
    </>
  );

  if (href && !disabled && !isLoading) {
    return (
      <Link href={href} target={target} rel={rel} className={cls}>
        {content}
      </Link>
    );
  }

  return (
    <button {...props} disabled={disabled || isLoading} className={cls}>
      {content}
    </button>
  );
}
