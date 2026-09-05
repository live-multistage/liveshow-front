'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useSettingsAuditQuery, isSettingsAuditEntry } from '../queries/get-settings';
import type { AuditLogEntry } from '../types/platform-admin.types';
import { ratePct, formatAuditWhen } from '../utils/format';
import styles from './PlatformSettingsPage.module.scss';

// Right rail: last 6 settings-relevant audit entries (flags + fees) plus a
// static "how it works" explainer with a link to per-org overrides.
export function SettingsAuditRail() {
  const t = useTranslations('platformAdmin.settings');
  const locale = useLocale();
  const { data } = useSettingsAuditQuery();

  const recent = (data ?? [])
    .filter(isSettingsAuditEntry)
    .toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6);

  return (
    <aside className={styles.rail}>
      <section className={styles.card}>
        <header className={styles.railHeader}>
          <div className={styles.mono10}>{t('audit.eyebrow')}</div>
          <a href="/dashboard/platform/audit" className={styles.railLink}>
            {t('audit.all')} →
          </a>
        </header>
        {recent.map((entry) => (
          <AuditRailRow key={entry.id} entry={entry} locale={locale} />
        ))}
      </section>

      <section className={`${styles.card} ${styles.howCard}`}>
        <div className={styles.mono10}>{t('how.eyebrow')}</div>
        <p className={styles.howText}>
          {t.rich('how.text', {
            // `{risky}` is a plain interpolation, not an XML tag, so next-intl embeds
            // the value as-is — passing a RichTagsFunction here would render nothing.
            risky: <span className={styles.riskyText}>{t('how.risky')}</span>,
          } as unknown as Parameters<typeof t.rich>[1])}
        </p>
        <a href="/dashboard/platform/organizations" className={styles.railLink}>
          {t('how.link')} →
        </a>
      </section>
    </aside>
  );
}

function AuditRailRow({ entry, locale }: { entry: AuditLogEntry; locale: string }) {
  const t = useTranslations('platformAdmin.settings.audit');

  const enabled = entry.action === 'FEATURE_FLAG_SET' ? Boolean(entry.metadata?.enabled) : null;
  const dotClass =
    entry.action === 'FEATURE_FLAG_SET'
      ? enabled
        ? styles.dotGreen
        : styles.dotMuted
      : styles.dotPink;

  const actionText =
    entry.action === 'FEATURE_FLAG_SET'
      ? t(enabled ? 'on' : 'off')
      : entry.action === 'FEE_RATE_SET'
        ? t('feeChanged', { to: typeof entry.metadata?.rate === 'number' ? ratePct(entry.metadata.rate) : '—' })
        : t('feeOverride');

  return (
    <div className={styles.auditRow}>
      <span className={`${styles.auditDot} ${dotClass}`} />
      <div>
        <div className={styles.auditLine}>
          <code className={styles.chip}>{entry.targetId ?? 'platform_fee'}</code> {actionText}
        </div>
        <div className={styles.auditSub}>
          {entry.actorName ?? '—'} · {formatAuditWhen(entry.createdAt, locale)}
        </div>
      </div>
    </div>
  );
}
