'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Pencil, Check, X } from 'lucide-react';
import {
  usePlatformSettingsQuery,
  useSetDefaultFeeRateMutation,
  useSettingsAuditQuery,
} from '../queries/get-settings';
import { ratePct, formatAuditWhen } from '../utils/format';
import styles from './PlatformSettingsPage.module.scss';

// Fees card (design: "Taxas"). Default platform fee is editable via
// PATCH /platform-settings (ported from the old overview PlatformSettingsCard);
// the buyer fee (CART_TAX_RATE) is env-configured and read-only.
export function FeesSection() {
  const t = useTranslations('platformAdmin.settings.fees');
  const locale = useLocale();
  const { data: settings } = usePlatformSettingsQuery();
  const { data: auditEntries } = useSettingsAuditQuery();
  const setFee = useSetDefaultFeeRateMutation();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (settings && !editing) setDraft((settings.defaultFeeRate * 100).toString().replace('.', ','));
  }, [settings, editing]);

  const save = () => {
    const pct = Number(draft.replace(',', '.'));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error(t('save'));
      return;
    }
    setFee.mutate(pct / 100, {
      onSuccess: () => setEditing(false),
      onError: () => toast.error(t('save')),
    });
  };

  const lastFeeChange = (auditEntries ?? [])
    .filter((entry) => entry.action === 'FEE_RATE_SET')
    .toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];

  const changedLine = lastFeeChange
    ? t('default.changed', { who: lastFeeChange.actorName ?? '—', when: formatAuditWhen(lastFeeChange.createdAt, locale) })
    : t('default.never');

  const cartTaxRate = settings?.cartTaxRate;

  return (
    <section className={styles.card}>
      <header className={styles.sectionHeader}>
        <div className={styles.mono10}>{t('eyebrow')}</div>
        <div className={styles.sectionTitle}>{t('title')}</div>
      </header>
      <div className={styles.feesGrid}>
        <div className={styles.feeCell}>
          <div className={styles.feeRowTop}>
            <div>
              <div className={styles.feeLabel}>{t('default.title')}</div>
              <div className={styles.feeSub}>{t('default.sub')}</div>
            </div>
            <span className={styles.chip}>{t('default.badge')}</span>
          </div>
          {editing ? (
            <div className={styles.feeEditRow}>
              <input
                className={styles.feeInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                inputMode="decimal"
                aria-label={t('default.title')}
              />
              <span className={styles.feePct}>%</span>
              <button className={styles.iconBtnOk} onClick={save} disabled={setFee.isPending} aria-label={t('default.save')}>
                <Check size={14} />
              </button>
              <button className={styles.iconBtn} onClick={() => setEditing(false)} aria-label={t('default.cancel')}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className={styles.feeEditRow}>
              <span className={styles.feeValue}>{settings ? ratePct(settings.defaultFeeRate) : '—'}</span>
              <button className={styles.btnOutlineSm} onClick={() => setEditing(true)} aria-label={t('default.edit')}>
                <Pencil size={12} /> {t('default.edit')}
              </button>
            </div>
          )}
          <div className={styles.feeMeta}>{changedLine}</div>
        </div>

        <div className={styles.feeCell}>
          <div className={styles.feeRowTop}>
            <div>
              <div className={styles.feeLabel}>{t('buyer.title')}</div>
              <div className={styles.feeSub}>{t('buyer.sub')}</div>
            </div>
            <span className={`${styles.chip} ${styles.chipMuted}`}>{t('buyer.badge')}</span>
          </div>
          <div className={styles.feeEditRow}>
            <span className={styles.feeValue}>{typeof cartTaxRate === 'number' && Number.isFinite(cartTaxRate) ? ratePct(cartTaxRate) : '—'}</span>
            <code className={styles.chip}>CART_TAX_RATE</code>
          </div>
          <div className={styles.feeMeta}>{t('buyer.hint')}</div>
        </div>
      </div>
    </section>
  );
}
