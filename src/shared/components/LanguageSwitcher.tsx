'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { setLocale } from '@/i18n/actions';
import type { Locale } from '@/i18n/config';
import { LOCALES } from '@/i18n/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@live-show/design-system';
import styles from './LanguageSwitcher.module.scss';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    startTransition(() => {
      void (async () => {
        await setLocale(next as Locale);
        window.location.reload();
      })();
    });
  }

  return (
    <div className={styles.wrap}>
      <Globe size={14} className={styles.icon} />
      <Select value={locale} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className={styles.trigger} aria-label={t('select')}>
          <SelectValue>{t(locale)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LOCALES.map((l) => (
            <SelectItem key={l} value={l}>
              {t(l)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
