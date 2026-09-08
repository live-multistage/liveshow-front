import type { Metadata } from 'next';
import styles from './layout.module.scss';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      {children}
    </div>
  );
}
