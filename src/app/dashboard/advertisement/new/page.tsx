import type { Metadata } from 'next';
import { AdCreatePage } from '@/features/advertisements/components/AdCreatePage';

export const metadata: Metadata = { title: 'Criar Anúncio' };

export default function DashboardAdCreatePage() {
  return <AdCreatePage />;
}
