import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@live-show/design-system';
import styles from './EmailStatusCard.module.scss';

export type EmailStatusVariant = 'loading' | 'success' | 'expired' | 'pending';

export type EmailStatusAction =
  | { label: string; href: string }
  | { label: string; onClick?: () => void; disabled?: boolean };

interface EmailStatusCardProps {
  variant: EmailStatusVariant;
  eyebrow: string;
  title: string;
  message: string;
  protectedLabel: string;
  /** Required for `loading`: the spinner is the only non-text status cue. */
  iconLabel?: string;
  email?: string;
  primaryAction?: EmailStatusAction;
  secondaryAction?: EmailStatusAction;
  footer?: ReactNode;
  /** Rendered above the actions, e.g. an inline form that replaces the primary action. */
  children?: ReactNode;
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function MailIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function StatusIcon({ variant }: { variant: EmailStatusVariant }) {
  if (variant === 'loading') return <span className={styles.spinner} />;
  if (variant === 'pending') return <MailIcon size={38} />;
  if (variant === 'success') {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ActionButton({ action, className, withArrow }: { action: EmailStatusAction; className: string; withArrow?: boolean }) {
  const content = (
    <>
      {action.label}
      {withArrow && <ArrowIcon />}
    </>
  );

  if ('href' in action) {
    return <Link href={action.href} className={className}>{content}</Link>;
  }

  return (
    <button type="button" className={className} onClick={action.onClick} disabled={action.disabled}>
      {content}
    </button>
  );
}

export function EmailStatusCard({
  variant,
  eyebrow,
  title,
  message,
  protectedLabel,
  iconLabel,
  email,
  primaryAction,
  secondaryAction,
  footer,
  children,
}: EmailStatusCardProps) {
  return (
    <main className={`${styles.page} ${styles[variant]}`} data-variant={variant}>
      <div className={styles.glowTop} aria-hidden="true" />
      <div className={styles.glowBottom} aria-hidden="true" />
      <div className={styles.scanlines} aria-hidden="true" />

      <Link href="/" className={styles.logo}>
        <Logo size={26} color="#ff2e9e" wordmarkClassName={styles.logoWordmark} />
      </Link>

      <section className={styles.card}>
        {/* Keyed by variant so the pop/ring animations replay on every state change. */}
        <div className={styles.medallion} key={variant}>
          <span className={styles.ring} aria-hidden="true" />
          <span
            className={styles.icon}
            {...(iconLabel ? { role: 'img', 'aria-label': iconLabel } : { 'aria-hidden': true })}
          >
            <StatusIcon variant={variant} />
          </span>
        </div>

        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message} role="status" aria-live="polite">{message}</p>

        {email && (
          <p className={styles.emailPill}>
            <MailIcon size={14} />
            <span className={styles.emailText}>{email}</span>
          </p>
        )}

        {children}

        {(primaryAction || secondaryAction) && (
          <div className={styles.actions}>
            {primaryAction && <ActionButton action={primaryAction} className={styles.primary} withArrow={variant !== 'loading'} />}
            {secondaryAction && <ActionButton action={secondaryAction} className={styles.secondary} />}
          </div>
        )}

        {footer && <div className={styles.footer}>{footer}</div>}
      </section>

      <p className={styles.badge}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        {protectedLabel}
      </p>
    </main>
  );
}
