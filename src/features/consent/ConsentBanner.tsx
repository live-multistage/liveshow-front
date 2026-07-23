'use client';

import Link from 'next/link';
import { useAnalyticsConsent, type ConsentState } from '@/lib/analytics/consent';
import { privacyService } from './privacy.service';
import styles from './ConsentBanner.module.scss';

// LGPD consent gate. Renders only until the visitor decides. Accept and Reject
// carry equal visual weight — refusing must be as easy as accepting.
export function ConsentBanner() {
  const { consent, setConsent } = useAnalyticsConsent();

  const choose = (state: ConsentState) => {
    setConsent(state);
    privacyService.syncConsent(state === 'granted');
  };

  if (consent !== null) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Preferências de privacidade">
      <div className={styles.text}>
        <strong className={styles.title}>Privacidade</strong>
        <span className={styles.body}>
          Coletamos dados de uso não essenciais (analytics e recomendações) para
          personalizar sua experiência. Você pode recusar sem perder acesso ao serviço.
          Ajuste quando quiser em{' '}
          <Link href="/settings#privacidade" className={styles.link}>Configurações</Link>.
        </span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.reject} onClick={() => choose('denied')}>
          Recusar
        </button>
        <button type="button" className={styles.accept} onClick={() => choose('granted')}>
          Aceitar
        </button>
      </div>
    </div>
  );
}
