import type { Metadata } from 'next';
import { MyTicketsPageContent } from '@/features/tickets';

export const metadata: Metadata = { title: 'Meus ingressos' };

export default function MyTicketsPage() {
  return <MyTicketsPageContent />;
}
