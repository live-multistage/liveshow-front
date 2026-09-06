import type { Metadata } from 'next';
import { PurchasesPageContent } from '@/features/purchases';
import { fetchFeatureFlags } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Compras' };

export default async function PurchasesPage() {
  const flags = await fetchFeatureFlags();
  return <PurchasesPageContent fiscalEnabled={flags.fiscal_emission} />;
}
