import { Navbar } from '@/shared/components/Navbar';
import { Providers } from '@/providers';
import styles from './layout.module.scss';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className={styles.layout}>
        <Navbar />
        {children}
      </div>
    </Providers>
  );
}
