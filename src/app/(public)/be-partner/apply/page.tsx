import type { Metadata } from 'next';
import { OrganizerApplicationContent } from '@/features/organizations/pages/OrganizerApplicationPage';

export const metadata: Metadata = {
  title: 'Candidate-se a organizador',
  description: 'Envie sua candidatura para se tornar um organizador e comece a transmitir seus eventos.',
  alternates: { canonical: '/be-partner/apply' },
  robots: { index: false },
};

export default function OrganizerApplicationPage() {
  return <OrganizerApplicationContent />;
}
