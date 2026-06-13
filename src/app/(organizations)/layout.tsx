import { OrganizationsGuard } from '@/features/organizations';

export default function OrganizationsLayout({ children }: { children: React.ReactNode }) {
  return <OrganizationsGuard>{children}</OrganizationsGuard>;
}
