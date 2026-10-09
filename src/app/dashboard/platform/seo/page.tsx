import type { Metadata } from 'next';
import { SeoAdminPage } from '@/features/platform-admin/seo/components/SeoAdminPage';

export const metadata: Metadata = { title: 'Plataforma — SEO' };

export default function Page() {
  return <SeoAdminPage />;
}
