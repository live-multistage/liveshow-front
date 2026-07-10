import { Navbar } from '@/shared/components/Navbar';
import styles from './layout.module.scss';

// Providers already wraps the whole app from the root layout — this
// nested wrap was redundant (silently duplicating Toaster/NavigationEvents/
// NavigationOverlay, and would have given Navbar's useAuth() a second,
// independent AuthProvider that never gets the SSR-seeded login state).
export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Navbar />
      {children}
    </div>
  );
}
