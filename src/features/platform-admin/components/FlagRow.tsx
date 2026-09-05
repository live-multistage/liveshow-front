'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { useSetGlobalFlagMutation } from '../queries/get-settings';
import type { FlagMeta } from '../data/flag-catalog';
import type { AuditLogEntry } from '../types/platform-admin.types';
import { formatAuditWhen } from '../utils/format';
import styles from './PlatformSettingsPage.module.scss';

interface Props {
  flagKey: string;
  enabled: boolean;
  meta: FlagMeta;
  lastChange: AuditLogEntry | undefined;
}

// One row of the feature-flags list. Risky flags (mobile_stripe_checkout,
// play_billing) show an inline confirm panel before mutating; the rest
// toggle immediately, mirroring the pre-redesign PlatformFeatureFlagsPage.
export function FlagRow({ flagKey, enabled, meta, lastChange }: Props) {
  const t = useTranslations('platformAdmin.featureFlags');
  const locale = useLocale();
  const setFlag = useSetGlobalFlagMutation();
  const [pending, setPending] = useState(false);
  const confirmTitleId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pending) confirmButtonRef.current?.focus();
  }, [pending]);

  const name = t.has(`${flagKey}.name`) ? t(`${flagKey}.name`) : flagKey;
  const description = t.has(`${flagKey}.description`) ? t(`${flagKey}.description`) : null;

  const apply = (nextEnabled: boolean) => {
    setFlag.mutate(
      { key: flagKey, enabled: nextEnabled },
      {
        onSuccess: () => {
          setPending(false);
          toast.success(t('toggleSuccess', { key: flagKey, state: nextEnabled ? t('on') : t('off') }));
        },
        onError: () => {
          setPending(false);
          toast.error(t('toggleError'));
        },
      },
    );
  };

  const handleToggleClick = () => {
    if (pending) {
      setPending(false);
      return;
    }
    if (meta.risky) {
      setPending(true);
      return;
    }
    apply(!enabled);
  };

  const stateLabel = pending ? t('state.pending') : enabled ? t('state.on') : t('state.off');
  const stateClass = pending ? styles.statePending : enabled ? styles.stateOn : styles.stateOff;

  const metaLine = lastChange
    ? t(lastChange.metadata?.enabled ? 'meta.changedOn' : 'meta.changedOff', {
        who: lastChange.actorName ?? '—',
        when: formatAuditWhen(lastChange.createdAt, locale),
      })
    : t('meta.never');

  return (
    <div className={`${styles.flagRow} ${pending ? styles.flagRowPending : ''}`}>
      <div className={styles.flagInfo}>
        <div className={styles.flagNameRow}>
          <span className={styles.flagName}>{name}</span>
          <code className={styles.chip}>{flagKey}</code>
          {meta.beta && <span className={`${styles.badge} ${styles.badgeBeta}`}>{t('badge.beta')}</span>}
          {meta.risky && <span className={`${styles.badge} ${styles.badgeRisky}`}>{t('badge.risky')}</span>}
        </div>
        {description && <div className={styles.flagDescription}>{description}</div>}
        <div className={styles.flagMeta}>
          {metaLine} · {t(`scope.${meta.scope}`)}
        </div>
      </div>
      <div className={styles.flagToggleCol}>
        <span className={`${styles.stateLabel} ${stateClass}`}>{stateLabel}</span>
        <button
          type="button"
          className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
          aria-pressed={enabled}
          aria-label={`${name}: ${stateLabel}`}
          onClick={handleToggleClick}
          disabled={setFlag.isPending}
        >
          <span className={styles.toggleKnob} />
        </button>
      </div>

      {pending && (
        <div
          className={styles.confirmPanel}
          role="alertdialog"
          aria-labelledby={confirmTitleId}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPending(false);
          }}
        >
          <div>
            <strong id={confirmTitleId} className={styles.confirmTitle}>
              {t('confirm.title')}
            </strong>{' '}
            {t(enabled ? 'confirm.offText' : 'confirm.onText', { name })}
          </div>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.btnOutlineSm} onClick={() => setPending(false)}>
              {t('confirm.cancel')}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              className={styles.btnDanger}
              disabled={setFlag.isPending}
              onClick={() => apply(!enabled)}
            >
              {t(enabled ? 'confirm.off' : 'confirm.on')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
