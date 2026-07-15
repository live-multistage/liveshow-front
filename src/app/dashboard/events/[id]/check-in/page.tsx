import type { Metadata } from 'next';
import { CheckInPageContent } from '@/features/tickets/components/CheckInPageContent';

export const metadata: Metadata = { title: 'Check-in' };

export default function CheckInPage() {
  return <CheckInPageContent />;
}
