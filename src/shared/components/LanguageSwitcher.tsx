'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { setLocale } from '@/i18n/actions';
import type { Locale } from '@/i18n/config';
import { LOCALES } from '@/i18n/config';
import styles from './LanguageSwitcher.module.scss';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: Locale) {
    startTransition(async () => {
      await setLocale(next);
      window.location.reload();
    });
  }

  return (
    <div className={styles.wrap}>
      <Globe size={14} className={styles.icon} />
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        disabled={isPending}
        className={styles.select}
        aria-label={t('select')}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
    </div>
  );
}
