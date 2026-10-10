import { NextIntlClientProvider } from 'next-intl';
import styles from './layout.module.scss';

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return (
    // Full messages: the root provider omits this group's namespaces.
    <NextIntlClientProvider>
      <div className={styles.layout}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
