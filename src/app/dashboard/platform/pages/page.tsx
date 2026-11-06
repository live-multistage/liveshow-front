import type { Metadata } from 'next';
import { PagesListPage } from '@/features/platform-admin/pages/components/PagesListPage';

export const metadata: Metadata = { title: 'Plataforma — Páginas' };

export default function Page() {
  return <PagesListPage />;
}
