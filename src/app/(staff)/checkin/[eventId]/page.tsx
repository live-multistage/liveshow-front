import type { Metadata } from 'next';
import { CheckInPageContent } from '@/features/tickets/components/CheckInPageContent';

export const metadata: Metadata = { title: 'Check-in' };

// Standalone (staff) route group — outside /dashboard on purpose: gate staff
// only need an authenticated session + STAFF org membership (validated by the
// check-in endpoint), not the platform roles the dashboard demands.
export default function StaffCheckInPage() {
  return <CheckInPageContent />;
}
