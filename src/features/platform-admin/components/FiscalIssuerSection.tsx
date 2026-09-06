'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Switch } from '@live-show/design-system';
import { useFiscalIssuerQuery } from '../queries/get-fiscal-issuer';
import { useUpdateFiscalIssuerMutation } from '../mutations/update-fiscal-issuer.mutation';
import type { FiscalIssuerView, FiscalTaxRegime } from '../types/platform-admin.types';
import cardStyles from './PlatformSettingsPage.module.scss';
import styles from './FiscalIssuerSection.module.scss';

const TAX_REGIMES: FiscalTaxRegime[] = ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI'];

type Draft = Omit<FiscalIssuerView, 'id' | 'issuerKind' | 'updatedAt' | 'issRate'> & { issRatePct: string };

function toDraft(issuer: FiscalIssuerView): Draft {
  const { id: _id, issuerKind: _issuerKind, updatedAt: _updatedAt, issRate, ...rest } = issuer;
  return { ...rest, issRatePct: String(Math.round(issRate * 10000) / 100).replace('.', ',') };
}

// NFS-e issuer (platform) card, mirrors FeesSection's card structure. The
// 13 fields the backend needs to fill PlugNotas requests; issRate is edited
// as a percent and sent to the API as a 0..1 fraction.
export function FiscalIssuerSection() {
  const t = useTranslations('platformAdmin.fiscal.issuer');
  const { data: issuer } = useFiscalIssuerQuery();
  const update = useUpdateFiscalIssuerMutation();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (issuer) setDraft(toDraft(issuer));
  }, [issuer]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const pct = Number(draft.issRatePct.replace(',', '.'));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error(t('error'));
      return;
    }
    const { issRatePct: _issRatePct, ...rest } = draft;
    update.mutate(
      { ...rest, issRate: Math.round(pct * 100) / 10000 },
      {
        onSuccess: () => toast.success(t('saved')),
        onError: () => toast.error(t('error')),
      },
    );
  }

  if (!draft) return null;

  return (
    <section className={cardStyles.card}>
      <header className={cardStyles.sectionHeader}>
        <div className={cardStyles.mono10}>{t('eyebrow')}</div>
        <div className={cardStyles.sectionTitle}>{t('title')}</div>
        <p>{t('sub')}</p>
      </header>

      <form onSubmit={submit}>
        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>{t('cnpj')}</span>
            <input className={styles.input} value={draft.cnpj} onChange={(e) => set('cnpj', e.target.value)} aria-label={t('cnpj')} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('legalName')}</span>
            <input className={styles.input} value={draft.legalName} onChange={(e) => set('legalName', e.target.value)} aria-label={t('legalName')} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('municipalRegistration')}</span>
            <input
              className={styles.input}
              value={draft.municipalRegistration ?? ''}
              onChange={(e) => set('municipalRegistration', e.target.value || null)}
              aria-label={t('municipalRegistration')}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('cityIbgeCode')}</span>
            <input className={styles.input} value={draft.cityIbgeCode} onChange={(e) => set('cityIbgeCode', e.target.value)} aria-label={t('cityIbgeCode')} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('serviceCodeNational')}</span>
            <input
              className={styles.input}
              value={draft.serviceCodeNational}
              onChange={(e) => set('serviceCodeNational', e.target.value)}
              aria-label={t('serviceCodeNational')}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('cnae')}</span>
            <input className={styles.input} value={draft.cnae ?? ''} onChange={(e) => set('cnae', e.target.value || null)} aria-label={t('cnae')} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('issRate')}</span>
            <input
              className={styles.input}
              value={draft.issRatePct}
              onChange={(e) => set('issRatePct', e.target.value)}
              inputMode="decimal"
              aria-label={t('issRate')}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('taxRegime')}</span>
            <select
              className={styles.select}
              value={draft.taxRegime}
              onChange={(e) => set('taxRegime', e.target.value as FiscalTaxRegime)}
              aria-label={t('taxRegime')}
            >
              {TAX_REGIMES.map((regime) => (
                <option key={regime} value={regime}>
                  {regime}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('ibsCbsCst')}</span>
            <input
              className={styles.input}
              value={draft.ibsCbsCst ?? ''}
              onChange={(e) => set('ibsCbsCst', e.target.value || null)}
              aria-label={t('ibsCbsCst')}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('ibsCbsClassTrib')}</span>
            <input
              className={styles.input}
              value={draft.ibsCbsClassTrib ?? ''}
              onChange={(e) => set('ibsCbsClassTrib', e.target.value || null)}
              aria-label={t('ibsCbsClassTrib')}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('serviceDescriptionTemplate')}</span>
            <input
              className={styles.input}
              value={draft.serviceDescriptionTemplate}
              onChange={(e) => set('serviceDescriptionTemplate', e.target.value)}
              aria-label={t('serviceDescriptionTemplate')}
            />
          </label>
          <div className={styles.switchField}>
            <Switch checked={draft.issWithheld} onCheckedChange={(checked) => set('issWithheld', checked)} aria-label={t('issWithheld')} />
            <span className={styles.label}>{t('issWithheld')}</span>
          </div>
          <div className={styles.switchField}>
            <Switch checked={draft.active} onCheckedChange={(checked) => set('active', checked)} aria-label={t('active')} />
            <span className={styles.label}>{t('active')}</span>
          </div>
        </div>

        {!draft.active && <p className={styles.inactiveHint}>{t('inactiveHint')}</p>}

        <div className={styles.footer}>
          <button type="submit" className={cardStyles.btnOutlineSm} disabled={update.isPending}>
            {t('save')}
          </button>
        </div>
      </form>
    </section>
  );
}
