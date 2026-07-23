'use client';

import Link from 'next/link';
import { useAnalyticsConsent } from '@/lib/analytics/consent';
import styles from './ConsentBanner.module.scss';

// LGPD consent gate. Renders only until the visitor decides. Accept and Reject
// carry equal visual weight — refusing must be as easy as accepting.
export function ConsentBanner() {
  const { consent, setConsent } = useAnalyticsConsent();

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
        <button type="button" className={styles.reject} onClick={() => setConsent('denied')}>
          Recusar
        </button>
        <button type="button" className={styles.accept} onClick={() => setConsent('granted')}>
          Aceitar
        </button>
      </div>
    </div>
  );
}
