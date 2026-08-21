'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ScheduledSlot } from '../types/channel.types';
import styles from './OffAirOverlay.module.scss';

interface Props {
  next: ScheduledSlot | null;
}

// Fora do ar, um canal é uma tela preta indistinguível de uma transmissão
// travada. O overlay diz que o silêncio é intencional e quando ele acaba.
export function OffAirOverlay({ next }: Props) {
  const t = useTranslations();
  const locale = useLocale();

  // Hora e nome ficam em elementos separados de propósito: a mensagem
  // traduzida é o rótulo, o horário é o dado — sem interpolação para traduzir.
  // Por contrato, `channels.backAt` é um rótulo puro ("Volta às"), sem
  // placeholder `{time}`: nada é passado para o `t`.
  const time = next
    ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
        new Date(next.startsAt),
      )
    : null;

  return (
    <div className={styles.overlay} role="status">
      <p className={styles.title}>{t('channels.offAir')}</p>

      {next && time && (
        <>
          <p className={styles.backAt}>{t('channels.backAt')}</p>
          <p className={styles.time}>{time}</p>
          <p className={styles.nextName}>{next.name}</p>
        </>
      )}
    </div>
  );
}
