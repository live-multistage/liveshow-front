import { DashboardGuard, DashboardSidebar, DashboardMobileNav } from '@/features/dashboard';
import { Toaster } from '@live-show/design-system';
import { fetchFeatureFlags } from '@/features/feature-flags';
import styles from './layout.module.scss';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const flags = await fetchFeatureFlags();
  return (
    <DashboardGuard>
      <div className={styles.layout}>
        <div className={styles.inner}>
          <DashboardSidebar flags={flags} />
          <div className={styles.content}>
            <DashboardMobileNav flags={flags} />
            <main className={styles.main}>{children}</main>
          </div>
        </div>
      </div>
      <Toaster />
    </DashboardGuard>
  );
}
