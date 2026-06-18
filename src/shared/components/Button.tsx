'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'info' | 'success' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  uppercase?: boolean;
  fullWidth?: boolean;
}

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

  return (
    <button {...props} disabled={disabled || isLoading} className={cls}>
      {isLoading ? (
        <>
          <span className={styles.spinner} />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
