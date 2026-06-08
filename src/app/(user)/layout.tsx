import { Navbar } from '@/shared/components/Navbar';
import styles from './layout.module.scss';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Navbar />
      {children}
    </div>
  );
}
