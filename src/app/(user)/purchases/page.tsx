import type { Metadata } from 'next';
import { PurchasesPageContent } from '@/features/purchases';

export const metadata: Metadata = { title: 'Compras' };

export default function PurchasesPage() {
  return <PurchasesPageContent />;
}
