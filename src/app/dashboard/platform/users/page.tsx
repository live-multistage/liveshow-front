import type { Metadata } from 'next';
import { UserRoleSearchPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Usuários & Papéis' };

export default function PlatformUsersPage() {
  return <UserRoleSearchPage />;
}
