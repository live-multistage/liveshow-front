import { DashboardGuard, DashboardSidebar, DashboardMobileNav } from '@/features/dashboard';
import { Toaster } from '@live-show/design-system';
import styles from './layout.module.scss';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard>
      <div className={styles.layout}>
        <div className={styles.inner}>
          <DashboardSidebar />
          <div className={styles.content}>
            <DashboardMobileNav />
            <main className={styles.main}>{children}</main>
          </div>
        </div>
      </div>
      <Toaster />
    </DashboardGuard>
  );
}
