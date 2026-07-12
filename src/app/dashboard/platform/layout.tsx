import { PlatformAdminGuard } from '@/features/platform-admin';

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return <PlatformAdminGuard>{children}</PlatformAdminGuard>;
}
