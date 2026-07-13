import { DashboardGuard, DashboardSidebar } from '@/features/dashboard';
import { Toaster } from '@/shared/components/ui/sonner';
import styles from './layout.module.scss';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard>
      <div className={styles.layout}>
        <div className={styles.inner}>
          <DashboardSidebar />
          <main className={styles.main}>{children}</main>
        </div>
      </div>
      <Toaster />
    </DashboardGuard>
  );
}
