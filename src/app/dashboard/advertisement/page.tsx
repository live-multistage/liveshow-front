import type { Metadata } from 'next';
import { AdvertisementPage } from '@/features/advertisements/components/AdvertisementPage';

export const metadata: Metadata = { title: 'Anúncios' };

export default function DashboardAdvertisementPage() {
  return <AdvertisementPage />;
}
