'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import type { ChannelAccessMode } from '../../types/channel.types';
import styles from './CreateChannelForm.module.scss';

interface Props {
  value: ChannelAccessMode;
  onChange: (mode: ChannelAccessMode) => void;
}

const MODES: ChannelAccessMode[] = ['FREE', 'SUBSCRIPTION'];

const COPY = {
  FREE: { title: 'accessFreeTitle', description: 'accessFreeDescription' },
  SUBSCRIPTION: {
    title: 'accessSubscriptionTitle',
    description: 'accessSubscriptionDescription',
  },
} as const;

/**
 * Cards de rádio para o tipo de acesso. São `<input type="radio">` de verdade
 * (escondidos visualmente) para herdar a navegação por setas e o anúncio de
 * "1 de 2" dos leitores de tela, em vez de reimplementar isso à mão.
 */
export function ChannelAccessModeCards({ value, onChange }: Props) {
  const t = useTranslations('channels.create');

  return (
    <div className={styles.field}>
      <span className={styles.label} id="channel-access-label">
        {t('accessLabel')}
      </span>

      <div className={styles.accessGroup} role="radiogroup" aria-labelledby="channel-access-label">
        {MODES.map((mode) => {
          const selected = value === mode;
          return (
            <label
              key={mode}
              className={`${styles.accessCard} ${selected ? styles.accessCardSelected : ''}`}
            >
              <input
                className={styles.accessRadio}
                type="radio"
                name="channel-access-mode"
                value={mode}
                checked={selected}
                onChange={() => onChange(mode)}
              />
              <span className={styles.accessDot} aria-hidden="true" />
              <span>
                <span className={styles.accessTitle}>{t(COPY[mode].title)}</span>
                <span className={styles.accessDescription}>{t(COPY[mode].description)}</span>
              </span>
            </label>
          );
        })}
      </div>

      {value === 'SUBSCRIPTION' && (
        <p className={styles.notice}>
          <Info className={styles.noticeIcon} size={16} aria-hidden="true" />
          <span>{t('subscriptionNotice')}</span>
        </p>
      )}
    </div>
  );
}
