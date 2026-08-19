import type { Metadata } from 'next';
import { CheckInEventPicker } from '@/features/tickets/components/CheckInEventPicker';

export const metadata: Metadata = { title: 'Check-in' };

// Event picker: staff fixes the event here, then every scan on
// /checkin/[eventId] validates against it — the ticket never picks the event.
export default function CheckInIndexPage() {
  return <CheckInEventPicker />;
}
