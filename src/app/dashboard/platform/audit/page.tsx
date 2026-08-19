import type { Metadata } from 'next';
import { PlatformAuditPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Audit log' };

export default function Page() {
  return <PlatformAuditPage />;
}
