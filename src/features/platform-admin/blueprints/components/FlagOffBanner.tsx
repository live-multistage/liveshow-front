'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import styles from './FlagOffBanner.module.scss';

// Design A2: shown above the list/detail whenever the `blueprints` flag is
// OFF. Authoring and publishing stay available — only execution is gated.
export function FlagOffBanner({ visible }: { visible: boolean }) {
  const t = useTranslations('platformAdmin.blueprints');
  if (!visible) return null;
  return (
    <div className={styles.banner} role="status">
      <AlertTriangle size={18} />
      <p>{t.rich('flagOffBanner', { strong: (c) => <strong>{c}</strong>, mono: (c) => <span className={styles.mono}>{c}</span> })}</p>
    </div>
  );
}
