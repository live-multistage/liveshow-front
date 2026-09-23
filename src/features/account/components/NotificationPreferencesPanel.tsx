'use client';

import { useTranslations } from 'next-intl';
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '../queries/get-notification-preferences';
import type { NotificationPreferenceKey } from '../types/notification-preferences.types';
import { Toggle } from './Toggle';
import styles from './SettingsPageContent.module.scss';

const PREF_KEYS: NotificationPreferenceKey[] = ['LIVE_EVENTS', 'TICKET_REMINDERS', 'NEWS_PROMOS', 'EMAIL_DIGEST'];

interface Props {
  sectionId?: string;
  labelKey?: string;
  titleKey?: string;
}

// Reused by SettingsPageContent (id="notificacoes") and the new
// /account/notifications screen — same query/mutation, no duplicated logic.
export function NotificationPreferencesPanel({ sectionId, labelKey = 'PREFERÊNCIAS', titleKey }: Props) {
  const t = useTranslations('settings');
  const { data: prefs } = useNotificationPreferencesQuery();
  const updatePrefs = useUpdateNotificationPreferencesMutation();

  const togglePref = (key: NotificationPreferenceKey) => {
    if (!prefs) return;
    updatePrefs.mutate({ [key]: !prefs[key] });
  };

  return (
    <section id={sectionId} className={styles.card}>
      <div className={styles.cardLabel}>{labelKey}</div>
      <div className={styles.cardTitle}>{titleKey ?? 'Notificações'}</div>
      <div className={styles.prefList}>
        {PREF_KEYS.map((key) => (
          <div key={key} className={styles.prefRow}>
            <div>
              <div className={styles.prefTitle}>{t(`pref${key}`)}</div>
              <div className={styles.prefDesc}>{t(`pref${key}Desc`)}</div>
            </div>
            <Toggle
              on={prefs?.[key] ?? true}
              onClick={() => togglePref(key)}
              disabled={!prefs || updatePrefs.isPending}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
